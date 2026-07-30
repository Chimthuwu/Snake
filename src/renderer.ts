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
        const time = Date.now();
        const tempo = 1.0 + Math.max(0, state.gridBrightness - 1) * 0.6 + (state.levelUpFlash > 0 ? 0.8 : 0);

        const isLethal = state.gameMode === GameMode.LABYRINTH || state.gameMode === GameMode.OPEN_WORLD;

        state.walls.forEach(wall => {
            const isUnlocked = state.unlockedWalls && state.unlockedWalls.some(w => w.x === wall.x && w.y === wall.y);
            const cx = wall.x * cellSize;
            const cy = wall.y * cellSize;
            const sz = cellSize;

            // Per-cell phase offset drives the "evolving" gradient — neighboring walls
            // blaze through the synthwave palette slightly out of sync, producing a slow
            // color wave that crawls across the maze.
            const cellPhase = (wall.x * 0.13 + wall.y * 0.09) % 1;
            const animOffset = (((time / 1100) * tempo + cellPhase) % 1 + 1) % 1;

            // Diagonal linear gradient — the entire cell fills with the gradient. No
            // circles, no inner shapes, no per-wall decorations inside the rectangle.
            const grad = ctx.createLinearGradient(cx, cy, cx + sz, cy + sz);
            if (isUnlocked) {
                // Cyan-mint: clearly "passage / safe to enter"
                grad.addColorStop((animOffset - 0.35 + 1) % 1, '#05ffa1');
                grad.addColorStop(animOffset, '#01cdfe');
                grad.addColorStop((animOffset + 0.35) % 1, '#ffffff');
            } else if (isLethal) {
                // Synthwave hot palette: deep purple -> hot pink -> cyan, the classic
                // "danger" gradient evolving through the maze.
                grad.addColorStop((animOffset - 0.35 + 1) % 1, '#3a0ca3');
                grad.addColorStop(animOffset, '#ff006e');
                grad.addColorStop((animOffset + 0.35) % 1, '#3a86ff');
            } else {
                // Non-lethal OPEN_WORLD walls: cyan -> mint -> soft cyan.
                grad.addColorStop((animOffset - 0.35 + 1) % 1, '#01cdfe');
                grad.addColorStop(animOffset, '#05ffa1');
                grad.addColorStop((animOffset + 0.35) % 1, '#90e0ef');
            }

            // Single rectangular fill (no inner objects).
            ctx.fillStyle = grad;
            ctx.fillRect(cx, cy, sz, sz);

            // Subtle white top-edge highlight: maintains the "box" silhouette for
            // legibility (still a thin rect, never a circle or arc).
            ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
            ctx.fillRect(cx, cy, sz, Math.max(1, sz * 0.07));
        });

        // Level-up flash overlay tint (still rectangular — no circles).
        if (state.levelUpFlash > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(0.35, state.levelUpFlash * 0.45);
            ctx.fillStyle = '#ff006e';
            for (const w of state.walls) {
                ctx.fillRect(w.x * cellSize, w.y * cellSize, cellSize, cellSize);
            }
            ctx.restore();
        }
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
            // Cyan when armed (player can use it NOW), violet while dormant
            const portalColor = state.portalArmed ? '#00ffff' : '#9400D3';
            const accent = '#ffffff';
            const breath = 1.0 + Math.sin(Date.now() / 130) * 0.32;
            const rotation = (Date.now() / 700) % (Math.PI * 2);

            const cx = p.x * cellSize + cellSize / 2;
            const cy = p.y * cellSize + cellSize / 2;
            const radius = (cellSize * 0.7) * breath;

            // Inner orb (hot center → portal skin → transparent halo)
            ctx.save();
            ctx.shadowBlur = 70;
            ctx.shadowColor = portalColor;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            grad.addColorStop(0, accent);
            grad.addColorStop(0.2, portalColor);
            grad.addColorStop(0.7, portalColor);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Rotating ring of 4 short arcs — animated “active” indicator
            ctx.save();
            ctx.strokeStyle = accent;
            ctx.globalAlpha = state.portalArmed ? 0.85 : 0.4;
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 4; i++) {
                const a = rotation + (i / 4) * Math.PI * 2;
                ctx.beginPath();
                ctx.arc(cx, cy, radius * 1.45, a, a + Math.PI / 6);
                ctx.stroke();
            }
            ctx.restore();

            // If armed, blink the outer halo to draw the eye
            if (state.portalArmed) {
                ctx.save();
                ctx.globalAlpha = 0.35 + 0.35 * Math.sin(Date.now() / 80);
                ctx.shadowBlur = 30;
                ctx.shadowColor = portalColor;
                ctx.fillStyle = portalColor;
                ctx.beginPath();
                ctx.arc(cx, cy, radius * 1.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
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
