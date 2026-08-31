import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SmileIcon, CheckCircle2, LogIn } from 'lucide-react';

import { Header } from '../../components/Header/Header';
import { PageTitle } from '../../components/PageTitle/PageTitle';
import { MOOD_OPTIONS, getMoodOption } from '../../data/moods';
import {
    getStoredUser,
    getTodayCheckIn,
    getWeekCheckIns,
    saveCheckIn,
} from '../../data/storage';

function formatDayLabel(isoDate) {
    const date = new Date(isoDate);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) return 'Hoje';

    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export function CheckInPage() {
    const [user] = useState(() => getStoredUser());
    const [selectedMood, setSelectedMood] = useState(null);
    const [note, setNote] = useState('');
    const [history, setHistory] = useState([]);
    const [justSaved, setJustSaved] = useState(false);

    useEffect(() => {
        const todayEntry = getTodayCheckIn();
        if (todayEntry) {
            setSelectedMood(todayEntry.mood);
            setNote(todayEntry.note || '');
        }
        setHistory(getWeekCheckIns());
    }, []);

    const handleSave = () => {
        if (!selectedMood) return;

        saveCheckIn({ mood: selectedMood, note });
        setHistory(getWeekCheckIns());
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2500);
    };

    if (!user || user.role !== 'paciente') {
        return (
            <>
                <PageTitle />
                <Header />
                <main className="pt-32 min-h-screen flex flex-col items-center gap-4 bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] text-center px-6">
                    <p className="text-slate-600 font-secondary max-w-md">
                        Essa página é exclusiva para pacientes. Entre com uma conta de paciente para fazer seu check-in.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 rounded-full bg-[#6fc9b6] px-6 py-3 text-white font-medium shadow-md hover:opacity-90 transition-colors"
                    >
                        <LogIn size={18} />
                        Ir para o login
                    </Link>
                </main>
            </>
        );
    }

    return (
        <>
            <PageTitle />
            <Header />

            <main className="pt-28 pb-16 min-h-screen bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] px-6 md:px-24">
                <div className="max-w-3xl mx-auto flex flex-col gap-8">
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6fc9b6,#4abba1)] text-white shadow-md">
                            <SmileIcon size={26} />
                        </div>
                        <h1 className="text-3xl font-bold font-secondary text-slate-900">
                            Como você está se sentindo hoje?
                        </h1>
                        <p className="text-slate-500 font-main max-w-md">
                            Leva só alguns segundos. Isso ajuda a acompanhar como sua semana está sendo.
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col gap-6">
                        <div className="grid grid-cols-5 gap-3">
                            {MOOD_OPTIONS.map((mood) => {
                                const Icon = mood.icon;
                                const isSelected = selectedMood === mood.value;

                                return (
                                    <button
                                        key={mood.value}
                                        type="button"
                                        onClick={() => setSelectedMood(mood.value)}
                                        className={`flex flex-col items-center gap-2 rounded-2xl py-4 px-2 border transition-all cursor-pointer ${
                                            isSelected
                                                ? 'border-transparent shadow-md scale-105'
                                                : 'border-slate-200 hover:bg-slate-50'
                                        }`}
                                        style={isSelected ? { backgroundColor: mood.bg } : undefined}
                                    >
                                        <Icon size={28} style={{ color: mood.color }} />
                                        <span className="text-xs font-medium font-secondary text-slate-700 text-center">
                                            {mood.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <label className="flex flex-col gap-2">
                            <span className="text-sm font-medium font-secondary text-slate-700">
                                O que está influenciando esse sentimento? (opcional)
                            </span>
                            <textarea
                                value={note}
                                onChange={(event) => setNote(event.target.value)}
                                placeholder="Escreva livremente sobre o seu dia..."
                                rows={3}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-main text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                            />
                        </label>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={!selectedMood}
                                className="inline-flex items-center gap-2 rounded-full bg-[#6fc9b6] px-6 py-3 text-white font-medium shadow-md hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <CheckCircle2 size={18} />
                                Salvar check-in
                            </button>

                            {justSaved && (
                                <span className="text-sm text-emerald-600 font-secondary">
                                    Check-in salvo! 💚
                                </span>
                            )}
                        </div>
                    </div>

                    {history.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <h2 className="text-lg font-bold font-secondary text-slate-900">
                                Histórico da semana
                            </h2>
                            <div className="flex flex-col gap-2">
                                {history.map((entry) => {
                                    const mood = getMoodOption(entry.mood);
                                    const Icon = mood.icon;

                                    return (
                                        <div
                                            key={entry.id}
                                            className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 px-4 py-3"
                                        >
                                            <div
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                                                style={{ backgroundColor: mood.bg }}
                                            >
                                                <Icon size={18} style={{ color: mood.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium font-secondary text-slate-800">
                                                    {mood.label} · {formatDayLabel(entry.date)}
                                                </p>
                                                {entry.note && (
                                                    <p className="text-sm text-slate-500 font-main truncate">
                                                        {entry.note}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
