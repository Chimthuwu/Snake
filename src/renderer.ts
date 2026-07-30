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
        // Synth pulse: walls breathe faster when the grid is hot (level up flash)
        const tempo = 1.0 + Math.max(0, state.gridBrightness - 1) * 0.6 + (state.levelUpFlash > 0 ? 0.8 : 0);
        const pulse = 1.0 + Math.sin((time / 220) * tempo) * 0.28;
        const ripple = (time / 1200) % 1;
        const rotationRing = (time / 700) % (Math.PI * 2);

        const isLethal = state.gameMode === GameMode.LABYRINTH || state.gameMode === GameMode.OPEN_WORLD;
        // Wall: red/magenta neon for hostile barriers, cyan-teal when traversable
        const coreColor = isLethal ? colors.wall : colors.snakeHead;
        const defaultRim = isLethal ? '#ff00ff' : colors.food;
        const accentColor = isLethal ? '#ffffff' : colors.grid;

        state.walls.forEach(wall => {
            // Per-wall overrides: an unlocked door cell becomes cyan with extra bloom + a
            // rotating 4-arc ring (it doesn't kill the player — it's a traversable passage).
            const isUnlocked = state.unlockedWalls && state.unlockedWalls.some(w => w.x === wall.x && w.y === wall.y);
            const wallRim = isUnlocked ? '#00ffff' : defaultRim;
            const wallShadowMul = isUnlocked ? 1.2 : 0.85;
            const wallCore = isUnlocked ? '#00ffff' : coreColor;

            const cx = wall.x * cellSize;
            const cy = wall.y * cellSize;
            const pad = Math.max(1.5, cellSize * 0.08);

            // 1) Outer halo (entire cell glows via shadowBlur)
            ctx.save();
            ctx.shadowBlur = cellSize * wallShadowMul * pulse;
            ctx.shadowColor = wallRim;
            ctx.fillStyle = wallRim;
            ctx.globalAlpha = 0.55;
            ctx.fillRect(cx, cy, cellSize, cellSize);
            ctx.restore();

            // 2) Bright core with radial gradient (white-hot center → colored skin → fade)
            ctx.save();
            const cxMid = cx + cellSize / 2;
            const cyMid = cy + cellSize / 2;
            const grad = ctx.createRadialGradient(cxMid, cyMid, 0, cxMid, cyMid, cellSize * 0.55);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.22, wallCore);
            grad.addColorStop(1, 'rgba(0,0,0,0.55)');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.92;
            ctx.fillRect(cx + pad, cy + pad, cellSize - 2 * pad, cellSize - 2 * pad);
            ctx.restore();

            // 3) Animated circuit scan lines (cheap: 2 strokes per cell)
            ctx.save();
            ctx.strokeStyle = wallRim;
            ctx.globalAlpha = 0.5 + 0.35 * pulse;
            ctx.lineWidth = 1;
            const shim = ripple * cellSize;
            ctx.beginPath();
            ctx.moveTo(cx - cellSize * 0.2 + shim, cy + pad);
            ctx.lineTo(cx - cellSize * 0.2 + shim + cellSize * 0.25, cy + cellSize - pad);
            ctx.stroke();
            ctx.restore();

            // 4) Neon corner brackets — give the wall a “panel” look, neon HUD vibe
            ctx.save();
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.85;
            const bracketLen = Math.min(8, cellSize * 0.3);
            // Top-left bracket
            ctx.beginPath();
            ctx.moveTo(cx + pad, cy + pad + bracketLen);
            ctx.lineTo(cx + pad, cy + pad);
            ctx.lineTo(cx + pad + bracketLen, cy + pad);
            ctx.stroke();
            // Bottom-right bracket
            ctx.beginPath();
            ctx.moveTo(cx + cellSize - pad - bracketLen, cy + cellSize - pad);
            ctx.lineTo(cx + cellSize - pad, cy + cellSize - pad);
            ctx.lineTo(cx + cellSize - pad, cy + cellSize - pad - bracketLen);
            ctx.stroke();
            ctx.restore();

            // 5) UNLOCKED DOOR: rotating 4-arc pulse ring marks it traversable.
            if (isUnlocked) {
                ctx.save();
                ctx.strokeStyle = '#ffffff';
                ctx.globalAlpha = 0.85;
                ctx.lineWidth = 1.5;
                for (let i = 0; i < 4; i++) {
                    const a = rotationRing + (i / 4) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.arc(cx + cellSize / 2, cy + cellSize / 2, cellSize * 0.65, a, a + Math.PI / 6);
                    ctx.stroke();
                }
                ctx.restore();
            }
        });

        // Level-up flash overlay tint (draws after walls so it sits on top)
        if (state.levelUpFlash > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(0.6, state.levelUpFlash * 0.6);
            ctx.fillStyle = colors.food;
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
