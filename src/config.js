export const CONFIG = {
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

    COLORS: {
        bg: 'hsl(240, 30%, 3%)',
        grid: 'hsla(180, 100%, 50%, 0.15)',
        snakeHead: 'hsl(180, 100%, 50%)',
        snakeBody: 'hsla(180, 100%, 50%, 0.8)',
        snakeGhost: 'hsla(280, 100%, 60%, 0.6)',
        food: 'hsl(330, 100%, 50%)',
        particles: ['hsl(180, 100%, 50%)', 'hsl(330, 100%, 50%)', 'hsl(60, 100%, 50%)', 'hsl(280, 100%, 60%)']
    },
    
    // Screen Shake
    SHAKE_INTENSITY_EAT: 1,
    SHAKE_INTENSITY_DEATH: 4,
    SHAKE_DURATION_EAT: 100,
    SHAKE_DURATION_DEATH: 300
};
