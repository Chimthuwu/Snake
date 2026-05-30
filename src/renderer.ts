import { CONFIG } from './config.js';
import { state } from './state.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.resize();
        
        window.addEventListener('resize', () => this.resize());
        
        this.shakeTime = 0;
        this.shakeIntensity = 0;
        
        // Depth System State
        this.currentTilt = { x: 0, y: 0 };
        
        // Rave FX state
    }

    resize() {
        const container = this.canvas.parentElement;
        const size = Math.min(container.clientWidth, container.clientHeight);
        this.canvas.width = size;
        this.canvas.height = size;
        this.cellSize = size / CONFIG.GRID_SIZE;
    }

    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeTime = duration;
    }

    // Smoothly interpolate between previous and current grid positions
    getInterpolatedPos(curr, prev, alpha) {
        if (!prev) return curr;
        
        let dx = curr.x - prev.x;
        let dy = curr.y - prev.y;
        
        // Handle wrapping around edges (Ghost mode)
        if (Math.abs(dx) > 1) dx = dx > 0 ? -1 : 1;
        if (Math.abs(dy) > 1) dy = dy > 0 ? -1 : 1;
        
        return {
            x: prev.x + dx * alpha,
            y: prev.y + dy * alpha
        };
    }

    drawGrid(ctx, cellSize, colors) {
        const time = Date.now();
        const breathing = 1.0 + Math.sin(time * CONFIG.VISUALS.gridBreathingSpeed) * CONFIG.VISUALS.gridBreathingDepth;
        
        const getPoint = (ix, iy) => {
            let px = ix * cellSize;
            let py = iy * cellSize;
            
            // 1. Electric Jitter
            const jitterX = (Math.random() - 0.5) * CONFIG.VISUALS.gridJitterAmplitude;
            const jitterY = (Math.random() - 0.5) * CONFIG.VISUALS.gridJitterAmplitude;
            px += jitterX;
            py += jitterY;

            // 2. Grid Ripples
            state.ripples.forEach(r => {
                const dx = ix - r.x;
                const dy = iy - r.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const maxDist = (1.0 - r.life) * CONFIG.GRID_SIZE * CONFIG.VISUALS.rippleSpeed;
                
                if (dist < maxDist && dist > maxDist - 4) {
                    const force = Math.sin((dist - maxDist) * Math.PI) * r.life * CONFIG.VISUALS.rippleStrength;
                    if (dist > 0) {
                        px += (dx / dist) * force * cellSize;
                        py += (dy / dist) * force * cellSize;
                    }
                }
            });
            return {x: px, y: py};
        };

        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1.2;

        // Render Lines
        for (let i = 0; i <= CONFIG.GRID_SIZE; i++) {
            // Vertical
            ctx.beginPath();
            for (let j = 0; j <= CONFIG.GRID_SIZE; j++) {
                const p = getPoint(i, j);
                if (j === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();

            // Horizontal
            ctx.beginPath();
            for (let j = 0; j <= CONFIG.GRID_SIZE; j++) {
                const p = getPoint(j, i);
                if (j === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
        }


        // High-energy 'pips' at intersections
        ctx.fillStyle = colors.snakeHead; // Use a bright color from the theme
        for (let i = 0; i <= CONFIG.GRID_SIZE; i++) {
            for (let j = 0; j <= CONFIG.GRID_SIZE; j++) {
                const p = getPoint(i, j);
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.5 * breathing, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawWalls(ctx, cellSize, colors) {
        if (state.walls.length === 0) return;

        ctx.fillStyle = colors.snakeHead; // Use a bright, contrasting color
        ctx.shadowBlur = 20;
        ctx.shadowColor = colors.snakeHead;

        state.walls.forEach(wall => {
            const x = wall.x * cellSize;
            const y = wall.y * cellSize;
            ctx.beginPath();
            ctx.rect(x, y, cellSize, cellSize);
            ctx.fill();
        });

        ctx.shadowBlur = 0;
    }

    draw(gameState, particles, dt, accumulator, tickRate) {
        const { ctx, canvas, cellSize } = this;
        const alpha = Math.min(1.0, accumulator / tickRate);
        const colors = CONFIG.THEMES[state.theme];

        // Clear background
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();

        if (CONFIG.VISUALS.enabled) {
            // ... (Camera and other visual effects logic remains the same)
        }

        // --- RENDER LAYER: FAR (Grid) ---
        this.drawGrid(ctx, cellSize, colors);
        this.drawWalls(ctx, cellSize, colors);

        // ... (Chromatic aberration logic remains the same)

        // --- RENDER LAYER: MID (Food) ---
        if (gameState.food) {
            const f = gameState.food;
            const foodColor = f.type === 'NORMAL' ? colors.food : CONFIG.POWERUPS[f.type].color;
            const pulse = 1.0 + Math.sin(Date.now() / 120) * 0.25;
            
            ctx.save();
            ctx.shadowBlur = 50;
            ctx.shadowColor = foodColor;
            
            // ... (Food drawing logic remains the same, but uses foodColor)
            ctx.restore();
        }

        // --- RENDER LAYER: FOREGROUND (Snake) ---
        const isPhantomEffect = state.activePowerup === 'GHOST' || state.difficulty === 'PHANTOM';
        const snakeHeadColor = colors.snakeHead;
        const snakeBodyColor = isPhantomEffect ? colors.snakeGhost : colors.snakeBody;
        
        gameState.snake.forEach((segment, index) => {
            const prevSegment = gameState.previousSnake[index] || segment;
            let segmentAlpha = alpha;
            if (index > 0) {
                segmentAlpha = Math.max(0, alpha - (index * CONFIG.VISUALS.tailLag * 0.01));
            }
            
            const pos = this.getInterpolatedPos(segment, prevSegment, segmentAlpha);
            const isHead = index === 0;
            
            ctx.save();
            if (isHead) {
                ctx.shadowBlur = 60;
                ctx.shadowColor = snakeHeadColor;
                ctx.fillStyle = '#fff';
            } else {
                ctx.shadowBlur = 20;
                ctx.shadowColor = snakeBodyColor;
                ctx.fillStyle = snakeBodyColor;
            }

            // ... (Snake segment drawing logic remains the same)

            ctx.fill();
            
            if (isHead) {
                // Head detail
                ctx.fillStyle = snakeBodyColor;
                // ... (Head detail drawing logic remains the same)
                ctx.fill();
            }
            ctx.restore();
        });

        // --- RENDER LAYER: PARTICLES ---
        ctx.shadowBlur = 15;
        particles.forEach(p => {
            ctx.shadowColor = p.color; // Particle color is set on spawn, might not match theme
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            
            ctx.beginPath();
            ctx.arc(p.x * cellSize, p.y * cellSize, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;

        // ... (Debug overlay logic remains the same)

        ctx.restore();
    }
}
