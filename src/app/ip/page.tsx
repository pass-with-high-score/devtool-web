'use client';

import { useState, useEffect, useRef } from 'react';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import styles from './page.module.css';
import 'mapbox-gl/dist/mapbox-gl.css';

interface IPInfo {
    ip: string;
    success: boolean;
    type: string;
    continent: string;
    continent_code: string;
    country: string;
    country_code: string;
    region: string;
    region_code: string;
    city: string;
    latitude: number;
    longitude: number;
    is_eu: boolean;
    postal: string;
    calling_code: string;
    capital: string;
    borders: string;
    flag: {
        img: string;
        emoji: string;
        emoji_unicode: string;
    };
    connection: {
        asn: number;
        org: string;
        isp: string;
        domain: string;
    };
    timezone: {
        id: string;
        abbr: string;
        is_dst: boolean;
        offset: number;
        utc: string;
        current_time: string;
    };
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoibnFtZ2FtaW5nIiwiYSI6ImNseW83Nm83djBlOTAyaXE0YmF3bG1wbHkifQ.kqT_oTn3KX4wVx8foMkabQ';

export default function IPCheckerPage() {
    const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchIp, setSearchIp] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const { toasts, addToast, removeToast } = useToast();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markerRef = useRef<mapboxgl.Marker | null>(null);

    const fetchIP = async (ip?: string) => {
        try {
            const url = ip ? `https://ipwho.is/${ip}` : 'https://ipwho.is/';
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch IP info');
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Invalid IP address');
            setIpInfo(data);
            setError(null);
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        }
    };

    useEffect(() => {
        fetchIP().finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!ipInfo || !mapContainerRef.current) return;

        // Dynamically import mapbox-gl
        import('mapbox-gl').then((mapboxgl) => {
            mapboxgl.default.accessToken = MAPBOX_TOKEN;

            if (mapRef.current) {
                // Update existing map
                mapRef.current.flyTo({
                    center: [ipInfo.longitude, ipInfo.latitude],
                    zoom: 10,
                });
                // Update marker
                if (markerRef.current) {
                    markerRef.current.setLngLat([ipInfo.longitude, ipInfo.latitude]);
                }
            } else {
                // Create new map
                const map = new mapboxgl.default.Map({
                    container: mapContainerRef.current!,
                    style: 'mapbox://styles/mapbox/dark-v11',
                    center: [ipInfo.longitude, ipInfo.latitude],
                    zoom: 10,
                });

                // Add marker
                const marker = new mapboxgl.default.Marker({ color: '#FF0000' })
                    .setLngLat([ipInfo.longitude, ipInfo.latitude])
                    .addTo(map);

                mapRef.current = map;
                markerRef.current = marker;
            }
        });

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
    }, [ipInfo]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchIp.trim()) return;

        setIsSearching(true);
        try {
            await fetchIP(searchIp.trim());
            addToast('IP lookup successful!', 'success');
        } catch {
            addToast('Failed to lookup IP address', 'error');
        } finally {
            setIsSearching(false);
        }
    };

    const handleCheckMyIP = async () => {
        setSearchIp('');
        setIsSearching(true);
        try {
            await fetchIP();
            addToast('Showing your IP address', 'success');
        } catch {
            addToast('Failed to fetch your IP', 'error');
        } finally {
            setIsSearching(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Copied to clipboard!', 'success');
    };

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGradient}></div>
            <Navigation />

            <main className={styles.main}>
                <div className={styles.header}>
                    <h1 className={styles.title}>IP Address Checker</h1>
                    <p className={styles.subtitle}>View your public IP address and location</p>
                </div>

                {/* Search Form */}
                <form onSubmit={handleSearch} className={styles.searchForm}>
                    <div className={styles.searchInputWrapper}>
                        <input
                            type="text"
                            value={searchIp}
                            onChange={(e) => setSearchIp(e.target.value)}
                            placeholder="Enter IP address (e.g., 8.8.8.8)"
                            className={styles.searchInput}
                            disabled={isSearching}
                        />
                        <button
                            type="submit"
                            className={styles.searchBtn}
                            disabled={isSearching || !searchIp.trim()}
                        >
                            {isSearching ? 'Searching...' : 'Lookup'}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleCheckMyIP}
                        className={styles.myIpBtn}
                        disabled={isSearching}
                    >
                        Check My IP
                    </button>
                </form>

                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                        <p>Detecting your IP...</p>
                    </div>
                ) : error ? (
                    <div className={styles.error}>
                        <p>Error: {error}</p>
                        <button onClick={() => window.location.reload()} className={styles.retryBtn}>
                            Retry
                        </button>
                    </div>
                ) : ipInfo && (
                    <div className={styles.content}>
                        {/* IP Address Card */}
                        <div className={styles.ipCard}>
                            <div className={styles.ipLabel}>Your IP Address</div>
                            <div className={styles.ipValue}>
                                {ipInfo.ip}
                                <span className={styles.ipType}>{ipInfo.type}</span>
                                <button
                                    className={styles.copyBtn}
                                    onClick={() => copyToClipboard(ipInfo.ip)}
                                    title="Copy to clipboard"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className={styles.grid}>
                            {/* Location Info */}
                            <div className={styles.infoCard}>
                                <div className={styles.cardHeader}>
                                    <img
                                        src={ipInfo.flag.img}
                                        alt={ipInfo.country_code}
                                        className={styles.flag}
                                    />
                                    <h3>Location</h3>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>City</span>
                                    <span className={styles.value}>{ipInfo.city}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Region</span>
                                    <span className={styles.value}>{ipInfo.region}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Country</span>
                                    <span className={styles.value}>{ipInfo.country} {ipInfo.flag.emoji}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Continent</span>
                                    <span className={styles.value}>{ipInfo.continent}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Timezone</span>
                                    <span className={styles.value}>{ipInfo.timezone.id} ({ipInfo.timezone.utc})</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Coordinates</span>
                                    <span className={styles.value}>
                                        {ipInfo.latitude.toFixed(4)}, {ipInfo.longitude.toFixed(4)}
                                    </span>
                                </div>
                            </div>

                            {/* Network Info */}
                            <div className={styles.infoCard}>
                                <div className={styles.cardHeader}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="2" y1="12" x2="22" y2="12" />
                                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                    </svg>
                                    <h3>Network</h3>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>ASN</span>
                                    <span className={styles.value}>AS{ipInfo.connection.asn}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>ISP</span>
                                    <span className={styles.value}>{ipInfo.connection.isp}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Organization</span>
                                    <span className={styles.value}>{ipInfo.connection.org}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Domain</span>
                                    <span className={styles.value}>{ipInfo.connection.domain}</span>
                                </div>
                            </div>
                        </div>

                        {/* Map */}
                        <div className={styles.mapContainer}>
                            <div ref={mapContainerRef} className={styles.map}></div>
                        </div>
                    </div>
                )}
            </main>
            <footer className={styles.footer}>
                Powered by <a href="https://ipwho.is/" target="_blank" rel="noopener noreferrer">ipwho.is</a>
            </footer>
            <Toast toasts={toasts} removeToast={removeToast} />
        </div>
    );
}
