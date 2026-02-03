# 🧠 Inner Talk — Assistente Virtual de Apoio Emocional

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC?logo=tailwind-css&logoColor=white)
![Django](https://img.shields.io/badge/Django-5-092E20?logo=django&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-API-412991?logo=openai&logoColor=white)
![License](https://img.shields.io/badge/license-Educational-lightgrey)

O **Inner Talk** é uma plataforma de apoio emocional que utiliza **Inteligência Artificial** para oferecer um espaço seguro e acolhedor onde a pessoa pode compartilhar sentimentos e receber palavras de conforto.

> 💚 Um primeiro acolhimento, com empatia, escuta e cuidado.

---

## 📋 Sobre o Projeto

Este chatbot foi desenvolvido com o objetivo de fornecer uma **escuta empática inicial** para pessoas que precisam de suporte emocional.

O assistente utiliza a **API da OpenAI** para gerar respostas acolhedoras e humanas, sempre reforçando que **não substitui acompanhamento profissional de saúde mental**.

---

## ✨ Funcionalidades

- 💬 Interface de chat intuitiva e responsiva  
- 🤖 Respostas empáticas geradas por IA (OpenAI)  
- 📱 Design moderno com Tailwind CSS  
- 🔒 Ambiente seguro e privado  
- ℹ️ Recursos de apoio profissional integrados  
- ⚠️ Avisos claros sobre limitações médicas  

---

## 🛠️ Tecnologias Utilizadas

### 🔹 Backend
- Python 3.12+
- Django 5
- Django REST Framework
- OpenAI API
- SQLite
- Django CORS Headers

### 🔹 Frontend
- React 19
- Vite
- Tailwind CSS
- Lucide React
- React Markdown

---

## 📦 Pré-requisitos

Antes de começar, instale:

- Python 3.12+
- Node.js 18+
- Git
- Conta na OpenAI

---

# 🚀 Instalação e Configuração

## 1️⃣ Clonar o repositório

```bash
git clone <url-do-repositorio>
cd Inner_Talk
```

---

# 🔹 Backend (Django)

## Entrar na pasta

```bash
cd Back-end
```

## Criar ambiente virtual

### Windows
```bash
python -m venv env
env\Scripts\activate
```

### Linux/Mac
```bash
python3 -m venv env
source env/bin/activate
```

## Instalar dependências

```bash
pip install -r requirements.txt
```

## Criar arquivo .env

Crie:

```
Back-end/.env
```

Conteúdo:

```
OPENAI_API_KEY=sua_chave_api_aqui
```

⚠️ Nunca commite esse arquivo.

---

## Rodar migrações

```bash
python manage.py migrate
```

## Iniciar servidor backend

```bash
python manage.py runserver
```

Backend rodando em:

```
http://127.0.0.1:8000/
```

---

# 🔹 Frontend (React + Vite)

Em outro terminal:

```bash
cd Front-end
npm install
npm run dev
```

Frontend rodando em:

```
http://localhost:5173/
```

---

# 🎉 Pronto!

Acesse:

```
http://localhost:5173/
```

E comece a usar o **Inner Talk** 💚

---

# 📁 Estrutura do Projeto

```
Inner_Talk/
│
├── Back-end/
│   ├── app/chat/
│   ├── innerTalk/
│   ├── manage.py
│   ├── requirements.txt
│   └── .env
│
└── Front-end/
    ├── src/components/ChatBot/
    ├── App.jsx
    ├── main.jsx
    ├── index.css
    ├── package.json
    └── vite.config.js
```

---

# 🔧 Scripts Disponíveis

## Backend

```bash
python manage.py runserver
python manage.py migrate
python manage.py createsuperuser
python manage.py test
```

## Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

---

# 🔐 Segurança e Privacidade

- Conversas não são armazenadas permanentemente
- API Key deve permanecer privada
- Nunca commitar `.env`
- O app exibe avisos claros sobre limitações médicas

---

# ⚠️ Avisos Importantes

Este assistente:

❌ Não substitui psicólogos ou médicos  
❌ Não fornece diagnósticos  
❌ Não prescreve tratamentos  

Em caso de emergência:

📞 CVV: 188  
🌐 https://cvv.org.br/

Busque ajuda profissional.

---

# 👨‍💻 Desenvolvedor

Desenvolvido por **Nicolas** com 💚  
Projeto acadêmico focado em **IA + apoio emocional**.

---

# 📄 Licença

Uso educacional.
