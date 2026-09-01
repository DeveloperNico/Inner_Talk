import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NotebookPen, PenLine, LogIn, Sparkles, Calendar, Tag, MoreVertical, PencilLine, Trash2, X, CheckCircle2 } from 'lucide-react';

import { Header } from '../../components/Header/Header';
import { PageTitle } from '../../components/PageTitle/PageTitle';
import {
    addDiarioEntry,
    deleteDiarioEntry,
    getDailyDiarySuggestion,
    getDiarioEntries,
    getStoredUser,
    updateDiarioEntry,
} from '../../data/storage';

const SENTIMENTOS = ['Alegria', 'Calma', 'Ansiedade', 'Tristeza', 'Gratidão'];

function formatDate(isoDate) {
    return new Date(isoDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

function formatTodayLabel() {
    const label = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function createEmptyForm() {
    return { title: '', content: '', sentimento: null };
}

export function DiarioPage() {
    const [user] = useState(() => getStoredUser());
    const [entries, setEntries] = useState([]);
    const [form, setForm] = useState(createEmptyForm);
    const [editingId, setEditingId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [dailySuggestion, setDailySuggestion] = useState('');
    const [suggestionMeta, setSuggestionMeta] = useState({ source: null, fallbackReason: null });
    const [isSuggestionLoading, setIsSuggestionLoading] = useState(true);
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        let isCancelled = false;

        const loadPageData = async () => {
            if (!user || user.role !== 'paciente') {
                setIsLoading(false);
                setIsSuggestionLoading(false);
                return;
            }

            try {
                const [nextEntries, suggestion] = await Promise.all([
                    getDiarioEntries(),
                    getDailyDiarySuggestion(),
                ]);

                if (isCancelled) return;

                setEntries(nextEntries);
                setDailySuggestion(suggestion?.suggestion || '');
                setSuggestionMeta({
                    source: suggestion?.source || null,
                    fallbackReason: suggestion?.fallbackReason || null,
                });
                setErrorMessage('');
            } catch (error) {
                if (!isCancelled) {
                    setErrorMessage(error.message || 'Não foi possível carregar o diário.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                    setIsSuggestionLoading(false);
                }
            }
        };

        loadPageData();

        return () => {
            isCancelled = true;
        };
    }, [user]);

    useEffect(() => {
        const closeMenu = () => setMenuOpenId(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const handleSubmit = async () => {
        if (!form.content.trim()) return;

        setIsSaving(true);
        setErrorMessage('');

        try {
            if (editingId) {
                await updateDiarioEntry(editingId, form);
            } else {
                await addDiarioEntry(form);
            }

            setEntries(await getDiarioEntries());
            setForm(createEmptyForm());
            setEditingId(null);
        } catch (error) {
            setErrorMessage(error.message || 'Não foi possível salvar a entrada.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (entry) => {
        setForm({
            title: entry.title || '',
            content: entry.content || '',
            sentimento: entry.sentimento || null,
        });
        setEditingId(entry.id);
        setMenuOpenId(null);
        setErrorMessage('');
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        setIsSaving(true);
        setErrorMessage('');

        try {
            await deleteDiarioEntry(deleteTarget.id);
            setEntries(await getDiarioEntries());
            if (editingId === deleteTarget.id) {
                setEditingId(null);
                setForm(createEmptyForm());
            }
            setDeleteTarget(null);
        } catch (error) {
            setErrorMessage(error.message || 'Não foi possível excluir a entrada.');
        } finally {
            setIsSaving(false);
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm(createEmptyForm());
        setErrorMessage('');
    };

    if (!user || user.role !== 'paciente') {
        return (
            <>
                <PageTitle />
                <Header />
                <main className="pt-32 min-h-screen flex flex-col items-center gap-4 bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] text-center px-6">
                    <p className="text-slate-600 font-secondary max-w-md">
                        Essa página é exclusiva para pacientes. Entre com uma conta de paciente para escrever no seu diário.
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
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col gap-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3b9b8a,#8f7ab3)] text-white shadow-md">
                                    <NotebookPen size={20} />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold font-secondary text-slate-900">Diário emocional</h1>
                                    <p className="text-slate-500 font-main text-sm">
                                        Escreva sem julgamento. Este espaço é só seu.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-slate-600 font-main">
                                <span className="flex items-center gap-2">
                                    <Calendar size={16} className="text-slate-400" />
                                    {formatTodayLabel()}
                                </span>
                                <span className="flex items-center gap-2">
                                    <Tag size={16} className="text-slate-400" />
                                    Escolha um sentimento:
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {SENTIMENTOS.map((item) => {
                                    const isActive = form.sentimento === item;
                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setForm((current) => ({ ...current, sentimento: isActive ? null : item }))}
                                            className={`rounded-full px-4 py-1.5 text-sm font-main transition-colors cursor-pointer ${
                                                isActive
                                                    ? 'bg-[#6fc9b6] text-white'
                                                    : 'bg-[#eaf7f2] text-slate-600 hover:bg-[#dcf1e9]'
                                            }`}
                                        >
                                            {item}
                                        </button>
                                    );
                                })}
                            </div>

                            <input
                                type="text"
                                value={form.title}
                                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                                placeholder="Dê um título para o seu dia... (Opcional)"
                                className="w-full border-b border-slate-200 pb-3 text-2xl font-semibold font-secondary text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-[#6fc9b6]"
                            />

                            <textarea
                                value={form.content}
                                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                                placeholder="Como você se sentiu hoje? O que passou pela sua cabeça? Escreva livremente..."
                                rows={10}
                                className="w-full rounded-xl border border-slate-200 bg-[#f7fbfa] px-4 py-3 text-sm font-main text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                            />

                            {errorMessage && <p className="text-sm text-red-500 font-main">{errorMessage}</p>}

                            <div className="flex flex-col gap-3">
                                <p className="text-xs text-slate-400 font-main">Privado • só você pode ler</p>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={!form.content.trim() || isSaving}
                                        className="inline-flex items-center gap-2 rounded-full bg-[#6fc9b6] px-6 py-3 text-white font-medium shadow-md hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        <PenLine size={18} />
                                        {isSaving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar entrada'}
                                    </button>
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={cancelEdit}
                                            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-6 py-3 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                                        >
                                            Cancelar edição
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <aside className="flex flex-col gap-4 lg:sticky lg:top-28">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={16} className="text-[#5b9084]" />
                                <h2 className="text-base font-bold font-secondary text-slate-900">Sugestão do dia</h2>
                            </div>

                            {isSuggestionLoading ? (
                                <p className="text-sm text-slate-500 font-main">Gerando sugestão...</p>
                            ) : dailySuggestion ? (
                                <>
                                    <p className="text-sm text-slate-700 font-main leading-relaxed">{dailySuggestion}</p>
                                    {suggestionMeta?.source === 'fallback' && suggestionMeta?.fallbackReason && (
                                        <p className="text-[11px] text-amber-700 mt-2 font-main">Sugestão em modo fallback hoje.</p>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-slate-500 font-main">Não foi possível obter a sugestão de hoje.</p>
                            )}
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
                            <h2 className="text-lg font-bold font-secondary text-slate-900 mb-3">Entradas recentes</h2>

                            {isLoading ? (
                                <p className="text-slate-500 font-main text-sm">Carregando entradas...</p>
                            ) : entries.length === 0 ? (
                                <p className="text-slate-500 font-main text-sm">Você ainda não escreveu nenhuma entrada. Comece agora mesmo!</p>
                            ) : (
                                <div className="flex flex-col gap-3 max-h-[68vh] overflow-y-auto pr-1">
                                    {entries.map((entry) => {
                                        const isMenuOpen = menuOpenId === entry.id;

                                        return (
                                            <div key={entry.id} className="bg-slate-50 rounded-2xl border border-slate-200 px-4 py-3 flex flex-col gap-2">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        {entry.title && <h3 className="font-bold font-secondary text-slate-800 truncate">{entry.title}</h3>}
                                                        <p className="text-xs text-slate-400 font-main">{formatDate(entry.date)}</p>
                                                    </div>
                                                    <div className="relative shrink-0">
                                                        <div className="flex items-center gap-2">
                                                            {entry.sentimento ? (
                                                                <span className="rounded-full bg-[#eaf7f2] px-3 py-1 text-xs text-slate-600 font-main whitespace-nowrap">{entry.sentimento}</span>
                                                            ) : (
                                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 font-main whitespace-nowrap">Sem sentimento</span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    setMenuOpenId(isMenuOpen ? null : entry.id);
                                                                }}
                                                                className="rounded-full p-2 text-slate-500 hover:bg-white hover:text-slate-800 transition-colors"
                                                                aria-label="Abrir ações"
                                                            >
                                                                <MoreVertical size={18} />
                                                            </button>
                                                        </div>

                                                        {isMenuOpen && (
                                                            <div className="absolute right-0 top-11 z-20 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleEdit(entry)}
                                                                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                                                                >
                                                                    <PencilLine size={16} />
                                                                    Editar
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setDeleteTarget(entry);
                                                                        setMenuOpenId(null);
                                                                    }}
                                                                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                                                                >
                                                                    <Trash2 size={16} />
                                                                    Deletar
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <p className="text-sm text-slate-600 font-main whitespace-pre-wrap">{entry.content}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </main>

            {deleteTarget && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/50 px-4">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold font-secondary text-slate-900">Deseja realmente deletar?</h3>
                                <p className="mt-2 text-sm text-slate-500 font-main">
                                    Essa ação remove a entrada do diário permanentemente.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Fechar modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
                            <p className="text-sm font-semibold font-secondary text-slate-800">{deleteTarget.title || 'Sem título'}</p>
                            <p className="text-xs text-slate-500 mt-1">{formatDate(deleteTarget.date)}</p>
                        </div>

                        <div className="mt-6 flex flex-wrap justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="rounded-full border border-slate-300 px-5 py-2.5 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-white font-medium shadow-md hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                <CheckCircle2 size={16} />
                                {isSaving ? 'Excluindo...' : 'Sim, deletar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}