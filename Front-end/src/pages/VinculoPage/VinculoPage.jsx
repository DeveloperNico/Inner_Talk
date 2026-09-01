import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Link2, LogIn, Search, Stethoscope, UserRound, RefreshCcw } from 'lucide-react';

import { Header } from '../../components/Header/Header';
import { PageTitle } from '../../components/PageTitle/PageTitle';
import {
    getPatientPsychologist,
    getPsychologists,
    getStoredSession,
    getStoredUser,
    persistSession,
    updatePatientPsychologist,
} from '../../data/storage';

function filterPsychologists(items, query) {
    const term = query.trim().toLowerCase();
    if (!term) {
        return items;
    }

    return items.filter((item) => {
        const name = (item.name || '').toLowerCase();
        const crp = (item.crp || '').toLowerCase();
        return name.includes(term) || crp.includes(term);
    });
}

export function VinculoPage() {
    const [user] = useState(() => getStoredUser());
    const [items, setItems] = useState([]);
    const [currentPsychologist, setCurrentPsychologist] = useState(null);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingId, setIsSavingId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const filteredPsychologists = useMemo(() => filterPsychologists(items, query), [items, query]);

    const loadData = useCallback(async () => {
        if (!user || user.role !== 'paciente') {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const [psychologists, linkedPsychologist] = await Promise.all([
                getPsychologists(),
                getPatientPsychologist(),
            ]);
            setItems(psychologists);
            setCurrentPsychologist(linkedPsychologist);
            setErrorMessage('');
        } catch (error) {
            setErrorMessage(error.message || 'Nao foi possivel carregar os psicologos.');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAssociate = async (psychologist) => {
        if (!psychologist?.id) {
            return;
        }

        setIsSavingId(psychologist.id);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const linkedPsychologist = await updatePatientPsychologist(psychologist.id);
            setCurrentPsychologist(linkedPsychologist);
            setSuccessMessage(`Agora seu psicologo vinculado e ${linkedPsychologist.name}.`);

            const session = getStoredSession();
            if (session?.user) {
                const nextSession = {
                    ...session,
                    user: {
                        ...session.user,
                        psychologistId: linkedPsychologist.id,
                    },
                };
                persistSession(nextSession);
                window.dispatchEvent(new Event('storage'));
            }
        } catch (error) {
            setErrorMessage(error.message || 'Nao foi possivel atualizar o vinculo.');
        } finally {
            setIsSavingId(null);
        }
    };

    if (!user) {
        return (
            <>
                <PageTitle />
                <Header />
                <main className="pt-32 min-h-screen flex flex-col items-center gap-4 bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] text-center px-6">
                    <p className="text-slate-600 font-secondary max-w-md">
                        Entre na sua conta para associar um psicologo.
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

    if (user.role !== 'paciente') {
        return (
            <>
                <PageTitle />
                <Header />
                <main className="pt-32 min-h-screen flex flex-col items-center gap-4 bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] text-center px-6">
                    <p className="text-slate-600 font-secondary max-w-md">
                        Essa tela e exclusiva para pacientes escolherem seu psicologo.
                    </p>
                    <Link
                        to="/painel"
                        className="inline-flex items-center gap-2 rounded-full bg-[#6fc9b6] px-6 py-3 text-white font-medium shadow-md hover:opacity-90 transition-colors"
                    >
                        <Stethoscope size={18} />
                        Ir para o painel
                    </Link>
                </main>
            </>
        );
    }

    return (
        <>
            <PageTitle />
            <Header />

            <main className="pt-28 pb-16 min-h-screen bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] px-6 md:px-12 lg:px-16">
                <div className="max-w-6xl mx-auto flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="flex flex-col gap-2">
                            <p className="inline-flex items-center gap-2 text-sm text-[#3b9b8a] font-secondary">
                                <Link2 size={16} />
                                Vinculo clinico
                            </p>
                            <h1 className="text-3xl font-bold font-secondary text-slate-900">
                                Escolha seu psicologo na plataforma
                            </h1>
                            <p className="text-slate-500 font-main max-w-2xl">
                                Se existir mais de um profissional, voce pode definir aqui com quem seu acompanhamento sera feito.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={loadData}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-secondary text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <RefreshCcw size={16} />
                            Atualizar lista
                        </button>
                    </div>

                    {currentPsychologist ? (
                        <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-400 font-secondary">Psicologo vinculado</p>
                                <p className="text-xl font-bold font-secondary text-slate-900">{currentPsychologist.name}</p>
                                <p className="text-sm text-slate-500 font-main">CRP: {currentPsychologist.crp || 'Nao informado'}</p>
                            </div>
                            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                                <CheckCircle2 size={16} />
                                Vínculo ativo
                            </span>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-amber-100 shadow-sm p-5 text-amber-700 text-sm font-main">
                            Voce ainda nao possui psicologo vinculado. Escolha um profissional abaixo para liberar agenda e acompanhamento.
                        </div>
                    )}

                    {(errorMessage || successMessage) && (
                        <div className={`rounded-2xl border px-4 py-3 text-sm font-main ${errorMessage ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                            {errorMessage || successMessage}
                        </div>
                    )}

                    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6 flex flex-col gap-4">
                        <div className="relative">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Buscar por nome ou CRP"
                                className="w-full rounded-full border border-slate-200 bg-[#f8fafb] pl-9 pr-3 py-2.5 text-sm font-main text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            />
                        </div>

                        {isLoading ? (
                            <p className="text-sm text-slate-500 font-main">Carregando psicologos...</p>
                        ) : filteredPsychologists.length === 0 ? (
                            <p className="text-sm text-slate-500 font-main">Nenhum psicologo encontrado.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredPsychologists.map((psychologist) => {
                                    const isCurrent = currentPsychologist?.id === psychologist.id;

                                    return (
                                        <article key={psychologist.id} className={`rounded-2xl border px-4 py-4 flex items-start justify-between gap-4 ${isCurrent ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                                            <div>
                                                <p className="font-bold font-secondary text-slate-900 flex items-center gap-2">
                                                    <UserRound size={16} className="text-[#3b9b8a]" />
                                                    {psychologist.name}
                                                </p>
                                                <p className="text-sm text-slate-500 font-main">CRP: {psychologist.crp || 'Nao informado'}</p>
                                                <p className="text-xs text-slate-400 font-main mt-1">
                                                    {psychologist.patientsCount} paciente(s) vinculados
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={isCurrent || isSavingId === psychologist.id}
                                                onClick={() => handleAssociate(psychologist)}
                                                className="shrink-0 rounded-full bg-[linear-gradient(135deg,#6fc9b6,#4abba1)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isCurrent ? 'Selecionado' : isSavingId === psychologist.id ? 'Salvando...' : 'Selecionar'}
                                            </button>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}