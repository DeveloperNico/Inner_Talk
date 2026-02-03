import { useState } from 'react'
import { Heart, Shield, MessageCircleHeart } from 'lucide-react';
import styles from './App.module.css'

import { ChatBot } from './components/ChatBot/ChatBot';

function App() {
  return (
    <>
      <main className={styles.container}>
        <div className={styles.iconMessageCircleHeart}>
          <MessageCircleHeart size={40} />
        </div>

        <div className={styles.textContainer}>
          <h1 className={styles.title}>
            Inner Talk
          </h1>
          <p className={styles.description}>
            Um espaço seguro para você compartilhar seus sentimentos e receber palavras de acolhimento
          </p>
        </div>

        <div className={styles.featuresContainer}>
          <div className={styles.featureItem}>
            <Heart className="h-4 w-4 text-primary" />
            <span>Escuta empática</span>
          </div>
          <div className={styles.featureItem}>
            <Shield className="" />
            <span>Espaço seguro</span>
          </div>
        </div>
      
        <ChatBot />
      </main>

    </>
  )
}

export default App
