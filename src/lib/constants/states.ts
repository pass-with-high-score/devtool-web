// Predefined ANeko animation states

export const ANEKO_STATES = [
    // Core states
    { id: 'stop', label: 'Stop', description: 'Idle state, standing still' },
    { id: 'wait', label: 'Wait', description: 'Waiting/sleeping animation loop' },
    { id: 'awake', label: 'Awake', description: 'Waking up from sleep' },

    // Movement states (4 directions)
    { id: 'moveUp', label: 'Move Up', description: 'Walking upward' },
    { id: 'moveDown', label: 'Move Down', description: 'Walking downward' },
    { id: 'moveLeft', label: 'Move Left', description: 'Walking left' },
    { id: 'moveRight', label: 'Move Right', description: 'Walking right' },

    // Diagonal movement states
    { id: 'moveUpLeft', label: 'Move Up-Left', description: 'Walking diagonally up-left' },
    { id: 'moveUpRight', label: 'Move Up-Right', description: 'Walking diagonally up-right' },
    { id: 'moveDownLeft', label: 'Move Down-Left', description: 'Walking diagonally down-left' },
    { id: 'moveDownRight', label: 'Move Down-Right', description: 'Walking diagonally down-right' },

    // Wall hit states
    { id: 'wallUp', label: 'Wall Up', description: 'Hit top wall animation' },
    { id: 'wallDown', label: 'Wall Down', description: 'Hit bottom wall animation' },
    { id: 'wallLeft', label: 'Wall Left', description: 'Hit left wall animation' },
    { id: 'wallRight', label: 'Wall Right', description: 'Hit right wall animation' },
] as const;

export type ANekoStateId = typeof ANEKO_STATES[number]['id'];

export const STATE_CATEGORIES = {
    core: ['stop', 'wait', 'awake'],
    movement: ['moveUp', 'moveDown', 'moveLeft', 'moveRight'],
    diagonal: ['moveUpLeft', 'moveUpRight', 'moveDownLeft', 'moveDownRight'],
    wall: ['wallUp', 'wallDown', 'wallLeft', 'wallRight'],
} as const;
