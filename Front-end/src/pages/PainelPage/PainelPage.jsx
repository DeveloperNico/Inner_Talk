import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    Stethoscope,
    TriangleAlert,
    CalendarClock,
    ChevronRight,
    LogIn,
    Search,
    Users,
    Sparkles,
    TrendingUp,
    TrendingDown,
    Minus,
    Sunrise,
    CloudDrizzle,
    Moon,
    Heart,
} from 'lucide-react';

import { Header } from '../../components/Header/Header';
import { PageTitle } from '../../components/PageTitle/PageTitle';
import { getMoodOption } from '../../data/moods';
import { getPsychologistPatient, getPsychologistPatients, getStoredUser } from '../../data/storage';

function getInitials(name) {
    return name
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
}

function formatSessionLabel(isoDate) {
    if (!isoDate) return 'Sessão não agendada';

    const date = new Date(isoDate);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const hourLabel = `${date.getHours()}h${date.getMinutes() > 0 ? String(date.getMinutes()).padStart(2, '0') : ''}`;

    if (date.toDateString() === now.toDateString()) return `Hoje, ${hourLabel}`;
    if (date.toDateString() === tomorrow.toDateString()) return `Amanhã, ${hourLabel}`;

    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${hourLabel}`;
}

const TREND_ICONS = {
    up: { icon: TrendingUp, color: '#3b9b8a' },
    down: { icon: TrendingDown, color: '#e0654f' },
    stable: { icon: Minus, color: '#94a3b8' },
};

export function PainelPage() {
    const { pacienteId } = useParams();
    const navigate = useNavigate();
    const [user] = useState(() => getStoredUser());
    const [search, setSearch] = useState('');
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isLoadingPatients, setIsLoadingPatients] = useState(true);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        let isCancelled = false;

        const loadPatients = async () => {
            if (!user || user.role !== 'psicologo') {
                setIsLoadingPatients(false);
                return;
            }

            try {
                const items = await getPsychologistPatients();
                if (isCancelled) return;

                setPatients(items);
                setErrorMessage('');
                if (!pacienteId && items.length > 0) {
                    navigate(`/painel/${items[0].id}`, { replace: true });
                }
            } catch (error) {
                if (!isCancelled) {
                    setErrorMessage(error.message || 'Não foi possível carregar os pacientes.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingPatients(false);
                }
            }
        };

        loadPatients();

        return () => {
            isCancelled = true;
        };
    }, [user, pacienteId, navigate]);

    useEffect(() => {
        let isCancelled = false;

        const loadPatientDetail = async () => {
            if (!user || user.role !== 'psicologo' || !pacienteId) {
                setSelectedPatient(null);
                return;
            }

            setIsLoadingDetail(true);
            try {
                const payload = await getPsychologistPatient(pacienteId);
                if (!isCancelled) {
                    setSelectedPatient(payload);
                    setErrorMessage('');
                }
            } catch (error) {
                if (!isCancelled) {
                    setSelectedPatient(null);
                    setErrorMessage(error.message || 'Não foi possível carregar o resumo do paciente.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingDetail(false);
                }
            }
        };

        loadPatientDetail();

        return () => {
            isCancelled = true;
        };
    }, [user, pacienteId]);

    const filteredPatients = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return patients;
        return patients.filter((patient) => patient.name.toLowerCase().includes(term));
    }, [patients, search]);

    const sessionsToday = patients.filter(
        (patient) => patient.nextSession && new Date(patient.nextSession).toDateString() === new Date().toDateString()
    ).length;
    const attentionCount = patients.filter((patient) => patient.alertsCount > 0).length;

    if (!user || user.role !== 'psicologo') {
        return (
            <>
                <PageTitle />
                <Header />
                <main className="pt-32 min-h-screen flex flex-col items-center gap-4 bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] text-center px-6">
                    <p className="text-slate-600 font-secondary max-w-md">
                        Essa página é exclusiva para psicólogos. Entre com uma conta de psicólogo para ver seus pacientes.
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

    const averageMoodOption = selectedPatient?.moodAverage
        ? getMoodOption(Math.round(selectedPatient.moodAverage))
        : null;
    const TrendIcon = selectedPatient ? TREND_ICONS[selectedPatient.moodTrend]?.icon || Minus : null;
    const trendColor = selectedPatient ? TREND_ICONS[selectedPatient.moodTrend]?.color || '#94a3b8' : null;
    const summarySource = selectedPatient?.aiSummaryMeta?.source || 'unknown';
    const summaryModel = selectedPatient?.aiSummaryMeta?.model || '-';
    const fallbackReason = selectedPatient?.aiSummaryMeta?.fallbackReason || '';
    const isAiSummary = summarySource === 'ai';

    return (
        <>
            <PageTitle />
            <Header />

            <main className="pt-24 pb-16 min-h-screen bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] px-6 md:px-10 lg:px-16">
                <div className="max-w-6xl mx-auto flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-6">
                        <div className="flex flex-col gap-1">
                            <p className="flex items-center gap-2 text-sm text-slate-500 font-secondary">
                                <Stethoscope size={16} />
                                Painel do psicólogo
                            </p>
                            <h1 className="text-3xl font-bold font-secondary text-slate-900">
                                {getGreeting()}, {user.name || 'Psicólogo(a)'} 🌿
                            </h1>
                            <p className="text-slate-500 font-main">
                                {sessionsToday > 0
                                    ? `Você tem ${sessionsToday} sessõe${sessionsToday > 1 ? 's' : ''} hoje. Os resumos já estão prontos.`
                                    : 'Nenhuma sessão marcada para hoje.'}
                            </p>
                        </div>

                        <div className="flex gap-3 flex-wrap">
                            <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8F6F6] text-[#3b9b8a] shrink-0">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-secondary">Pacientes</p>
                                    <p className="text-lg font-bold font-secondary text-slate-800 leading-none">
                                        {patients.length}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef1fd] text-[#8f7ab3] shrink-0">
                                    <CalendarClock size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-secondary">Sessões hoje</p>
                                    <p className="text-lg font-bold font-secondary text-slate-800 leading-none">
                                        {sessionsToday}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-500 shrink-0">
                                    <TriangleAlert size={18} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-secondary">Atenção</p>
                                    <p className="text-lg font-bold font-secondary text-slate-800 leading-none">
                                        {attentionCount}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 font-main">
                            {errorMessage}
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        <aside className="w-full lg:w-80 shrink-0 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
                            <div className="relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Buscar paciente..."
                                    className="w-full rounded-full border border-slate-200 bg-[#f8fafb] pl-9 pr-3 py-2.5 text-sm font-main text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5 max-h-[420px] lg:max-h-[560px] overflow-y-auto">
                                {isLoadingPatients ? (
                                    <p className="text-sm text-slate-500 font-main text-center py-4">Carregando pacientes...</p>
                                ) : filteredPatients.length === 0 ? (
                                    <p className="text-sm text-slate-500 font-main text-center py-4">
                                        Nenhum paciente encontrado.
                                    </p>
                                ) : null}

                                {filteredPatients.map((patient) => {
                                    const isSelected = String(patient.id) === pacienteId;

                                    return (
                                        <Link
                                            key={patient.id}
                                            to={`/painel/${patient.id}`}
                                            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${
                                                isSelected ? 'bg-[#E4FBF4]' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6fc9b6,#4abba1)] text-white font-bold font-secondary text-sm">
                                                {getInitials(patient.name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="font-bold font-secondary text-sm text-slate-800 truncate">
                                                        {patient.name}
                                                    </p>
                                                    {patient.alertsCount > 0 && (
                                                        <TriangleAlert size={14} className="text-amber-500 shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 font-main truncate">
                                                    Próx.: {formatSessionLabel(patient.nextSession)}
                                                </p>
                                            </div>
                                            <ChevronRight size={16} className="text-slate-300 shrink-0" />
                                        </Link>
                                    );
                                })}
                            </div>
                        </aside>

                        {isLoadingDetail ? (
                            <div className="flex-1 min-w-0 bg-white rounded-3xl border border-slate-200 shadow-sm p-10 flex items-center justify-center text-center">
                                <p className="text-slate-500 font-main">
                                    Carregando resumo do paciente...
                                </p>
                            </div>
                        ) : selectedPatient ? (
                            <div className="flex-1 min-w-0 flex flex-col gap-5">
                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 flex-wrap">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6fc9b6,#4abba1)] text-white font-bold font-secondary text-lg">
                                        {getInitials(selectedPatient.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-400 font-main">
                                            Próxima sessão · {formatSessionLabel(selectedPatient.nextSession)}
                                        </p>
                                        <h2 className="text-xl font-bold font-secondary text-slate-900">
                                            {selectedPatient.name}
                                        </h2>
                                        <p className="text-xs text-slate-400 font-main">
                                            Último check-in: {selectedPatient.lastCheckinLabel}
                                        </p>
                                    </div>
                                    {averageMoodOption && (
                                        <span
                                            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium font-secondary shrink-0"
                                            style={{ backgroundColor: averageMoodOption.bg, color: averageMoodOption.color }}
                                        >
                                            <TrendIcon size={15} style={{ color: trendColor }} />
                                            Humor {selectedPatient.moodAverage.toFixed(1)}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
                                        <p className="text-sm text-slate-400 font-main">Check-ins na semana</p>
                                        <p className="text-2xl font-bold font-secondary text-slate-900">
                                            {selectedPatient.checkinsThisWeek} / 7
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
                                        <p className="text-sm text-slate-400 font-main">Entradas no diário</p>
                                        <p className="text-2xl font-bold font-secondary text-slate-900">
                                            {selectedPatient.diaryEntriesCount}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
                                        <p className="text-sm text-slate-400 font-main">Alertas</p>
                                        <p className={`text-2xl font-bold font-secondary ${selectedPatient.alertsCount > 0 ? 'text-amber-500' : 'text-slate-900'}`}>
                                            {selectedPatient.alertsCount}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-[#E4FBF1] rounded-3xl border border-emerald-100 p-6 flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#4abba1] shadow-sm">
                                            <Sparkles size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold font-secondary text-slate-900">
                                                {isAiSummary ? "Resumo da semana · gerado por IA" : "Resumo da semana · fallback local"}
                                            </h3>
                                            <p className="text-xs text-slate-500 font-main">{isAiSummary ? `Modelo: ${summaryModel}` : `Fallback ativo (${summaryModel})`}</p>
                                        </div>
                                    </div>

                                    <p className="text-sm text-slate-700 font-main leading-relaxed">
                                        {selectedPatient.aiSummary}
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="flex items-center gap-2.5 bg-white rounded-full px-4 py-3">
                                            <Sunrise size={16} className="text-amber-400 shrink-0" />
                                            <p className="text-sm font-main text-slate-600">
                                                Melhor dia: <span className="font-bold text-slate-800">{selectedPatient.highlights.melhorDia}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2.5 bg-white rounded-full px-4 py-3">
                                            <CloudDrizzle size={16} className="text-slate-400 shrink-0" />
                                            <p className="text-sm font-main text-slate-600">
                                                Dia mais difícil: <span className="font-bold text-slate-800">{selectedPatient.highlights.diaDificil}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2.5 bg-white rounded-full px-4 py-3">
                                            <Moon size={16} className="text-[#8f7ab3] shrink-0" />
                                            <p className="text-sm font-main text-slate-600">
                                                Ponto de atenção: <span className="font-bold text-slate-800">{selectedPatient.highlights.pontoAtencao}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2.5 bg-white rounded-full px-4 py-3">
                                            <Heart size={16} className="text-emerald-500 shrink-0" />
                                            <p className="text-sm font-main text-slate-600">
                                                Recurso positivo: <span className="font-bold text-slate-800">{selectedPatient.highlights.recursoPositivo}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 min-w-0 bg-white rounded-3xl border border-slate-200 shadow-sm p-10 flex items-center justify-center text-center">
                                <p className="text-slate-500 font-main">
                                    Selecione um paciente na lista para ver o resumo.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}