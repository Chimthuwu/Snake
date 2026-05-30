import { CONFIG } from './config.js';

export enum GameState {
    MENU = 'MENU',
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
    GAMEOVER = 'GAMEOVER'
};

export enum GameMode {
    CLASSIC = 'CLASSIC',
    LABYRINTH = 'LABYRINTH'
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
        this.theme = localStorage.getItem('neon_snake_theme') || CONFIG.defaultTheme;
        this.gameMode = (localStorage.getItem('neon_snake_gamemode') as GameMode) || GameMode.CLASSIC;
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
        this.walls = [];
        
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
        localStorage.setItem('neon_snake_gamemode', mode);
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
