import { CONFIG } from './config.js';
import { state, GameState, GameMode } from './state';
import { InputManager } from './input';
import { Renderer } from './renderer.js';
import { UIManager } from './ui.js';
import { audio } from './audio.js';

/* ===================== Procedural Labyrinth Helpers =====================
 * Mulberry32: deterministic seeded PRNG, small + fast for the cell-grid distribution.
 * The seed is base + labyrinthDepth*7919 so each room has stable, reproducible walls.
 */
function mulberry32(seed: number): () => number {
    let s = (seed | 0) || 1;
    return () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const LABYRINTH_SEED_BASE = 0xC0FFEE;

/** BFS check: is `start` reachable to ANY of `targets` in a grid where walls are blocked? */
function isReachableToAllDoors(
    start: {x: number, y: number},
    targets: {x: number, y: number}[],
    walls: {x: number, y: number}[],
    grid: number
): boolean {
    const blocked = new Set<string>();
    walls.forEach(w => blocked.add(`${w.x}_${w.y}`));
    const deltas = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const target of targets) {
        const visited = new Set<string>();
        const queue: {x: number, y: number}[] = [start];
        visited.add(`${start.x}_${start.y}`);
        let found = false;
        while (queue.length > 0) {
            const cur = queue.shift()!;
            if (cur.x === target.x && cur.y === target.y) { found = true; break; }
            for (const [dx, dy] of deltas) {
                const nx = cur.x + dx;
                const ny = cur.y + dy;
                if (nx < 0 || nx >= grid || ny < 0 || ny >= grid) continue;
                if (blocked.has(`${nx}_${ny}`)) continue;
                const k = `${nx}_${ny}`;
                if (visited.has(k)) continue;
                visited.add(k);
                queue.push({ x: nx, y: ny });
            }
        }
        if (!found) return false;
    }
    return true;
}

/** Build interior maze walls for one Labyrinth room.
 *  Guarantees:
 *   - The 4 perimeter door cells (and the cell just inside them) stay clear so the
 *     player can always cross through to the next room.
 *   - A 5×5 bubble around every snake segment is clear so the snake can never spawn on
 *     or adjacent to a wall.
 *   - Wall count ramps with labyrinthDepth so deeper rooms feel denser. */
