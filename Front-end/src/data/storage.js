const AUTH_STORAGE_KEY = 'innertalk.auth';
const CHECKINS_STORAGE_KEY = 'innertalk.checkins';
const DIARIO_STORAGE_KEY = 'innertalk.diario';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Lê a sessão local salva pelo LoginPage (mesma chave usada lá).
 * Retorna { user: { role, email/crp, name } } ou null.
 */
export function getStoredSession() {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function getStoredUser() {
    return getStoredSession()?.user || null;
}

function readList(key) {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
}

function isSameDay(isoDateA, isoDateB) {
    return new Date(isoDateA).toDateString() === new Date(isoDateB).toDateString();
}

function isWithinLastDays(isoDate, days) {
    const now = Date.now();
    const then = new Date(isoDate).getTime();
    return now - then <= days * DAY_IN_MS;
}

/* ---------------------- Check-ins ---------------------- */

export function getCheckIns() {
    return readList(CHECKINS_STORAGE_KEY).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );
}

export function getTodayCheckIn() {
    const today = new Date().toISOString();
    return getCheckIns().find((entry) => isSameDay(entry.date, today)) || null;
}

/**
 * Salva um check-in. Se já existe um check-in hoje, substitui (permite
 * que a pessoa atualize como está se sentindo ao longo do dia).
 */
export function saveCheckIn({ mood, note }) {
    const existing = readList(CHECKINS_STORAGE_KEY);
    const today = new Date().toISOString();
    const withoutToday = existing.filter((entry) => !isSameDay(entry.date, today));

    const newEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        mood,
        note: note?.trim() || '',
        date: today,
    };

    writeList(CHECKINS_STORAGE_KEY, [...withoutToday, newEntry]);
    return newEntry;
}

export function getWeekCheckIns() {
    return getCheckIns().filter((entry) => isWithinLastDays(entry.date, 7));
}

/* ---------------------- Diário ---------------------- */

export function getDiarioEntries() {
    return readList(DIARIO_STORAGE_KEY).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );
}

export function addDiarioEntry({ title, content }) {
    const existing = readList(DIARIO_STORAGE_KEY);
    const newEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        title: title?.trim() || '',
        content: content.trim(),
        date: new Date().toISOString(),
    };

    writeList(DIARIO_STORAGE_KEY, [newEntry, ...existing]);
    return newEntry;
}

export function deleteDiarioEntry(id) {
    const existing = readList(DIARIO_STORAGE_KEY);
    writeList(DIARIO_STORAGE_KEY, existing.filter((entry) => entry.id !== id));
}

export function getWeekDiarioEntries() {
    return getDiarioEntries().filter((entry) => isWithinLastDays(entry.date, 7));
}
