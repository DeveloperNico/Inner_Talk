import React from 'react';
import { Link } from 'react-router-dom';
import styles from './HomePage.module.css';

export function HomePage() {
    return (
        <>
            <h1>Home Page</h1>

            <div className={styles.container}>
                <Link to="/chatbot">Go to ChatBot Page</Link>
                <Link to="/login">Go to Login Page</Link>
            </div>
        </>
    );
};