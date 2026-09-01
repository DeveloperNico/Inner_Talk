const AUTH_STORAGE_KEY = 'innertalk.auth';
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');
const DAILY_DIARY_SUGGESTION_CACHE_KEY = 'innertalk.diarySuggestion';

export function getStoredSession() {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function persistSession(session) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getStoredUser() {
    return getStoredSession()?.user || null;
}

function getAccessToken() {
    return getStoredSession()?.access || '';
}

function isSameDay(isoDateA, isoDateB) {
    return new Date(isoDateA).toDateString() === new Date(isoDateB).toDateString();
}

function isWithinLastDays(isoDate, days) {
    const now = Date.now();
    const then = new Date(isoDate).getTime();
    return now - then <= days * DAY_IN_MS;
}

function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}

function getApiError(payload, fallbackMessage) {
    if (payload?.error) {
        if (Array.isArray(payload.details) && payload.details.length > 0) {
            return `${payload.error} ${payload.details.join(' ')}`;
        }

        return payload.error;
    }

    return fallbackMessage;
}

async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getAccessToken();

    if (!headers.has('Content-Type') && options.body !== undefined) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
    });

    let payload = null;
    const rawBody = await response.text();
    if (rawBody) {
        try {
            payload = JSON.parse(rawBody);
        } catch {
            payload = null;
        }
    }

    if (!response.ok) {
        throw new Error(getApiError(payload, 'Não foi possível concluir a operação.'));
    }

    return payload;
}

export async function getCheckIns() {
    const payload = await request('/check-ins/');
    return Array.isArray(payload?.items) ? payload.items : [];
}

export async function getTodayCheckIn() {
    const today = new Date().toISOString();
    const entries = await getCheckIns();
    return entries.find((entry) => isSameDay(entry.date, today)) || null;
}

export async function saveCheckIn({ mood, emotions, factors, note }) {
    const payload = await request('/check-ins/', {
        method: 'POST',
        body: JSON.stringify({ mood, emotions, factors, note }),
    });
    return payload?.item || null;
}

export async function getWeekCheckIns() {
    const entries = await getCheckIns();
    return entries.filter((entry) => isWithinLastDays(entry.date, 7));
}

export async function getDiarioEntries() {
    const payload = await request('/diary/');
    return Array.isArray(payload?.items) ? payload.items : [];
}

export async function addDiarioEntry({ title, sentimento, content }) {
    const payload = await request('/diary/', {
        method: 'POST',
        body: JSON.stringify({ title, sentimento, content }),
    });
    return payload?.item || null;
}

export async function updateDiarioEntry(id, { title, sentimento, content }) {
    const payload = await request(`/diary/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ title, sentimento, content }),
    });
    return payload?.item || null;
}

export async function deleteDiarioEntry(id) {
    await request(`/diary/${id}/`, {
        method: 'DELETE',
    });
}

export async function getWeekDiarioEntries() {
    const entries = await getDiarioEntries();
    return entries.filter((entry) => isWithinLastDays(entry.date, 7));
}

export async function getDailyDiarySuggestion() {
    const todayKey = getTodayKey();

    try {
        const cachedRaw = localStorage.getItem(DAILY_DIARY_SUGGESTION_CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (cached?.date === todayKey && cached?.suggestion) {
                return cached;
            }
        }
    } catch {
        // Ignore invalid cache payloads.
    }

    const payload = await request('/diary/suggestion/');
    const result = {
        date: todayKey,
        suggestion: payload?.suggestion || '',
        source: payload?.source || 'fallback',
        model: payload?.model || null,
        fallbackReason: payload?.fallbackReason || null,
    };

    localStorage.setItem(DAILY_DIARY_SUGGESTION_CACHE_KEY, JSON.stringify(result));
    return result;
}

export async function getOwnWeeklySummary() {
    return request('/summary/week/');
}

export async function getPsychologistPatients() {
    const payload = await request('/psychologist/patients/');
    return Array.isArray(payload?.items) ? payload.items : [];
}

export async function getPsychologistPatient(patientId) {
    return request(`/psychologist/patients/${patientId}/`);
}
export async function getCalendarOverview() {
    return request('/calendar/');
}

export async function updateCalendarSettings({ workingDays, startTime, endTime, slotDuration }) {
    const payload = await request('/calendar/settings/', {
        method: 'PATCH',
        body: JSON.stringify({ workingDays, startTime, endTime, slotDuration }),
    });
    return payload?.settings || null;
}

export async function updateCalendarBlockedDays({ dateKeys, disable, message }) {
    const payload = await request('/calendar/blocked-days/', {
        method: 'POST',
        body: JSON.stringify({ dateKeys, disable, message }),
    });
    return payload || null;
}

export async function bookCalendarAppointment({ dateKey, time }) {
    const payload = await request('/calendar/appointments/', {
        method: 'POST',
        body: JSON.stringify({ dateKey, time }),
    });
    return payload?.item || null;
}

export async function cancelCalendarAppointment(appointmentId, { message }) {
    const payload = await request(`/calendar/appointments/${appointmentId}/cancel/`, {
        method: 'POST',
        body: JSON.stringify({ message }),
    });
    return payload?.item || null;
}
export async function rescheduleCalendarAppointment(appointmentId, { dateKey, time, message }) {
    const payload = await request(`/calendar/appointments/${appointmentId}/reschedule/`, {
        method: 'POST',
        body: JSON.stringify({ dateKey, time, message }),
    });
    return payload?.item || null;
}

export async function getPsychologists() {
    const payload = await request('/psychologists/');
    return Array.isArray(payload?.items) ? payload.items : [];
}

export async function getPatientPsychologist() {
    const payload = await request('/patient/psychologist/');
    return payload?.psychologist || null;
}

export async function updatePatientPsychologist(psychologistId) {
    const payload = await request('/patient/psychologist/', {
        method: 'PATCH',
        body: JSON.stringify({ psychologistId }),
    });
    return payload?.psychologist || null;
}