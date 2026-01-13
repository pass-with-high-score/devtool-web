'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Toast, { useToast } from '@/components/Toast';
import { ShieldIcon, SmartphoneIcon } from '@/components/Icons';
import styles from './page.module.css';

interface AudioTrack {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    duration: number;
}

// Music icon component
function MusicIcon({ size = 24 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
        </svg>
    );
}

export default function AudioPlayerPage() {
    const [playlist, setPlaylist] = useState<AudioTrack[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isLooping, setIsLooping] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [visualizerBars, setVisualizerBars] = useState<number[]>(Array(20).fill(5));

    const audioRef = useRef<HTMLAudioElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addFileInputRef = useRef<HTMLInputElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const { toasts, addToast, removeToast } = useToast();

    const currentTrack = playlist[currentIndex] || null;

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const generateId = () => Math.random().toString(36).substring(2, 9);

    const loadAudioFiles = useCallback((files: FileList | File[]) => {
        const validExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma', '.webm'];
        const newTracks: AudioTrack[] = [];

        Array.from(files).forEach((file) => {
            const isValidByType = file.type.startsWith('audio/');
            const isValidByExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

            if (!isValidByType && !isValidByExtension) {
                addToast(`Skipped: ${file.name} - not a valid audio file`, 'error');
                return;
            }

            const url = URL.createObjectURL(file);
            newTracks.push({
                id: generateId(),
                name: file.name.replace(/\.[^/.]+$/, ''),
                size: file.size,
                type: file.type || 'audio/*',
                url,
                duration: 0,
            });
        });

        if (newTracks.length > 0) {
            setPlaylist(prev => [...prev, ...newTracks]);
            addToast(`Added ${newTracks.length} track(s)`, 'success');
        }
    }, [addToast]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            loadAudioFiles(files);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (addFileInputRef.current) {
            addFileInputRef.current.value = '';
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            loadAudioFiles(files);
        }
    }, [loadAudioFiles]);

    const playTrack = (index: number) => {
        if (index >= 0 && index < playlist.length) {
            setCurrentIndex(index);
            setIsPlaying(true);
        }
    };

    const togglePlay = () => {
        if (!audioRef.current || !currentTrack) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    const playNext = () => {
        if (playlist.length === 0) return;

        if (isShuffling) {
            const randomIndex = Math.floor(Math.random() * playlist.length);
            setCurrentIndex(randomIndex);
        } else {
            const nextIndex = (currentIndex + 1) % playlist.length;
            setCurrentIndex(nextIndex);
        }
        setIsPlaying(true);
    };

    const playPrevious = () => {
        if (playlist.length === 0) return;

        if (currentTime > 3) {
            // If more than 3 seconds in, restart current track
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
            }
        } else {
            const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
            setCurrentIndex(prevIndex);
        }
        setIsPlaying(true);
    };

    const handleAudioPlay = () => setIsPlaying(true);
    const handleAudioPause = () => setIsPlaying(false);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
            // Update track duration in playlist
            setPlaylist(prev => prev.map((track, i) =>
                i === currentIndex ? { ...track, duration: audioRef.current!.duration } : track
            ));
            // Auto-play after loading
            if (isPlaying) {
                audioRef.current.play();
            }
        }
    };

    const handleEnded = () => {
        if (isLooping) {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
            }
        } else {
            playNext();
        }
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !audioRef.current) return;

        const rect = progressRef.current.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        const newTime = clickPosition * duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
        setIsMuted(newVolume === 0);
    };

    const toggleMute = () => {
        if (!audioRef.current) return;

        if (isMuted) {
            audioRef.current.volume = volume || 0.5;
            setIsMuted(false);
        } else {
            audioRef.current.volume = 0;
            setIsMuted(true);
        }
    };

    const cyclePlaybackRate = () => {
        const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentRateIndex = rates.indexOf(playbackRate);
        const nextIndex = (currentRateIndex + 1) % rates.length;
        const newRate = rates[nextIndex];
        setPlaybackRate(newRate);
        if (audioRef.current) {
            audioRef.current.playbackRate = newRate;
        }
    };

    const removeTrack = (index: number) => {
        const track = playlist[index];
        URL.revokeObjectURL(track.url);

        setPlaylist(prev => prev.filter((_, i) => i !== index));

        if (index === currentIndex) {
            setCurrentIndex(prev => Math.min(prev, playlist.length - 2));
        } else if (index < currentIndex) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const clearPlaylist = () => {
        playlist.forEach(track => URL.revokeObjectURL(track.url));
        setPlaylist([]);
        setCurrentIndex(0);
        setIsPlaying(false);
    };

    // Visualizer animation
    useEffect(() => {
        const animate = () => {
            if (isPlaying) {
                setVisualizerBars(prev =>
                    prev.map(() => Math.random() * 80 + 10)
                );
            } else {
                setVisualizerBars(prev =>
                    prev.map(bar => Math.max(5, bar * 0.9))
                );
            }
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isPlaying]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!currentTrack) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    if (audioRef.current) {
                        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                    }
                    break;
                case 'arrowright':
                    e.preventDefault();
                    if (audioRef.current) {
                        audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
                    }
                    break;
                case 'arrowup':
                    e.preventDefault();
                    if (audioRef.current) {
                        const newVol = Math.min(1, audioRef.current.volume + 0.1);
                        audioRef.current.volume = newVol;
                        setVolume(newVol);
                        setIsMuted(false);
                    }
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    if (audioRef.current) {
                        const newVol = Math.max(0, audioRef.current.volume - 0.1);
                        audioRef.current.volume = newVol;
                        setVolume(newVol);
                        if (newVol === 0) setIsMuted(true);
                    }
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'n':
                    e.preventDefault();
                    playNext();
                    break;
                case 'p':
                    e.preventDefault();
                    playPrevious();
                    break;
                case 'l':
                    e.preventDefault();
                    setIsLooping(prev => !prev);
                    break;
                case 's':
                    e.preventDefault();
                    setIsShuffling(prev => !prev);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentTrack, isPlaying, volume, duration]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            playlist.forEach(track => URL.revokeObjectURL(track.url));
        };
    }, []);

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={styles.container}>
            <div className={styles.backgroundGradient}></div>
            <Navigation />
            <Toast toasts={toasts} removeToast={removeToast} />

            {/* Hidden audio element */}
            {currentTrack && (
                <audio
                    ref={audioRef}
                    src={currentTrack.url}
                    onPlay={handleAudioPlay}
                    onPause={handleAudioPause}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleEnded}
                />
            )}

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>
                        <MusicIcon size={28} />
                    </div>
                    <h1>Audio Player</h1>
                </div>
                <p className={styles.tagline}>
                    Play local audio files with playlist support
                </p>
            </header>

            <main className={styles.main}>
                {playlist.length === 0 ? (
                    /* Upload Zone */
                    <div
                        className={`${styles.uploadZone} ${dragOver ? styles.dragOver : ''}`}
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
                            multiple
                            onChange={handleFileSelect}
                            className={styles.fileInput}
                        />
                        <div className={styles.uploadPrompt}>
                            <div className={styles.uploadIconLarge}>
                                <MusicIcon size={48} />
                            </div>
                            <p className={styles.uploadText}>Drop audio files here or click to open</p>
                            <p className={styles.uploadHint}>Keyboard: Space play, N/P next/prev, L loop, S shuffle</p>
                            <p className={styles.uploadLimit}>MP3, WAV, FLAC, OGG, M4A, AAC</p>
                        </div>
                    </div>
                ) : (
                    /* Audio Player */
                    <div className={styles.playerSection}>
                        <div className={styles.playerHeader}>
                            <h2>
                                <MusicIcon size={18} />
                                {currentTrack?.name || 'No track selected'}
                            </h2>
                            <button className={styles.closeButton} onClick={clearPlaylist}>
                                Clear All
                            </button>
                        </div>

                        {/* Visualizer */}
                        <div className={styles.visualizerContainer}>
                            <div className={styles.visualizer}>
                                {visualizerBars.map((height, i) => (
                                    <div
                                        key={i}
                                        className={styles.visualizerBar}
                                        style={{ height: `${height}%` }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className={styles.controls}>
                            {/* Progress Bar */}
                            <div
                                ref={progressRef}
                                className={styles.progressContainer}
                                onClick={handleProgressClick}
                            >
                                <div
                                    className={styles.progressBar}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>

                            {/* Control Buttons */}
                            <div className={styles.controlsRow}>
                                <div className={styles.leftControls}>
                                    {/* Shuffle */}
                                    <button
                                        className={`${styles.controlButton} ${isShuffling ? styles.activeButton : ''}`}
                                        onClick={() => setIsShuffling(!isShuffling)}
                                        title="Shuffle (S)"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="16 3 21 3 21 8" />
                                            <line x1="4" y1="20" x2="21" y2="3" />
                                            <polyline points="21 16 21 21 16 21" />
                                            <line x1="15" y1="15" x2="21" y2="21" />
                                            <line x1="4" y1="4" x2="9" y2="9" />
                                        </svg>
                                    </button>

                                    {/* Previous */}
                                    <button className={styles.controlButton} onClick={playPrevious} title="Previous (P)">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                            <polygon points="19,20 9,12 19,4" />
                                            <rect x="5" y="4" width="3" height="16" />
                                        </svg>
                                    </button>

                                    {/* Play/Pause */}
                                    <button
                                        className={`${styles.controlButton} ${styles.playButton}`}
                                        onClick={togglePlay}
                                        title={isPlaying ? 'Pause (K)' : 'Play (K)'}
                                    >
                                        {isPlaying ? (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <rect x="6" y="4" width="4" height="16" />
                                                <rect x="14" y="4" width="4" height="16" />
                                            </svg>
                                        ) : (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                <polygon points="5,3 19,12 5,21" />
                                            </svg>
                                        )}
                                    </button>

                                    {/* Next */}
                                    <button className={styles.controlButton} onClick={playNext} title="Next (N)">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                            <polygon points="5,4 15,12 5,20" />
                                            <rect x="16" y="4" width="3" height="16" />
                                        </svg>
                                    </button>

                                    {/* Loop */}
                                    <button
                                        className={`${styles.controlButton} ${isLooping ? styles.activeButton : ''}`}
                                        onClick={() => setIsLooping(!isLooping)}
                                        title="Loop (L)"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="17 1 21 5 17 9" />
                                            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                            <polyline points="7 23 3 19 7 15" />
                                            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                                        </svg>
                                    </button>

                                    {/* Time Display */}
                                    <span className={styles.timeDisplay}>
                                        {formatTime(currentTime)} / {formatTime(duration)}
                                    </span>
                                </div>

                                <div className={styles.rightControls}>
                                    {/* Playback Speed */}
                                    <button className={styles.speedButton} onClick={cyclePlaybackRate} title="Playback speed">
                                        {playbackRate}x
                                    </button>

                                    {/* Volume */}
                                    <div className={styles.volumeContainer}>
                                        <button className={styles.controlButton} onClick={toggleMute} title={isMuted ? 'Unmute (M)' : 'Mute (M)'}>
                                            {isMuted || volume === 0 ? (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" />
                                                    <line x1="23" y1="9" x2="17" y2="15" />
                                                    <line x1="17" y1="9" x2="23" y2="15" />
                                                </svg>
                                            ) : (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" />
                                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                                </svg>
                                            )}
                                        </button>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={isMuted ? 0 : volume}
                                            onChange={handleVolumeChange}
                                            className={styles.volumeSlider}
                                            title="Volume"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Track Info */}
                        {currentTrack && (
                            <div className={styles.trackInfo}>
                                <span className={styles.trackInfoItem}>
                                    <strong>Size:</strong> {formatSize(currentTrack.size)}
                                </span>
                                <span className={styles.trackInfoItem}>
                                    <strong>Type:</strong> {currentTrack.type || 'audio/*'}
                                </span>
                                <span className={styles.trackInfoItem}>
                                    <strong>Track:</strong> {currentIndex + 1} / {playlist.length}
                                </span>
                            </div>
                        )}

                        {/* Playlist */}
                        <div className={styles.playlistSection}>
                            <div className={styles.playlistHeader}>
                                <h3>Playlist</h3>
                                <input
                                    ref={addFileInputRef}
                                    type="file"
                                    accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
                                    multiple
                                    onChange={handleFileSelect}
                                    className={styles.fileInput}
                                />
                                <button
                                    className={styles.addButton}
                                    onClick={() => addFileInputRef.current?.click()}
                                >
                                    + Add
                                </button>
                            </div>
                            <div className={styles.playlistItems}>
                                {playlist.map((track, index) => (
                                    <div
                                        key={track.id}
                                        className={`${styles.playlistItem} ${index === currentIndex ? styles.active : ''}`}
                                        onClick={() => playTrack(index)}
                                    >
                                        <span className={styles.playlistIndex}>{index + 1}</span>
                                        <span className={styles.playlistName}>{track.name}</span>
                                        <span className={styles.playlistDuration}>
                                            {track.duration > 0 ? formatTime(track.duration) : '--:--'}
                                        </span>
                                        <button
                                            className={styles.removeButton}
                                            onClick={(e) => { e.stopPropagation(); removeTrack(index); }}
                                            title="Remove"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Features */}
                <div className={styles.features}>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <MusicIcon size={24} />
                        </div>
                        <h4>Playlist Support</h4>
                        <p>Add multiple tracks, shuffle, loop</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <ShieldIcon size={24} />
                        </div>
                        <h4>100% Private</h4>
                        <p>Nothing uploaded to any server</p>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <SmartphoneIcon size={24} />
                        </div>
                        <h4>All Formats</h4>
                        <p>MP3, WAV, FLAC, OGG, M4A</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
