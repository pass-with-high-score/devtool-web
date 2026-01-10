import type { Metadata } from 'next';
import ChatWidget from '@/components/ChatWidget';
import Navigation from '@/components/Navigation';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: 'Community Chat',
    description: 'Chat with other developers in real-time. Anonymous, no signup required.',
};

export default function ChatPage() {
    return (
        <div className={styles.container}>
            <div className={styles.backgroundGradient}></div>

            <Navigation />

            <header className={styles.header}>
                <h1 className={styles.title}>Community Chat</h1>
                <p className={styles.subtitle}>Chat with other developers. Anonymous & real-time.</p>
            </header>

            <main className={styles.main}>
                <ChatWidget />
            </main>

            <footer className={styles.footer}>
                <p>Messages are public. Be respectful.</p>
            </footer>
        </div>
    );
}
