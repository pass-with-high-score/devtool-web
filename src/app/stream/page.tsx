'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import { ShieldIcon, BoltIcon } from '@/components/Icons';
import styles from './page.module.css';

// Stream icon component
function StreamIcon({ size = 24 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
            <line x1="2" y1="20" x2="2.01" y2="20" />
        </svg>
    );
}

interface StreamHistory {
    url: string;
    timestamp: number;
}

interface QualityLevel {
    height: number;
    bitrate: number;
    index: number;
}

// Sample HLS streams for testing
const SAMPLE_STREAMS = [
    { label: 'Big Buck Bunny', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
    { label: 'Sintel', url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8' },
    { label: 'Apple Demo', url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8' },
];

export default function StreamPlayerPage() {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLive, setIsLive] = useState(false);
    const [qualities, setQualities] = useState<QualityLevel[]>([]);
    const [currentQuality, setCurrentQuality] = useState(-1); // -1 = auto
    const [history, setHistory] = useState<StreamHistory[]>([]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const { toasts, addToast, removeToast } = useToast();

    // Load history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('stream-history');
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch {
                // ignore
            }
        }
    }, []);

    // Save history
    const saveHistory = useCallback((newHistory: StreamHistory[]) => {
        setHistory(newHistory);
        localStorage.setItem('stream-history', JSON.stringify(newHistory.slice(0, 20)));
    }, []);

    // Cleanup HLS on unmount
    useEffect(() => {
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, []);

    const loadStream = useCallback((streamUrl: string) => {
        if (!streamUrl.trim()) {
            addToast('Please enter a stream URL', 'error');
            return;
        }

        if (!videoRef.current) return;

        setIsLoading(true);
        setError(null);
        setQualities([]);
        setCurrentQuality(-1);

        // Destroy existing HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        const video = videoRef.current;

        // Check if native HLS is supported (Safari)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = streamUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play();
                setIsPlaying(true);
                setIsLoading(false);
                addToast('Stream loaded!', 'success');
            }, { once: true });
            video.addEventListener('error', () => {
                setError('Failed to load stream');
                setIsLoading(false);
            }, { once: true });
        }
        // Use HLS.js for other browsers
        else if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
            });
            hlsRef.current = hls;

            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
                // Get quality levels
                const levels: QualityLevel[] = data.levels.map((level, index) => ({
                    height: level.height,
                    bitrate: level.bitrate,
                    index,
                })).sort((a, b) => b.height - a.height);

                setQualities(levels);
                setIsLive(hls.levels[0]?.details?.live || false);

                video.play();
                setIsPlaying(true);
                setIsLoading(false);
                addToast('Stream loaded!', 'success');
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
                setCurrentQuality(data.level);
            });

            hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) {
                    console.error('HLS fatal error:', data);
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            setError('Network error - check CORS or URL');
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            return;
                        default:
                            setError('Playback error');
                    }
                    setIsLoading(false);
                }
            });
        } else {
            setError('HLS not supported in this browser');
            setIsLoading(false);
            return;
        }

        // Add to history
        const newHistory = [
            { url: streamUrl, timestamp: Date.now() },
            ...history.filter(h => h.url !== streamUrl),
        ].slice(0, 20);
        saveHistory(newHistory);
    }, [addToast, history, saveHistory]);

    const changeQuality = (level: number) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = level;
            addToast(level === -1 ? 'Quality: Auto' : `Quality: ${qualities.find(q => q.index === level)?.height}p`, 'info');
        }
    };

    const closePlayer = () => {
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.src = '';
        }
        setIsPlaying(false);
        setError(null);
        setQualities([]);
    };

    const removeFromHistory = (urlToRemove: string) => {
        saveHistory(history.filter(h => h.url !== urlToRemove));
    };

    const clearHistory = () => {
        saveHistory([]);
        addToast('History cleared', 'info');
    };

    const formatBitrate = (bps: number): string => {
        const mbps = bps / 1000000;
        return `${mbps.toFixed(1)} Mbps`;
    };

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGradient}></div>
            <Navigation />
            <Toast toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <StreamIcon size={28} />
                    </div>
                    <h1>Stream Player</h1>
                </div>
                <p className={styles.tagline}>
                    Play HLS streaming video (M3U8)
                </p>
            </header>

            <main className={styles.main}>
                {/* URL Input */}
                <div className={styles.urlSection}>
                    <div className={styles.urlForm}>
                        <div className={styles.urlInputWrapper}>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="Enter M3U8 URL..."
                                className={styles.urlInput}
                                onKeyDown={(e) => e.key === 'Enter' && loadStream(url)}
                            />
                        </div>
                        <button
                            className={styles.playButton}
                            onClick={() => loadStream(url)}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>Loading...</>
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="5,3 19,12 5,21" />
                                    </svg>
                                    Play
                                </>
                            )}
                        </button>
                    </div>

                    {/* Sample URLs */}
                    <div className={styles.sampleUrls}>
                        <div className={styles.sampleLabel}>Sample streams:</div>
                        <div className={styles.sampleButtons}>
                            {SAMPLE_STREAMS.map((sample) => (
                                <button
                                    key={sample.url}
                                    className={styles.sampleButton}
                                    onClick={() => {
                                        setUrl(sample.url);
                                        loadStream(sample.url);
                                    }}
                                >
                                    {sample.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Player */}
                <div className={styles.playerSection} style={{ display: (isPlaying || isLoading || error) ? 'block' : 'none' }}>
                    <div className={styles.playerHeader}>
                        <h2>
                            <StreamIcon size={16} />
                            {isLive ? 'Live Stream' : 'VOD Stream'}
                        </h2>
                        {isLive && (
                            <div className={styles.liveIndicator}>
                                <span className={styles.liveDot}></span>
                                LIVE
                            </div>
                        )}
                        <button className={styles.closeButton} onClick={closePlayer}>
                            Close
                        </button>
                    </div>

                    <div className={styles.videoContainer}>
                        <video
                            ref={videoRef}
                            className={styles.videoElement}
                            controls
                            playsInline
                        />

                        {isLoading && (
                            <div className={styles.loadingOverlay}>
                                <div className={styles.spinner}></div>
                                <span className={styles.loadingText}>Loading stream...</span>
                            </div>
                        )}

                        {error && (
                            <div className={styles.errorOverlay}>
                                <div className={styles.errorIcon}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="15" y1="9" x2="9" y2="15" />
                                        <line x1="9" y1="9" x2="15" y2="15" />
                                    </svg>
                                </div>
                                <span className={styles.errorText}>Failed to load stream</span>
                                <span className={styles.errorDetails}>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Stream Info */}
                    {qualities.length > 0 && (
                        <div className={styles.streamInfo}>
                            <span className={styles.streamInfoItem}>
                                <strong>Type:</strong> HLS
                            </span>
                            <span className={styles.streamInfoItem}>
                                <strong>Quality:</strong> {currentQuality === -1 ? 'Auto' : `${qualities.find(q => q.index === currentQuality)?.height || 0}p`}
                            </span>

                            {/* Quality Selector */}
                            <div className={styles.qualitySelector}>
                                <span className={styles.qualityLabel}>Select:</span>
                                <select
                                    className={styles.qualitySelect}
                                    value={currentQuality}
                                    onChange={(e) => changeQuality(parseInt(e.target.value))}
                                >
                                    <option value={-1}>Auto</option>
                                    {qualities.map((q) => (
                                        <option key={q.index} value={q.index}>
                                            {q.height}p ({formatBitrate(q.bitrate)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Features */}
                <div className={styles.features}>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <StreamIcon size={24} />
                        </div>
                        <h4>HLS Streaming</h4>
                        <p>M3U8 live & VOD</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <BoltIcon size={24} />
                        </div>
                        <h4>Adaptive Quality</h4>
                        <p>Auto bitrate switching</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <ShieldIcon size={24} />
                        </div>
                        <h4>Client-side</h4>
                        <p>No server needed</p>
                    </div>
                </div>

                {/* History */}
                {history.length > 0 && (
                    <div className={styles.historySection}>
                        <div className={styles.historyHeader}>
                            <h3>Recent Streams</h3>
                            <button className={styles.clearHistoryButton} onClick={clearHistory}>
                                Clear
                            </button>
                        </div>
                        <div className={styles.historyList}>
                            {history.map((item) => (
                                <div
                                    key={item.timestamp}
                                    className={styles.historyItem}
                                    onClick={() => {
                                        setUrl(item.url);
                                        loadStream(item.url);
                                    }}
                                >
                                    <span className={`${styles.historyType} ${styles.hls}`}>
                                        HLS
                                    </span>
                                    <span className={styles.historyUrl}>{item.url}</span>
                                    <button
                                        className={styles.historyRemove}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFromHistory(item.url);
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
