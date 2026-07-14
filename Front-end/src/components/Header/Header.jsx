import { Leaf, Bot, House, Smile, NotebookPen, LogIn, LayoutDashboard, Stethoscope, SmileIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const AUTH_STORAGE_KEY = 'innertalk.auth';

function getStoredRole() {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        return raw ? JSON.parse(raw)?.user?.role : null;
    } catch {
        return null;
    }
}

const PACIENTE_LINKS = [
    { to: '/', icon: House, label: 'Início' },
    { to: '/chatbot', icon: Bot, label: 'Thery' },
    { to: '/checkin', icon: SmileIcon, label: 'Check-in' },
    { to: '/diario', icon: NotebookPen, label: 'Diário' },
];

const PSICOLOGO_LINKS = [
    { to: '/resumo', icon: LayoutDashboard, label: 'Resumo' },
    { to: '/painel', icon: Stethoscope, label: 'Painel' },
];

export function Header() {
    const [role, setRole] = useState(() => getStoredRole());

    useEffect(() => {
        const handleStorage = () => setRole(getStoredRole());
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const links = role === 'psicologo' ? PSICOLOGO_LINKS : role === 'paciente' ? PACIENTE_LINKS : [];

    return (
        <header className="bg-[#e3f5ee] items-center justify-between py-4 px-20 flex shadow-md">
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
                                {links.map(({ to, icon: Icon, label }) => (
                                    <li key={label}>
                                        <Link
                                            to={to}
                                            className='flex gap-2 items-center text-[#50686d] font-secondary transition-colors hover:bg-[#84f0da50] px-3 py-2 rounded-full'
                                        >
                                            <Icon size={20} />
                                            {label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </>
                )}
            </section>

            <section>
                <Link to="/login" className='text-white font-secondary transition-colors'>
                    <button className='flex gap-2 bg-[linear-gradient(135deg,#6fc9b6,#4abba1)] p-3 rounded-full w-[100px] h-[40px] flex items-center justify-center shadow-md hover:opacity-90 transition-colors cursor-pointer'>
                        <LogIn size={20} />
                        Entrar
                    </button>
                </Link>
            </section>
        </header>
    )
}