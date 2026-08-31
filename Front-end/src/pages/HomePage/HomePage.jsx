import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Sparkles, Smile, ShieldCheck, icons } from 'lucide-react';

import { Header } from '../../components/Header/Header';

const features = [
    {
        icon: Sparkles,
        title: 'Chat com IA',
        description: 'Um primeiro acolhimento a qualquer hora com o Thery',
    },
    {
        icon: Smile,
        title: 'Check-in de humor',
        description: 'Registre como você está se sentindo em poucos segundos',
    },
    {
        icon: Leaf,
        title: 'Diário emocional',
        description: 'Um resumo da sua semana pronto para compartilhar',
    },
    {
        icon: ShieldCheck,
        title: 'Acompanhamento',
        description: 'Compartilhe seu progresso com seu psicólogo',
    },
];

export function HomePage() {
    return (
        <>
            <Header />

            <main className="pt-12 min-h-screen bg-gradient-to-br from-[#E4FBF4] to-[#f3f9f7]">
                <section className="px-24 px-6 py-16 md:py-24">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

                        {/* Coluna esquerda - texto */}
                        <div className='flex flex-col gap-5'>
                            <span className="inline-flex max-w-68 items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm cursor-default">
                                <Leaf size={16} className="text-emerald-500" />
                                Um espaço tranquilo para respirar
                            </span>

                            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-slate-900 cursor-default font-secondary">
                                Bem-vindo ao{' '}
                                <span className="text-emerald-500">Inner Talk!</span> Cuide
                                do seu dia com leveza.
                            </h1>

                            <p className="text-base md:text-lg text-slate-500 max-w-lg cursor-default">
                                Um primeiro acolhimento com IA, check-in de humor diário e um
                                diário emocional que resume sua semana — pronto para
                                compartilhar com seu psicólogo.
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <Link
                                    to="/chatbot"
                                    className="inline-flex items-center gap-2 rounded-full bg-[#6fc9b6] px-6 py-3 text-white font-medium shadow-md hover:opacity-90 transition-colors"
                                >
                                    <Sparkles size={18} />
                                    Conversar agora
                                </Link>

                                <Link
                                    to="/checkin"
                                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-slate-700 font-medium shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
                                >
                                    <Smile size={18} />
                                    Fazer check-in
                                </Link>
                            </div>

                            <p className="flex items-center gap-2 text-sm text-black cursor-default">
                                <ShieldCheck size={16} />
                                O Inner Talk é um apoio inicial e não substitui um profissional.
                            </p>
                        </div>

                        {/* Coluna direita - preview do chat */}
                        <div className="flex justify-center md:justify-end">
                            <div className="w-full flex flex-col gap-5 rounded-3xl bg-white shadow-xl p-6">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                                        <Sparkles size={18} className="text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 leading-none">
                                            Mente Serena
                                        </p>
                                        <p className="text-sm text-slate-400">
                                            está aqui para escutar
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <div className="rounded-tr-2xl rounded-bl-2xl rounded-br-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700 w-fit max-w-[85%] font-main">
                                        Olá! 💚 Eu sou o Thery, seu assistente virtual de apoio emocional, como posso ajudar?
                                    </div>

                                    <div className="rounded-tl-2xl rounded-bl-2xl rounded-br-2xl bg-emerald-500 px-4 py-3 text-sm text-white w-fit self-end font-main">
                                        Olá Thery, estou me sentindo bem hoje!
                                    </div>

                                    <div className="rounded-tr-2xl rounded-bl-2xl rounded-br-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700 w-fit max-w-[85%] font-main">
                                        Que bom notar essa diferença 💚 o que ajudou você hoje?
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="px-6 md:px-24 py-16">
                    <div className="mb-10">
                        <h2 className="text-2xl font-bold font-secondary">
                            Tudo o que você precisa em um só lugar
                        </h2>
                        <p className="text-slate-500">
                            Ferramentas gentis para cuidar de você, todos os dias.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature) => {
                            const Icon = feature.icon;

                            return (
                                <div
                                    key={feature.title}
                                    className="flex flex-col gap-3 bg-white border border-gray-300 px-6 py-5 rounded-3xl"
                                >
                                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#E8F6F6]">
                                        <Icon className="text-black" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold font-secondary">{feature.title}</h3>
                                        <p className="font-secondary text-sm text-slate-500 mt-1">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>
        </>
    );
}