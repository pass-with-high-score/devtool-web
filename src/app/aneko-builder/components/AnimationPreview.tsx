'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSkinBuilder } from '@/lib/contexts/SkinBuilderContext';
import { AnimationItem } from '@/lib/types/skin';
import styles from '../page.module.css';

export default function AnimationPreview() {
    const { state, getAssetByFilename, setPlaying, setPlaybackSpeed } = useSkinBuilder();
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
    const animationRef = useRef<number>(undefined);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const selectedState = state.skinData.states.find(s => s.state === state.selectedStateId);

    // Flatten animation items to get all frames
    const getFlatFrames = useCallback((items: AnimationItem[]): { drawable: string; duration: number }[] => {
        const frames: { drawable: string; duration: number }[] = [];

        const processItems = (itemList: AnimationItem[], repeatCount = 1) => {
            for (let r = 0; r < repeatCount; r++) {
                for (const item of itemList) {
                    if (item.type === 'item' && item.drawable) {
                        frames.push({ drawable: item.drawable, duration: item.duration || 250 });
                    } else if (item.type === 'repeat-item' && item.items) {
                        processItems(item.items, item.repeatCount || 1);
                    }
                }
            }
        };

        processItems(items);
        return frames;
    }, []);

    const frames = selectedState ? getFlatFrames(selectedState.items) : [];
    const currentFrame = frames[currentFrameIndex];
    const currentAsset = currentFrame ? getAssetByFilename(currentFrame.drawable) : undefined;

    // Animation loop
    useEffect(() => {
        if (!state.isPlaying || frames.length === 0) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            return;
        }

        const scheduleNextFrame = () => {
            const frame = frames[currentFrameIndex];
            const duration = (frame?.duration || 250) / state.playbackSpeed;

            timeoutRef.current = setTimeout(() => {
                setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
                scheduleNextFrame();
            }, duration);
        };

        scheduleNextFrame();

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [state.isPlaying, currentFrameIndex, frames, state.playbackSpeed]);

    // Reset frame index when state changes
    useEffect(() => {
        setCurrentFrameIndex(0);
        setPlaying(false);
    }, [state.selectedStateId, setPlaying]);

    const handlePlayPause = () => {
        if (frames.length === 0) return;
        setPlaying(!state.isPlaying);
    };

    const handleStop = () => {
        setPlaying(false);
        setCurrentFrameIndex(0);
    };

    const handleStepForward = () => {
        if (frames.length === 0) return;
        setPlaying(false);
        setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
    };

    const handleStepBackward = () => {
        if (frames.length === 0) return;
        setPlaying(false);
        setCurrentFrameIndex((prev) => (prev - 1 + frames.length) % frames.length);
    };

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>Preview</span>
            </div>
            <div className={styles.panelContent}>
                <div className={styles.previewArea}>
                    {/* State info */}
                    {state.selectedStateId && (
                        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{state.selectedStateId}</span>
                            {frames.length > 0 && (
                                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Frame {currentFrameIndex + 1}/{frames.length}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Preview canvas */}
                    <div className={styles.previewCanvas}>
                        {currentAsset ? (
                            <img src={currentAsset.dataUrl} alt={currentFrame?.drawable} />
                        ) : state.selectedStateId ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {frames.length === 0 ? 'No frames' : 'Missing asset'}
                            </span>
                        ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Select a state
                            </span>
                        )}
                    </div>

                    {/* Controls */}
                    <div className={styles.previewControls}>
                        <button
                            className={styles.previewBtn}
                            onClick={handleStepBackward}
                            disabled={frames.length === 0}
                            title="Previous frame"
                        >
                            ◀◀
                        </button>
                        <button
                            className={`${styles.previewBtn} ${state.isPlaying ? styles.playing : ''}`}
                            onClick={handlePlayPause}
                            disabled={frames.length === 0}
                            title={state.isPlaying ? 'Pause' : 'Play'}
                        >
                            {state.isPlaying ? '⏸' : '▶'}
                        </button>
                        <button
                            className={styles.previewBtn}
                            onClick={handleStop}
                            disabled={frames.length === 0}
                            title="Stop"
                        >
                            ⏹
                        </button>
                        <button
                            className={styles.previewBtn}
                            onClick={handleStepForward}
                            disabled={frames.length === 0}
                            title="Next frame"
                        >
                            ▶▶
                        </button>
                    </div>

                    {/* Speed control */}
                    <div className={styles.speedControl}>
                        <label>Speed: {state.playbackSpeed}x</label>
                        <input
                            type="range"
                            min="0.25"
                            max="3"
                            step="0.25"
                            value={state.playbackSpeed}
                            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                        />
                    </div>

                    {/* Current frame info */}
                    {currentFrame && (
                        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.75rem' }}>
                            <div><strong>Drawable:</strong> {currentFrame.drawable}</div>
                            <div><strong>Duration:</strong> {currentFrame.duration}ms</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
