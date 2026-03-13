import { CONFIG } from './config.js';

export const GameState = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
};

class StateManager {
    constructor() {
        this.reset();
        this.highScore = parseInt(localStorage.getItem('neon_snake_highscore')) || 0;
        this.portfolioMode = false;
        this.difficulty = 'NORMAL';
        this.isMuted = false;
        
        // Global visual state
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
        
        // Visual FX State
        this.ripples = [];
        this.cameraImpulse = { x: 0, y: 0, vx: 0, vy: 0 };
        this.boardTilt = { x: 0, y: 0, vx: 0, vy: 0 };
        this.cameraPos = { x: 0, y: 0, vx: 0, vy: 0 };
        this.globalFlash = 0;
        this.gridBrightness = 1.0;
        this.chromaticGlitch = 0;
    }

    setHighScore(score) {
        if (score > this.highScore) {
            this.highScore = score;
            localStorage.setItem('neon_snake_highscore', this.highScore.toString());
            return true;
        }
        return false;
    }

    addScore(points) {
        let finalPoints = points * this.combo;
        if (this.activePowerup === 'MULTIPLIER') finalPoints *= 2;
        this.score += finalPoints;
    }
}

export const state = new StateManager();
