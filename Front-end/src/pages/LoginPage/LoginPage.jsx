import { useState } from 'react';
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

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z"
            fill="#4285F4"
        />
        <path
            d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
            fill="#34A853"
        />
        <path
            d="M3.964 10.706A5.41 5.41 0 0 1 3.68 9c0-.593.102-1.17.284-1.706V4.962H.957A9.006 9.006 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
            fill="#FBBC05"
        />
        <path
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
            fill="#EA4335"
        />
    </svg>
);

export function LoginPage() {
    const [mode, setMode] = useState('login');
    const [role, setRole] = useState('paciente');

    const isLogin = mode === 'login';
    const isPaciente = role === 'paciente';

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
                description: 'Crie seu acesso profissional para acompanhar seus pacientes.',
                submitLabel: 'Criar conta',
                toggleLabel: 'Fazer login',
            },
        },
    };

    const activeContent = content[role][mode];

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
                <form className={styles.form}>
                    <div className={styles.roleToggle}>
                        <button
                            type="button"
                            className={isPaciente ? styles.roleButtonActive : styles.roleButton}
                            onClick={() => setRole('paciente')}
                        >
                            <User size={16} />
                            Paciente
                        </button>
                        <button
                            type="button"
                            className={!isPaciente ? styles.roleButtonActive : styles.roleButton}
                            onClick={() => setRole('psicologo')}
                        >
                            <Stethoscope size={16} />
                            Psicólogo
                        </button>
                    </div>

                    <h3 className={styles.title}>{activeContent.title}</h3>
                    <p className={styles.description}>{activeContent.description}</p>

                    <label className={styles.label} htmlFor="email">
                        E-mail
                        <div className={styles.inputWrapper}>
                            <Mail size={18} className={styles.inputIcon} />
                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="voce@email.com"
                                required
                            />
                        </div>
                    </label>

                    <label className={styles.label} htmlFor="password">
                        Senha
                        <div className={styles.inputWrapper}>
                            <Lock size={18} className={styles.inputIcon} />
                            <input
                                type="password"
                                id="password"
                                name="password"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </label>

                    {!isLogin && (
                        <label className={styles.label} htmlFor="confirmPassword">
                            Confirmar senha
                            <div className={styles.inputWrapper}>
                                <Lock size={18} className={styles.inputIcon} />
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </label>
                    )}

                    <button type="submit" className={styles.submitButton}>
                        {activeContent.submitLabel}
                        <ArrowRight size={18} />
                    </button>

                    <div className={styles.divider}>
                        <span>ou</span>
                    </div>

                    <button type="button" className={styles.googleButton}>
                        <GoogleIcon />
                        Continuar com Google
                    </button>

                    <p className={styles.footerText}>
                        Novo por aqui?{' '}
                        <button
                            type="button"
                            className={styles.footerLink}
                            onClick={() => setMode(isLogin ? 'signup' : 'login')}
                        >
                            {activeContent.toggleLabel === 'Cadastre-se' ? 'Criar conta' : activeContent.toggleLabel}
                        </button>
                    </p>
                </form>
            </section>
        </main>
    );
}
