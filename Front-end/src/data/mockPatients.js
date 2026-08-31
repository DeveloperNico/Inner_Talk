// Dados de exemplo (mock) para a visão do psicólogo, enquanto os endpoints
// reais de pacientes/resumo por IA não existem no backend. Trocar pelas
// chamadas à API (ex: GET /api/psicologo/pacientes/, GET /api/psicologo/
// pacientes/:id/resumo/) quando estiverem disponíveis.

function relativeSessionDate(daysFromNow, hour, minute = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
}

export const MOCK_PATIENTS = [
    {
        id: '1',
        name: 'Ana Beatriz',
        email: 'ana.beatriz@email.com',
        nextSession: relativeSessionDate(0, 15),
        lastCheckinLabel: 'Sexta',
        moodAverage: 3.6,
        moodTrend: 'up',
        weeklyMoods: [4, 3, 4, 3, 4, 4, null],
        checkinsThisWeek: 6,
        diaryEntriesCount: 4,
        alertsCount: 0,
        aiSummary: 'Ana teve uma semana com humor médio 3.6. Reportou ansiedade no início da semana, ligada a demandas de trabalho, e mostrou melhora após retomar caminhadas matinais. O sono às quintas apareceu como padrão a investigar. Termos frequentes no diário: calma, cansaço, gratidão.',
        highlights: {
            melhorDia: 'Sexta',
            diaDificil: 'Segunda',
            pontoAtencao: 'Sono irregular',
            recursoPositivo: 'Rede social próxima',
        },
    },
    {
        id: '2',
        name: 'Rafael Mendes',
        email: 'rafael.mendes@email.com',
        nextSession: relativeSessionDate(1, 10),
        lastCheckinLabel: 'Quinta',
        moodAverage: 1.8,
        moodTrend: 'down',
        weeklyMoods: [2, 2, 1, 2, null, null, null],
        checkinsThisWeek: 4,
        diaryEntriesCount: 1,
        alertsCount: 2,
        aiSummary: 'Rafael apresentou humor consistentemente baixo essa semana, com média 1.8. Relatou dificuldade de concentração e episódios de isolamento social. A entrada de diário desta semana menciona sensação de sobrecarga. Vale priorizar acolhimento logo no início da sessão.',
        highlights: {
            melhorDia: 'Terça',
            diaDificil: 'Quarta',
            pontoAtencao: 'Isolamento social',
            recursoPositivo: 'Terapia ocupacional',
        },
    },
    {
        id: '3',
        name: 'Camila Souza',
        email: 'camila.souza@email.com',
        nextSession: relativeSessionDate(3, 18),
        lastCheckinLabel: 'Domingo',
        moodAverage: 4.6,
        moodTrend: 'up',
        weeklyMoods: [5, 4, 5, 5, 4, 5, 4],
        checkinsThisWeek: 7,
        diaryEntriesCount: 3,
        alertsCount: 0,
        aiSummary: 'Camila teve uma semana estável e positiva, com humor médio 4.6 e check-in em todos os dias. O diário destaca conquistas pessoais e tempo dedicado ao autocuidado. Nenhum ponto de atenção relevante identificado nesta semana.',
        highlights: {
            melhorDia: 'Quarta',
            diaDificil: 'Terça',
            pontoAtencao: 'Nenhum identificado',
            recursoPositivo: 'Rotina de autocuidado',
        },
    },
    {
        id: '4',
        name: 'Diego Almeida',
        email: 'diego.almeida@email.com',
        nextSession: relativeSessionDate(4, 9),
        lastCheckinLabel: 'Segunda',
        moodAverage: 3.0,
        moodTrend: 'stable',
        weeklyMoods: [3, null, null, null, null, null, null],
        checkinsThisWeek: 1,
        diaryEntriesCount: 0,
        alertsCount: 0,
        aiSummary: 'Diego registrou apenas um check-in nesta semana, o que dificulta uma leitura mais completa do período. Pode ser interessante reforçar o convite para check-ins mais frequentes no início da sessão.',
        highlights: {
            melhorDia: 'Segunda',
            diaDificil: '—',
            pontoAtencao: 'Poucos registros na semana',
            recursoPositivo: '—',
        },
    },
];

export function getMockPatientById(id) {
    return MOCK_PATIENTS.find((patient) => patient.id === id) || null;
}
