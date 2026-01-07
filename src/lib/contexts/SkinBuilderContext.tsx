'use client';

import { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import {
    SkinData,
    SkinMetadata,
    MotionParams,
    MotionState,
    Asset,
    DEFAULT_METADATA,
    DEFAULT_MOTION_PARAMS,
} from '@/lib/types/skin';

// State
interface SkinBuilderState {
    skinData: SkinData;
    selectedStateId: string | null;
    isPlaying: boolean;
    playbackSpeed: number;
}

// Actions
type SkinBuilderAction =
    | { type: 'SET_SKIN_DATA'; payload: SkinData }
    | { type: 'SET_METADATA'; payload: Partial<SkinMetadata> }
    | { type: 'SET_PARAMS'; payload: Partial<MotionParams> }
    | { type: 'ADD_ASSET'; payload: Asset }
    | { type: 'REMOVE_ASSET'; payload: string }
    | { type: 'ADD_STATE'; payload: MotionState }
    | { type: 'UPDATE_STATE'; payload: MotionState }
    | { type: 'REMOVE_STATE'; payload: string }
    | { type: 'SELECT_STATE'; payload: string | null }
    | { type: 'SET_PLAYING'; payload: boolean }
    | { type: 'SET_PLAYBACK_SPEED'; payload: number }
    | { type: 'RESET' };

// Initial state
const initialState: SkinBuilderState = {
    skinData: {
        metadata: DEFAULT_METADATA,
        params: DEFAULT_MOTION_PARAMS,
        states: [],
        assets: [],
    },
    selectedStateId: null,
    isPlaying: false,
    playbackSpeed: 1,
};

// Reducer
function skinBuilderReducer(state: SkinBuilderState, action: SkinBuilderAction): SkinBuilderState {
    switch (action.type) {
        case 'SET_SKIN_DATA':
            return { ...state, skinData: action.payload };

        case 'SET_METADATA':
            return {
                ...state,
                skinData: {
                    ...state.skinData,
                    metadata: { ...state.skinData.metadata, ...action.payload },
                },
            };

        case 'SET_PARAMS':
            return {
                ...state,
                skinData: {
                    ...state.skinData,
                    params: { ...state.skinData.params, ...action.payload },
                },
            };

        case 'ADD_ASSET':
            return {
                ...state,
                skinData: {
                    ...state.skinData,
                    assets: [...state.skinData.assets, action.payload],
                },
            };

        case 'REMOVE_ASSET':
            return {
                ...state,
                skinData: {
                    ...state.skinData,
                    assets: state.skinData.assets.filter(a => a.id !== action.payload),
                },
            };

        case 'ADD_STATE':
            return {
                ...state,
                skinData: {
                    ...state.skinData,
                    states: [...state.skinData.states, action.payload],
                },
            };

        case 'UPDATE_STATE':
            return {
                ...state,
                skinData: {
                    ...state.skinData,
                    states: state.skinData.states.map(s =>
                        s.state === action.payload.state ? action.payload : s
                    ),
                },
            };

        case 'REMOVE_STATE':
            return {
                ...state,
                skinData: {
                    ...state.skinData,
                    states: state.skinData.states.filter(s => s.state !== action.payload),
                },
                selectedStateId: state.selectedStateId === action.payload ? null : state.selectedStateId,
            };

        case 'SELECT_STATE':
            return { ...state, selectedStateId: action.payload };

        case 'SET_PLAYING':
            return { ...state, isPlaying: action.payload };

        case 'SET_PLAYBACK_SPEED':
            return { ...state, playbackSpeed: action.payload };

        case 'RESET':
            return initialState;

        default:
            return state;
    }
}

// Context
interface SkinBuilderContextValue {
    state: SkinBuilderState;
    setSkinData: (data: SkinData) => void;
    setMetadata: (metadata: Partial<SkinMetadata>) => void;
    setParams: (params: Partial<MotionParams>) => void;
    addAsset: (asset: Asset) => void;
    removeAsset: (id: string) => void;
    addState: (motionState: MotionState) => void;
    updateState: (motionState: MotionState) => void;
    removeState: (stateId: string) => void;
    selectState: (stateId: string | null) => void;
    setPlaying: (playing: boolean) => void;
    setPlaybackSpeed: (speed: number) => void;
    reset: () => void;
    getAssetByFilename: (filename: string) => Asset | undefined;
    getSelectedState: () => MotionState | undefined;
}

const SkinBuilderContext = createContext<SkinBuilderContextValue | null>(null);

// Provider
export function SkinBuilderProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(skinBuilderReducer, initialState);

    const setSkinData = useCallback((data: SkinData) => {
        dispatch({ type: 'SET_SKIN_DATA', payload: data });
    }, []);

    const setMetadata = useCallback((metadata: Partial<SkinMetadata>) => {
        dispatch({ type: 'SET_METADATA', payload: metadata });
    }, []);

    const setParams = useCallback((params: Partial<MotionParams>) => {
        dispatch({ type: 'SET_PARAMS', payload: params });
    }, []);

    const addAsset = useCallback((asset: Asset) => {
        dispatch({ type: 'ADD_ASSET', payload: asset });
    }, []);

    const removeAsset = useCallback((id: string) => {
        dispatch({ type: 'REMOVE_ASSET', payload: id });
    }, []);

    const addState = useCallback((motionState: MotionState) => {
        dispatch({ type: 'ADD_STATE', payload: motionState });
    }, []);

    const updateState = useCallback((motionState: MotionState) => {
        dispatch({ type: 'UPDATE_STATE', payload: motionState });
    }, []);

    const removeState = useCallback((stateId: string) => {
        dispatch({ type: 'REMOVE_STATE', payload: stateId });
    }, []);

    const selectState = useCallback((stateId: string | null) => {
        dispatch({ type: 'SELECT_STATE', payload: stateId });
    }, []);

    const setPlaying = useCallback((playing: boolean) => {
        dispatch({ type: 'SET_PLAYING', payload: playing });
    }, []);

    const setPlaybackSpeed = useCallback((speed: number) => {
        dispatch({ type: 'SET_PLAYBACK_SPEED', payload: speed });
    }, []);

    const reset = useCallback(() => {
        dispatch({ type: 'RESET' });
    }, []);

    const getAssetByFilename = useCallback((filename: string) => {
        // Remove extension if present
        const baseName = filename.replace(/\.(png|jpg|jpeg|gif)$/i, '');
        return state.skinData.assets.find(a =>
            a.filename.replace(/\.(png|jpg|jpeg|gif)$/i, '') === baseName
        );
    }, [state.skinData.assets]);

    const getSelectedState = useCallback(() => {
        if (!state.selectedStateId) return undefined;
        return state.skinData.states.find(s => s.state === state.selectedStateId);
    }, [state.selectedStateId, state.skinData.states]);

    const value: SkinBuilderContextValue = {
        state,
        setSkinData,
        setMetadata,
        setParams,
        addAsset,
        removeAsset,
        addState,
        updateState,
        removeState,
        selectState,
        setPlaying,
        setPlaybackSpeed,
        reset,
        getAssetByFilename,
        getSelectedState,
    };

    return (
        <SkinBuilderContext.Provider value={value}>
            {children}
        </SkinBuilderContext.Provider>
    );
}

// Hook
export function useSkinBuilder() {
    const context = useContext(SkinBuilderContext);
    if (!context) {
        throw new Error('useSkinBuilder must be used within SkinBuilderProvider');
    }
    return context;
}
