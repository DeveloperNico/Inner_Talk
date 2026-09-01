import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SmileIcon, CheckCircle2, LogIn, ArrowRight, ArrowLeft } from 'lucide-react';

import { Header } from '../../components/Header/Header';
import { PageTitle } from '../../components/PageTitle/PageTitle';
import { MOOD_OPTIONS, getMoodOption } from '../../data/moods';
import {
    getStoredUser,
    getTodayCheckIn,
    getWeekCheckIns,
    saveCheckIn,
} from '../../data/storage';

const EMOTION_OPTIONS = [
    'Calmo', 'Contente', 'Relaxado(a)', 'Indiferente', 'Aliviado', 'Satisfeito', 'Tranquilo', 'Alegre',
    'Esperançoso', 'Maravilhado', 'Feliz', 'Apaixonado', 'Entusiasmado', 'Animado', 'Corajoso', 'Orgulhoso',
    'Curioso', 'Grato', 'Triste', 'Com raiva', 'Irritado', 'Ansioso', 'Assustado', 'Com nojo', 'Ciumento',
    'Culpado', 'Envergonhado', 'Decepcionado', 'Estressado', 'Desesperançoso', 'Solitário', 'Cansado', 'Deprimido',
];

const FACTOR_OPTIONS = [
    'Saúde', 'Sono', 'Exercício', 'Alimentos', 'Hobby', 'Dinheiro', 'Identidade', 'Parceiro', 'Amigos',
    'Animal de estimação', 'Família', 'Colegas de trabalho', 'Namoro', 'Trabalho', 'Casa', 'Escola',
    'Ao ar livre', 'Viagem', 'Clima',
];

function formatDayLabel(isoDate) {
    const date = new Date(isoDate);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) return 'Hoje';

    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function toggleValue(values, item) {
    if (values.includes(item)) {
        return values.filter((value) => value !== item);
    }
    return [...values, item];
}

function OptionPills({ options, selectedValues, onToggle }) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((option) => {
                const isSelected = selectedValues.includes(option);
                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => onToggle(option)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            isSelected
                                ? 'bg-[#d7f6ed] border-[#7bcfbe] text-[#1f4d43]'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {option}
                    </button>
                );
            })}
        </div>
    );
}

