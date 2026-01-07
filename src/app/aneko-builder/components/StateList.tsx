'use client';

import { useState } from 'react';
import { useSkinBuilder } from '@/lib/contexts/SkinBuilderContext';
import { ANEKO_STATES } from '@/lib/constants/states';
import { MotionState } from '@/lib/types/skin';
import { PlusIcon, TrashIcon, PencilIcon } from '@/components/Icons';
import styles from '../page.module.css';

interface StateListProps {
    onEditState: (stateId: string) => void;
}

export default function StateList({ onEditState }: StateListProps) {
    const { state, addState, removeState, selectState } = useSkinBuilder();
    const [showAddModal, setShowAddModal] = useState(false);

    const existingStateIds = state.skinData.states.map(s => s.state);

    const handleAddState = (stateId: string) => {
        const newState: MotionState = {
            state: stateId,
            items: [],
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

    return (
        <>
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>States ({state.skinData.states.length})</span>
                    <button
                        className={styles.stateActionBtn}
                        onClick={() => setShowAddModal(true)}
                        title="Add state"
                    >
                        <PlusIcon size={14} />
                    </button>
                </div>
                <div className={styles.panelContent}>
                    {state.skinData.states.length > 0 ? (
                        <div className={styles.stateList}>
                            {state.skinData.states.map((motionState) => (
                                <div
                                    key={motionState.state}
                                    className={`${styles.stateItem} ${state.selectedStateId === motionState.state ? styles.selected : ''}`}
                                    onClick={() => selectState(motionState.state)}
                                >
                                    <div>
                                        <span className={styles.stateName}>{motionState.state}</span>
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
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <p>No states yet</p>
                            <button
                                className={styles.btn}
                                style={{ marginTop: '0.5rem' }}
                                onClick={() => setShowAddModal(true)}
                            >
                                Add State
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showAddModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <span className={styles.modalTitle}>Add Animation State</span>
                            <button className={styles.modalClose} onClick={() => setShowAddModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className={styles.modalContent}>
                            <div className={styles.stateGrid}>
                                {ANEKO_STATES.map((anekoState) => {
                                    const isDisabled = existingStateIds.includes(anekoState.id);
                                    return (
                                        <div
                                            key={anekoState.id}
                                            className={`${styles.stateOption} ${isDisabled ? styles.disabled : ''}`}
                                            onClick={() => !isDisabled && handleAddState(anekoState.id)}
                                            title={anekoState.description}
                                        >
                                            <span className={styles.stateName}>{anekoState.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
