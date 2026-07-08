import React from 'react';
import { Link } from 'react-router-dom';
import styles from './LoginPage.module.css';

export function LoginPage() {
    return (
        <>
            <h1>Login Page</h1>

            <div className={styles.container}>
                <Link to="/chatbot">Go to ChatBot Page</Link>
                <Link to="/">Go to Home Page</Link>
            </div>
        </>
    );
}