export function CheckInPage() {
    const [user] = useState(() => getStoredUser());
    const [selectedMood, setSelectedMood] = useState(null);
    const [selectedEmotions, setSelectedEmotions] = useState([]);
    const [selectedFactors, setSelectedFactors] = useState([]);
    const [note, setNote] = useState('');
    const [history, setHistory] = useState([]);
    const [justSaved, setJustSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [step, setStep] = useState(1);

    useEffect(() => {
        let isCancelled = false;

        const loadData = async () => {
            if (!user || user.role !== 'paciente') {
                setIsLoading(false);
                return;
            }

            try {
                const [todayEntry, weekHistory] = await Promise.all([
                    getTodayCheckIn(),
                    getWeekCheckIns(),
                ]);

                if (isCancelled) return;

                if (todayEntry) {
                    setSelectedMood(todayEntry.mood);
                    setSelectedEmotions(todayEntry.emotions || []);
                    setSelectedFactors(todayEntry.factors || []);
                    setNote(todayEntry.note || '');
                }
                setHistory(weekHistory);
                setErrorMessage('');
            } catch (error) {
                if (!isCancelled) {
                    setErrorMessage(error.message || 'Não foi possível carregar seus check-ins.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isCancelled = true;
        };
    }, [user]);

    const goToStepTwo = () => {
        if (!selectedMood) {
            setErrorMessage('Escolha seu sentimento para continuar.');
            return;
        }
        setErrorMessage('');
        setStep(2);
    };

    const goToStepThree = () => {
        if (selectedEmotions.length === 0) {
            setErrorMessage('Selecione pelo menos uma emoção.');
            return;
        }

        if (selectedFactors.length === 0) {
            setErrorMessage('Selecione pelo menos um fator que influencia seu sentimento.');
            return;
        }

        setErrorMessage('');
        setStep(3);
    };

    const handleSave = async () => {
        if (!selectedMood) return;

        if (selectedEmotions.length === 0) {
            setErrorMessage('Selecione pelo menos uma emoção.');
            setStep(2);
            return;
        }

        if (selectedFactors.length === 0) {
            setErrorMessage('Selecione pelo menos um fator que influencia seu sentimento.');
            setStep(2);
            return;
        }

        setIsSaving(true);
        setErrorMessage('');

        try {
            await saveCheckIn({
                mood: selectedMood,
                emotions: selectedEmotions,
                factors: selectedFactors,
                note,
            });
            setHistory(await getWeekCheckIns());
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 2500);
        } catch (error) {
            setErrorMessage(error.message || 'Não foi possível salvar o check-in.');
        } finally {
            setIsSaving(false);
        }
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

            <main className="pt-28 pb-16 min-h-screen bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] px-6 md:px-10 xl:px-16">
                <div className="max-w-[1300px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 xl:gap-8 items-start">
                    <section className="flex flex-col gap-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6fc9b6,#4abba1)] text-white shadow-md">
                                <SmileIcon size={26} />
                            </div>
                            <h1 className="text-3xl font-bold font-secondary text-slate-900">
                                Check-in do dia
                            </h1>
                            <p className="text-slate-500 font-main max-w-md">
                                Responda em 3 etapas curtas para organizar melhor como você está hoje.
                            </p>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col gap-6">
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3].map((item) => (
                                    <div key={item} className={`h-2 rounded-full ${step >= item ? 'bg-[#6fc9b6]' : 'bg-slate-200'}`} />
                                ))}
                            </div>

                            {step === 1 && (
                                <>
                                    <h2 className="text-lg font-semibold font-secondary text-slate-900">
                                        1. Qual sentimento está mais presente agora?
                                    </h2>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
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
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={goToStepTwo}
                                            className="inline-flex items-center gap-2 rounded-full bg-[#6fc9b6] px-5 py-2.5 text-white font-medium shadow-md hover:opacity-90 transition-colors"
                                        >
                                            Próximo
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <h2 className="text-lg font-semibold font-secondary text-slate-900">
                                        2. Emoções e causas
                                    </h2>
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm font-medium font-secondary text-slate-700">
                                            Quais emoções descrevem melhor o que você está sentindo?
                                        </p>
                                        <OptionPills
                                            options={EMOTION_OPTIONS}
                                            selectedValues={selectedEmotions}
                                            onToggle={(option) => setSelectedEmotions((prev) => toggleValue(prev, option))}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm font-medium font-secondary text-slate-700">
                                            O que está fazendo você se sentir assim?
                                        </p>
                                        <OptionPills
                                            options={FACTOR_OPTIONS}
                                            selectedValues={selectedFactors}
                                            onToggle={(option) => setSelectedFactors((prev) => toggleValue(prev, option))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-slate-700 font-medium hover:bg-slate-50"
                                        >
                                            <ArrowLeft size={16} />
                                            Voltar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={goToStepThree}
                                            className="inline-flex items-center gap-2 rounded-full bg-[#6fc9b6] px-5 py-2.5 text-white font-medium shadow-md hover:opacity-90 transition-colors"
                                        >
                                            Próximo
                                            <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </>
                            )}

                            {step === 3 && (
                                <>
                                    <h2 className="text-lg font-semibold font-secondary text-slate-900">
                                        3. Escreva livremente e salve
                                    </h2>
                                    <label className="flex flex-col gap-2">
                                        <span className="text-sm font-medium font-secondary text-slate-700">
                                            Escreva livremente (opcional)
                                        </span>
                                        <textarea
                                            value={note}
                                            onChange={(event) => setNote(event.target.value)}
                                            placeholder="Se quiser, conte com suas palavras o que aconteceu hoje..."
                                            rows={5}
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-main text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                                        />
                                    </label>

                                    <div className="flex items-center justify-between gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-slate-700 font-medium hover:bg-slate-50"
                                        >
                                            <ArrowLeft size={16} />
                                            Voltar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={isLoading || isSaving}
                                            className="inline-flex items-center gap-2 rounded-full bg-[#6fc9b6] px-6 py-3 text-white font-medium shadow-md hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                            <CheckCircle2 size={18} />
                                            {isSaving ? 'Salvando...' : 'Salvar check-in'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {errorMessage && <p className="text-sm text-red-500 font-main">{errorMessage}</p>}
                            {justSaved && <p className="text-sm text-emerald-600 font-secondary">Check-in salvo!</p>}
                        </div>
                    </section>

                    <aside className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6 lg:sticky lg:top-28">
                        <h2 className="text-lg font-bold font-secondary text-slate-900 mb-3">Histórico da semana</h2>

                        {isLoading ? (
                            <p className="text-sm text-slate-500 font-main">Carregando histórico...</p>
                        ) : history.length === 0 ? (
                            <p className="text-sm text-slate-500 font-main">Você ainda não registrou check-ins nesta semana.</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {history.map((entry) => {
                                    const mood = getMoodOption(entry.mood);
                                    const Icon = mood.icon;

                                    return (
                                        <div key={entry.id} className="flex gap-3 bg-slate-50 rounded-2xl border border-slate-200 px-3 py-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: mood.bg }}>
                                                <Icon size={16} style={{ color: mood.color }} />
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                                                <p className="text-sm font-medium font-secondary text-slate-800">{mood.label} · {formatDayLabel(entry.date)}</p>
                                                {!!entry.emotions?.length && <p className="text-xs text-slate-500 font-main truncate">Emoções: {entry.emotions.join(', ')}</p>}
                                                {!!entry.factors?.length && <p className="text-xs text-slate-500 font-main truncate">Fatores: {entry.factors.join(', ')}</p>}
                                                {entry.note && <p className="text-xs text-slate-500 font-main truncate">{entry.note}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </aside>
                </div>
            </main>
        </>
    );
}