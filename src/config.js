export const CONFIG = {
    GRID_SIZE: 20,
    
    // Difficulty Settings
    DIFFICULTIES: {
        EASY: { baseTick: 180, speedCurve: 0.99, scoreMult: 1 },
        NORMAL: { baseTick: 130, speedCurve: 0.98, scoreMult: 2 },
        HARD: { baseTick: 90, speedCurve: 0.97, scoreMult: 3 }
    },
    
    MIN_TICK_RATE: 40,
    
    // Powerups
    POWERUP_CHANCE: 0.15,
    POWERUP_DURATION: 8000,
    POWERUPS: {
        SLOW: { id: 'SLOW', color: '#00ff41', name: 'TIME DILATION' },
        GHOST: { id: 'GHOST', color: '#b000ff', name: 'PHANTOM MODE' },
        MULTIPLIER: { id: 'MULTIPLIER', color: '#ffea00', name: 'SCORE x2' }
    },
    
    // Visuals & Depth System
    VISUALS: {
        enabled: true,
        VISUAL_DEBUG: true, // Force exaggerated effects
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
        stretchAmount: 0.5,
        turnCompression: 0.5,
        tailLag: 0.4,

        // Grid Ripple
        rippleStrength: 2.0, // Grid cell offset multiplier
        rippleDuration: 1000,
        rippleFrequency: 0.05,
        rippleSpeed: 0.5,

        // Vignette & Speed
        vignetteMax: 0.95,
        chromaticPowerupBoost: 20,
        speedGlowMultiplier: 5.0,

        // Combo Juice
        comboPopScale: 2.5,
        comboPulseSpeed: 25,
        comboDecayTime: 2000
    },

    COLORS: {
        bg: '#050505',
        grid: 'rgba(0, 242, 255, 0.08)',
        snakeHead: '#00f2ff',
        snakeBody: 'rgba(0, 242, 255, 0.8)',
        snakeGhost: 'rgba(176, 0, 255, 0.5)',
        food: '#ff0055',
        particles: ['#00f2ff', '#ff0055', '#ffea00', '#ff00ff']
    },
    
    // Screen Shake
    SHAKE_INTENSITY_EAT: 1,
    SHAKE_INTENSITY_DEATH: 4,
    SHAKE_DURATION_EAT: 100,
    SHAKE_DURATION_DEATH: 300
};
