import React from 'react';
import { Route, Routes, BrowserRouter } from 'react-router-dom';

import { HomePage } from '../pages/HomePage/HomePage';
import { LoginPage } from '../pages/LoginPage/LoginPage';
import { ChatBotPage } from '../pages/ChatBotPage/ChatBotPage';
import { CheckInPage } from '../pages/CheckInPage/CheckInPage';
import { DiarioPage } from '../pages/DiarioPage/DiarioPage';
import { ResumoPage } from '../pages/ResumoPage/ResumoPage';
import { PainelPage } from '../pages/PainelPage/PainelPage';

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
                <Route path="/painel" element={<PainelPage />} />
                <Route path="/painel/:pacienteId" element={<PainelPage />} />
            </Routes>
        </BrowserRouter>
    )
}

export default Rotas;