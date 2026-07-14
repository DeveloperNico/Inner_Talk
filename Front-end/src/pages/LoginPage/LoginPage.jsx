import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './LoginPage.module.css';

import {
    Leaf,
    MessageCircle,
    NotebookText,
    User,
    Stethoscope,
    Mail,
    Lock,
    ArrowRight,
} from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const AUTH_STORAGE_KEY = 'innertalk.auth';

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4" />
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
        <path d="M3.964 10.706A5.41 5.41 0 0 1 3.68 9c0-.593.102-1.17.284-1.706V4.962H.957A9.006 9.006 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
);

function getStoredSession() {
    try {
        const storedValue = localStorage.getItem(AUTH_STORAGE_KEY);
        return storedValue ? JSON.parse(storedValue) : null;
    } catch {
        return null;
    }
}

function persistSession(session) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function getApiError(payload, fallbackMessage) {
    if (payload?.error) {
        if (Array.isArray(payload.details) && payload.details.length > 0) {
            return `${payload.error} ${payload.details.join(' ')}`;
        }

        return payload.error;
    }

    return fallbackMessage;
}

function formatCrpInput(value) {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) {
        return digits;
    }

    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

async function postJson(path, body) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    return { response, payload };
}

export function LoginPage() {
    const navigate = useNavigate();
    const googleButtonRef = useRef(null);
    const roleRef = useRef('paciente');
    const [mode, setMode] = useState('login');
    const [role, setRole] = useState('paciente');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        crp: '',
        password: '',
        confirmPassword: '',
    });
    const [statusError, setStatusError] = useState('');
    const [statusSuccess, setStatusSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
    const [isGoogleReady, setIsGoogleReady] = useState(false);
    const [currentUser, setCurrentUser] = useState(() => getStoredSession()?.user || null);

    const isLogin = mode === 'login';
    const isPaciente = role === 'paciente';
    const isPsicologo = role === 'psicologo';

    roleRef.current = role;

    const content = {
        paciente: {
            login: {
                title: 'Entrar como paciente',
                description: 'Acesse seu espaço, seu diário e seus check-ins.',
                submitLabel: 'Entrar',
                toggleLabel: 'Cadastre-se',
            },
            signup: {
                title: 'Criar conta de paciente',
                description: 'Crie seu acesso e comece seu acompanhamento com mais calma.',
                submitLabel: 'Criar conta',
                toggleLabel: 'Fazer login',
            },
        },
        psicologo: {
            login: {
                title: 'Entrar como psicólogo',
                description: 'Acesse seus pacientes e acompanhamentos.',
                submitLabel: 'Entrar',
                toggleLabel: 'Cadastre-se',
            },
            signup: {
                title: 'Criar conta de psicólogo',
                description: 'Crie seu acesso profissional informando o CRP.',
                submitLabel: 'Criar conta',
                toggleLabel: 'Fazer login',
            },
        },
    };

    const activeContent = content[role][mode];

    const finalizeAuth = (payload, successMessage) => {
        persistSession(payload);
        setCurrentUser(payload.user);
        setStatusError('');
        setStatusSuccess(successMessage);
        navigate('/');
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData((currentValue) => ({
            ...currentValue,
            [name]: name === 'crp' ? formatCrpInput(value) : value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setStatusError('');
        setStatusSuccess('');

        if (!isLogin && formData.password !== formData.confirmPassword) {
            setStatusError('As senhas não coincidem.');
            return;
        }

        if (isPsicologo && !/^\d{2}\/\d{6}$/.test(formData.crp)) {
            setStatusError('CRP inválido. Use o formato 00/000000.');
            return;
        }

        setIsSubmitting(true);

        try {
            const endpoint = isLogin ? '/auth/login/' : '/auth/register/';
            const body = {
                password: formData.password,
                role,
            };

            if (isPsicologo) {
                body.crp = formData.crp;
            } else {
                body.email = formData.email;
            }

            if (!isLogin) {
                body.name = formData.name;
                body.confirmPassword = formData.confirmPassword;
            }

            const { response, payload } = await postJson(endpoint, body);
            if (!response.ok) {
                throw new Error(getApiError(payload, 'Não foi possível concluir a autenticação.'));
            }

            finalizeAuth(payload, isLogin ? 'Login realizado com sucesso.' : 'Conta criada com sucesso.');
        } catch (error) {
            setStatusError(error.message || 'Não foi possível concluir a autenticação.');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID || !googleButtonRef.current || isPsicologo) {
            return undefined;
        }

        let isCancelled = false;

        const initializeGoogleButton = () => {
            if (isCancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
                return;
            }

            googleButtonRef.current.innerHTML = '';
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: async ({ credential }) => {
                    if (!credential) {
                        setStatusError('O Google não retornou um token válido.');
                        return;
                    }

                    setStatusError('');
                    setStatusSuccess('');
                    setIsGoogleSubmitting(true);

                    try {
                        const { response, payload } = await postJson('/auth/google/', {
                            credential,
                            role: roleRef.current,
                        });

                        if (!response.ok) {
                            throw new Error(getApiError(payload, 'Não foi possível entrar com Google.'));
                        }

                        finalizeAuth(payload, 'Login com Google realizado com sucesso.');
                    } catch (error) {
                        setStatusError(error.message || 'Não foi possível entrar com Google.');
                    } finally {
                        setIsGoogleSubmitting(false);
                    }
                },
            });

            window.google.accounts.id.renderButton(googleButtonRef.current, {
                theme: 'outline',
                size: 'large',
                shape: 'pill',
                text: 'continue_with',
                locale: 'pt-BR',
                width: Math.max(320, googleButtonRef.current.clientWidth || 320),
            });
            setIsGoogleReady(true);
        };

        if (window.google?.accounts?.id) {
            initializeGoogleButton();
            return () => {
                isCancelled = true;
            };
        }

        const existingScript = document.querySelector('script[data-google-identity="true"]');
        if (existingScript) {
            existingScript.addEventListener('load', initializeGoogleButton, { once: true });
            return () => {
                isCancelled = true;
            };
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = 'true';
        script.addEventListener('load', initializeGoogleButton, { once: true });
        script.addEventListener('error', () => {
            if (!isCancelled) {
                setStatusError('Não foi possível carregar o login do Google.');
            }
        }, { once: true });
        document.head.appendChild(script);

        return () => {
            isCancelled = true;
        };
    }, [isPsicologo]);

    const identifierLabel = isPsicologo ? 'CRP' : 'E-mail';
    const identifierPlaceholder = isPsicologo ? '00/000000' : 'voce@email.com';
    const identifierIcon = isPsicologo ? <Stethoscope size={18} className={styles.inputIcon} /> : <Mail size={18} className={styles.inputIcon} />;
    const identifierFieldName = isPsicologo ? 'crp' : 'email';

    return (
        <main className={styles.mainContainer}>
            <section className={styles.info}>
                <div className={styles.badge}>
                    <Leaf size={22} />
                </div>

                <h2 className={styles.headline}>
                    Bem-vindo de volta ao <span className={styles.highlight}>InnerTalk</span>.
                </h2>
                <p className={styles.subtext}>
                    Retome sua jornada de autocuidado. Um lugar tranquilo para respirar, escrever e conversar.
                </p>

                <div className={styles.features}>
                    <div className={styles.feature}>
                        <Leaf size={18} className={styles.featureIconLeaf} />
                        <p>Check-in de humor em segundos</p>
                    </div>
                    <div className={styles.feature}>
                        <MessageCircle size={18} className={styles.featureIconChat} />
                        <p>Conversa acolhedora com o Thery</p>
                    </div>
                    <div className={styles.feature}>
                        <NotebookText size={18} className={styles.featureIconNote} />
                        <p>Um resumo semanal claro para você e seu psicólogo</p>
                    </div>
                </div>
            </section>

            <section className={styles.formSection}>
                <form className={styles.form} onSubmit={handleSubmit}>
                    {currentUser && (
                        <div className={styles.sessionBanner}>
                            <p>
                                Sessão local encontrada para <strong>{currentUser.email || currentUser.crp}</strong>.
                            </p>
                            <Link to="/chatbot" className={styles.sessionLink}>
                                Ir para o chat
                            </Link>
                        </div>
                    )}

                    <div className={styles.roleToggle}>
                        <button type="button" className={isPaciente ? styles.roleButtonActive : styles.roleButton} onClick={() => setRole('paciente')} disabled={isSubmitting || isGoogleSubmitting}>
                            <User size={16} />
                            Paciente
                        </button>
                        <button type="button" className={isPsicologo ? styles.roleButtonActive : styles.roleButton} onClick={() => setRole('psicologo')} disabled={isSubmitting || isGoogleSubmitting}>
                            <Stethoscope size={16} />
                            Psicólogo
                        </button>
                    </div>

                    <h3 className={styles.title}>{activeContent.title}</h3>
                    <p className={styles.description}>{activeContent.description}</p>

                    {!isLogin && (
                        <label className={styles.label} htmlFor="name">
                            Nome
                            <div className={styles.inputWrapper}>
                                <User size={18} className={styles.inputIcon} />
                                <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Seu nome" required />
                            </div>
                        </label>
                    )}

                    <label className={styles.label} htmlFor={identifierFieldName}>
                        {identifierLabel}
                        <div className={styles.inputWrapper}>
                            {identifierIcon}
                            <input
                                type={isPsicologo ? 'text' : 'email'}
                                id={identifierFieldName}
                                name={identifierFieldName}
                                placeholder={identifierPlaceholder}
                                value={isPsicologo ? formData.crp : formData.email}
                                onChange={handleInputChange}
                                inputMode={isPsicologo ? 'numeric' : 'email'}
                                autoComplete={isPsicologo ? 'off' : 'email'}
                                maxLength={isPsicologo ? 9 : undefined}
                                required
                            />
                        </div>
                    </label>

                    <label className={styles.label} htmlFor="password">
                        Senha
                        <div className={styles.inputWrapper}>
                            <Lock size={18} className={styles.inputIcon} />
                            <input type="password" id="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} required />
                        </div>
                    </label>

                    {!isLogin && (
                        <label className={styles.label} htmlFor="confirmPassword">
                            Confirmar senha
                            <div className={styles.inputWrapper}>
                                <Lock size={18} className={styles.inputIcon} />
                                <input type="password" id="confirmPassword" name="confirmPassword" placeholder="••••••••" value={formData.confirmPassword} onChange={handleInputChange} required />
                            </div>
                        </label>
                    )}

                    {statusError && <p className={styles.errorMessage}>{statusError}</p>}
                    {statusSuccess && <p className={styles.successMessage}>{statusSuccess}</p>}

                    <button type="submit" className={styles.submitButton} disabled={isSubmitting || isGoogleSubmitting}>
                        {isSubmitting ? 'Enviando...' : activeContent.submitLabel}
                        {!isSubmitting && <ArrowRight size={18} />}
                    </button>

                    <div className={styles.divider}>
                        <span>ou</span>
                    </div>

                    {GOOGLE_CLIENT_ID && isPaciente ? (
                        <div className={styles.googleSlot}>
                            <div ref={googleButtonRef} className={styles.googleButtonMount} />
                        </div>
                    ) : GOOGLE_CLIENT_ID && isPsicologo ? (
                        <button type="button" className={styles.googleButtonDisabled} disabled>
                            <GoogleIcon />
                            Login com Google indisponível para psicólogo
                        </button>
                    ) : (
                        <button type="button" className={styles.googleButtonDisabled} disabled>
                            <GoogleIcon />
                            Configure VITE_GOOGLE_CLIENT_ID para habilitar o Google
                        </button>
                    )}

                    {GOOGLE_CLIENT_ID && isPaciente && !isGoogleReady && <p className={styles.helperText}>Carregando login do Google...</p>}
                    {isGoogleSubmitting && <p className={styles.helperText}>Validando conta Google...</p>}

                    <p className={styles.footerText}>
                        Novo por aqui?{' '}
                        <button type="button" className={styles.footerLink} onClick={() => setMode(isLogin ? 'signup' : 'login')} disabled={isSubmitting || isGoogleSubmitting}>
                            {activeContent.toggleLabel === 'Cadastre-se' ? 'Criar conta' : activeContent.toggleLabel}
                        </button>
                    </p>
                </form>
            </section>
        </main>
    );
}