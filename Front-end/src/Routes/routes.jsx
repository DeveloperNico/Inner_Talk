import React from 'react';
import { Route, Routes, BrowserRouter } from 'react-router-dom';

import { HomePage } from '../pages/HomePage/HomePage';
import { LoginPage } from '../pages/LoginPage/LoginPage';
import { ChatBotPage } from '../pages/ChatBotPage/ChatBotPage';
import { CheckInPage } from '../pages/CheckInPage/CheckInPage';
import { DiarioPage } from '../pages/DiarioPage/DiarioPage';
import { ResumoPage } from '../pages/ResumoPage/ResumoPage';
import { CalendarPage } from '../pages/CalendarPage/CalendarPage';
import { VinculoPage } from '../pages/VinculoPage/VinculoPage';
import { PainelPage } from '../pages/PainelPage/PainelPage';
import { PatientChatWidget } from '../components/PatientChatWidget/PatientChatWidget';

const Rotas = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/chatbot" element={<ChatBotPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/checkin" element={<CheckInPage />} />
                <Route path="/diario" element={<DiarioPage />} />
                <Route path="/resumo" element={<ResumoPage />} />
                <Route path="/calendario" element={<CalendarPage />} />
                <Route path="/vinculo" element={<VinculoPage />} />
                <Route path="/painel" element={<PainelPage />} />
                <Route path="/painel/:pacienteId" element={<PainelPage />} />
            </Routes>
            <PatientChatWidget />
        </BrowserRouter>
    );
};

export default Rotas;