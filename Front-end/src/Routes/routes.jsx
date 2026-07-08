import React from 'react';
import { Route, Routes, BrowserRouter } from 'react-router-dom';

import { HomePage } from '../pages/HomePage/HomePage';
import { LoginPage } from '../pages/LoginPage/LoginPage';
import { ChatBotPage } from '../pages/ChatBotPage/ChatBotPage';

const Rotas = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/chatbot" element={<ChatBotPage />} />
                <Route path="/login" element={<LoginPage />} />
            </Routes>
        </BrowserRouter>
    )
}

export default Rotas;