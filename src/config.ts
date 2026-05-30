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

interface Config {
    GRID_SIZE: number;
    DIFFICULTIES: { [key: string]: Difficulty };
    MIN_TICK_RATE: number;
    POWERUP_CHANCE: number;
    POWERUP_DURATION: number;
    POWERUPS: { [key: string]: Powerup };
    VISUALS: VisualConfig;
    COLORS: {
        bg: string;
        grid: string;
        snakeHead: string;
        snakeBody: string;
        snakeGhost: string;
        food: string;
        particles: string[];
    };
    SHAKE_INTENSITY_EAT: number;
    SHAKE_INTENSITY_DEATH: number;
    SHAKE_DURATION_EAT: number;
    SHAKE_DURATION_DEATH: number;
}

export const CONFIG: Config = {
    GRID_SIZE: 20,
// ... existing code ...
