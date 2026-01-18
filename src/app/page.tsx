// Server Component - optimized for SEO
import HeroSection from '@/components/HeroSection';
import ToolsGrid from '@/components/ToolsGrid';
import FeaturesSection from '@/components/FeaturesSection';
import Footer from '@/components/Footer';
import styles from './page.module.css';

export default function HomePage() {
    return (
        <div className={styles.container}>
            {/* Background */}
            <div className={styles.backgroundGradient}></div>

            {/* Hero Section */}
            <HeroSection />

            {/* Tools Grid */}
            <ToolsGrid />

            {/* Features Section */}
            <FeaturesSection />

            {/* Footer */}
            <Footer />
        </div>
    );
}
