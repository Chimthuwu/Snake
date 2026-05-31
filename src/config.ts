interface Difficulty {
    baseTick: number;
    speedCurve: number;
    scoreMult: number;
}

interface Powerup {
    id: string;
    color: string;
    name: string;
}

interface VisualConfig {
    enabled: boolean;
    VISUAL_DEBUG: boolean;
    boardTiltMax: number;
    boardTiltSpring: number;
    boardTiltDamping: number;
    cameraFollowLag: number;
    cameraOvershoot: number;
    impulseStrength: number;
    impulseDecay: number;
    impulseSpring: number;
    stretchAmount: number;
    turnCompression: number;
    tailLag: number;
    rippleStrength: number;
    rippleDuration: number;
    rippleFrequency: number;
    rippleSpeed: number;
    vignetteMax: number;
    chromaticPowerupBoost: number;
    speedGlowMultiplier: number;
    gridBreathingSpeed: number;
    gridBreathingDepth: number;
    gridJitterAmplitude: number;
    gridJitterFrequency: number;
    gridColorFlowSpeed: number;
    glitchChance: number;
    glitchDuration: number;
    glitchOffsetMax: number;
    chromaticBurstDuration: number;
    dataPacketChance: number;
    dataPacketSpeed: number;
    gridNoiseIntensity: number;
    comboPopScale: number;
    comboPulseSpeed: number;
    comboDecayTime: number;
}

interface ColorScheme {
    bg: string;
    grid: string;
    snakeHead: string;
    snakeBody: string;
    snakeGhost: string;
    food: string;
    wall: string;
    particles: string[];
}

interface Config {
    GRID_SIZE: number;
    DIFFICULTIES: { [key: string]: Difficulty };
    MIN_TICK_RATE: number;
    POWERUP_CHANCE: number;
    POWERUP_DURATION: number;
    POWERUPS: { [key: string]: Powerup };
    VISUALS: VisualConfig;
    THEMES: { [key: string]: ColorScheme };
    defaultTheme: string;
    LEVELS: { [key: string]: {x: number, y: number}[] };
    defaultLevel: string;
    SHAKE_INTENSITY_EAT: number;
    SHAKE_INTENSITY_DEATH: number;
    SHAKE_DURATION_EAT: number;
    SHAKE_DURATION_DEATH: number;
}