function generateLabyrinthInteriorWalls(
    seed: number,
    snakeCells: {x: number, y: number}[],
    labyrinthDepth: number
): {x: number, y: number}[] {
    const grid = CONFIG.GRID_SIZE;
    const half = Math.floor(grid / 2);
    const forbidden = new Set<string>();
    const k = (x: number, y: number) => `${x}_${y}`;

    // Doors + the interior cell just inside each door stay clear (so the player can
    // always fit through on the first tick after unlock).
    forbidden.add(k(half, 0));
    forbidden.add(k(half, grid - 1));
    forbidden.add(k(0, half));
    forbidden.add(k(grid - 1, half));
    forbidden.add(k(half, 1));
    forbidden.add(k(half, grid - 2));
    forbidden.add(k(1, half));
    forbidden.add(k(grid - 2, half));

    // 5×5 spawn safety bubble around every snake segment
    snakeCells.forEach(s => {
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const x = s.x + dx;
                const y = s.y + dy;
                if (x >= 1 && x < grid - 1 && y >= 1 && y < grid - 1) {
                    forbidden.add(k(x, y));
                }
            }
        }
    });

    const snakeStart = snakeCells[0] || { x: 2, y: 2 };
    const halfG = Math.floor(grid / 2);
    // Connectivity targets: 1 cell INSIDE each perimeter door (we keep these cells clear
    // anyway, so a successful BFS proves the snake can physically reach the door).
    const doorTargets = [
        { x: halfG, y: 1 },
        { x: halfG, y: grid - 2 },
        { x: 1, y: halfG },
        { x: grid - 2, y: halfG },
    ];

    // Try up to 4 randomized generations: each retry uses a smaller target size (and a
    // salt-modified seed) so connectivity almost always succeeds. Each retry tends to
    // produce a slightly different layout but never more walls than the depth allows.
    for (let retry = 0; retry < 4; retry++) {
        const rng = mulberry32(((seed | 0) + retry * 31337) || 1);
        const walls: {x: number, y: number}[] = [];
        const base = Math.max(8, 26 - retry * 5);   // 26 -> 21 -> 16 -> 11
        const ramp = Math.min(14, labyrinthDepth * 2) - retry * 3;
        const target = Math.max(8, Math.min(40, base + ramp));

        let attempts = 0;
        while (walls.length < target && attempts < 600) {
            attempts++;
            const x = 1 + Math.floor(rng() * (grid - 2));
            const y = 1 + Math.floor(rng() * (grid - 2));
            if (forbidden.has(k(x, y))) continue;
            if (walls.some(w => w.x === x && w.y === y)) continue;
            walls.push({ x, y });
        }

        if (isReachableToAllDoors(snakeStart, doorTargets, walls, grid)) {
            return walls;
        }
    }

    // Final fallback: empty interior walls (door-unlock progression still gives purpose).
    return [];
}

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
        
        // Labyrinth mode (walls-as-doors): the room has 4 perimeter doors, all locked.
        if (state.gameMode === GameMode.LABYRINTH) {
            const halfGrid = Math.floor(CONFIG.GRID_SIZE / 2);
            state.walls = [
                { x: halfGrid, y: 0 },                     // top door
                { x: halfGrid, y: CONFIG.GRID_SIZE - 1 },  // bottom door
                { x: 0, y: halfGrid },                     // left door
                { x: CONFIG.GRID_SIZE - 1, y: halfGrid },  // right door
            ];
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

            // Note: in Labyrinth mode the 4 doors are placed at mid-perimeter, which is never
            // on top of a corner spawn. So no per-iteration wall regen is required here.

            // Extend the 4 door cells with procedural interior walls for THIS candidate
            // snake. The seed encodes the current labyrinthDepth so each room has stable
            // walls; deeper rooms get more walls.
            if (state.gameMode === GameMode.LABYRINTH) {
                const interior = generateLabyrinthInteriorWalls(
                    LABYRINTH_SEED_BASE + state.labyrinthDepth * 7919,
                    tempSnake,
                    state.labyrinthDepth
                );
                state.walls = [
                    { x: halfGrid, y: 0 },                     // top door
                    { x: halfGrid, y: CONFIG.GRID_SIZE - 1 },  // bottom door
                    { x: 0, y: halfGrid },                     // left door
                    { x: CONFIG.GRID_SIZE - 1, y: halfGrid },  // right door
                    ...interior,
                ];
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
            // Fallback: if no safe spawn found after maxAttempts. With walls-as-doors the
            // 4 perimeter doors are fixed; the (1,1)–(1,3) head lands safely in the interior.
            this.snake = [{x: 1, y: 1}, {x: 1, y: 2}, {x: 1, y: 3}];
            initialDirection = { x: 1, y: 0 };
            // Regenerate interior walls in Labyrinth mode using the fallback snake so the
            // (1,1)–(1,3) head can't land on a leftover interior wall from the last attempt.
            if (state.gameMode === GameMode.LABYRINTH) {
                const interior = generateLabyrinthInteriorWalls(
                    LABYRINTH_SEED_BASE + state.labyrinthDepth * 7919,
                    this.snake,
                    state.labyrinthDepth
                );
                state.walls = [
                    { x: halfGrid, y: 0 },
                    { x: halfGrid, y: CONFIG.GRID_SIZE - 1 },
                    { x: 0, y: halfGrid },
                    { x: CONFIG.GRID_SIZE - 1, y: halfGrid },
                    ...interior,
                ];
            }
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
            // In Labyrinth mode the entire perimeter is touch-of-death (lethal). Food must
            // land in the interior only so the player can physically reach it.
            if (state.gameMode === GameMode.LABYRINTH) {
                const grid = CONFIG.GRID_SIZE;
                const onPerimeter = newFood.x === 0 || newFood.x === grid - 1
                                 || newFood.y === 0 || newFood.y === grid - 1;
                if (onPerimeter) {
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
        // Portals are an OPEN_WORLD-only feature. Labyrinth now uses walls-as-doors
        // (the 4 perimeter doors unlock by collecting food).
        if (state.gameMode !== GameMode.OPEN_WORLD) {
            state.portal = null;
            return;
        }

        const r = () => Math.random();
        let found = null;
        const tries = 300;
        for (let i = 0; i < tries && !found; i++) {
            const candidate = {
                x: Math.floor(r() * CONFIG.GRID_SIZE),
                y: Math.floor(r() * CONFIG.GRID_SIZE)
            };
            const onSnake = this.snake.some(s => s.x === candidate.x && s.y === candidate.y);
            const onWall = state.walls.some(w => w.x === candidate.x && w.y === candidate.y);
            // Avoid placing portal on the same cell as the existing food — confusing visual.
            const onFood = !!this.food && this.food.x === candidate.x && this.food.y === candidate.y;
            if (!onSnake && !onWall && !onFood) {
                found = candidate;
            }
        }
        state.portal = found;
    }

    /** Walls-as-doors: snake crossed an unlocked door into a new room.
     *  Spawn the snake 1 cell INSIDE the door they crossed and face the direction
     *  AWAY from that door — otherwise the snake's preserved momentum marches it
     *  straight into the opposite locked door of the new room (death in ~9 ticks). */
    enterNewRoom(doorCoord: {x: number, y: number}) {
        const grid = CONFIG.GRID_SIZE;
        const halfGrid = Math.floor(grid / 2);

        state.roomsEntered++;
        state.foodEatenThisRoom = 0;
        state.unlockedWalls = [];

        // Map-coordinate update + spawn position + facing direction based on the door crossed
        let spawnX = halfGrid;
        let spawnY = halfGrid;
        let moveX = 0;
        let moveY = 0;
        if (doorCoord.y === 0) {
            // Top door crossed → enter room facing down (+y)
            state.currentRoom.y--;
            spawnY = 1;
            moveY = 1;
        } else if (doorCoord.y === grid - 1) {
            // Bottom door crossed → enter room facing up (-y)
            state.currentRoom.y++;
            spawnY = grid - 2;
            moveY = -1;
        } else if (doorCoord.x === 0) {
            // Left door crossed → enter room facing right (+x)
            state.currentRoom.x--;
            spawnX = 1;
            moveX = 1;
        } else if (doorCoord.x === grid - 1) {
            // Right door crossed → enter room facing left (-x)
            state.currentRoom.x++;
            spawnX = grid - 2;
            moveX = -1;
        }

        // Defensive: if for any reason moveX/moveY both ended up 0 (doorCoord didn't match
        // the 4 known walls, e.g. an older version of the helper), default to facing rightward.
        if (moveX === 0 && moveY === 0) moveX = 1;
        this.input.setDirection({ x: moveX, y: moveY });

        // Reset walls to the 4 doors + procedural interior for the new room. Seed
        // encodes labyrinthDepth so each room has stable, reproducible walls.
        const newInterior = generateLabyrinthInteriorWalls(
            LABYRINTH_SEED_BASE + state.labyrinthDepth * 7919,
            this.snake,
            state.labyrinthDepth
        );
        state.walls = [
            { x: halfGrid, y: 0 },
            { x: halfGrid, y: grid - 1 },
            { x: 0, y: halfGrid },
            { x: grid - 1, y: halfGrid },
            ...newInterior,
        ];

        // Cycle theme for visual progression feedback
        const newTheme = state.cycleTheme();
        const tColor = CONFIG.THEMES[newTheme].food;

        // Stack all snake segments at the spawn cell. Next tick: head moves into
        // (spawnX+moveX, spawnY+moveY) which is interior, so no self-collision.
        for (let i = 0; i < this.snake.length; i++) {
            this.snake[i] = { x: spawnX, y: spawnY };
        }
        this.previousSnake = this.snake.map(s => ({ ...s }));
        state.snakeLength = this.snake.length;

        // Update depth LAST so UI/telemetry see consistent state
        state.labyrinthDepth = state.roomsEntered - 1;

        // Visual celebration
        state.levelUpFlash = 1.0;
        state.gridBrightness = Math.max(state.gridBrightness, 2.5);
        state.chromaticGlitch = 1.4;

        // Burst particles in the new theme color
        for (let i = 0; i < 35; i++) {
            this.spawnParticles(spawnX, spawnY, tColor, 5);
        }

        // Fresh food for the new room
        this.food = this.generateFood();

        // Audio: powerup jingle
        audio.playPowerup();
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
        // Set state FIRST so a thrown audio call can never trap the player on GAMEOVER.
        this.resetGameData();
        state.current = GameState.PLAYING;
        this.ui.updateScreens();
        audio.resume().catch(() => {});
        audio.playInGameMusic().catch(() => {});
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
        // State first, UI second, audio last and caught. Order matters: if audio previously
        // threw and somehow froze the click chain, the player could be stuck on GAMEOVER with
        // no Menu / Restart response. Now state + UI are guaranteed to update.
        state.current = GameState.MENU;
        this.ui.updateScreens();
        audio.playMenuMusic().catch(() => {});
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
        // (state.levelUpFlash decays in loop() so it keeps ticking during pause/gameover)

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

        // Phantom vs Ghost split:
        //  - PHANTOM difficulty  -> only wraps the 4 boundary edges (out-of-bounds snap to opposite side).
        //  - GHOST powerup        -> additionally phases through in-level walls.
        //  - Otherwise            -> walls (and boundaries) are lethal.
        const wrapsBorders = state.difficulty === 'PHANTOM' || state.activePowerup === 'GHOST';
        const phasesWalls  = state.activePowerup === 'GHOST';
        
        // Wall collision
        const hitWall = state.walls.some(w => w.x === newHead.x && w.y === newHead.y);
        if (hitWall && !phasesWalls) {
            // Labyrinth walls-as-doors: if the head enters an unlocked door cell, transition
            // rooms instead of dying.
            if (state.gameMode === GameMode.LABYRINTH
                && state.unlockedWalls.some(w => w.x === newHead.x && w.y === newHead.y)) {
                this.enterNewRoom(newHead);
                return;
            }
            this.gameOver();
            return;
        }

        // Labyrinth perimeter is touch-of-death for non-door cells. Doors are already in
        // state.walls (caught by the hitWall branch above), so reaching here means the
        // newHead is on a non-door perimeter cell — instantly lethal (no sit-and-wait
        // loophole). OPEN_WORLD keeps its permissive perimeter (room wrap is handled
        // below) so this check is gated on LABYRINTH mode only.
        if (state.gameMode === GameMode.LABYRINTH) {
            const onPerimeter = newHead.x === 0 || newHead.x === CONFIG.GRID_SIZE - 1
                             || newHead.y === 0 || newHead.y === CONFIG.GRID_SIZE - 1;
            if (onPerimeter) {
                this.gameOver();
                return;
            }
        }

        const hitBoundary = newHead.x < 0 || newHead.x >= CONFIG.GRID_SIZE || newHead.y < 0 || newHead.y >= CONFIG.GRID_SIZE;

        if (hitBoundary) {
            if (state.gameMode === GameMode.LABYRINTH) {
                // The 4 doors are placed at mid-perimeter, so any *boundary* hit in Labyrinth
                // mode is a non-door perimeter cell — unconditionally lethal. PHANTOM doesn't
                // bypass because the entire perimeter is touch-of-death.
                this.gameOver();
                return;
            } else if (state.gameMode === GameMode.OPEN_WORLD) {
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
            } else if (wrapsBorders) {
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

        // Portal collision (OPEN_WORLD only — Labyrinth uses door transitions)
        if (state.portal && state.gameMode === GameMode.OPEN_WORLD
            && newHead.x === state.portal.x && newHead.y === state.portal.y) {
            this.loadRoom();
            this.food = this.generateFood();
            this.generatePortal();
            return;
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

            // Labyrinth (walls-as-doors): every CONFIG.LABYRINTH_FOOD_PER_WALL food unlocks
            // the next locked door, in deterministic order (top → bottom → left → right).
            // When all 4 doors are unlocked we award a room-completion bonus.
            if (state.gameMode === GameMode.LABYRINTH) {
                state.foodEatenThisRoom++;
                const target = CONFIG.LABYRINTH_FOOD_PER_WALL;
                const targetUnlocks = Math.min(
                    Math.floor(state.foodEatenThisRoom / target),
                    state.walls.length
                );
                let unlockedAny = false;
                while (state.unlockedWalls.length < targetUnlocks
                       && state.unlockedWalls.length < state.walls.length) {
                    state.unlockedWalls.push(state.walls[state.unlockedWalls.length]);
                    unlockedAny = true;
                }
                if (unlockedAny) {
                    state.gridBrightness = Math.max(state.gridBrightness, 2.0);
                    state.chromaticGlitch = Math.max(state.chromaticGlitch, 0.6);
                    if (state.current !== GameState.MENU) audio.playPowerup();
                }
                if (state.unlockedWalls.length === state.walls.length && state.walls.length > 0) {
                    state.score += 200 * state.roomsEntered;
                    state.levelUpFlash = Math.max(state.levelUpFlash, 0.6);
                }
            }

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

        // Global input check (Pause via Space OR Escape)
        if (this.input.keys['Space']) {
            this.input.keys['Space'] = false; // consume
            this.togglePause();
        }
        if (this.input.keys['Escape']) {
            this.input.keys['Escape'] = false;
            // ESC mirrors Space: open pause when playing, close pause when paused.
            // togglePause() itself is a no-op when state is MENU/GAMEOVER so it's safe
            // to fire unconditionally without trapping the player.
            this.togglePause();
        }
        if (this.input.keys['KeyP']) {
            this.input.keys['KeyP'] = false;
            state.portfolioMode = !state.portfolioMode;
            this.ui.btnPortfolio.classList.toggle('active', state.portfolioMode);
            this.ui.updatePortfolioMode();
        }

        this.update(dt);

        // Decay the level-up flash here (in loop, not update) so it continues during pause
        // and gameover — otherwise the flash would freeze on screen when the player pauses.
        if (state.levelUpFlash > 0) {
            state.levelUpFlash = Math.max(0, state.levelUpFlash - dt / 1500);
        }

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
