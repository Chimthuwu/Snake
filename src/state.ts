import { CONFIG } from './config.js';

export enum GameState {
    MENU = 'MENU',
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
    GAMEOVER = 'GAMEOVER'
};

export enum GameMode {
    CLASSIC = 'CLASSIC',
    LABYRINTH = 'LABYRINTH',
    OPEN_WORLD = 'OPEN_WORLD'
};

interface Vec {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

interface Ripple {
    x: number;
    y: number;
    life: number;
    color: string;
}

class StateManager {
    current: GameState = GameState.MENU;
    score: number = 0;
    highScore: number = 0;
    combo: number = 1;
    comboTimer: number = 0;
    comboTimerMax: number = 0;
    activePowerup: string | null = null;
    powerupTimer: number = 0;
    snakeLength: number = 3;
    entitiesCount: number = 0;
    
    portfolioMode: boolean = false;
    difficulty: string = 'NORMAL';
    isMuted: boolean = false;
    theme: string = CONFIG.defaultTheme;
    gameMode: GameMode = GameMode.CLASSIC;
    walls: {x: number, y: number}[] = [];
    portal: {x: number, y: number} | null = null;
    currentRoom: {x: number, y: number} = {x: 0, y: 0};

    // Labyrinth progression (walls-as-doors)
    labyrinthDepth: number = 0; // current depth (0 = first room)
    roomsEntered: number = 1;  // how many rooms the player has entered total (resets on game over)
    foodEatenThisRoom: number = 0; // food collected in the *current* room
    unlockedWalls: {x: number, y: number}[] = []; // subset of doors that are currently unlocked (0..4)

    // For level-up HUD flash (used on room-enter celebrations)
    levelUpFlash: number = 0;

    ripples: Ripple[] = [];
    cameraImpulse: Vec = { x: 0, y: 0, vx: 0, vy: 0 };
    boardTilt: Vec = { x: 0, y: 0, vx: 0, vy: 0 };
    cameraPos: Vec = { x: 0, y: 0, vx: 0, vy: 0 };
    globalFlash: number = 0;
    gridBrightness: number = 1.0;
    chromaticGlitch: number = 0;

    constructor() {
        this.reset();
        this.highScore = parseInt(localStorage.getItem('neon_snake_highscore') || '0', 10);
        // Defaults applied above: theme='NEON' (CONFIG.defaultTheme), gameMode=CLASSIC,
        // difficulty='NORMAL'. We deliberately do NOT read theme/gameMode from localStorage
        // so every session starts fresh.
        // (cycleTheme() / setGameMode() still write to localStorage for backup, just never read.)
    }

    reset() {
        this.current = GameState.MENU;
        this.score = 0;
        this.combo = 1;
        this.comboTimer = 0;
        this.comboTimerMax = CONFIG.VISUALS.comboDecayTime;
        this.activePowerup = null;
        this.powerupTimer = 0;
        this.snakeLength = 3;
        this.entitiesCount = 0;

        // Labyrinth progression (walls-as-doors)
        this.labyrinthDepth = 0;
        this.roomsEntered = 1;
        this.foodEatenThisRoom = 0;
        this.unlockedWalls = [];
        this.currentRoom = { x: 0, y: 0 };
        this.levelUpFlash = 0;

        // Visual FX State
        this.ripples = [];
        this.cameraImpulse = { x: 0, y: 0, vx: 0, vy: 0 };
        this.boardTilt = { x: 0, y: 0, vx: 0, vy: 0 };
        this.cameraPos = { x: 0, y: 0, vx: 0, vy: 0 };
        this.globalFlash = 0;
        this.gridBrightness = 1.0;
        this.chromaticGlitch = 0;
    }

    setGameMode(mode: GameMode) {
        this.gameMode = mode;
        // NOTE: legacy localStorage write. The constructor no longer reads it (defaults always
        // win at session start), so this save is currently inert — retained for a future
        // per-account / cloud-sync feature where we'd want the user's last selection.
        localStorage.setItem('neon_snake_gamemode', mode);
    }

    /** Rotate to the next theme. Used on Labyrinth level-up. Returns the new theme key. */
    cycleTheme(): string {
        const themes = Object.keys(CONFIG.THEMES);
        const idx = themes.indexOf(this.theme);
        const next = themes[(idx + 1) % themes.length];
        this.theme = next;
        // NOTE: legacy localStorage write. Same inert-for-now rationale as setGameMode().
        localStorage.setItem('neon_snake_theme', next);
        return next;
    }

    setHighScore(score: number): boolean {
        if (score > this.highScore) {
            this.highScore = score;
            localStorage.setItem('neon_snake_highscore', this.highScore.toString());
            return true;
        }
        return false;
    }

    addScore(points: number): void {
        let finalPoints = points * this.combo;
        if (this.activePowerup === 'MULTIPLIER') finalPoints *= 2;
        this.score += finalPoints;
    }
}

export const state = new StateManager();
