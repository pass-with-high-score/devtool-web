// Predefined ANeko animation states

export interface StateDefinition {
    id: string;
    label: string;
    description: string;
    isRequired: boolean; // Required states are created by default and cannot be deleted
    checkMove?: boolean;
    checkWall?: boolean;
    nextState?: string;
}

export const ANEKO_STATES: StateDefinition[] = [
    // Core states - REQUIRED
    { id: 'stop', label: 'Stop', description: 'Idle state, standing still', isRequired: true, checkMove: true, nextState: 'wait' },
    { id: 'wait', label: 'Wait', description: 'Waiting/sleeping animation loop', isRequired: true, checkMove: true },
    { id: 'awake', label: 'Awake', description: 'Waking up from sleep', isRequired: true, nextState: 'moveRight' },

    // Movement states (4 directions) - REQUIRED
    { id: 'moveUp', label: 'Move Up', description: 'Walking upward', isRequired: true, checkWall: true },
    { id: 'moveDown', label: 'Move Down', description: 'Walking downward', isRequired: true, checkWall: true },
    { id: 'moveLeft', label: 'Move Left', description: 'Walking left', isRequired: true, checkWall: true },
    { id: 'moveRight', label: 'Move Right', description: 'Walking right', isRequired: true, checkWall: true },

    // Diagonal movement states - REQUIRED
    { id: 'moveUpLeft', label: 'Move Up-Left', description: 'Walking diagonally up-left', isRequired: true, checkWall: true },
    { id: 'moveUpRight', label: 'Move Up-Right', description: 'Walking diagonally up-right', isRequired: true, checkWall: true },
    { id: 'moveDownLeft', label: 'Move Down-Left', description: 'Walking diagonally down-left', isRequired: true, checkWall: true },
    { id: 'moveDownRight', label: 'Move Down-Right', description: 'Walking diagonally down-right', isRequired: true, checkWall: true },

    // Wall hit states - OPTIONAL  
    { id: 'wallUp', label: 'Wall Up', description: 'Hit top wall animation', isRequired: false, checkMove: true },
    { id: 'wallDown', label: 'Wall Down', description: 'Hit bottom wall animation', isRequired: false, checkMove: true },
    { id: 'wallLeft', label: 'Wall Left', description: 'Hit left wall animation', isRequired: false, checkMove: true },
    { id: 'wallRight', label: 'Wall Right', description: 'Hit right wall animation', isRequired: false, checkMove: true },
];

export type ANekoStateId = StateDefinition['id'];

export const REQUIRED_STATES = ANEKO_STATES.filter(s => s.isRequired);
export const OPTIONAL_STATES = ANEKO_STATES.filter(s => !s.isRequired);

export const STATE_CATEGORIES = {
    core: ['stop', 'wait', 'awake'],
    movement: ['moveUp', 'moveDown', 'moveLeft', 'moveRight'],
    diagonal: ['moveUpLeft', 'moveUpRight', 'moveDownLeft', 'moveDownRight'],
    wall: ['wallUp', 'wallDown', 'wallLeft', 'wallRight'],
} as const;

export function getStateDefinition(id: string): StateDefinition | undefined {
    return ANEKO_STATES.find(s => s.id === id);
}

