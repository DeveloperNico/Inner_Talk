import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, Expand, MessageCircle, Send, X } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');
const AUTH_STORAGE_KEY = 'innertalk.auth';

function getStoredUser() {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        return raw ? JSON.parse(raw)?.user ?? null : null;
    } catch {
        return null;
    }
}

export function PatientChatWidget() {
    const location = useLocation();
    const [user, setUser] = useState(() => getStoredUser());
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const listRef = useRef(null);

    useEffect(() => {
        const syncUser = () => setUser(getStoredUser());

        syncUser();
        window.addEventListener('storage', syncUser);
        window.addEventListener('focus', syncUser);
        document.addEventListener('visibilitychange', syncUser);

        return () => {
            window.removeEventListener('storage', syncUser);
            window.removeEventListener('focus', syncUser);
            document.removeEventListener('visibilitychange', syncUser);
        };
    }, [location.pathname]);

    useEffect(() => {
        if (!isOpen || !listRef.current) return;
        listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages, isOpen]);

    const canRender = useMemo(() => {
        if (location.pathname.startsWith('/login')) return false;
        if (location.pathname.startsWith('/painel')) return false;
        if (location.pathname.startsWith('/chatbot')) return false;
        return user?.role === 'paciente';
    }, [location.pathname, user?.role]);

    useEffect(() => {
        if (!canRender) {
            setIsOpen(false);
            return;
        }

        if (messages.length === 0) {
            setMessages([
                {
                    role: 'bot',
                    content: 'Oi! Eu sou o Thery. Posso te acolher aqui rapidinho ou você pode expandir para a conversa completa.',
                },
            ]);
        }
    }, [canRender, messages.length]);

    const sendMessage = async () => {
        const trimmed = inputMessage.trim();
        if (!trimmed || isLoading) return;

        setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/chat/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: trimmed }),
            });

            let payload = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok) {
                const message = payload?.error || payload?.detail || 'Não consegui responder agora.';
                setMessages((prev) => [...prev, { role: 'bot', content: message }]);
                return;
            }

            setMessages((prev) => [...prev, { role: 'bot', content: payload?.reply || 'Não consegui responder agora.' }]);
        } catch {
            setMessages((prev) => [...prev, { role: 'bot', content: 'Erro de conexão. Tente novamente em instantes.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!canRender) {
        return null;
    }

    return (
        <div className="fixed bottom-5 right-5 z-[190]">
            {isOpen ? (
                <div className="w-[330px] sm:w-[360px] h-[500px] rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col">
                    <div className="px-4 py-3 bg-[linear-gradient(135deg,#6fc9b6,#4abba1)] text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot size={18} />
                            <div>
                                <p className="font-secondary font-bold text-sm leading-none">Thery</p>
                                <p className="text-[11px] opacity-90">Acolhimento rápido</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link
                                to="/chatbot"
                                className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs hover:bg-white/30"
                                title="Expandir conversa"
                            >
                                <Expand size={13} />
                                Expandir
                            </Link>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="rounded-full p-1.5 hover:bg-white/20"
                                aria-label="Fechar chat"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 bg-[#f8fbfa] flex flex-col gap-2.5">
                        {messages.map((message, index) => (
                            <div
                                key={`${message.role}-${index}`}
                                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                                    message.role === 'user'
                                        ? 'self-end bg-[#4abba1] text-white rounded-br-md'
                                        : 'self-start bg-white border border-slate-200 text-slate-700 rounded-bl-md'
                                }`}
                            >
                                {message.content}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="self-start bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-bl-md px-3 py-2 text-sm">
                                Escrevendo...
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-200 bg-white p-3 flex items-end gap-2">
                        <textarea
                            value={inputMessage}
                            onChange={(event) => setInputMessage(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    sendMessage();
                                }
                            }}
                            rows={1}
                            placeholder="Como você está agora?"
                            className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        />
                        <button
                            type="button"
                            onClick={sendMessage}
                            disabled={!inputMessage.trim() || isLoading}
                            className="h-10 w-10 rounded-full bg-[#6fc9b6] text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Enviar mensagem"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="group inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#6fc9b6,#4abba1)] px-4 py-3 text-white shadow-xl hover:opacity-95 transition-all"
                >
                    <MessageCircle size={18} />
                    <span className="text-sm font-secondary font-semibold">Conversar com Thery</span>
                </button>
            )}
        </div>
    );
}