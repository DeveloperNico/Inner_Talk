import { useEffect, useRef, useState } from 'react';
import styles from './ChatBot.module.css';

import { Sparkles, Send, TriangleAlert, Phone, ExternalLink, Bot, User, Building2, Heart, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export function ChatBot() {
    const initialMessages = [
        {
            role: 'bot',
            content: `Olá! 💚 Eu sou o **Thery**, seu assistente virtual de apoio emocional.

Estou aqui para ouvir você com carinho e oferecer palavras de conforto. Pode me contar como está se sentindo hoje.

**Lembre-se:** sou uma IA e estou aqui para um primeiro acolhimento. Para questões mais profundas, é sempre importante buscar um profissional de saúde mental.`
        }
    ];
    const [messages, setMessages] = useState(initialMessages);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!inputMessage.trim()) return;

        const newMessage = { role: 'user', content: inputMessage };
        setMessages([...messages, newMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/chat/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ message: inputMessage }),
            });

            const rawBody = await response.text();
            let data = {};

            if (rawBody) {
                try {
                    data = JSON.parse(rawBody);
                } catch (parseError) {
                    console.error('Erro ao parsear resposta da API:', parseError, rawBody);
                }
            }

            if (!response.ok) {
                const apiError = data?.error || data?.detail || `Erro HTTP ${response.status}`;
                console.error('Falha da API /api/chat/', {
                    status: response.status,
                    statusText: response.statusText,
                    body: rawBody,
                });
                setMessages(prev => [...prev, { role: 'bot', content: `Não consegui responder agora: ${apiError}` }]);
                return;
            }

            const reply = data?.reply;
            if (!reply) {
                console.error('Resposta sem campo reply:', data);
                setMessages(prev => [...prev, { role: 'bot', content: 'A resposta veio em formato inesperado. Verifique o backend.' }]);
                return;
            }

            setMessages(prev => [...prev, { role: 'bot', content: reply }]);
        } catch (error) {
            console.error('Erro ao chamar API:', error);
            setMessages(prev => [...prev, { role: 'bot', content: 'Desculpe, ocorreu um erro ao processar sua solicitação.' }]);
        } finally {
            setIsLoading(false);
        }
    }

    const handleTextareaChange = (e) => {
        setInputMessage(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    }

    const handleResetConversation = () => {
        setMessages(initialMessages);
        setInputMessage('');
        setIsLoading(false);
    }

    return (
        <div className={styles.mainLayout}>
            {/* Coluna da esquerda - Aviso e informações */}
            <aside className={styles.sidebarContainer}>
                <div className={styles.resourcesContainer}>
                    <h3>Recursos de Apoio Profissional</h3>
                    <a href='https://zenklub.com.br/' target='_blank' className={styles.cardResources}>
                        <div className={styles.iconPhone}>
                            <Heart size={22} />
                        </div>
                        <div className={styles.cardContent}>
                            <div className={styles.cardHeader}>
                                <h4>Zenklub</h4>
                                <ExternalLink size={14} className={styles.externalIcon} />
                            </div>
                            <p>Plataforma de terapia online com psicólogos e coaches</p>
                        </div>
                    </a>

                    <a href='https://vittude.com/' target='_blank' className={styles.cardResources}>
                        <div className={styles.iconPhone}>
                            <Heart size={22} />
                        </div>
                        <div className={styles.cardContent}>
                            <div className={styles.cardHeader}>
                                <h4>Vittude</h4>
                                <ExternalLink size={14} className={styles.externalIcon} />
                            </div>
                            <p>Conecte-se com psicólogos online para sessões de terapia</p>
                        </div>
                    </a>

                    <a href='https://caps.saude.gov.br/' target='_blank' className={styles.cardResources}>
                        <div className={styles.iconPhone}>
                            <Building2 size={22} />
                        </div>
                        <div className={styles.cardContent}>
                            <div className={styles.cardHeader}>
                                <h4>CAPS</h4>
                                <ExternalLink size={14} className={styles.externalIcon} />
                            </div>
                            <p>Centros de Atenção Psicossocial - Rede pública de saúde mental</p>
                        </div>
                    </a>
                </div>
                <div className={styles.alertMessage}>
                    <div className={styles.spanAlert}>
                        <TriangleAlert />
                        <h4>Aviso Importante</h4>
                    </div>
                    <div className={styles.alertText}>
                        <p>Este é um assistente virtual de apoio emocional e <b>não substitui</b> a consulta com um profissional de saúde mental. As respostas fornecidas são apenas para suporte inicial e não devem ser consideradas como diagnóstico ou tratamento médico.</p>
                    </div>

                    <div className={styles.alertLinksContainer}>
                        <div className={styles.alertLinks}>
                            <Phone size={16} />
                            <p>CVV: 188</p>
                        </div>
                        <a href='https://cvv.org.br/' target='_blank' className={styles.alertLinks}>
                            <ExternalLink size={16} />
                            <p>cvv.org.br</p>
                        </a>
                    </div>
                </div>
            </aside>

            {/* Coluna da direita - Chat */}
            <section className={styles.chatBotContainer}>
                <div className={styles.headerChatBotContainer}>
                    <div className={styles.iconSparkles}>
                        <Sparkles />
                    </div>
                    <div className={styles.headerChatBot}>
                        <h3>Inner Talk</h3>
                        <p>Seu espaço seguro de acolhimento</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleResetConversation}
                        className={styles.newConversationButton}
                    >
                        <RotateCcw size={16} />
                        <span>Nova conversa</span>
                    </button>
                </div>

                {/* Conteúdo do chat */}
                <div className={styles.contentChatBotContainer}>
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={msg.role === "user" ? styles.messageUser : styles.messageBot}
                        >
                            {msg.role === "bot" && (
                                <Bot size={24} color="#8f7ab3" className={styles.iconBot} />
                            )}
                            <div className={styles.messageBubble}>
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            {msg.role === "user" && (
                                <User size={24} color="#ffffff" className={styles.iconUser} />
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className={styles.messageBot}>
                            <Sparkles size={24} color="#8f7ab3" className={styles.icon} />
                            <div className={styles.messageBubble}>...</div>
                        </div>
                    )}

                    <div ref={messagesEndRef}></div>
                </div>

                {/* Input do usuário */}
                <div className={styles.inputChatBotContainer}>
                    <div className={styles.inputArea}>
                        <textarea
                            value={inputMessage}
                            onChange={handleTextareaChange}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Compartilhe o que está sentindo..."
                            className={styles.inputChatBot}
                            rows={1}
                        />
                        <button onClick={handleSend} className={styles.sendButton}><Send /></button>
                    </div>
                </div>
            </section>
        </div>
    );
}