export const CONFIG: Config = {
    GRID_SIZE: 20,
    
    // Difficulty Settings
    DIFFICULTIES: {
        EASY: { baseTick: 180, speedCurve: 0.99, scoreMult: 1 },
        NORMAL: { baseTick: 130, speedCurve: 0.98, scoreMult: 2 },
        HARD: { baseTick: 90, speedCurve: 0.97, scoreMult: 3 },
        INSANE: { baseTick: 60, speedCurve: 0.96, scoreMult: 5 },
        PHANTOM: { baseTick: 90, speedCurve: 0.97, scoreMult: 1.5 }
    },
    
    MIN_TICK_RATE: 40,
    
    // Powerups
    POWERUP_CHANCE: 0.15,
    POWERUP_DURATION: 8000,
    POWERUPS: {
        SLOW: { id: 'SLOW', color: '#00ff41', name: 'TIME DILATION' },
        GHOST: { id: 'GHOST', color: '#b000ff', name: 'PHANTOM MODE' },
        MULTIPLIER: { id: 'MULTIPLIER', color: '#ffea00', name: 'SCORE x2' },
        SHIELD: { id: 'SHIELD', color: '#00bfff', name: 'DEFLECTOR' },
        MAGNET: { id: 'MAGNET', color: '#ff4500', name: 'FOOD ATTRACTOR' },
        SHRINK: { id: 'SHRINK', color: '#DA70D6', name: 'COMPACT' }
    },
    
    // Visuals & Depth System
    VISUALS: {
        enabled: true,
        VISUAL_DEBUG: false, // Force exaggerated effects
        // Depth & Camera
        boardTiltMax: 5, // degrees
        boardTiltSpring: 0.1,
        boardTiltDamping: 0.3,
        
        cameraFollowLag: 0.02,
        cameraOvershoot: 0.9,
        
        impulseStrength: 10,
        impulseDecay: 0.5,
        impulseSpring: 0.2,

        // Snake Deformation
        stretchAmount: 0.3,
        turnCompression: 0.1,
        tailLag: 0.2,

        // Grid Ripple
        rippleStrength: 1.5, // Grid cell offset multiplier
        rippleDuration: 800,
        rippleFrequency: 0.04,
        rippleSpeed: 0.6,

        // Vignette & Speed
        vignetteMax: 0.8,
        chromaticPowerupBoost: 12,
        speedGlowMultiplier: 3.0,

        // Living Grid
        gridBreathingSpeed: 0.002,
        gridBreathingDepth: 0.3,
        gridJitterAmplitude: 0.8,
        gridJitterFrequency: 0.015,
        gridColorFlowSpeed: 0.05,

        // Cyber Terminal Engine
        glitchChance: 0.005, // Random frame tear chance
        glitchDuration: 100, // ms
        glitchOffsetMax: 15, // pixels
        chromaticBurstDuration: 300, 
        
        dataPacketChance: 0.1, 
        dataPacketSpeed: 0.15,
        gridNoiseIntensity: 0.05,

        // Combo Juice
        comboPopScale: 1.8,
        comboPulseSpeed: 20,
        comboDecayTime: 1500
    },

    defaultTheme: 'NEON',
    THEMES: {
        NEON: {
            bg: 'hsl(240, 30%, 3%)',
            grid: 'hsla(180, 100%, 50%, 0.15)',
            snakeHead: 'hsl(180, 100%, 50%)',
            snakeBody: 'hsla(180, 100%, 50%, 0.8)',
            snakeGhost: 'hsla(280, 100%, 60%, 0.6)',
            food: 'hsl(330, 100%, 50%)',
            wall: 'hsl(0, 80%, 50%)',
            particles: ['hsl(180, 100%, 50%)', 'hsl(330, 100%, 50%)', 'hsl(60, 100%, 50%)', 'hsl(280, 100%, 60%)']
        },
        EMBER: {
            bg: 'hsl(20, 40%, 5%)',
            grid: 'hsla(30, 100%, 50%, 0.15)',
            snakeHead: 'hsl(45, 100%, 50%)',
            snakeBody: 'hsla(30, 100%, 50%, 0.8)',
            snakeGhost: 'hsla(300, 100%, 60%, 0.6)',
            food: 'hsl(150, 100%, 50%)',
            wall: 'hsl(0, 80%, 50%)',
            particles: ['hsl(45, 100%, 50%)', 'hsl(30, 100%, 50%)', 'hsl(10, 100%, 50%)']
        },
        OCEAN: {
            bg: 'hsl(220, 50%, 10%)',
            grid: 'hsla(200, 100%, 50%, 0.15)',
            snakeHead: 'hsl(190, 100%, 60%)',
            snakeBody: 'hsla(210, 100%, 60%, 0.8)',
            snakeGhost: 'hsla(250, 100%, 70%, 0.6)',
            food: 'hsl(100, 100%, 50%)',
            wall: 'hsl(0, 80%, 50%)',
            particles: ['hsl(190, 100%, 60%)', 'hsl(210, 100%, 60%)', 'hsl(100, 100%, 50%)']
        }
    },

    defaultLevel: 'EMPTY',
    LEVELS: {
        EMPTY: [],
        TUNNELS: [
            {x: 0, y: 9}, {x: 1, y: 9}, {x: 2, y: 9}, {x: 3, y: 9}, {x: 4, y: 9}, {x: 5, y: 9}, {x: 6, y: 9},
            {x: 13, y: 9}, {x: 14, y: 9}, {x: 15, y: 9}, {x: 16, y: 9}, {x: 17, y: 9}, {x: 18, y: 9}, {x: 19, y: 9},
        ],
        PILLARS: [
            {x: 4, y: 4}, {x: 4, y: 5}, {x: 5, y: 4}, {x: 5, y: 5},
            {x: 14, y: 4}, {x: 15, y: 4}, {x: 14, y: 5}, {x: 15, y: 5},
            {x: 4, y: 14}, {x: 5, y: 14}, {x: 4, y: 15}, {x: 5, y: 15},
            {x: 14, y: 14}, {x: 15, y: 14}, {x: 14, y: 15}, {x: 15, y: 15},
            {x: 9, y: 9}, {x: 10, y: 9}, {x: 9, y: 10}, {x: 10, y: 10},
        ],
        DIAGONAL: [
            {x: 4, y: 4}, {x: 5, y: 5}, {x: 6, y: 6}, {x: 7, y: 7}, {x: 8, y: 8}, 
            {x: 11, y: 11}, {x: 12, y: 12}, {x: 13, y: 13}, {x: 14, y: 14}, {x: 15, y: 15},
            {x: 4, y: 15}, {x: 5, y: 14}, {x: 6, y: 13}, {x: 7, y: 12}, {x: 8, y: 11},
            {x: 11, y: 8}, {x: 12, y: 7}, {x: 13, y: 6}, {x: 14, y: 5}, {x: 15, y: 4},
        ]
    },
    
    // Screen Shake
    SHAKE_INTENSITY_EAT: 1,
    SHAKE_INTENSITY_DEATH: 4,
    SHAKE_DURATION_EAT: 100,
    SHAKE_DURATION_DEATH: 300
};
