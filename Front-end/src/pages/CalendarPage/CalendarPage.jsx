import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    CalendarPlus,
    CheckCircle2,
    Clock3,
    MessageSquareText,
    ShieldAlert,
    Stethoscope,
    UserRound,
    X,
} from 'lucide-react';

import { Header } from '../../components/Header/Header';
import { PageTitle } from '../../components/PageTitle/PageTitle';
import {
    bookCalendarAppointment,
    cancelCalendarAppointment,
    getCalendarOverview,
    getStoredUser,
    rescheduleCalendarAppointment,
    updateCalendarBlockedDays,
    updateCalendarSettings,
} from '../../data/storage';

const WEEKDAY_OPTIONS = [
    { index: 1, short: 'Seg' },
    { index: 2, short: 'Ter' },
    { index: 3, short: 'Qua' },
    { index: 4, short: 'Qui' },
    { index: 5, short: 'Sex' },
    { index: 6, short: 'Sab' },
    { index: 0, short: 'Dom' },
];

const DEFAULT_SETTINGS = {
    workingDays: [1, 2, 3, 4, 5],
    blockedDates: [],
    startTime: '08:00',
    endTime: '18:00',
    slotDuration: 60,
};

function getDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function addDays(date, amount) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + amount);
    return nextDate;
}

function buildMonthGrid(referenceDate) {
    const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = addDays(firstDay, -startOffset);

    return Array.from({ length: 42 }, (_, index) => {
        const currentDate = addDays(startDate, index);
        return {
            dateKey: getDateKey(currentDate),
            inCurrentMonth: currentDate.getMonth() === referenceDate.getMonth(),
            isToday: getDateKey(currentDate) === getDateKey(new Date()),
        };
    });
}

function toMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

function fromMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
}

function buildSlots(settings) {
    const start = toMinutes(settings.startTime);
    const end = toMinutes(settings.endTime);
    const slots = [];

    for (let current = start; current + settings.slotDuration <= end; current += settings.slotDuration) {
        slots.push(fromMinutes(current));
    }

    return slots;
}

function formatTimeLabel(time) {
    return time.replace(':', 'h');
}

function formatMonthLabel(date) {
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatLongDate(dateKey) {
    const label = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
    }).format(parseDateKey(dateKey));

    return label.charAt(0).toUpperCase() + label.slice(1);
}

function normalizeSettings(settings) {
    if (!settings) {
        return {
            ...DEFAULT_SETTINGS,
            workingDays: [...DEFAULT_SETTINGS.workingDays],
            blockedDates: [...DEFAULT_SETTINGS.blockedDates],
        };
    }

    return {
        workingDays: Array.isArray(settings.workingDays) && settings.workingDays.length > 0 ? settings.workingDays : [...DEFAULT_SETTINGS.workingDays],
        blockedDates: Array.isArray(settings.blockedDates) ? settings.blockedDates : [],
        startTime: settings.startTime || DEFAULT_SETTINGS.startTime,
        endTime: settings.endTime || DEFAULT_SETTINGS.endTime,
        slotDuration: Number(settings.slotDuration) || DEFAULT_SETTINGS.slotDuration,
    };
}

