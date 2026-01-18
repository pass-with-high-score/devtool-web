import Link from 'next/link';
import styles from '../app/page.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerLinks}>
                <p>© 2026 DevTools. Open Source.</p>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <Link href="/chat" className={styles.policyLink}>
                        Community Chat
                    </Link>
                    <Link href="/about" className={styles.policyLink}>
                        About
                    </Link>
                    <Link href="/policy" className={styles.policyLink}>
                        Privacy &amp; Terms
                    </Link>
                </div>
            </div>
        </footer>
    );
}
