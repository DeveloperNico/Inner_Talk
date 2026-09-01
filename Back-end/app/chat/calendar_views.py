import logging
from datetime import datetime, timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_time
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CalendarAppointment, UserProfile

logger = logging.getLogger(__name__)

ROLE_PATIENT = UserProfile.ROLE_PATIENT
ROLE_PSYCHOLOGIST = UserProfile.ROLE_PSYCHOLOGIST


def js_weekday(date_value):
    return (date_value.weekday() + 1) % 7


def normalize_working_days(days):
    if not isinstance(days, list):
        return [1, 2, 3, 4, 5]

    normalized = []
    for value in days:
        try:
            weekday = int(value)
        except (TypeError, ValueError):
            continue
        if 0 <= weekday <= 6 and weekday not in normalized:
            normalized.append(weekday)

    return sorted(normalized) or [1, 2, 3, 4, 5]


def normalize_blocked_dates(date_keys):
    if not isinstance(date_keys, list):
        return []

    normalized = []
    for value in date_keys:
        parsed = parse_date(str(value)) if value is not None else None
        if not parsed:
            continue
        date_key = parsed.isoformat()
        if date_key not in normalized:
            normalized.append(date_key)

    return sorted(normalized)


def serialize_profile_settings(profile):
    return {
        'workingDays': normalize_working_days(getattr(profile, 'working_days', None)),
        'blockedDates': normalize_blocked_dates(getattr(profile, 'blocked_dates', None)),
        'startTime': profile.availability_start_time.strftime('%H:%M'),
        'endTime': profile.availability_end_time.strftime('%H:%M'),
        'slotDuration': int(profile.availability_slot_duration or 60),
    }


def serialize_appointment(appointment, include_patient=True):
    local_start = timezone.localtime(appointment.start_at)
    payload = {
        'id': appointment.id,
        'dateKey': local_start.date().isoformat(),
        'time': local_start.strftime('%H:%M'),
        'status': appointment.status,
        'cancellationMessage': appointment.cancellation_message or '',
        'rescheduleMessage': appointment.reschedule_message or '',
        'cancelledAt': appointment.cancelled_at.isoformat() if appointment.cancelled_at else None,
        'cancelledBy': appointment.cancelled_by_id,
        'rescheduledAt': appointment.rescheduled_at.isoformat() if appointment.rescheduled_at else None,
        'rescheduledBy': appointment.rescheduled_by_id,
        'createdAt': appointment.created_at.isoformat(),
        'updatedAt': appointment.updated_at.isoformat(),
    }

    if include_patient:
        payload['patientId'] = appointment.patient_id
        payload['patientName'] = appointment.patient.get_full_name() or appointment.patient.username

    return payload


def serialize_patient_appointment(appointment):
    payload = serialize_appointment(appointment, include_patient=False)
    payload['psychologistId'] = appointment.psychologist_id
    payload['psychologistName'] = appointment.psychologist.get_full_name() or appointment.psychologist.username
    return payload


def serialize_for_user(appointment, user):
    profile = get_profile(user)
    if profile and profile.role == ROLE_PSYCHOLOGIST:
        return serialize_appointment(appointment)
    return serialize_patient_appointment(appointment)


def get_profile(user):
    return getattr(user, 'profile', None)


def parse_aware_datetime(date_key, time_value):
    date_value = parse_date(date_key)
    time_object = parse_time(time_value)

    if not date_value or not time_object:
        return None

    naive_datetime = datetime.combine(date_value, time_object)
    return timezone.make_aware(naive_datetime, timezone.get_current_timezone())


def build_slots(start_time, end_time, slot_duration):
    start_minutes = start_time.hour * 60 + start_time.minute
    end_minutes = end_time.hour * 60 + end_time.minute

    if slot_duration <= 0 or end_minutes <= start_minutes:
        return []

    slots = []
    for current_minutes in range(start_minutes, end_minutes, slot_duration):
        if current_minutes + slot_duration > end_minutes:
            break
        slots.append(f'{current_minutes // 60:02d}:{current_minutes % 60:02d}')

    return slots


def is_slot_valid(profile, start_at):
    date_value = timezone.localtime(start_at).date()
    date_key = date_value.isoformat()
    if date_key in normalize_blocked_dates(profile.blocked_dates):
        return False

    weekday = js_weekday(date_value)
    if weekday not in normalize_working_days(profile.working_days):
        return False

    local_time = timezone.localtime(start_at).time()
    start_time = profile.availability_start_time
    end_time = profile.availability_end_time
    slot_duration = int(profile.availability_slot_duration or 60)

    if local_time < start_time or local_time >= end_time:
        return False

    slot_candidates = build_slots(start_time, end_time, slot_duration)
    return local_time.strftime('%H:%M') in slot_candidates