function buildRecurringDatesInMonth(baseDateKey, monthReference) {
    const baseDate = parseDateKey(baseDateKey);
    const todayKey = getDateKey(new Date());
    const weekday = baseDate.getDay();
    const month = monthReference.getMonth();
    const year = monthReference.getFullYear();
    const days = [];

    const cursor = new Date(year, month, 1);
    while (cursor.getMonth() === month) {
        const dateKey = getDateKey(cursor);
        if (cursor.getDay() === weekday && dateKey >= todayKey) {
            days.push(dateKey);
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return days;
}

function getSessionStatusLabel(status) {
    return status === 'cancelled' ? 'Cancelada' : 'Agendada';
}

function isPastDate(dateKey) {
    const day = parseDateKey(dateKey);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    day.setHours(0, 0, 0, 0);
    return day < today;
}

function isPastTimeForDate(dateKey, time) {
    if (dateKey !== getDateKey(new Date())) {
        return false;
    }
    return toMinutes(time) <= (new Date().getHours() * 60 + new Date().getMinutes());
}

export function CalendarPage() {
    const [user] = useState(() => getStoredUser());
    const [calendar, setCalendar] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewDate, setViewDate] = useState(() => new Date());
    const [selectedDateKey, setSelectedDateKey] = useState(() => getDateKey(new Date()));
    const [selectedDateKeys, setSelectedDateKeys] = useState(() => [getDateKey(new Date())]);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedSessionId, setSelectedSessionId] = useState('');
    const [cancellationMessage, setCancellationMessage] = useState('');
    const [rescheduleMessage, setRescheduleMessage] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [disableDaysMessage, setDisableDaysMessage] = useState('');
    const [repeatWeeklyInMonth, setRepeatWeeklyInMonth] = useState(false);
    const [isBookingOpen, setIsBookingOpen] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const isPsychologist = user?.role === 'psicologo';
    const isPatient = user?.role === 'paciente';
    const settings = useMemo(() => normalizeSettings(calendar?.settings), [calendar]);
    const appointments = useMemo(() => (Array.isArray(calendar?.appointments) ? [...calendar.appointments] : []), [calendar]);
    const bookedSlots = useMemo(() => (Array.isArray(calendar?.bookedSlots) ? calendar.bookedSlots : []), [calendar]);
    const monthGrid = useMemo(() => buildMonthGrid(viewDate), [viewDate]);

    const loadCalendar = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const payload = await getCalendarOverview();
            setCalendar(payload);
            setErrorMessage('');
        } catch (error) {
            setErrorMessage(error.message || 'Nao foi possivel carregar o calendario.');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadCalendar();
    }, [loadCalendar]);

    useEffect(() => {
        if (!isMultiSelectMode) {
            setSelectedDateKeys([selectedDateKey]);
        }
    }, [isMultiSelectMode, selectedDateKey]);

    const occupiedSlots = useMemo(() => {
        if (isPsychologist) {
            return appointments
                .filter((appointment) => appointment.status === 'scheduled')
                .map((appointment) => `${appointment.dateKey} ${appointment.time}`);
        }

        return bookedSlots.map((slot) => `${slot.dateKey} ${slot.time}`);
    }, [appointments, bookedSlots, isPsychologist]);

    const patientScheduledByDate = useMemo(() => {
        const map = new Map();
        appointments
            .filter((appointment) => appointment.status === 'scheduled')
            .forEach((appointment) => {
                map.set(appointment.dateKey, appointment);
            });
        return map;
    }, [appointments]);

    const blockedDatesSet = useMemo(() => new Set(settings.blockedDates || []), [settings.blockedDates]);

    const availableSlots = useMemo(() => {
        const weekdayIndex = parseDateKey(selectedDateKey).getDay();
        if (isPastDate(selectedDateKey)) return [];
        if (blockedDatesSet.has(selectedDateKey)) return [];
        if (!settings.workingDays.includes(weekdayIndex)) return [];

        const hasScheduledOnDay = isPatient && patientScheduledByDate.has(selectedDateKey);
        if (hasScheduledOnDay) return [];

        return buildSlots(settings)
            .filter((slot) => !occupiedSlots.includes(`${selectedDateKey} ${slot}`))
            .filter((slot) => !isPastTimeForDate(selectedDateKey, slot));
    }, [blockedDatesSet, isPatient, occupiedSlots, patientScheduledByDate, selectedDateKey, settings]);

    const resolvedSelectedTime = availableSlots.includes(selectedTime) ? selectedTime : availableSlots[0] || '';

    const selectedDayAppointments = useMemo(
        () => appointments.filter((appointment) => appointment.dateKey === selectedDateKey),
        [appointments, selectedDateKey],
    );

    useEffect(() => {
        const stillVisible = selectedDayAppointments.some((appointment) => appointment.id === selectedSessionId);
        if (!stillVisible) {
            setSelectedSessionId('');
        }
    }, [selectedDateKey, selectedDayAppointments, selectedSessionId]);

    const selectedSession = selectedDayAppointments.find((appointment) => appointment.id === selectedSessionId) || null;

    const selectedActionDateKeys = isMultiSelectMode
        ? selectedDateKeys.filter((dateKey) => !isPastDate(dateKey))
        : [selectedDateKey].filter((dateKey) => !isPastDate(dateKey));

    const actionScheduledAppointments = useMemo(() => {
        return appointments.filter((appointment) => (
            appointment.status === 'scheduled' && selectedActionDateKeys.includes(appointment.dateKey)
        ));
    }, [appointments, selectedActionDateKeys]);

    const selectedDayState = useMemo(() => {
        const weekdayIndex = parseDateKey(selectedDateKey).getDay();
        const bookedCount = occupiedSlots.filter((slot) => slot.startsWith(`${selectedDateKey} `)).length;
        const hasOwnAppointment = isPatient && patientScheduledByDate.has(selectedDateKey);
        const isBlocked = blockedDatesSet.has(selectedDateKey);
        return {
            isWorkingDay: settings.workingDays.includes(weekdayIndex),
            isBlocked,
            bookedCount,
            availableSlots,
            hasOwnAppointment,
            isAvailable: !isPastDate(selectedDateKey) && !isBlocked && settings.workingDays.includes(weekdayIndex) && availableSlots.length > 0,
        };
    }, [availableSlots, blockedDatesSet, isPatient, occupiedSlots, patientScheduledByDate, selectedDateKey, settings]);

    const nextAvailableDay = monthGrid.find((day) => {
        if (!day.inCurrentMonth || isPastDate(day.dateKey)) return false;
        const weekdayIndex = parseDateKey(day.dateKey).getDay();
        if (!settings.workingDays.includes(weekdayIndex)) return false;
        if (blockedDatesSet.has(day.dateKey)) return false;
        if (isPatient && patientScheduledByDate.has(day.dateKey)) return false;
        const slots = buildSlots(settings)
            .filter((slot) => !occupiedSlots.includes(`${day.dateKey} ${slot}`))
            .filter((slot) => !isPastTimeForDate(day.dateKey, slot));
        return slots.length > 0;
    }) || null;

    const availableDaysCount = monthGrid.filter((day) => {
        if (!day.inCurrentMonth || isPastDate(day.dateKey)) return false;
        const weekdayIndex = parseDateKey(day.dateKey).getDay();
        if (!settings.workingDays.includes(weekdayIndex)) return false;
        if (blockedDatesSet.has(day.dateKey)) return false;
        if (isPatient && patientScheduledByDate.has(day.dateKey)) return false;
        const slots = buildSlots(settings)
            .filter((slot) => !occupiedSlots.includes(`${day.dateKey} ${slot}`))
            .filter((slot) => !isPastTimeForDate(day.dateKey, slot));
        return slots.length > 0;
    }).length;

    const cancelledCount = appointments.filter((appointment) => appointment.status === 'cancelled').length;
    const scheduledCount = appointments.filter((appointment) => appointment.status === 'scheduled').length;

    const refresh = async () => {
        await loadCalendar();
    };

    const handleMonthChange = (amount) => {
        setViewDate((currentDate) => new Date(currentDate.getFullYear(), currentDate.getMonth() + amount, 1));
    };

    const clearActionMessages = () => {
        setErrorMessage('');
        setSuccessMessage('');
    };

    const handleSelectDate = (dateKey) => {
        if (isPastDate(dateKey)) return;

        setSelectedDateKey(dateKey);
        setSelectedTime('');
        clearActionMessages();

        if (isMultiSelectMode) {
            setSelectedDateKeys((current) => (
                current.includes(dateKey)
                    ? current.filter((item) => item !== dateKey)
                    : [...current, dateKey].sort()
            ));
        } else {
            setSelectedDateKeys([dateKey]);
        }
    };

    const handleSelectSession = (appointmentId) => {
        const session = selectedDayAppointments.find((item) => item.id === appointmentId);
        if (!session || session.status !== 'scheduled') return;
        setSelectedSessionId(appointmentId);
        setRescheduleTime(session.time);
        clearActionMessages();
    };

    const handleToggleWorkingDay = async (weekdayIndex) => {
        try {
            const nextWorkingDays = settings.workingDays.includes(weekdayIndex)
                ? settings.workingDays.filter((day) => day !== weekdayIndex)
                : [...settings.workingDays, weekdayIndex].sort((left, right) => left - right);

            await updateCalendarSettings({
                ...settings,
                workingDays: nextWorkingDays,
                blockedDates: settings.blockedDates,
            });
            setSuccessMessage('Dias de atendimento atualizados.');
            setErrorMessage('');
            await refresh();
        } catch (error) {
            setErrorMessage(error.message || 'Nao foi possivel atualizar os dias de atendimento.');
        }
    };

    const handleSettingChange = async (field, value) => {
        try {
            await updateCalendarSettings({
                ...settings,
                blockedDates: settings.blockedDates,
                [field]: value,
            });
            setSuccessMessage('Configuracoes da agenda atualizadas.');
            setErrorMessage('');
            await refresh();
        } catch (error) {
            setErrorMessage(error.message || 'Nao foi possivel atualizar a agenda.');
        }
    };

    const handleBookAppointment = async () => {
        if (!selectedDayState.isAvailable) {
            setErrorMessage('Escolha um dia livre antes de agendar.');
            return;
        }

        if (!resolvedSelectedTime) {
            setErrorMessage('Selecione um horario disponivel.');
            return;
        }

        try {
            if (isPatient && repeatWeeklyInMonth) {
                const recurringDateKeys = buildRecurringDatesInMonth(selectedDateKey, viewDate)
                    .filter((dateKey) => !blockedDatesSet.has(dateKey));
                const successes = [];
                const failures = [];

                for (const dateKey of recurringDateKeys) {
                    try {
                        await bookCalendarAppointment({ dateKey, time: resolvedSelectedTime });
                        successes.push(dateKey);
                    } catch (error) {
                        failures.push(`${dateKey}: ${error.message || 'falha ao agendar'}`);
                    }
                }

                if (successes.length > 0) {
                    setSuccessMessage(`Agendadas ${successes.length} consulta(s) recorrente(s) no horario ${formatTimeLabel(resolvedSelectedTime)}.`);
                }
                if (failures.length > 0) {
                    setErrorMessage(`Algumas datas nao foram agendadas. ${failures.slice(0, 2).join(' | ')}`);
                } else {
                    setErrorMessage('');
                }
            } else {
                await bookCalendarAppointment({ dateKey: selectedDateKey, time: resolvedSelectedTime });
                setSuccessMessage(`Consulta agendada para ${formatLongDate(selectedDateKey)} as ${formatTimeLabel(resolvedSelectedTime)}.`);
                setErrorMessage('');
            }

            setSelectedTime('');
            await refresh();
        } catch (error) {
            setErrorMessage(error.message || 'Nao foi possivel agendar a consulta.');
        }
    };

    const handleBulkCancel = async () => {
        if (!cancellationMessage.trim()) {
            setErrorMessage('Escreva a justificativa do cancelamento.');
            return;
        }

        let targets = [];
        if (!isMultiSelectMode && selectedSession && selectedSession.dateKey === selectedDateKey) {
            targets = [selectedSession];
        } else {
            targets = actionScheduledAppointments;
        }

        if (targets.length === 0) {
            setErrorMessage('Nao ha consultas agendadas nas datas selecionadas.');
            return;
        }

        let successCount = 0;
        const failures = [];
        for (const appointment of targets) {
            try {
                await cancelCalendarAppointment(appointment.id, { message: cancellationMessage.trim() });
                successCount += 1;
            } catch (error) {
                failures.push(`${appointment.dateKey} ${appointment.time}: ${error.message || 'falha'}`);
            }
        }

        if (successCount > 0) {
            setSuccessMessage(`${successCount} consulta(s) cancelada(s) com justificativa.`);
        }
        if (failures.length > 0) {
            setErrorMessage(`Falhas no cancelamento: ${failures.slice(0, 2).join(' | ')}`);
        } else {
            setErrorMessage('');
        }

        setCancellationMessage('');
        setSelectedSessionId('');
        await refresh();
    };

    const rescheduleOptions = useMemo(() => {
        const baseDateKey = selectedDateKey;
        const weekdayIndex = parseDateKey(baseDateKey).getDay();
        if (isPastDate(baseDateKey)) return [];
        if (!settings.workingDays.includes(weekdayIndex)) return [];
        if (blockedDatesSet.has(baseDateKey)) return [];

        return buildSlots(settings)
            .filter((slot) => !isPastTimeForDate(baseDateKey, slot))
            .filter((slot) => {
                const slotKey = `${baseDateKey} ${slot}`;
                if (!occupiedSlots.includes(slotKey)) return true;
                if (!selectedSession) return false;
                return selectedSession.dateKey === baseDateKey && selectedSession.time === slot;
            });
    }, [blockedDatesSet, occupiedSlots, selectedDateKey, selectedSession, settings]);

    const resolvedRescheduleTime = rescheduleOptions.includes(rescheduleTime)
        ? rescheduleTime
        : (rescheduleOptions.includes(selectedSession?.time) ? selectedSession.time : rescheduleOptions[0] || '');

    const handleBulkReschedule = async () => {
        if (!rescheduleMessage.trim()) {
            setErrorMessage('Escreva a justificativa da alteracao de horario.');
            return;
        }

        if (!resolvedRescheduleTime) {
            setErrorMessage('Selecione um novo horario disponivel.');
            return;
        }

        let targets = [];
        if (!isMultiSelectMode && selectedSession && selectedSession.dateKey === selectedDateKey) {
            targets = [selectedSession];
        } else {
            const grouped = new Map();
            actionScheduledAppointments.forEach((appointment) => {
                const list = grouped.get(appointment.dateKey) || [];
                list.push(appointment);
                grouped.set(appointment.dateKey, list);
            });

            const invalidGroup = [...grouped.entries()].find(([, list]) => list.length > 1);
            if (invalidGroup) {
                setErrorMessage('Edicao em lote exige no maximo 1 consulta por dia selecionado.');
                return;
            }

            targets = [...grouped.values()].map((list) => list[0]);
        }

        if (targets.length === 0) {
            setErrorMessage('Nao ha consultas para editar nas datas selecionadas.');
            return;
        }

        let successCount = 0;
        const failures = [];

        for (const appointment of targets) {
            try {
                await rescheduleCalendarAppointment(appointment.id, {
                    dateKey: appointment.dateKey,
                    time: resolvedRescheduleTime,
                    message: rescheduleMessage.trim(),
                });
                successCount += 1;
            } catch (error) {
                failures.push(`${appointment.dateKey} ${appointment.time}: ${error.message || 'falha'}`);
            }
        }

        if (successCount > 0) {
            setSuccessMessage(`${successCount} consulta(s) editada(s) com justificativa.`);
        }
        if (failures.length > 0) {
            setErrorMessage(`Falhas na edicao: ${failures.slice(0, 2).join(' | ')}`);
        } else {
            setErrorMessage('');
        }

        setRescheduleMessage('');
        setSelectedSessionId('');
        await refresh();
    };

    const handleDisableSelectedDays = async () => {
        if (!isPsychologist) return;
        const futureDateKeys = selectedActionDateKeys.filter((dateKey) => !isPastDate(dateKey));

        if (futureDateKeys.length === 0) {
            setErrorMessage('Selecione pelo menos um dia atual/futuro para desabilitar.');
            return;
        }

        if (!disableDaysMessage.trim()) {
            setErrorMessage('Escreva a justificativa para desabilitar os dias selecionados.');
            return;
        }

        try {
            const payload = await updateCalendarBlockedDays({
                dateKeys: futureDateKeys,
                disable: true,
                message: disableDaysMessage.trim(),
            });
            const cancelledCount = Number(payload?.cancelledCount || 0);
            setSuccessMessage(
                cancelledCount > 0
                    ? `Dias desabilitados. ${cancelledCount} consulta(s) pre-marcada(s) foram canceladas com sua justificativa.`
                    : 'Dias desabilitados com sucesso.',
            );
            setDisableDaysMessage('');
            setErrorMessage('');
            await refresh();
        } catch (error) {
            setErrorMessage(error.message || 'Nao foi possivel desabilitar os dias selecionados.');
        }
    };

    const handleEnableSelectedDays = async () => {
        if (!isPsychologist) return;
        const futureDateKeys = selectedActionDateKeys.filter((dateKey) => !isPastDate(dateKey));

        if (futureDateKeys.length === 0) {
            setErrorMessage('Selecione ao menos um dia para reabilitar.');
            return;
        }

        try {
            await updateCalendarBlockedDays({
                dateKeys: futureDateKeys,
                disable: false,
                message: '',
            });
            setSuccessMessage('Dias reabilitados com sucesso.');
            setErrorMessage('');
            await refresh();
        } catch (error) {
            setErrorMessage(error.message || 'Nao foi possivel reabilitar os dias selecionados.');
        }
    };

    if (!user) {
        return (
            <>
                <PageTitle />
                <Header />
                <main className="pt-32 min-h-screen flex flex-col items-center gap-4 bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] text-center px-6">
                    <p className="text-slate-600 font-secondary max-w-md">
                        Entre na sua conta para acessar o calendario.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 rounded-full bg-[#6fc9b6] px-6 py-3 text-white font-medium shadow-md hover:opacity-90 transition-colors"
                    >
                        <CalendarDays size={18} />
                        Ir para o login
                    </Link>
                </main>
            </>
        );
    }

    if (!isPatient && !isPsychologist) {
        return (
            <>
                <PageTitle />
                <Header />
                <main className="pt-32 min-h-screen flex flex-col items-center gap-4 bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] text-center px-6">
                    <p className="text-slate-600 font-secondary max-w-md">
                        Esse calendario esta disponivel para pacientes e psicologos.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 rounded-full bg-[#6fc9b6] px-6 py-3 text-white font-medium shadow-md hover:opacity-90 transition-colors"
                    >
                        <CalendarDays size={18} />
                        Ir para o login
                    </Link>
                </main>
            </>
        );
    }

    if (isLoading && !calendar) {
        return (
            <>
                <PageTitle />
                <Header />
                <main className="pt-32 min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7]">
                    <p className="text-slate-500 font-main">Carregando calendario...</p>
                </main>
            </>
        );
    }

    return (
        <>
            <PageTitle />
            <Header />
            <main className="pt-28 pb-16 min-h-screen bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] px-6 md:px-10 lg:px-16">
                <div className="max-w-7xl mx-auto flex flex-col gap-6">
                    <div className="flex flex-col gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-emerald-100 px-4 py-2 text-sm font-secondary text-[#3b9b8a] shadow-sm w-fit">
                            {isPsychologist ? <Stethoscope size={16} /> : <CalendarDays size={16} />}
                            {isPsychologist ? 'Calendario do psicologo' : 'Calendario do paciente'}
                        </div>
                        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-3xl font-bold font-secondary text-slate-900">
                                    Agenda com selecao por dia e acoes em lote
                                </h1>
                                <p className="text-slate-500 font-main max-w-3xl">
                                    Dias e horarios passados ficam desabilitados. Edicao e cancelamento exigem justificativa.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F6F6] text-[#3b9b8a] shrink-0">
                                        <CalendarDays size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-secondary">Dias livres</p>
                                        <p className="text-lg font-bold font-secondary text-slate-800 leading-none">{availableDaysCount}</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef1fd] text-[#8f7ab3] shrink-0">
                                        <Clock3 size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-secondary">Sessoes marcadas</p>
                                        <p className="text-lg font-bold font-secondary text-slate-800 leading-none">{scheduledCount}</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-500 shrink-0">
                                        <ShieldAlert size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-secondary">Canceladas</p>
                                        <p className="text-lg font-bold font-secondary text-slate-800 leading-none">{cancelledCount}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {(successMessage || errorMessage) && (
                        <div className={`rounded-2xl border px-4 py-3 text-sm font-main ${errorMessage ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                            {errorMessage || successMessage}
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.95fr] gap-6 items-start">
                        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col gap-5">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                    <h2 className="text-lg font-bold font-secondary text-slate-900">{formatMonthLabel(viewDate)}</h2>
                                    <p className="text-sm text-slate-500 font-main">Clique para selecionar dias. Ative selecao multipla para acoes em lote.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => handleMonthChange(-1)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors" aria-label="Mes anterior">
                                        <ArrowLeft size={18} />
                                    </button>
                                    <button type="button" onClick={() => setViewDate(new Date())} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-secondary text-slate-600 hover:bg-slate-50 transition-colors">
                                        Hoje
                                    </button>
                                    <button type="button" onClick={() => handleMonthChange(1)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors" aria-label="Proximo mes">
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>

                            <label className="inline-flex items-center gap-2 text-sm text-slate-600 font-main">
                                <input type="checkbox" checked={isMultiSelectMode} onChange={(event) => setIsMultiSelectMode(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400" />
                                Selecao multipla por dias
                            </label>

                            <div className="grid grid-cols-7 gap-2 text-center text-xs font-secondary text-slate-400">
                                {WEEKDAY_OPTIONS.map((weekday) => (
                                    <span key={weekday.index}>{weekday.short}</span>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-3">
                                {monthGrid.map((day) => {
                                    const weekdayIndex = parseDateKey(day.dateKey).getDay();
                                    const isBlockedDate = blockedDatesSet.has(day.dateKey);
                                    const daySlots = buildSlots(settings)
                                        .filter((slot) => !occupiedSlots.includes(`${day.dateKey} ${slot}`))
                                        .filter((slot) => !isPastTimeForDate(day.dateKey, slot));
                                    const isWorkingDay = settings.workingDays.includes(weekdayIndex);
                                    const bookedCount = occupiedSlots.filter((slot) => slot.startsWith(`${day.dateKey} `)).length;
                                    const hasOwnAppointment = isPatient && patientScheduledByDate.has(day.dateKey);
                                    const isAvailable = !isPastDate(day.dateKey) && !isBlockedDate && isWorkingDay && daySlots.length > 0 && !hasOwnAppointment;
                                    const isSelected = selectedDateKey === day.dateKey;
                                    const isMarked = selectedDateKeys.includes(day.dateKey);
                                    const isDisabled = isPastDate(day.dateKey);

                                    const baseClass = day.inCurrentMonth
                                        ? isAvailable
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100'
                                            : isBlockedDate
                                                ? 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                                                : bookedCount > 0 || hasOwnAppointment
                                                    ? 'bg-violet-50 text-violet-800 border-violet-100 hover:bg-violet-100'
                                                    : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'
                                        : 'bg-transparent text-slate-300 border-transparent';

                                    let statusText = 'Bloq';
                                    if (isDisabled) statusText = 'Passou';
                                    else if (isBlockedDate) statusText = 'Folga';
                                    else if (hasOwnAppointment) statusText = 'Agend';
                                    else if (isAvailable) statusText = 'Livre';
                                    else if (bookedCount > 0) statusText = 'Ocup';

                                    return (
                                        <button
                                            key={day.dateKey}
                                            type="button"
                                            disabled={isDisabled}
                                            onClick={() => handleSelectDate(day.dateKey)}
                                            className={`min-h-[112px] rounded-2xl border px-3 py-2 text-left transition-all ${baseClass} ${isSelected ? 'ring-2 ring-[#6fc9b6] ring-offset-1' : ''} ${isMarked ? 'outline outline-2 outline-emerald-300' : ''} ${isDisabled ? 'cursor-not-allowed opacity-55' : ''}`}
                                        >
                                            <div className="flex items-start justify-between gap-1">
                                                <span className={`text-sm font-bold font-secondary ${day.inCurrentMonth ? 'text-slate-800' : 'text-slate-300'}`}>
                                                    {parseDateKey(day.dateKey).getDate()}
                                                </span>
                                                {day.isToday && <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#3b9b8a]">Hoje</span>}
                                            </div>
                                            <div className="mt-4 flex items-center justify-between gap-2">
                                                <span className="text-[10px] leading-tight font-secondary uppercase tracking-wide text-inherit/80 truncate max-w-[58px]">
                                                    {statusText}
                                                </span>
                                                <span className="flex items-center gap-1 text-[10px] font-secondary text-inherit/80">
                                                    <span className="inline-flex h-2 w-2 rounded-full bg-current opacity-70" />
                                                    {bookedCount}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <aside className="flex flex-col gap-6">
                            {isPatient ? (
                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col gap-5">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div>
                                            <p className="text-sm text-[#3b9b8a] font-secondary flex items-center gap-2"><CalendarPlus size={16} /> Nova consulta</p>
                                            <h3 className="text-xl font-bold font-secondary text-slate-900 mt-1">Agendar nova consulta</h3>
                                            <p className="text-sm text-slate-500 font-main max-w-sm">Escolha data e horario. Opcionalmente repita em todas as semanas do mes.</p>
                                        </div>
                                        <button type="button" onClick={() => setIsBookingOpen((currentValue) => !currentValue)} className="rounded-full bg-[linear-gradient(135deg,#6fc9b6,#4abba1)] px-4 py-2 text-sm font-semibold font-secondary text-white shadow-md hover:opacity-90 transition-opacity">
                                            {isBookingOpen ? 'Fechar' : 'Agendar'}
                                        </button>
                                    </div>

                                    {isBookingOpen ? (
                                        <div className="flex flex-col gap-4">
                                            <div className="rounded-2xl bg-[#f8fbfa] border border-slate-200 p-4">
                                                <p className="text-xs uppercase tracking-wide text-slate-400 font-secondary">Dia selecionado</p>
                                                <p className="text-lg font-bold font-secondary text-slate-900">{formatLongDate(selectedDateKey)}</p>
                                                <p className="text-sm text-slate-500 font-main mt-1">
                                                    {selectedDayState.hasOwnAppointment
                                                        ? 'Voce ja possui consulta nesse dia. Use edicao para alterar horario.'
                                                        : selectedDayState.isBlocked
                                                            ? 'Este dia foi bloqueado pelo psicologo.'
                                                            : selectedDayState.isAvailable
                                                                ? `${availableSlots.length} horario(s) disponivel(is).`
                                                                : selectedDayState.bookedCount > 0
                                                                    ? 'Esse dia esta ocupado neste momento.'
                                                                    : 'Esse dia nao esta disponivel.'}
                                                </p>
                                                {!selectedDayState.isAvailable && nextAvailableDay && (
                                                    <button type="button" onClick={() => handleSelectDate(nextAvailableDay.dateKey)} className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-secondary text-[#3b9b8a] hover:bg-emerald-50 transition-colors">
                                                        Ir para o proximo dia livre
                                                    </button>
                                                )}
                                            </div>

                                            <div>
                                                <p className="text-sm font-semibold font-secondary text-slate-700 mb-2">Horarios disponiveis</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {availableSlots.length > 0 ? availableSlots.map((slot) => (
                                                        <button key={slot} type="button" onClick={() => setSelectedTime(slot)} className={`rounded-full border px-4 py-2 text-sm font-secondary transition-colors ${resolvedSelectedTime === slot ? 'border-[#6fc9b6] bg-[#E4FBF4] text-[#1f4d43]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                                                            {formatTimeLabel(slot)}
                                                        </button>
                                                    )) : <p className="text-sm text-slate-500 font-main">Sem horarios livres neste dia.</p>}
                                                </div>
                                            </div>

                                            <label className="flex items-center gap-2 text-sm font-main text-slate-600">
                                                <input type="checkbox" checked={repeatWeeklyInMonth} onChange={(event) => setRepeatWeeklyInMonth(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400" />
                                                Repetir em todas as {WEEKDAY_OPTIONS.find((weekday) => weekday.index === parseDateKey(selectedDateKey).getDay())?.short?.toLowerCase() || 'datas'} deste mes
                                            </label>

                                            <button type="button" onClick={handleBookAppointment} disabled={!selectedDayState.isAvailable || !resolvedSelectedTime} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#6fc9b6,#4abba1)] px-5 py-3 text-sm font-semibold font-secondary text-white shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
                                                <CheckCircle2 size={18} /> Confirmar agendamento
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 font-main">Clique em <span className="font-semibold text-slate-700">Agendar</span> para abrir a selecao de data e horario.</div>
                                    )}
                                </div>
                            ) : null}

                            {isPsychologist ? (
                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col gap-5">
                                    <div>
                                        <p className="text-sm text-[#3b9b8a] font-secondary flex items-center gap-2"><Stethoscope size={16} /> Configuracoes da agenda</p>
                                        <h3 className="text-xl font-bold font-secondary text-slate-900 mt-1">Dias e horarios de atendimento</h3>
                                        <p className="text-sm text-slate-500 font-main">Tambem e possivel desabilitar dias especificos de folga/feriado.</p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {WEEKDAY_OPTIONS.filter((weekday) => weekday.index !== 0).map((weekday) => {
                                            const isActive = settings.workingDays.includes(weekday.index);
                                            return (
                                                <button key={weekday.index} type="button" onClick={() => handleToggleWorkingDay(weekday.index)} className={`rounded-full border px-4 py-2 text-sm font-secondary transition-colors ${isActive ? 'border-[#6fc9b6] bg-[#E4FBF4] text-[#1f4d43]' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                                                    {weekday.short}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <label className="flex flex-col gap-2 text-sm font-secondary text-slate-600">
                                            Inicio
                                            <input type="time" value={settings.startTime} onChange={(event) => handleSettingChange('startTime', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                        </label>
                                        <label className="flex flex-col gap-2 text-sm font-secondary text-slate-600">
                                            Fim
                                            <input type="time" value={settings.endTime} onChange={(event) => handleSettingChange('endTime', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                                        </label>
                                        <label className="flex flex-col gap-2 text-sm font-secondary text-slate-600">
                                            Duracao
                                            <select value={settings.slotDuration} onChange={(event) => handleSettingChange('slotDuration', Number(event.target.value))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300">
                                                <option value="30">30 min</option>
                                                <option value="45">45 min</option>
                                                <option value="60">60 min</option>
                                            </select>
                                        </label>
                                    </div>

                                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-col gap-3">
                                        <p className="text-sm font-semibold font-secondary text-slate-700">Folga / feriado</p>
                                        <p className="text-xs text-slate-500 font-main">Dias selecionados: {selectedActionDateKeys.length}</p>
                                        <textarea value={disableDaysMessage} onChange={(event) => setDisableDaysMessage(event.target.value)} rows={3} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300" placeholder="Justifique porque estes dias serao desabilitados." />
                                        <div className="flex gap-2 flex-wrap">
                                            <button type="button" onClick={handleDisableSelectedDays} disabled={!disableDaysMessage.trim() || selectedActionDateKeys.length === 0} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ef6c57,#d84f40)] px-4 py-2.5 text-sm font-semibold font-secondary text-white shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
                                                <X size={16} /> Desabilitar dias selecionados
                                            </button>
                                            <button type="button" onClick={handleEnableSelectedDays} disabled={selectedActionDateKeys.length === 0} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold font-secondary text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                                                Reabilitar dias selecionados
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div>
                                        <p className="text-sm text-[#3b9b8a] font-secondary flex items-center gap-2"><UserRound size={16} /> Consultas do(s) dia(s)</p>
                                        <h3 className="text-xl font-bold font-secondary text-slate-900 mt-1">{isMultiSelectMode ? `${selectedActionDateKeys.length} dia(s) selecionado(s)` : formatLongDate(selectedDateKey)}</h3>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{actionScheduledAppointments.length} consulta(s) ativa(s)</span>
                                </div>

                                <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto pr-1">
                                    {selectedDayAppointments.length === 0 ? (
                                        <p className="text-sm text-slate-500 font-main">Nenhuma consulta nesse dia.</p>
                                    ) : selectedDayAppointments.map((appointment) => (
                                        <button key={appointment.id} type="button" onClick={() => handleSelectSession(appointment.id)} className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${selectedSession?.id === appointment.id ? 'border-[#6fc9b6] bg-[#F1FBF7]' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    {isPsychologist ? <p className="font-semibold font-secondary text-slate-800">{appointment.patientName}</p> : null}
                                                    <p className="text-xs text-slate-500 font-main">{formatTimeLabel(appointment.time)} · {getSessionStatusLabel(appointment.status)}</p>
                                                </div>
                                                <Clock3 size={16} className="text-slate-400 shrink-0" />
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="rounded-2xl bg-[#f8fbfa] border border-slate-200 p-4 flex flex-col gap-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-400 font-secondary">Acoes</p>
                                            <h4 className="text-lg font-bold font-secondary text-slate-900">Editar horario e cancelar</h4>
                                            <p className="text-xs text-slate-500 font-main">Sem selecionar sessao, a acao considera apenas os dias selecionados no calendario.</p>
                                        </div>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"><MessageSquareText size={13} /> Justificativa obrigatoria</span>
                                    </div>

                                    <label className="flex flex-col gap-2 text-sm font-secondary text-slate-600">
                                        Novo horario para as consultas selecionadas
                                        <select value={resolvedRescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300">
                                            {rescheduleOptions.length === 0 ? (
                                                <option value="">Sem horarios disponiveis</option>
                                            ) : (
                                                rescheduleOptions.map((slot) => (
                                                    <option key={slot} value={slot}>{formatTimeLabel(slot)}</option>
                                                ))
                                            )}
                                        </select>
                                    </label>

                                    <label className="flex flex-col gap-2 text-sm font-secondary text-slate-600">
                                        Justificativa da mudanca de horario
                                        <textarea value={rescheduleMessage} onChange={(event) => setRescheduleMessage(event.target.value)} rows={3} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300" placeholder="Explique o motivo da alteracao." />
                                    </label>

                                    <button type="button" onClick={handleBulkReschedule} disabled={!rescheduleMessage.trim() || !resolvedRescheduleTime || actionScheduledAppointments.length === 0} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#4b9fd4,#2f7ab7)] px-5 py-3 text-sm font-semibold font-secondary text-white shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
                                        <Clock3 size={18} /> Editar horario com justificativa
                                    </button>

                                    <label className="flex flex-col gap-2 text-sm font-secondary text-slate-600">
                                        Justificativa do cancelamento
                                        <textarea value={cancellationMessage} onChange={(event) => setCancellationMessage(event.target.value)} rows={3} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300" placeholder="Explique o motivo do cancelamento." />
                                    </label>

                                    <button type="button" onClick={handleBulkCancel} disabled={!cancellationMessage.trim() || actionScheduledAppointments.length === 0} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ef6c57,#d84f40)] px-5 py-3 text-sm font-semibold font-secondary text-white shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
                                        <X size={18} /> Cancelar com justificativa
                                    </button>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </>
    );
}