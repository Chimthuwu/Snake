import { state, GameState } from './state.js';
import { CONFIG } from './config.js';
import { audio } from './audio.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        
        // Screens
        this.menuScreen = document.getElementById('menu-screen');
        this.menuScreen.style.pointerEvents = 'none';
        this.pauseScreen = document.getElementById('pause-screen');
        this.pauseScreen.style.pointerEvents = 'none';
        this.gameoverScreen = document.getElementById('gameover-screen');
        this.gameoverScreen.style.pointerEvents = 'none';
        this.hud = document.getElementById('hud');
        this.uiLayer = document.getElementById('ui-layer');
        this.uiLayer.style.pointerEvents = 'auto';
        this.portfolioOverlay = document.getElementById('portfolio-overlay');
        this.vignetteOverlay = document.getElementById('vignette-overlay');
        
        // Elements
        this.scoreVal = document.getElementById('score-val');
        this.comboVal = document.getElementById('combo-val');
        this.comboBarFill = document.getElementById('combo-bar-fill');
        this.highscoreVal = document.getElementById('highscore-val');
        this.goScore = document.getElementById('go-score');
        this.goCombo = document.getElementById('go-combo');
        
        this.powerupIndicator = document.getElementById('powerup-indicator');
        this.powerupName = document.getElementById('powerup-name');
        this.powerupBarFill = document.getElementById('powerup-bar-fill');
        
        this.btnDiff = document.getElementById('btn-diff');
        this.btnMute = document.getElementById('btn-mute-toggle');
        this.btnPortfolio = document.getElementById('btn-portfolio-toggle');
        
        this.btnStart = document.getElementById('btn-start');
        this.btnResume = this.pauseScreen.querySelector('#btn-resume');
        this.btnQuit = this.pauseScreen.querySelector('#btn-quit');
        this.btnRestart = this.gameoverScreen.querySelector('#btn-restart');
        this.btnMenu = this.gameoverScreen.querySelector('#btn-menu');
        
        console.log('Buttons:', {
            btnStart: this.btnStart,
            btnResume: this.btnResume,
            btnQuit: this.btnQuit,
            btnRestart: this.btnRestart,
            btnMenu: this.btnMenu
        });
        
        [this.btnStart, this.btnResume, this.btnQuit, this.btnRestart, this.btnMenu, this.btnDiff, this.btnMute, this.btnPortfolio].forEach(btn => {
            if (btn) {
                btn.style.setProperty('pointer-events', 'auto', 'important');
                btn.style.setProperty('z-index', '1000', 'important');
            }
        });
        
        // Panels for parallax
        this.panels = document.querySelectorAll('.menu-panel');
        
        // Keyboard navigation
        this.menuButtons = [];
        this.selectedButtonIndex = 0;
        
        this.bindEvents();
    }

    bindEvents() {
        // Buttons
        this.menuButtons = [];
        
        if (this.btnStart) this.btnStart.addEventListener('click', () => {
            console.log('btnStart clicked');
            audio.playUISelect();
            this.game.start();
        });
        
        if (this.btnResume) this.btnResume.addEventListener('click', () => {
            console.log('btnResume clicked');
            audio.playUISelect();
            this.game.togglePause();
        });
        
        if (this.btnQuit) this.btnQuit.addEventListener('click', () => {
            console.log('btnQuit clicked');
            audio.playUISelect();
            this.game.quitToMenu();
        });

        if (this.btnRestart) this.btnRestart.addEventListener('click', () => {
            console.log('btnRestart clicked');
            audio.playUISelect();
            this.game.start();
        });

        if (this.btnMenu) this.btnMenu.addEventListener('click', () => {
            console.log('btnMenu clicked');
            audio.playUISelect();
            this.game.quitToMenu();
        });

        // Toggles
        this.btnPortfolio.addEventListener('click', () => {
            audio.playUISelect();
            state.portfolioMode = !state.portfolioMode;
            this.btnPortfolio.classList.toggle('active', state.portfolioMode);
            this.updatePortfolioMode();
        });

        this.btnMute.addEventListener('click', () => {
            state.isMuted = !state.isMuted;
            this.btnMute.classList.toggle('active', !state.isMuted);
            this.btnMute.textContent = state.isMuted ? '🔇' : '🔊';
            audio.resume();
        });

        // Difficulty Toggle
        const diffs = Object.keys(CONFIG.DIFFICULTIES);
        this.btnDiff.addEventListener('click', () => {
            audio.playUIHover();
            let idx = diffs.indexOf(state.difficulty);
            idx = (idx + 1) % diffs.length;
            state.difficulty = diffs[idx];
            this.btnDiff.textContent = state.difficulty;
        });

        // Hover sounds
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('mouseenter', () => audio.playUIHover());
        });

        // Keyboard navigation
        window.addEventListener('keydown', (e) => {
            if (state.current === GameState.PLAYING) return;

            if (e.code === 'ArrowDown' || e.code === 'ArrowRight' || e.code === 'KeyS' || e.code === 'KeyD') {
                this.navigateMenu(1);
            } else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft' || e.code === 'KeyW' || e.code === 'KeyA') {
                this.navigateMenu(-1);
            } else if (e.code === 'Enter' || e.code === 'Space') {
                if (this.menuButtons[this.selectedButtonIndex]) {
                    this.menuButtons[this.selectedButtonIndex].click();
                }
            }
        });
    }

    navigateMenu(direction) {
        audio.playUIHover();
        this.selectedButtonIndex = (this.selectedButtonIndex + direction + this.menuButtons.length) % this.menuButtons.length;
        this.highlightButton();
    }

    highlightButton() {
        this.menuButtons.forEach((btn, index) => {
            if (index === this.selectedButtonIndex) {
                btn.classList.add('active-glow');
                btn.focus();
            } else {
                btn.classList.remove('active-glow');
            }
        });
    }

    updateScreens() {
        this.menuScreen.classList.add('hidden');
        this.menuScreen.style.pointerEvents = 'none';
        this.pauseScreen.classList.add('hidden');
        this.pauseScreen.style.pointerEvents = 'none';
        this.gameoverScreen.classList.add('hidden');
        this.gameoverScreen.style.pointerEvents = 'none';
        this.hud.classList.add('hidden');
        this.uiLayer.style.pointerEvents = 'none';

        switch (state.current) {
            case GameState.MENU:
                this.menuScreen.classList.remove('hidden');
                this.menuScreen.style.pointerEvents = 'auto';
                this.menuScreen.style.zIndex = '2000';
                document.getElementById('main-menu-panel').style.pointerEvents = 'auto';
                document.getElementById('main-menu-panel').style.zIndex = '2001';
                document.querySelector('.menu-options').style.pointerEvents = 'auto';
                this.btnDiff.textContent = state.difficulty;
                document.getElementById('game-canvas').style.pointerEvents = 'none';
                this.updateMenuButtons();
                break;
            case GameState.PLAYING:
                this.hud.classList.remove('hidden');
                document.getElementById('game-canvas').style.pointerEvents = 'auto';
                break;
            case GameState.PAUSED:
                this.hud.classList.remove('hidden');
                this.pauseScreen.classList.remove('hidden');
                this.pauseScreen.style.pointerEvents = 'auto';
                document.getElementById('game-canvas').style.pointerEvents = 'none';
                this.updateMenuButtons();
                break;
            case GameState.GAMEOVER:
                this.gameoverScreen.classList.remove('hidden');
                this.gameoverScreen.style.pointerEvents = 'auto';
                this.goScore.textContent = state.score;
                this.goCombo.textContent = `x${state.combo}`;
                document.getElementById('game-canvas').style.pointerEvents = 'none';
                this.updateMenuButtons();
                break;
        }
    }

    updateMenuButtons() {
        switch (state.current) {
            case GameState.MENU:
                this.menuButtons = [this.btnStart, this.btnDiff, this.btnPortfolio, this.btnMute].filter(b => b);
                break;
            case GameState.PAUSED:
                this.menuButtons = [this.btnResume, this.btnQuit, this.btnPortfolio, this.btnMute].filter(b => b);
                break;
            case GameState.GAMEOVER:
                this.menuButtons = [this.btnRestart, this.btnMenu, this.btnPortfolio, this.btnMute].filter(b => b);
                console.log('GAMEOVER menu buttons:', this.menuButtons);
                break;
            default:
                this.menuButtons = [];
        }
        this.selectedButtonIndex = 0;
        this.highlightButton();
    }

    triggerComboPop() {
        if (!CONFIG.VISUALS.enabled) return;
        this.comboVal.classList.remove('combo-pop');
        // Trigger reflow
        void this.comboVal.offsetWidth;
        this.comboVal.classList.add('combo-pop');
        
        // Synchronize pulse with combo
        const pulseSpeed = Math.max(0.1, 1.0 / (state.combo * (CONFIG.VISUALS.comboPulseSpeed / 10)));
        this.comboVal.style.animationDuration = `${pulseSpeed}s`;
    }

    updateHUD() {
        this.scoreVal.textContent = state.score;
        this.comboVal.textContent = `x${state.combo}`;
        this.highscoreVal.textContent = state.highScore;

        // Combo Bar
        if (state.combo > 1) {
            const comboPct = (state.comboTimer / state.comboTimerMax);
            this.comboBarFill.style.transform = `scaleX(${Math.max(0, comboPct)})`;
        } else {
            this.comboBarFill.style.transform = `scaleX(0)`;
        }

        // Powerup Indicator
        if (state.activePowerup) {
            this.powerupIndicator.classList.remove('hidden');
            const pData = CONFIG.POWERUPS[state.activePowerup];
            this.powerupName.textContent = pData.name;
            this.powerupName.style.color = pData.color;
            this.powerupIndicator.style.borderColor = pData.color;
            this.powerupBarFill.style.backgroundColor = pData.color;
            this.powerupBarFill.style.boxShadow = `0 0 5px ${pData.color}`;
            
            const pct = (state.powerupTimer / CONFIG.POWERUP_DURATION);
            this.powerupBarFill.style.transform = `scaleX(${Math.max(0, pct)})`;
        } else {
            this.powerupIndicator.classList.add('hidden');
        }
    }

    updateVignette(tickRate) {
        if (!CONFIG.VISUALS.enabled) {
            this.vignetteOverlay.classList.remove('speed-vignette');
            this.vignetteOverlay.style.boxShadow = 'none';
            return;
        }

        const baseSpeed = CONFIG.DIFFICULTIES[state.difficulty].baseTick;
        
        if (tickRate < baseSpeed * 0.7) {
            this.vignetteOverlay.classList.add('speed-vignette');
            this.vignetteOverlay.style.boxShadow = `inset 0 0 ${100 * CONFIG.VISUALS.speedGlowMultiplier}px rgba(0, 242, 255, 0.1)`;
        } else {
            this.vignetteOverlay.classList.remove('speed-vignette');
            this.vignetteOverlay.style.boxShadow = 'none';
        }

        if (state.activePowerup) {
            const pData = CONFIG.POWERUPS[state.activePowerup];
            // Add hex alpha for glow
            this.vignetteOverlay.style.boxShadow = `inset 0 0 ${150 * CONFIG.VISUALS.speedGlowMultiplier}px ${pData.color}40`;
        }
    }

    updatePortfolioMode() {
        if (state.portfolioMode) {
            this.portfolioOverlay.classList.remove('hidden');
        } else {
            this.portfolioOverlay.classList.add('hidden');
        }
    }

    updateDebug(fps, dt, tickRate) {
        if (!state.portfolioMode) return;
        
        // Ensure debug panel exists
        let debugPanel = document.getElementById('debug-panel');
        if (!debugPanel) {
            debugPanel = document.createElement('div');
            debugPanel.id = 'debug-panel';
            debugPanel.className = 'glass-panel';
            debugPanel.style.position = 'absolute';
            debugPanel.style.top = '20px';
            debugPanel.style.right = '20px';
            debugPanel.style.padding = '10px';
            debugPanel.style.fontSize = '10px';
            debugPanel.style.color = '#00f2ff';
            debugPanel.style.zIndex = '1000';
            document.body.appendChild(debugPanel);
        }

        debugPanel.innerHTML = `
            <div>Tilt: ${state.boardTilt.x.toFixed(1)}, ${state.boardTilt.y.toFixed(1)}</div>
            <div>Cam: ${state.cameraPos.x.toFixed(1)}, ${state.cameraPos.y.toFixed(1)}</div>
            <div>Combo: ${state.combo}</div>
            <div>ComboTimer: ${state.comboTimer.toFixed(0)}</div>
            <div>GridBright: ${state.gridBrightness.toFixed(2)}</div>
            <div>Glitch: ${state.chromaticGlitch.toFixed(2)}</div>
        `;

        document.getElementById('debug-fps').textContent = Math.round(fps);
        document.getElementById('debug-dt').textContent = dt.toFixed(1) + 'ms';
        document.getElementById('debug-tick').textContent = Math.round(tickRate) + 'ms';
        document.getElementById('debug-len').textContent = state.snakeLength;
        document.getElementById('debug-entities').textContent = state.entitiesCount;
        document.getElementById('debug-state').textContent = state.current;
    }
}
