import { CONFIG } from './config.js';
import { state, GameMode } from './state.js';

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

    getInterpolatedPos(curr, prev, alpha) {
        if (!prev) return curr;
        let dx = curr.x - prev.x;
        let dy = curr.y - prev.y;
        if (Math.abs(dx) > 1) dx = dx > 0 ? -1 : 1;
        if (Math.abs(dy) > 1) dy = dy > 0 ? -1 : 1;
        return { x: prev.x + dx * alpha, y: prev.y + dy * alpha };
    }

    drawGrid(ctx, cellSize, colors) {
        const time = Date.now();
        const breathing = 1.0 + Math.sin(time * CONFIG.VISUALS.gridBreathingSpeed) * CONFIG.VISUALS.gridBreathingDepth;
        
        const getPoint = (ix, iy) => {
            let px = ix * cellSize;
            let py = iy * cellSize;
            const jitterX = (Math.random() - 0.5) * CONFIG.VISUALS.gridJitterAmplitude;
            const jitterY = (Math.random() - 0.5) * CONFIG.VISUALS.gridJitterAmplitude;
            px += jitterX;
            py += jitterY;

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

        for (let i = 0; i <= CONFIG.GRID_SIZE; i++) {
            ctx.beginPath();
            for (let j = 0; j <= CONFIG.GRID_SIZE; j++) {
                const p = getPoint(i, j);
                if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();

            ctx.beginPath();
            for (let j = 0; j <= CONFIG.GRID_SIZE; j++) {
                const p = getPoint(j, i);
                if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            }
            ctx.stroke();
        }

        ctx.fillStyle = colors.snakeHead;
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
        const isLethal = state.gameMode === GameMode.LABYRINTH || state.gameMode === GameMode.OPEN_WORLD;
        ctx.fillStyle = isLethal ? colors.wall : colors.snakeHead;
        ctx.shadowBlur = 20;
        ctx.shadowColor = isLethal ? colors.wall : colors.snakeHead;
        state.walls.forEach(wall => {
            ctx.beginPath();
            ctx.rect(wall.x * cellSize, wall.y * cellSize, cellSize, cellSize);
            ctx.fill();
        });
        ctx.shadowBlur = 0;
    }

    draw(gameState, particles, dt, accumulator, tickRate) {
        const { ctx, canvas, cellSize } = this;
        const alpha = Math.min(1.0, accumulator / tickRate);
        const colors = CONFIG.THEMES[state.theme];

        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();

        this.drawGrid(ctx, cellSize, colors);
        this.drawWalls(ctx, cellSize, colors);

        if (gameState.food) {
            const f = gameState.food;
            const foodColor = f.type === 'NORMAL' ? colors.food : CONFIG.POWERUPS[f.type].color;
            const pulse = 1.0 + Math.sin(Date.now() / 120) * 0.25;
            
            ctx.save();
            ctx.shadowBlur = 50;
            ctx.shadowColor = foodColor;
            
            const centerX = f.x * cellSize + cellSize / 2;
            const centerY = f.y * cellSize + cellSize / 2;
            const radius = (cellSize / 2.5) * pulse;

            const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.2, foodColor);
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        if (state.portal) {
            const p = state.portal;
            const portalColor = '#9400D3'; // Deep violet
            const pulse = 1.0 + Math.sin(Date.now() / 100) * 0.3;
            
            ctx.save();
            ctx.shadowBlur = 60;
            ctx.shadowColor = portalColor;
            
            const centerX = p.x * cellSize + cellSize / 2;
            const centerY = p.y * cellSize + cellSize / 2;
            const radius = (cellSize / 2) * pulse;

            const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.3, portalColor);
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

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

            const padding = isHead ? 0 : 2;
            let w = cellSize - padding * 2;
            let h = cellSize - padding * 2;
            
            if (isHead && CONFIG.VISUALS.enabled) {
                if (gameState.direction.x !== 0) w *= (1.0 + CONFIG.VISUALS.stretchAmount);
                else if (gameState.direction.y !== 0) h *= (1.0 + CONFIG.VISUALS.stretchAmount);
            }

            const x = pos.x * cellSize + padding + (cellSize - w)/2;
            const y = pos.y * cellSize + padding + (cellSize - h)/2;
            const radius = isHead ? 4 : 2;

            ctx.beginPath();
            ctx.roundRect(x, y, w, h, radius);
            ctx.fill();
            
            if (isHead) {
                ctx.fillStyle = snakeBodyColor;
                ctx.beginPath();
                ctx.roundRect(x + 2, y + 2, w - 4, h - 4, radius);
                ctx.fill();
            }
            ctx.restore();
        });

        ctx.shadowBlur = 15;
        particles.forEach(p => {
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            
            ctx.beginPath();
            ctx.arc(p.x * cellSize, p.y * cellSize, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        if (state.portfolioMode) {
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
        }

        ctx.restore();
    }
}
