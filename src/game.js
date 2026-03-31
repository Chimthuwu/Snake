import { CONFIG } from './config.js';
import { state, GameState } from './state.js';
import { InputManager } from './input.js';
import { Renderer } from './renderer.js';
import { UIManager } from './ui.js';
import { audio } from './audio.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);
        this.input = new InputManager();
        this.ui = new UIManager(this);
        
        this.lastTime = 0;
        this.accumulator = 0;
        this.particles = [];
        this.previousSnake = [];
        
        this.resetGameData();
        this.ui.updateScreens();
        
        // Start loop
        requestAnimationFrame((t) => this.loop(t));
    }

    resetGameData() {
        this.snake = [
            { x: 10, y: 10 },
            { x: 10, y: 11 },
            { x: 10, y: 12 }
        ];
        this.previousSnake = JSON.parse(JSON.stringify(this.snake));
        this.food = this.generateFood();
        this.tickRate = CONFIG.DIFFICULTIES[state.difficulty].baseTick;
        this.input.reset();
        this.particles = [];
        state.reset();
        this.ui.updateHUD();
    }

    generateFood() {
        let newFood;
        let valid = false;
        while (!valid) {
            newFood = {
                x: Math.floor(Math.random() * CONFIG.GRID_SIZE),
                y: Math.floor(Math.random() * CONFIG.GRID_SIZE)
            };
            valid = !this.snake.some(s => s.x === newFood.x && s.y === newFood.y);
        }

        // Determine type
        if (Math.random() < CONFIG.POWERUP_CHANCE) {
            const types = Object.keys(CONFIG.POWERUPS);
            newFood.type = types[Math.floor(Math.random() * types.length)];
        } else {
            newFood.type = 'NORMAL';
        }

        return newFood;
    }

    spawnParticles(x, y, color, combo = 1) {
        if (!CONFIG.VISUALS.enabled) return;
        
        // Explosion radius increases per combo tier
        const speedMultiplier = 1 + (combo * 0.3);
        
        for (let i = 0; i < 15 + combo * 2; i++) {
            // Hue shift based on combo
            let finalColor = color;
            if (combo > 1) {
                // If it's a hex color, we just use HSL for combo particles
                finalColor = `hsl(${(combo * 30) % 360}, 100%, 50%)`;
            }

            this.particles.push({
                x: x + 0.5,
                y: y + 0.5,
                vx: (Math.random() - 0.5) * 15 * speedMultiplier,
                vy: (Math.random() - 0.5) * 15 * speedMultiplier,
                life: 1.0,
                maxLife: 1.0,
                size: Math.random() * 3 + 1 + (combo * 0.2),
                color: finalColor
            });
        }
    }

    start() {
        audio.resume();
        this.resetGameData();
        state.current = GameState.PLAYING;
        this.ui.updateScreens();
    }

    togglePause() {
        if (state.current === GameState.PLAYING) {
            state.current = GameState.PAUSED;
        } else if (state.current === GameState.PAUSED) {
            state.current = GameState.PLAYING;
        }
        this.ui.updateScreens();
    }

    quitToMenu() {
        state.current = GameState.MENU;
        this.ui.updateScreens();
    }

    gameOver() {
        audio.playDie();
        if (CONFIG.VISUALS.enabled) this.renderer.shake(CONFIG.SHAKE_INTENSITY_DEATH, CONFIG.SHAKE_DURATION_DEATH);
        state.setHighScore(state.score);
        state.current = GameState.GAMEOVER;
        this.ui.updateScreens();
    }

    update(dt) {
        if (state.current !== GameState.PLAYING && state.current !== GameState.MENU) return;

        if (state.current === GameState.MENU) {
            this.doAttractAI();
        }

        // Update Combo
        if (state.combo > 1) {
            state.comboTimer -= dt;
            if (state.comboTimer <= 0) {
                state.combo = 1;
            }
        }

        // Update Powerups
        if (state.activePowerup) {
            state.powerupTimer -= dt;
            if (state.powerupTimer <= 0) {
                state.activePowerup = null;
                // Reset tick rate if slow was active
                this.tickRate = Math.max(
                    CONFIG.MIN_TICK_RATE,
                    CONFIG.DIFFICULTIES[state.difficulty].baseTick * Math.pow(CONFIG.DIFFICULTIES[state.difficulty].speedCurve, state.snakeLength - 3)
                );
            }
        }
        
        // Update HUD every frame for smooth bars
        this.ui.updateHUD();
        this.ui.updateVignette(this.tickRate);

        // Fixed timestep for snake movement
        this.accumulator += dt;
        
        let currentTickRate = this.tickRate;
        if (state.activePowerup === 'SLOW') currentTickRate *= 1.5;

        if (this.accumulator >= currentTickRate) {
            this.accumulator -= currentTickRate;
            this.moveSnake();
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx * (dt / 1000);
            p.y += p.vy * (dt / 1000);
            p.life -= dt / 1000;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Update Grid Ripples
        for (let i = state.ripples.length - 1; i >= 0; i--) {
            let r = state.ripples[i];
            r.life -= dt / CONFIG.VISUALS.rippleDuration;
            if (r.life <= 0) state.ripples.splice(i, 1);
        }

        // Update flash and glitch
        if (state.globalFlash > 0) state.globalFlash -= dt / 500;
        if (state.gridBrightness > 1.0) state.gridBrightness -= dt / 1000;
        if (state.chromaticGlitch > 0) state.chromaticGlitch -= dt / 200;

        state.entitiesCount = this.snake.length + this.particles.length + state.ripples.length + 1;
    }

    doAttractAI() {
        const head = this.snake[0];
        const food = this.food;
        const currentDir = this.input.direction;
        
        const possibleDirs = [
            {x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}
        ];

        // Filter out 180 degree turns
        const validDirs = possibleDirs.filter(d => 
            !(d.x === -currentDir.x && d.y === -currentDir.y)
        );

        // Sort by Manhattan distance to food
        validDirs.sort((a, b) => {
            const distA = Math.abs((head.x + a.x) - food.x) + Math.abs((head.y + a.y) - food.y);
            const distB = Math.abs((head.x + b.x) - food.x) + Math.abs((head.y + b.y) - food.y);
            return distA - distB;
        });

        // Find the first direction that doesn't immediately kill the snake
        let chosenDir = validDirs[0];
        for (let dir of validDirs) {
            const nx = head.x + dir.x;
            const ny = head.y + dir.y;
            
            // Check walls (unless ghost mode)
            if (state.activePowerup !== 'GHOST') {
                if (nx < 0 || nx >= CONFIG.GRID_SIZE || ny < 0 || ny >= CONFIG.GRID_SIZE) continue;
            }
            
            // Check self
            let hitSelf = false;
            for (let i = 0; i < this.snake.length - 1; i++) {
                let s = this.snake[i];
                let checkX = nx;
                let checkY = ny;
                if (state.activePowerup === 'GHOST') {
                    checkX = (nx + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
                    checkY = (ny + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
                }
                if (s.x === checkX && s.y === checkY) {
                    hitSelf = true;
                    break;
                }
            }
            if (hitSelf) continue;

            chosenDir = dir;
            break;
        }

        this.input.nextDirection = chosenDir;
    }

    moveSnake() {
        this.previousSnake = JSON.parse(JSON.stringify(this.snake));
        
        // Detect turn for camera impulse
        const oldDir = this.input.direction;
        this.input.update();
        const dir = this.input.direction;
        
        if (oldDir.x !== dir.x || oldDir.y !== dir.y) {
            // Add impulse in opposite direction of turn
            state.cameraImpulse.vx -= dir.x * CONFIG.VISUALS.impulseStrength;
            state.cameraImpulse.vy -= dir.y * CONFIG.VISUALS.impulseStrength;
            
            // Add tilt velocity for dramatic board reaction
            state.boardTilt.vx += dir.x * 15;
            state.boardTilt.vy += dir.y * 15;
        }

        const head = this.snake[0];
        let newHead = {
            x: head.x + dir.x,
            y: head.y + dir.y
        };

        const isPhantom = state.difficulty === 'PHANTOM' || state.activePowerup === 'GHOST';
        
        // Wall collision
        if (newHead.x < 0 || newHead.x >= CONFIG.GRID_SIZE || newHead.y < 0 || newHead.y >= CONFIG.GRID_SIZE) {
            if (isPhantom) {
                newHead.x = (newHead.x + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
                newHead.y = (newHead.y + CONFIG.GRID_SIZE) % CONFIG.GRID_SIZE;
            } else {
                if (state.current === GameState.MENU) {
                    this.resetGameData();
                    return;
                }
                this.gameOver();
                return;
            }
        }

        // Self-collision
        if (!isPhantom) {
            for (let s of this.snake) {
                if (s.x === newHead.x && s.y === newHead.y) {
                    if (state.current === GameState.MENU) {
                        this.resetGameData();
                        return;
                    }
                    this.gameOver();
                    return;
                }
            }
        }

        // Collisions handled above for Phantom/Ghost flexibility
        
        this.snake.unshift(newHead);

        // Food collision
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            if (state.current !== GameState.MENU) {
                audio.playEat(state.combo);
                if (CONFIG.VISUALS.enabled) this.renderer.shake(CONFIG.SHAKE_INTENSITY_EAT, CONFIG.SHAKE_DURATION_EAT);
            }
            
            const color = this.food.type === 'NORMAL' ? CONFIG.COLORS.food : CONFIG.POWERUPS[this.food.type].color;
            this.spawnParticles(newHead.x, newHead.y, color, state.combo);
            
            // Trigger Grid Ripple & Flashes
            if (CONFIG.VISUALS.enabled) {
                state.ripples.push({
                    x: newHead.x,
                    y: newHead.y,
                    life: 1.0,
                    color: color
                });
                
                state.gridBrightness = 2.0 + (state.combo * 0.5);
                state.chromaticGlitch = 1.0;
            }

            // Handle Powerup
            if (this.food.type !== 'NORMAL') {
                if (state.current !== GameState.MENU) audio.playPowerup();
                state.activePowerup = this.food.type;
                state.powerupTimer = CONFIG.POWERUP_DURATION;
            }

            // Score & Combo
            state.addScore(10 * CONFIG.DIFFICULTIES[state.difficulty].scoreMult);
            state.combo++;
            state.comboTimer = state.comboTimerMax;
            if (state.current !== GameState.MENU) this.ui.triggerComboPop();
            
            // Speed up
            this.tickRate = Math.max(
                CONFIG.MIN_TICK_RATE,
                this.tickRate * CONFIG.DIFFICULTIES[state.difficulty].speedCurve
            );

            this.food = this.generateFood();
            state.snakeLength = this.snake.length;
        } else {
            this.snake.pop();
            if (state.current !== GameState.MENU) audio.playMove();
        }
    }

    loop(timestamp) {
        let dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Cap dt to prevent spiral of death on tab switch
        if (dt > 100) dt = 16;

        // Global input check (Pause)
        if (this.input.keys['Space']) {
            this.input.keys['Space'] = false; // consume
            this.togglePause();
        }
        if (this.input.keys['KeyP']) {
            this.input.keys['KeyP'] = false;
            state.portfolioMode = !state.portfolioMode;
            this.ui.btnPortfolio.classList.toggle('active', state.portfolioMode);
            this.ui.updatePortfolioMode();
        }

        this.update(dt);
        
        // Render
        let currentTickRate = this.tickRate;
        if (state.activePowerup === 'SLOW') currentTickRate *= 1.5;
        
        const renderState = {
            snake: this.snake,
            previousSnake: this.previousSnake,
            food: this.food,
            direction: this.input.direction
        };
        
        this.renderer.draw(renderState, this.particles, dt, this.accumulator, currentTickRate);

        // Debug
        if (state.portfolioMode) {
            let fps = 1000 / dt;
            this.ui.updateDebug(fps, dt, this.tickRate);
        }

        requestAnimationFrame((t) => this.loop(t));
    }
}

// Initialize
window.onload = () => {
    window.gameInstance = new Game();
};
