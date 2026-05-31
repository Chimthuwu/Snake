import { CONFIG } from './config.js';
import { state, GameState, GameMode } from './state';
import { InputManager } from './input';
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
        state.reset();
        
        if (state.gameMode === GameMode.LABYRINTH) {
            const labyrinthLevels = Object.keys(CONFIG.LEVELS).filter(k => k !== 'EMPTY');
            const randomLevelKey = labyrinthLevels[Math.floor(Math.random() * labyrinthLevels.length)];
            state.walls = CONFIG.LEVELS[randomLevelKey];
        } else {
            state.walls = [];
        }

        this.snake = [];
        let startX, startY;
        let initialDirection = { x: 1, y: 0 }; // Default to right
        let validSpawn = false;
        const initialSnakeLength = 3;

        // Try to find a safe spawn location
        let attempts = 0;
        const maxAttempts = 100;
        while (!validSpawn && attempts < maxAttempts) {
            attempts++;
            // Randomize starting corner a bit to reduce predictability
            const corner = Math.floor(Math.random() * 4);
            switch(corner) {
                case 0: // Top-leftish
                    startX = Math.floor(Math.random() * (CONFIG.GRID_SIZE / 4)) + 1;
                    startY = Math.floor(Math.random() * (CONFIG.GRID_SIZE / 4)) + 1;
                    initialDirection = { x: 1, y: 0 };
                    break;
                case 1: // Top-rightish
                    startX = Math.floor(Math.random() * (CONFIG.GRID_SIZE / 4)) + CONFIG.GRID_SIZE * 3 / 4 - initialSnakeLength;
                    startY = Math.floor(Math.random() * (CONFIG.GRID_SIZE / 4)) + 1;
                    initialDirection = { x: -1, y: 0 };
                    break;
                case 2: // Bottom-leftish
                    startX = Math.floor(Math.random() * (CONFIG.GRID_SIZE / 4)) + 1;
                    startY = Math.floor(Math.random() * (CONFIG.GRID_SIZE / 4)) + CONFIG.GRID_SIZE * 3 / 4 - initialSnakeLength;
                    initialDirection = { x: 0, y: -1 };
                    break;
                case 3: // Bottom-rightish
                    startX = Math.floor(Math.random() * (CONFIG.GRID_SIZE / 4)) + CONFIG.GRID_SIZE * 3 / 4 - initialSnakeLength;
                    startY = Math.floor(Math.random() * (CONFIG.GRID_SIZE / 4)) + CONFIG.GRID_SIZE * 3 / 4 - initialSnakeLength;
                    initialDirection = { x: -1, y: 0 }; // Adjusted for bottom-right
                    break;
            }
            
            // Generate potential snake segments based on start and direction
            let tempSnake = [];
            for (let i = 0; i < initialSnakeLength; i++) {
                tempSnake.push({
                    x: startX - initialDirection.x * i,
                    y: startY - initialDirection.y * i
                });
            }

            // Check if potential snake overlaps with walls or boundaries
            validSpawn = true;
            for (let segment of tempSnake) {
                if (segment.x < 0 || segment.x >= CONFIG.GRID_SIZE ||
                    segment.y < 0 || segment.y >= CONFIG.GRID_SIZE ||
                    state.walls.some(w => w.x === segment.x && w.y === segment.y)) {
                    validSpawn = false;
                    break;
                }
            }
            // Check the square *just ahead* of the head too
            const nextHeadPos = { x: tempSnake[0].x + initialDirection.x, y: tempSnake[0].y + initialDirection.y };
            if (nextHeadPos.x < 0 || nextHeadPos.x >= CONFIG.GRID_SIZE ||
                nextHeadPos.y < 0 || nextHeadPos.y >= CONFIG.GRID_SIZE ||
                state.walls.some(w => w.x === nextHeadPos.x && w.y === nextHeadPos.y)) {
                validSpawn = false;
            }

            if (validSpawn) {
                this.snake = tempSnake;
            }
        }

        if (!validSpawn) {
            // Fallback: if no safe spawn found after maxAttempts, use a default safe spawn
            this.snake = [{x: 1, y: 1}, {x: 1, y: 2}, {x: 1, y: 3}];
            initialDirection = { x: 1, y: 0 }; // Default direction for fallback
        }

        this.previousSnake = this.snake.map(s => ({ ...s }));
        this.food = this.generateFood(); // Food generation already checks for walls and snake
        this.tickRate = CONFIG.DIFFICULTIES[state.difficulty].baseTick;
        this.input.reset();
        this.input.setDirection(initialDirection); // Set initial direction after spawn
        this.particles = [];
        this.ui.updateHUD();
        }

        loadRoom() {
        if (state.gameMode !== GameMode.OPEN_WORLD) return;
        const labyrinthLevels = Object.keys(CONFIG.LEVELS).filter(k => k !== 'EMPTY');
        const randomLevelKey = labyrinthLevels[Math.floor(Math.random() * labyrinthLevels.length)];
        state.walls = CONFIG.LEVELS[randomLevelKey];
        }

        generateFood() {
        let newFood;
        let valid = false;
        while (!valid) {
            newFood = {
                x: Math.floor(Math.random() * CONFIG.GRID_SIZE),
                y: Math.floor(Math.random() * CONFIG.GRID_SIZE)
            };
            const onSnake = this.snake.some(s => s.x === newFood.x && s.y === newFood.y);
            let onWall = state.walls.some(w => w.x === newFood.x && w.y === newFood.y);
            if (!onWall && (state.gameMode === GameMode.LABYRINTH || state.gameMode === GameMode.OPEN_WORLD)) {
                const isNearWall = state.walls.some(w => 
                    Math.abs(newFood.x - w.x) <= 1 && Math.abs(newFood.y - w.y) <= 1
                );
                if (isNearWall) {
                    onWall = true;
                }
            }
            const onPortal = state.portal && state.portal.x === newFood.x && state.portal.y === newFood.y;
            valid = !onSnake && !onWall && !onPortal;
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

    generatePortal() {
        if (state.gameMode !== GameMode.OPEN_WORLD) {
            state.portal = null;
            return;
        }

        let newPortal;
        let valid = false;
        while (!valid) {
            newPortal = {
                x: Math.floor(Math.random() * CONFIG.GRID_SIZE),
                y: Math.floor(Math.random() * CONFIG.GRID_SIZE)
            };
            const onSnake = this.snake.some(s => s.x === newPortal.x && s.y === newPortal.y);
            const onWall = state.walls.some(w => w.x === newPortal.x && w.y === newPortal.y);
            valid = !onSnake && !onWall;
        }
        state.portal = newPortal;
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
        audio.playMusic();
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
        // Shield Check
        if (state.activePowerup === 'SHIELD') {
            state.activePowerup = null;
            state.powerupTimer = 0;
            if (CONFIG.VISUALS.enabled) this.renderer.shake(CONFIG.SHAKE_INTENSITY_EAT * 2, CONFIG.SHAKE_DURATION_EAT * 2);
            return;
        }

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

            // Magnet effect
            if (state.activePowerup === 'MAGNET' && this.food) {
                const head = this.snake[0];
                const dx = head.x - this.food.x;
                const dy = head.y - this.food.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 1) { // Only pull if not already on top
                    // Move food towards snake head. The divisor controls speed.
                    this.food.x += dx / dist * (dist / 15); 
                    this.food.y += dy / dist * (dist / 15);
                }
            }

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
        if (state.gridBrightness > 1.0) state.gridBrightness -= dt / 200; // Faster decay
        if (state.chromaticGlitch > 0) state.chromaticGlitch -= dt / 200;

        // Audio-reactive effects
        const audioData = audio.getAudioData();
        if (audioData) {
            // Get bass level (avg of first few frequency bins)
            const bass = (audioData[0] + audioData[1] + audioData[2]) / 3 / 255;
            state.gridBrightness += bass * 0.5;
        }


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

        this.input.setDirection(chosenDir);
    }

    moveSnake() {
        this.previousSnake = this.snake.map(s => ({ ...s }));
        
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
        const hitWall = state.walls.some(w => w.x === newHead.x && w.y === newHead.y);
        if (hitWall && !isPhantom) {
            this.gameOver();
            return;
        }

        const hitBoundary = newHead.x < 0 || newHead.x >= CONFIG.GRID_SIZE || newHead.y < 0 || newHead.y >= CONFIG.GRID_SIZE;

        if (hitBoundary) {
            if (state.gameMode === GameMode.OPEN_WORLD) {
                if (newHead.x < 0) {
                    state.currentRoom.x--;
                    newHead.x = CONFIG.GRID_SIZE - 1;
                } else if (newHead.x >= CONFIG.GRID_SIZE) {
                    state.currentRoom.x++;
                    newHead.x = 0;
                }
                if (newHead.y < 0) {
                    state.currentRoom.y--;
                    newHead.y = CONFIG.GRID_SIZE - 1;
                } else if (newHead.y >= CONFIG.GRID_SIZE) {
                    state.currentRoom.y++;
                    newHead.y = 0;
                }
                this.loadRoom();
            } else if (isPhantom) {
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
        if (state.activePowerup !== 'GHOST') {
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

        // Portal collision
        if (state.gameMode === GameMode.OPEN_WORLD && state.portal && newHead.x === state.portal.x && newHead.y === state.portal.y) {
            this.loadRoom();
            this.food = this.generateFood();
            this.generatePortal();
            // Add score, effects, etc.
        }

        // Food collision
        const ateFood = this.food && Math.abs(newHead.x - this.food.x) < 1 && Math.abs(newHead.y - this.food.y) < 1;

        if (ateFood) {
            if (state.current !== GameState.MENU) {
                audio.playEat(state.combo);
                if (CONFIG.VISUALS.enabled) this.renderer.shake(CONFIG.SHAKE_INTENSITY_EAT, CONFIG.SHAKE_DURATION_EAT);
            }

            const foodType = this.food.type;
            const color = foodType === 'NORMAL' ? CONFIG.THEMES[state.theme].food : CONFIG.POWERUPS[foodType].color;
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
            if (foodType !== 'NORMAL') {
                if (state.current !== GameState.MENU) audio.playPowerup();
                
                if (foodType === 'SHRINK') {
                    // Instant effect for Shrink
                    const amountToShrink = 3;
                    if (this.snake.length > amountToShrink + 1) {
                        for (let i = 0; i < amountToShrink; i++) {
                            this.snake.pop();
                        }
                        state.snakeLength = this.snake.length;
                    }
                } else {
                    // Timed effect for others
                    state.activePowerup = foodType;
                    state.powerupTimer = CONFIG.POWERUP_DURATION;
                }
            }

            // Score & Combo
            if (state.current !== GameState.MENU) {
                state.addScore(10 * CONFIG.DIFFICULTIES[state.difficulty].scoreMult);
                state.combo++;
                state.comboTimer = state.comboTimerMax;
                this.ui.triggerComboPop();
            }
            
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
