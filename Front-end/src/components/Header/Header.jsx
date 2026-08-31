import { Leaf, Bot, House, Smile, NotebookPen, LogIn, LayoutDashboard, Stethoscope, SmileIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const AUTH_STORAGE_KEY = 'innertalk.auth';

function getStoredUser() {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        return raw ? JSON.parse(raw)?.user ?? null : null;
    } catch {
        return null;
    }
}

function getInitials(name) {
    if (!name) return '?';
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

const PACIENTE_LINKS = [
    { to: '/', icon: House, label: 'Início' },
    { to: '/chatbot', icon: Bot, label: 'Thery' },
    { to: '/checkin', icon: SmileIcon, label: 'Check-in' },
    { to: '/diario', icon: NotebookPen, label: 'Diário' },
    { to: '/resumo', icon: LayoutDashboard, label: 'Resumo' },
];

// O psicólogo acessa o Resumo de um paciente específico a partir do Painel,
// por isso não há um link direto de "Resumo" aqui (sem paciente selecionado
// a página não faz sentido sozinha).
const PSICOLOGO_LINKS = [
    { to: '/painel', icon: Stethoscope, label: 'Painel' },
];

export function Header() {
    const [user, setUser] = useState(() => getStoredUser());
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleStorage = () => setUser(getStoredUser());
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const role = user?.role;
    const links = role === 'psicologo' ? PSICOLOGO_LINKS : role === 'paciente' ? PACIENTE_LINKS : [];

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 0);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header className={`fixed top-0 left-0 right-0 z-[150] bg-[#EDFDF8] items-center justify-between py-4 px-20 flex ${scrolled ? "shadow-md" : "shadow-none"}`}>
            <section className='flex items-center gap-5'>
                <div className='flex items-center gap-3 pr-4'>
                    <div className='w-[36px] h-[36px] text-white bg-[linear-gradient(135deg,#6fc9b6,#4abba1)] rounded-full flex items-center justify-center shadow-md'>
                        <Leaf size={20} />
                    </div>
                    <div>
                        <h1 className='text-black font-bold font-secondary'>InnerTalk</h1>
                        <p className='text-sm text-[#50686d] font-secondary'>Conecte-se ‧ Entenda-se ‧ Transforme-se</p>
                    </div>
                </div>

                {links.length > 0 && (
                    <>
                        <span className='h-8 w-px bg-[#509486] self-center'></span>
                        <nav>
                            <ul className='flex gap-5'>
                                {links.map(({ to, icon: Icon, label }) => {
                                    const isActive = location.pathname === to
                                        || location.pathname.startsWith(`${to}/`);

                                    return (
                                        <li key={label}>
                                            <Link
                                                to={to}
                                                className={`flex gap-2 items-center font-secondary transition-colors px-3 py-2 rounded-full ${isActive
                                                        ? 'bg-[#C3EEE2] text-[#1f4d43] font-medium'
                                                        : 'text-[#50686d] hover:bg-[#84f0da50]'
                                                    }`}
                                            >
                                                <Icon size={20} />
                                                {label}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </>
                )}
            </section>

            <section>
                {user ? (
                    <div className='flex items-center gap-3'>
                        <div className='w-[40px] h-[40px] shrink-0 text-white bg-[linear-gradient(135deg,#6fc9b6,#4abba1)] rounded-full flex items-center justify-center shadow-md font-bold font-secondary'>
                            {getInitials(user.name)}
                        </div>
                        <div className='text-left leading-tight'>
                            <p className='text-sm font-bold font-secondary text-slate-800'>
                                {user.name || (role === 'psicologo' ? 'Psicólogo' : 'Paciente')}
                            </p>
                            <p className='text-xs text-[#50686d] font-secondary'>
                                {role === 'psicologo' ? user.crp : user.email}
                            </p>
                        </div>
                    </div>
                ) : (
                    <Link to="/login" className='text-white font-secondary transition-colors'>
                        <button className='flex gap-2 bg-[linear-gradient(135deg,#6fc9b6,#4abba1)] p-3 rounded-full w-[100px] h-[40px] flex items-center justify-center shadow-md hover:opacity-90 transition-colors cursor-pointer'>
                            <LogIn size={20} />
                            Entrar
                        </button>
                    </Link>
                )}
            </section>
        </header>
    )
}