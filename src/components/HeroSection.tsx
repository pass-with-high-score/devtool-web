import { BoltIcon, GithubIcon } from '@/components/Icons';
import styles from '../app/page.module.css';

export default function HeroSection() {
    return (
        <header className={styles.hero}>
            <div className={styles.heroContent}>
                <div className={styles.logoBox}>
                    <BoltIcon size={48} />
                </div>
                <h1 className={styles.heroTitle}>
                    DevTools
                </h1>
                <p className={styles.heroTagline}>
                    Free online tools for developers
                </p>
                <p className={styles.heroDescription}>
                    A collection of useful utilities to simplify your development workflow.
                    No signup required. 100% client-side processing.
                </p>
                <a
                    href="https://github.com/pass-with-high-score/devtool-web"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.githubButton}
                >
                    <GithubIcon size={20} />
                    View on GitHub
                </a>
            </div>
        </header>
    );
}
