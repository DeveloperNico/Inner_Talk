import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, NotebookText, LogIn, Sparkles, Stethoscope } from 'lucide-react';

import { Header } from '../../components/Header/Header';
import { PageTitle } from '../../components/PageTitle/PageTitle';
import { getMoodOption } from '../../data/moods';
import { getOwnWeeklySummary, getStoredUser } from '../../data/storage';

function formatExcerptDate(isoDate) {
    return new Date(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatWeekday(isoDate) {
    return new Date(isoDate).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

export function ResumoPage() {
    const [user] = useState(() => getStoredUser());
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        let isCancelled = false;

        const loadSummary = async () => {
            if (!user || user.role !== 'paciente') {
                setIsLoading(false);
                return;
            }

            try {
                const payload = await getOwnWeeklySummary();
                if (!isCancelled) {
                    setSummary(payload);
                    setErrorMessage('');
                }
            } catch (error) {
                if (!isCancelled) {
                    setErrorMessage(error.message || 'Não foi possível carregar o resumo da semana.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        loadSummary();

        return () => {
            isCancelled = true;
        };
    }, [user]);

    if (!user) {
        return (
            <>
                <PageTitle />
                <Header />
                <main className="pt-32 min-h-screen flex flex-col items-center gap-4 bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] text-center px-6">
                    <p className="text-slate-600 font-secondary max-w-md">
                        Entre na sua conta para ver o resumo da semana.
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

    if (user.role === 'psicologo') {
        return (
            <>
                <PageTitle />
                <Header />
                <main className="pt-32 min-h-screen flex flex-col items-center gap-4 bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] text-center px-6">
                    <p className="text-slate-600 font-secondary max-w-md">
                        Agora você acompanha o resumo de cada paciente diretamente pelo Painel.
                    </p>
                    <Link
                        to="/painel"
                        className="inline-flex items-center gap-2 rounded-full bg-[#6fc9b6] px-6 py-3 text-white font-medium shadow-md hover:opacity-90 transition-colors"
                    >
                        <Stethoscope size={18} />
                        Ir para o Painel
                    </Link>
                </main>
            </>
        );
    }

    const weekSeries = summary?.weekSeries || [];
    const diaryExcerpts = summary?.diaryExcerpts || [];
    const averageMoodOption = typeof summary?.moodAverage === 'number'
        ? getMoodOption(Math.round(summary.moodAverage))
        : null;
    const summarySource = summary?.aiSummaryMeta?.source || 'unknown';
    const summaryModel = summary?.aiSummaryMeta?.model || '-';
    const fallbackReason = summary?.aiSummaryMeta?.fallbackReason || '';
    const isAiSummary = summarySource === 'ai';

    return (
        <>
            <PageTitle />
            <Header />

            <main className="pt-28 pb-16 min-h-screen bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] px-6 md:px-24">
                <div className="max-w-3xl mx-auto flex flex-col gap-8">
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6fc9b6,#8f7ab3)] text-white shadow-md">
                            <LayoutDashboard size={26} />
                        </div>
                        <h1 className="text-3xl font-bold font-secondary text-slate-900">
                            Seu resumo da semana
                        </h1>
                        <p className="text-slate-500 font-main max-w-md">
                            Um panorama de como você tem estado nos últimos 7 dias.
                        </p>
                    </div>

                    {errorMessage && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 font-main">
                            {errorMessage}
                        </div>
                    )}

                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col gap-6">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <h2 className="text-lg font-bold font-secondary text-slate-900">
                                Humor da semana
                            </h2>
                            {averageMoodOption && (
                                <span
                                    className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium font-secondary"
                                    style={{ backgroundColor: averageMoodOption.bg, color: averageMoodOption.color }}
                                >
                                    Média: {averageMoodOption.label}
                                </span>
                            )}
                        </div>

                        {isLoading ? (
                            <p className="text-sm text-slate-500 font-main">Carregando resumo...</p>
                        ) : weekSeries.length === 0 ? (
                            <p className="text-sm text-slate-500 font-main">
                                Ainda não há check-ins registrados nesta semana.
                            </p>
                        ) : null}

                        <div className="flex items-end justify-between gap-2 h-36">
                            {weekSeries.map((day) => {
                                const moodOption = day.mood ? getMoodOption(day.mood) : null;
                                const heightPercent = day.mood ? (day.mood / 5) * 100 : 8;

                                return (
                                    <div key={day.date} className="flex flex-col items-center gap-2 flex-1">
                                        <div className="w-full h-28 flex items-end">
                                            <div
                                                className="w-full rounded-t-lg transition-all"
                                                style={{
                                                    height: `${heightPercent}%`,
                                                    backgroundColor: moodOption ? moodOption.color : '#e2e8f0',
                                                }}
                                                title={moodOption ? moodOption.label : 'Sem registro'}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400 font-main capitalize">
                                            {formatWeekday(day.date)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div> 

                    <div className="flex flex-col gap-3">
                        <h2 className="text-lg font-bold font-secondary text-slate-900 flex items-center gap-2">
                            <NotebookText size={20} className="text-[#8f7ab3]" />
                            Trechos do diário
                        </h2>

                        {!isLoading && diaryExcerpts.length === 0 && (
                            <p className="text-sm text-slate-500 font-main">
                                Nenhuma entrada de diário nesta semana.
                            </p>
                        )}

                        <div className="flex flex-col gap-3">
                            {diaryExcerpts.map((excerpt) => (
                                <div
                                    key={excerpt.id}
                                    className="bg-white rounded-2xl border border-slate-200 px-5 py-4"
                                >
                                    <p className="text-xs text-slate-400 font-main mb-1">
                                        {formatExcerptDate(excerpt.date)}
                                    </p>
                                    <p className="text-sm text-slate-600 font-main whitespace-pre-wrap">
                                        {excerpt.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}