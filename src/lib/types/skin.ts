// ANeko Skin Builder Types

export interface SkinMetadata {
    name: string;
    author: string;
    package: string;
    preview: string; // icon filename without extension
}

export interface MotionParams {
    acceleration: number;
    maxVelocity: number;
    deaccelerationDistance: number;
    proximityDistance: number;
    initialState: string;
    awakeState: string;
    moveStatePrefix: string;
    wallStatePrefix: string;
}

export interface AnimationItem {
    type: 'item' | 'repeat-item';
    drawable?: string;
    duration?: number;
    repeatCount?: number;
    items?: AnimationItem[];
}

export interface MotionState {
    state: string;
    checkMove?: boolean;
    checkWall?: boolean;
    nextState?: string;
    items: AnimationItem[];
}

export interface Asset {
    id: string;
    filename: string;
    dataUrl: string;
}

export interface SkinData {
    metadata: SkinMetadata;
    params: MotionParams;
    states: MotionState[];
    assets: Asset[];
}

export const DEFAULT_MOTION_PARAMS: MotionParams = {
    acceleration: 160,
    maxVelocity: 100,
    deaccelerationDistance: 60,
    proximityDistance: 10,
    initialState: 'stop',
    awakeState: 'awake',
    moveStatePrefix: 'move',
    wallStatePrefix: 'wall',
};

export const DEFAULT_METADATA: SkinMetadata = {
    name: 'My Skin',
    author: '',
    package: 'com.example.myskin',
    preview: 'icon.png',
};
