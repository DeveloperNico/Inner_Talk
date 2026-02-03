import { useState } from 'react';
import styles from './ChatBot.module.css';

import { Sparkles, Send, TriangleAlert, Phone, ExternalLink, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export function ChatBot() {
const [messages, setMessages] = useState([
    {
        role: 'bot',
        content: `Olá! 💚 Eu sou o **Thery**, seu assistente virtual de apoio emocional.

Estou aqui para ouvir você com carinho e oferecer palavras de conforto. Pode me contar como está se sentindo hoje.

**Lembre-se:** sou uma IA e estou aqui para um primeiro acolhimento. Para questões mais profundas, é sempre importante buscar um profissional de saúde mental.`
    }
]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!inputMessage.trim()) return;

        const newMessage = { role: 'user', content: inputMessage };
        setMessages([...messages, newMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:8000/api/chat/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ message: inputMessage }),
            });

            const data = await response.json();

            setMessages(prev => [...prev, { role: 'bot', content: data.reply }]);
        } catch (error) {
            console.error('Erro ao chamar API:', error);
            setMessages(prev => [...prev, { role: 'bot', content: 'Desculpe, ocorreu um erro ao processar sua solicitação.' }]);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <section className={styles.chatBotContainer}>
            <div className={styles.headerChatBotContainer}>
                <div className={styles.iconSparkles}>
                    <Sparkles />
                </div>
                <div className={styles.headerChatBot}>
                    <h3>Inner Talk</h3>
                    <p>Seu espaço seguro de acolhimento</p>
                </div>
            </div>

            {/* Conteúdo do chat */}
            <div className={styles.contentChatBotContainer}>
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={msg.role === "user" ? styles.messageUser : styles.messageBot}
                    >
                        {/* Ícone do bot (apenas na esquerda para mensagens do bot) */}
                        {msg.role === "bot" && (
                            <Bot size={24} color="#8f7ab3" className={styles.iconBot} />
                        )}

                        {/* Mensagem */}
                        <div className={styles.messageBubble}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>

                        {/* Ícone do usuário (apenas na direita para mensagens do usuário) */}
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
            </div>

            {/* Input do usuário */}
            <div className={styles.inputChatBotContainer}>
                <div className={styles.inputArea}>
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={e => setInputMessage(e.target.value)}
                        placeholder="Compartilhe o que está sentindo..."
                        className={styles.inputChatBot}
                    />
                    <button onClick={handleSend} className={styles.sendButton}><Send /></button>
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
                        <div className={styles.alertLinks}>
                            <ExternalLink size={16} />
                            <a href="https://cvv.org.br/" target='_blank'>cvv.org.br</a>
                        </div>
                    </div>
                </div>
            </div>

        </section>
    );
}