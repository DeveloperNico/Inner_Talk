import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NotebookPen, Trash2, PenLine, LogIn } from 'lucide-react';

import { Header } from '../../components/Header/Header';
import { PageTitle } from '../../components/PageTitle/PageTitle';
import {
    addDiarioEntry,
    deleteDiarioEntry,
    getDiarioEntries,
    getStoredUser,
} from '../../data/storage';

function formatDate(isoDate) {
    return new Date(isoDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

export function DiarioPage() {
    const [user] = useState(() => getStoredUser());
    const [entries, setEntries] = useState([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        setEntries(getDiarioEntries());
    }, []);

    const handleSave = () => {
        if (!content.trim()) return;

        addDiarioEntry({ title, content });
        setEntries(getDiarioEntries());
        setTitle('');
        setContent('');
    };

    const handleDelete = (id) => {
        deleteDiarioEntry(id);
        setEntries(getDiarioEntries());
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

            <main className="pt-28 pb-16 min-h-screen bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7] px-6 md:px-24">
                <div className="max-w-3xl mx-auto flex flex-col gap-8">
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3b9b8a,#8f7ab3)] text-white shadow-md">
                            <NotebookPen size={26} />
                        </div>
                        <h1 className="text-3xl font-bold font-secondary text-slate-900">
                            Diário emocional
                        </h1>
                        <p className="text-slate-500 font-main max-w-md">
                            Escreva livremente. Essas entradas ajudam a montar o resumo da sua semana.
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col gap-4">
                        <input
                            type="text"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="Título (opcional)"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-secondary font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        />
                        <textarea
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            placeholder="O que você quer registrar hoje?"
                            rows={5}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-main text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                        />
                        <div>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={!content.trim()}
                                className="inline-flex items-center gap-2 rounded-full bg-[#6fc9b6] px-6 py-3 text-white font-medium shadow-md hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <PenLine size={18} />
                                Salvar entrada
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <h2 className="text-lg font-bold font-secondary text-slate-900">
                            Suas entradas
                        </h2>

                        {entries.length === 0 && (
                            <p className="text-slate-500 font-main text-sm">
                                Você ainda não escreveu nenhuma entrada. Comece agora mesmo!
                            </p>
                        )}

                        <div className="flex flex-col gap-3">
                            {entries.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex flex-col gap-2"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            {entry.title && (
                                                <h3 className="font-bold font-secondary text-slate-800">
                                                    {entry.title}
                                                </h3>
                                            )}
                                            <p className="text-xs text-slate-400 font-main">
                                                {formatDate(entry.date)}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(entry.id)}
                                            className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                                            aria-label="Excluir entrada"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-600 font-main whitespace-pre-wrap">
                                        {entry.content}
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