def has_scheduled_same_slot(psychologist, start_at, exclude_appointment_id=None):
    queryset = CalendarAppointment.objects.filter(
        psychologist=psychologist,
        start_at=start_at,
        status=CalendarAppointment.STATUS_SCHEDULED,
    )
    if exclude_appointment_id:
        queryset = queryset.exclude(id=exclude_appointment_id)
    return queryset.exists()


def has_patient_scheduled_on_date(patient, local_date, exclude_appointment_id=None):
    queryset = CalendarAppointment.objects.filter(
        patient=patient,
        start_at__date=local_date,
        status=CalendarAppointment.STATUS_SCHEDULED,
    )
    if exclude_appointment_id:
        queryset = queryset.exclude(id=exclude_appointment_id)
    return queryset.exists()


def refresh_next_session(user):
    profile = get_profile(user)
    if not profile:
        return

    now = timezone.now()
    if profile.role == ROLE_PSYCHOLOGIST:
        next_appointment = CalendarAppointment.objects.filter(
            psychologist=user,
            status=CalendarAppointment.STATUS_SCHEDULED,
            start_at__gte=now,
        ).order_by('start_at').first()
    else:
        next_appointment = CalendarAppointment.objects.filter(
            patient=user,
            status=CalendarAppointment.STATUS_SCHEDULED,
            start_at__gte=now,
        ).order_by('start_at').first()

    profile.next_session_at = next_appointment.start_at if next_appointment else None
    profile.save(update_fields=['next_session_at', 'updated_at'])


def get_calendar_payload(user):
    profile = get_profile(user)
    if not profile:
        return None, Response({'error': 'Perfil de usuario nao encontrado.'}, status=403)

    if profile.role == ROLE_PSYCHOLOGIST:
        appointments = CalendarAppointment.objects.filter(psychologist=user).select_related('patient', 'psychologist', 'cancelled_by', 'rescheduled_by')
        return {
            'role': ROLE_PSYCHOLOGIST,
            'settings': serialize_profile_settings(profile),
            'appointments': [serialize_appointment(appointment) for appointment in appointments],
            'statistics': {
                'scheduledCount': appointments.filter(status=CalendarAppointment.STATUS_SCHEDULED).count(),
                'cancelledCount': appointments.filter(status=CalendarAppointment.STATUS_CANCELLED).count(),
            },
        }, None

    psychologist = profile.psychologist
    if not psychologist:
        return None, Response({'error': 'Nenhum psicologo foi associado a sua conta.'}, status=400)

    psychologist_profile = get_profile(psychologist)
    appointments = CalendarAppointment.objects.filter(psychologist=psychologist).select_related('patient', 'psychologist', 'cancelled_by', 'rescheduled_by')
    patient_appointments = appointments.filter(patient=user)
    booked_slots = [
        {
            'dateKey': timezone.localtime(appointment.start_at).date().isoformat(),
            'time': timezone.localtime(appointment.start_at).strftime('%H:%M'),
        }
        for appointment in appointments.filter(status=CalendarAppointment.STATUS_SCHEDULED)
    ]

    return {
        'role': ROLE_PATIENT,
        'psychologist': {
            'id': psychologist.id,
            'name': psychologist.get_full_name() or psychologist.username,
            'crp': psychologist_profile.crp if psychologist_profile else None,
        },
        'settings': serialize_profile_settings(psychologist_profile),
        'bookedSlots': booked_slots,
        'appointments': [serialize_patient_appointment(appointment) for appointment in patient_appointments],
        'statistics': {
            'scheduledCount': patient_appointments.filter(status=CalendarAppointment.STATUS_SCHEDULED).count(),
            'cancelledCount': patient_appointments.filter(status=CalendarAppointment.STATUS_CANCELLED).count(),
        },
    }, None


def resolve_appointment_and_permissions(user, appointment_id):
    profile = get_profile(user)
    if not profile or profile.role not in [ROLE_PSYCHOLOGIST, ROLE_PATIENT]:
        return None, Response({'error': 'Perfil sem permissao para alterar consultas.'}, status=403)

    appointment = get_object_or_404(
        CalendarAppointment.objects.select_related('patient', 'psychologist', 'cancelled_by', 'rescheduled_by'),
        id=appointment_id,
    )

    if profile.role == ROLE_PSYCHOLOGIST and appointment.psychologist_id != user.id:
        return None, Response({'error': 'Consulta nao pertence ao seu calendario.'}, status=403)

    if profile.role == ROLE_PATIENT and appointment.patient_id != user.id:
        return None, Response({'error': 'Consulta nao pertence a sua conta.'}, status=403)

    return appointment, None


class CalendarOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            payload, error_response = get_calendar_payload(request.user)
            if error_response:
                return error_response
            return Response(payload)
        except Exception:
            logger.exception('Falha ao carregar o calendario.')
            return Response({'error': 'Falha interna ao carregar o calendario.'}, status=500)


class CalendarSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        try:
            profile = get_profile(request.user)
            if not profile or profile.role != ROLE_PSYCHOLOGIST:
                return Response({'error': 'Apenas psicologos podem editar a agenda.'}, status=403)

            working_days = normalize_working_days(request.data.get('workingDays'))
            blocked_dates = normalize_blocked_dates(request.data.get('blockedDates'))
            start_time = parse_time(request.data.get('startTime'))
            end_time = parse_time(request.data.get('endTime'))
            slot_duration = request.data.get('slotDuration')

            if not start_time or not end_time:
                return Response({'error': 'Horario inicial e final invalidos.'}, status=400)

            try:
                slot_duration = int(slot_duration)
            except (TypeError, ValueError):
                return Response({'error': 'Duracao invalida.'}, status=400)

            if slot_duration < 15:
                return Response({'error': 'Duracao deve ser de pelo menos 15 minutos.'}, status=400)

            if end_time <= start_time:
                return Response({'error': 'Horario final deve ser maior que o inicial.'}, status=400)

            profile.working_days = working_days
            profile.blocked_dates = blocked_dates
            profile.availability_start_time = start_time
            profile.availability_end_time = end_time
            profile.availability_slot_duration = slot_duration
            profile.save(update_fields=['working_days', 'blocked_dates', 'availability_start_time', 'availability_end_time', 'availability_slot_duration', 'updated_at'])

            return Response({'settings': serialize_profile_settings(profile)})
        except Exception:
            logger.exception('Falha ao atualizar configuracoes do calendario.')
            return Response({'error': 'Falha interna ao atualizar a agenda.'}, status=500)


class CalendarBlockedDaysView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            profile = get_profile(request.user)
            if not profile or profile.role != ROLE_PSYCHOLOGIST:
                return Response({'error': 'Apenas psicologos podem bloquear dias especificos.'}, status=403)

            date_keys = normalize_blocked_dates(request.data.get('dateKeys'))
            disable = bool(request.data.get('disable', True))
            message = (request.data.get('message') or '').strip()

            if not date_keys:
                return Response({'error': 'Selecione ao menos um dia.'}, status=400)

            if disable and not message:
                return Response({'error': 'Escreva uma justificativa para desabilitar os dias.'}, status=400)

            current_blocked = set(normalize_blocked_dates(profile.blocked_dates))

            cancelled_count = 0
            if disable:
                current_blocked.update(date_keys)

                for date_key in date_keys:
                    date_value = parse_date(date_key)
                    if not date_value:
                        continue
                    day_start = timezone.make_aware(datetime.combine(date_value, datetime.min.time()), timezone.get_current_timezone())
                    day_end = day_start + timedelta(days=1)
                    day_appointments = CalendarAppointment.objects.filter(
                        psychologist=request.user,
                        status=CalendarAppointment.STATUS_SCHEDULED,
                        start_at__gte=day_start,
                        start_at__lt=day_end,
                    )

                    for appointment in day_appointments:
                        appointment.status = CalendarAppointment.STATUS_CANCELLED
                        appointment.cancellation_message = message
                        appointment.cancelled_by = request.user
                        appointment.cancelled_at = timezone.now()
                        appointment.save(update_fields=['status', 'cancellation_message', 'cancelled_by', 'cancelled_at', 'updated_at'])
                        refresh_next_session(appointment.patient)
                        cancelled_count += 1
            else:
                for date_key in date_keys:
                    current_blocked.discard(date_key)

            profile.blocked_dates = sorted(current_blocked)
            profile.save(update_fields=['blocked_dates', 'updated_at'])
            refresh_next_session(request.user)

            return Response({
                'settings': serialize_profile_settings(profile),
                'cancelledCount': cancelled_count,
            })
        except Exception:
            logger.exception('Falha ao bloquear/desbloquear dias da agenda.')
            return Response({'error': 'Falha interna ao atualizar dias desabilitados.'}, status=500)


class CalendarAppointmentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            profile = get_profile(request.user)
            if not profile or profile.role != ROLE_PATIENT:
                return Response({'error': 'Apenas pacientes podem agendar consultas.'}, status=403)

            psychologist = profile.psychologist
            psychologist_profile = get_profile(psychologist) if psychologist else None
            if not psychologist or not psychologist_profile:
                return Response({'error': 'Nenhum psicologo foi associado a sua conta.'}, status=400)

            date_key = request.data.get('dateKey')
            time_value = request.data.get('time')
            start_at = parse_aware_datetime(date_key, time_value)
            if not start_at:
                return Response({'error': 'Data ou horario invalidos.'}, status=400)

            now = timezone.now()
            if start_at <= now:
                return Response({'error': 'Nao e possivel agendar um horario passado.'}, status=400)

            if not is_slot_valid(psychologist_profile, start_at):
                return Response({'error': 'Horario indisponivel na agenda do psicologo.'}, status=400)

            if has_scheduled_same_slot(psychologist, start_at):
                return Response({'error': 'Esse horario acabou de ser ocupado.'}, status=409)

            local_date = timezone.localtime(start_at).date()
            if has_patient_scheduled_on_date(request.user, local_date):
                return Response({'error': 'Voce ja possui uma consulta agendada nesse dia.'}, status=409)

            appointment = CalendarAppointment.objects.create(
                psychologist=psychologist,
                patient=request.user,
                start_at=start_at,
                duration_minutes=int(psychologist_profile.availability_slot_duration or 60),
            )

            refresh_next_session(request.user)
            refresh_next_session(psychologist)

            return Response({'item': serialize_patient_appointment(appointment)}, status=201)
        except Exception:
            logger.exception('Falha ao criar agendamento.')
            return Response({'error': 'Falha interna ao agendar consulta.'}, status=500)


class CalendarAppointmentRescheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, appointment_id):
        try:
            appointment, permission_error = resolve_appointment_and_permissions(request.user, appointment_id)
            if permission_error:
                return permission_error

            if appointment.status == CalendarAppointment.STATUS_CANCELLED:
                return Response({'error': 'Nao e possivel editar uma consulta cancelada.'}, status=400)

            message = (request.data.get('message') or '').strip()
            if not message:
                return Response({'error': 'Escreva uma justificativa para alterar o horario.'}, status=400)

            date_key = request.data.get('dateKey')
            time_value = request.data.get('time')
            start_at = parse_aware_datetime(date_key, time_value)
            if not start_at:
                return Response({'error': 'Data ou horario invalidos.'}, status=400)

            if start_at <= timezone.now():
                return Response({'error': 'Nao e possivel reagendar para um horario passado.'}, status=400)

            psychologist_profile = get_profile(appointment.psychologist)
            if not psychologist_profile or not is_slot_valid(psychologist_profile, start_at):
                return Response({'error': 'Horario indisponivel na agenda do psicologo.'}, status=400)

            if has_scheduled_same_slot(appointment.psychologist, start_at, exclude_appointment_id=appointment.id):
                return Response({'error': 'Esse horario acabou de ser ocupado.'}, status=409)

            local_date = timezone.localtime(start_at).date()
            if has_patient_scheduled_on_date(appointment.patient, local_date, exclude_appointment_id=appointment.id):
                return Response({'error': 'O paciente ja possui uma consulta agendada nesse dia.'}, status=409)

            appointment.start_at = start_at
            appointment.duration_minutes = int(psychologist_profile.availability_slot_duration or 60)
            appointment.reschedule_message = message
            appointment.rescheduled_by = request.user
            appointment.rescheduled_at = timezone.now()
            appointment.save(
                update_fields=['start_at', 'duration_minutes', 'reschedule_message', 'rescheduled_by', 'rescheduled_at', 'updated_at']
            )

            refresh_next_session(appointment.patient)
            refresh_next_session(appointment.psychologist)

            return Response({'item': serialize_for_user(appointment, request.user)})
        except Exception:
            logger.exception('Falha ao reagendar consulta.')
            return Response({'error': 'Falha interna ao reagendar consulta.'}, status=500)


class CalendarAppointmentCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, appointment_id):
        try:
            appointment, permission_error = resolve_appointment_and_permissions(request.user, appointment_id)
            if permission_error:
                return permission_error

            if appointment.status == CalendarAppointment.STATUS_CANCELLED:
                return Response({'error': 'Essa consulta ja foi cancelada.'}, status=400)

            message = (request.data.get('message') or '').strip()
            if not message:
                return Response({'error': 'Escreva a justificativa do cancelamento.'}, status=400)

            appointment.status = CalendarAppointment.STATUS_CANCELLED
            appointment.cancellation_message = message
            appointment.cancelled_by = request.user
            appointment.cancelled_at = timezone.now()
            appointment.save(update_fields=['status', 'cancellation_message', 'cancelled_by', 'cancelled_at', 'updated_at'])

            refresh_next_session(appointment.patient)
            refresh_next_session(appointment.psychologist)

            return Response({'item': serialize_for_user(appointment, request.user)})
        except Exception:
            logger.exception('Falha ao cancelar consulta.')
            return Response({'error': 'Falha interna ao cancelar consulta.'}, status=500)