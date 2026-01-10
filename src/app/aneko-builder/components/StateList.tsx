'use client';

import { useState, useEffect } from 'react';
import { useSkinBuilder } from '@/lib/contexts/SkinBuilderContext';
import { REQUIRED_STATES, OPTIONAL_STATES, getStateDefinition } from '@/lib/constants/states';
import { MotionState } from '@/lib/types/skin';
import { PlusIcon, TrashIcon, PencilIcon, LockIcon } from '@/components/Icons';
import styles from '../page.module.css';

interface StateListProps {
    onEditState: (stateId: string) => void;
}

export default function StateList({ onEditState }: StateListProps) {
    const { state, addState, removeState, selectState } = useSkinBuilder();
    const [showAddModal, setShowAddModal] = useState(false);
    const [initialized, setInitialized] = useState(false);

    const existingStateIds = state.skinData.states.map(s => s.state);

    // Auto-initialize required states when skin is empty
    useEffect(() => {
        if (!initialized && state.skinData.states.length === 0) {
            const existingIds = new Set(state.skinData.states.map(s => s.state));
            REQUIRED_STATES.forEach(stateDef => {
                if (!existingIds.has(stateDef.id)) {
                    const newState: MotionState = {
                        state: stateDef.id,
                        items: [],
                        checkMove: stateDef.checkMove,
                        checkWall: stateDef.checkWall,
                        nextState: stateDef.nextState,
                    };
                    addState(newState);
                    existingIds.add(stateDef.id);
                }
            });
            setInitialized(true);
        }
    }, [initialized, state.skinData.states.length, addState]);

    // Reset initialized flag when skin is imported (states exist from import)
    useEffect(() => {
        if (state.skinData.states.length > 0 && !initialized) {
            setInitialized(true);
        }
    }, [state.skinData.states.length, initialized]);

    const handleAddState = (stateId: string) => {
        const stateDef = getStateDefinition(stateId);
        const newState: MotionState = {
            state: stateId,
            items: [],
            checkMove: stateDef?.checkMove,
            checkWall: stateDef?.checkWall,
            nextState: stateDef?.nextState,
        };
        addState(newState);
        setShowAddModal(false);
    };

    const countFrames = (motionState: MotionState): number => {
        let count = 0;
        const countItems = (items: typeof motionState.items) => {
            for (const item of items) {
                if (item.type === 'item') {
                    count++;
                } else if (item.type === 'repeat-item' && item.items) {
                    countItems(item.items);
                }
            }
        };
        countItems(motionState.items);
        return count;
    };

    const isRequiredState = (stateId: string) => {
        return REQUIRED_STATES.some(s => s.id === stateId);
    };

    // Available optional states to add (not already added)
    const availableOptionalStates = OPTIONAL_STATES.filter(
        s => !existingStateIds.includes(s.id)
    );

    return (
        <>
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>States ({state.skinData.states.length})</span>
                    {availableOptionalStates.length > 0 && (
                        <button
                            className={styles.stateActionBtn}
                            onClick={() => setShowAddModal(true)}
                            title="Add optional state"
                        >
                            <PlusIcon size={14} />
                        </button>
                    )}
                </div>
                <div className={styles.panelContent}>
                    {state.skinData.states.length > 0 ? (
                        <div className={styles.stateList}>
                            {state.skinData.states.map((motionState) => {
                                const isRequired = isRequiredState(motionState.state);
                                return (
                                    <div
                                        key={motionState.state}
                                        className={`${styles.stateItem} ${state.selectedStateId === motionState.state ? styles.selected : ''}`}
                                        onClick={() => selectState(motionState.state)}
                                    >
                                        <div>
                                            <span className={styles.stateName}>
                                                {motionState.state}
                                                {isRequired && <LockIcon size={10} style={{ marginLeft: '4px', opacity: 0.5 }} />}
                                            </span>
                                            <span className={styles.stateFrameCount}>
                                                {countFrames(motionState)} frames
                                            </span>
                                        </div>
                                        <div className={styles.stateActions}>
                                            <button
                                                className={styles.stateActionBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditState(motionState.state);
                                                }}
                                                title="Edit frames"
                                            >
                                                <PencilIcon size={12} />
                                            </button>
                                            {!isRequired && (
                                                <button
                                                    className={styles.stateActionBtn}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeState(motionState.state);
                                                    }}
                                                    title="Delete state"
                                                >
                                                    <TrashIcon size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <p>Loading states...</p>
                        </div>
                    )}
                </div>
            </div>

            {showAddModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <span className={styles.modalTitle}>Add Optional State</span>
                            <button className={styles.modalClose} onClick={() => setShowAddModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className={styles.modalContent}>
                            <p style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Wall states are triggered when the character hits a screen edge.
                            </p>
                            <div className={styles.stateGrid}>
                                {availableOptionalStates.map((stateDef) => (
                                    <div
                                        key={stateDef.id}
                                        className={styles.stateOption}
                                        onClick={() => handleAddState(stateDef.id)}
                                        title={stateDef.description}
                                    >
                                        <span className={styles.stateName}>{stateDef.label}</span>
                                    </div>
                                ))}
                            </div>
                            {availableOptionalStates.length === 0 && (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    All optional states have been added.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

