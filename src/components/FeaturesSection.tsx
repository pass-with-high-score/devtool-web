import { BoltIcon, ShieldIcon, SmartphoneIcon } from '@/components/Icons';
import styles from '../app/page.module.css';

export default function FeaturesSection() {
    return (
        <section className={styles.featuresSection}>
            <div className={styles.featuresList}>
                <div className={styles.feature}>
                    <span className={styles.featureIcon}>
                        <BoltIcon size={28} />
                    </span>
                    <div>
                        <h4>Fast &amp; Free</h4>
                        <p>All tools are free to use with no rate limits</p>
                    </div>
                </div>
                <div className={styles.feature}>
                    <span className={styles.featureIcon}>
                        <ShieldIcon size={28} />
                    </span>
                    <div>
                        <h4>Privacy First</h4>
                        <p>Data stays in your browser, nothing sent to servers</p>
                    </div>
                </div>
                <div className={styles.feature}>
                    <span className={styles.featureIcon}>
                        <SmartphoneIcon size={28} />
                    </span>
                    <div>
                        <h4>Mobile Ready</h4>
                        <p>Works on any device with a modern browser</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
