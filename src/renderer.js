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

    drawGrid(ctx, cellSize) {
        ctx.strokeStyle = `rgba(0, 242, 255, ${0.08 * state.gridBrightness})`;
        ctx.lineWidth = 1 + (state.gridBrightness - 1.0) * 2;

        const getPoint = (ix, iy) => {
            let px = ix * cellSize;
            let py = iy * cellSize;
            
            // Apply ripples
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

        ctx.beginPath();
        for (let i = 0; i <= CONFIG.GRID_SIZE; i++) {
            // Vertical lines
            for (let j = 0; j <= CONFIG.GRID_SIZE; j++) {
                const p = getPoint(i, j);
                if (j === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            // Horizontal lines
            for (let j = 0; j <= CONFIG.GRID_SIZE; j++) {
                const p = getPoint(j, i);
                if (j === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
        }
        ctx.stroke();
    }

    draw(gameState, particles, dt, accumulator, tickRate) {
        const { ctx, canvas, cellSize } = this;
        const alpha = Math.min(1.0, accumulator / tickRate);

        // Clear background
        ctx.fillStyle = CONFIG.COLORS.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();

        if (CONFIG.VISUALS.enabled) {
            // 1. Camera Impulse Spring Physics
            state.cameraImpulse.vx += -state.cameraImpulse.x * CONFIG.VISUALS.impulseSpring;
            state.cameraImpulse.vy += -state.cameraImpulse.y * CONFIG.VISUALS.impulseSpring;
            state.cameraImpulse.x += state.cameraImpulse.vx;
            state.cameraImpulse.y += state.cameraImpulse.vy;
            state.cameraImpulse.vx *= CONFIG.VISUALS.impulseDecay;
            state.cameraImpulse.vy *= CONFIG.VISUALS.impulseDecay;

            // 2. Camera Follow Inertia
            const targetCamX = gameState.direction.x * 40;
            const targetCamY = gameState.direction.y * 40;
            
            state.cameraPos.vx += (targetCamX - state.cameraPos.x) * CONFIG.VISUALS.cameraFollowLag;
            state.cameraPos.vy += (targetCamY - state.cameraPos.y) * CONFIG.VISUALS.cameraFollowLag;
            state.cameraPos.x += state.cameraPos.vx;
            state.cameraPos.y += state.cameraPos.vy;
            state.cameraPos.vx *= CONFIG.VISUALS.cameraOvershoot;
            state.cameraPos.vy *= CONFIG.VISUALS.cameraOvershoot;

            // 3. Screen Shake
            let shakeX = 0, shakeY = 0;
            if (this.shakeTime > 0) {
                shakeX = (Math.random() - 0.5) * this.shakeIntensity;
                shakeY = (Math.random() - 0.5) * this.shakeIntensity;
                this.shakeTime -= dt;
            }

            // 4. Board Tilt Spring Physics
            const targetTiltX = gameState.direction.x * CONFIG.VISUALS.boardTiltMax; 
            const targetTiltY = gameState.direction.y * CONFIG.VISUALS.boardTiltMax; 
            
            state.boardTilt.vx += (targetTiltX - state.boardTilt.x) * CONFIG.VISUALS.boardTiltSpring;
            state.boardTilt.vy += (targetTiltY - state.boardTilt.y) * CONFIG.VISUALS.boardTiltSpring;
            state.boardTilt.x += state.boardTilt.vx;
            state.boardTilt.y += state.boardTilt.vy;
            state.boardTilt.vx *= CONFIG.VISUALS.boardTiltDamping;
            state.boardTilt.vy *= CONFIG.VISUALS.boardTiltDamping;

            // Apply Global Camera Transforms
            // Camera transformations disabled for stability
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.translate(-canvas.width/2, -canvas.height/2);
        }

        // --- RENDER LAYER: FAR (Grid) ---
        this.drawGrid(ctx, cellSize);

        // Determine Chromatic Aberration offset based on speed & powerup
        let chromaticOffset = 0;
        if (CONFIG.VISUALS.enabled) {
            const baseSpeed = CONFIG.DIFFICULTIES[state.difficulty].baseTick;
            if (tickRate < baseSpeed * 0.7) {
                chromaticOffset = 2; // High speed
            }
            if (state.activePowerup) {
                chromaticOffset += CONFIG.VISUALS.chromaticPowerupBoost;
            }
            if (state.chromaticGlitch > 0) {
                chromaticOffset += state.chromaticGlitch * 15;
            }
        }

        // Helper to draw with chromatic aberration
        const drawWithChromatic = (drawFn) => {
            if (chromaticOffset > 0) {
                ctx.globalCompositeOperation = 'screen';
                
                ctx.save();
                ctx.translate(-chromaticOffset, 0);
                // Red channel
                ctx.fillStyle = '#ff0000';
                ctx.shadowColor = '#ff0000';
                drawFn();
                ctx.restore();
                
                ctx.save();
                ctx.translate(chromaticOffset, 0);
                // Cyan channel
                ctx.fillStyle = '#00ffff';
                ctx.shadowColor = '#00ffff';
                drawFn();
                ctx.restore();
                
                ctx.globalCompositeOperation = 'source-over';
            } else {
                drawFn();
            }
        };

        // --- RENDER LAYER: MID (Food) ---
        if (state.globalFlash > 0 && gameState.food) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const gradient = ctx.createRadialGradient(
                gameState.food.x * cellSize + cellSize/2, 
                gameState.food.y * cellSize + cellSize/2, 
                0, 
                gameState.food.x * cellSize + cellSize/2, 
                gameState.food.y * cellSize + cellSize/2, 
                canvas.width * 0.8
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${state.globalFlash})`);
            gradient.addColorStop(1, 'rgba(0, 242, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(-canvas.width, -canvas.height, canvas.width*3, canvas.height*3);
            ctx.restore();
        }

        if (gameState.food) {
            const f = gameState.food;
            const color = f.type === 'NORMAL' ? CONFIG.COLORS.food : CONFIG.POWERUPS[f.type].color;
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            
            // Pulse effect for food
            const pulse = 1.0 + Math.sin(Date.now() / 150) * 0.1;
            
            const drawFood = () => {
                ctx.beginPath();
                ctx.arc(
                    f.x * cellSize + cellSize / 2,
                    f.y * cellSize + cellSize / 2,
                    (cellSize / 2.5) * pulse,
                    0, Math.PI * 2
                );
                ctx.fill();
            };
            
            if (chromaticOffset > 0) {
                drawWithChromatic(drawFood);
            } else {
                drawFood();
            }
            
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(
                f.x * cellSize + cellSize / 2,
                f.y * cellSize + cellSize / 2,
                cellSize / 6,
                0, Math.PI * 2
            );
            ctx.fill();
        }

        // --- RENDER LAYER: FOREGROUND (Snake) ---
        const snakeColor = state.activePowerup === 'GHOST' ? CONFIG.COLORS.snakeGhost : CONFIG.COLORS.snakeBody;
        
        gameState.snake.forEach((segment, index) => {
            const prevSegment = gameState.previousSnake[index] || segment;
            
            // Apply tail lag interpolation
            let segmentAlpha = alpha;
            if (index > 0) {
                segmentAlpha = Math.max(0, alpha - (index * CONFIG.VISUALS.tailLag * 0.01));
            }
            
            const pos = this.getInterpolatedPos(segment, prevSegment, segmentAlpha);
            const isHead = index === 0;
            
            if (isHead) {
                ctx.shadowBlur = 25;
                ctx.shadowColor = CONFIG.COLORS.snakeHead;
                ctx.fillStyle = CONFIG.COLORS.snakeHead;
            } else {
                ctx.shadowBlur = 0;
                ctx.fillStyle = snakeColor;
            }

            const padding = isHead ? 0 : 1;
            let w = cellSize - padding * 2;
            let h = cellSize - padding * 2;
            
            // Squash and Stretch based on movement
            if (isHead && CONFIG.VISUALS.enabled) {
                if (gameState.direction.x !== 0) {
                    w *= (1.0 + CONFIG.VISUALS.stretchAmount);
                    h *= (1.0 - CONFIG.VISUALS.turnCompression * 0.2);
                } else if (gameState.direction.y !== 0) {
                    h *= (1.0 + CONFIG.VISUALS.stretchAmount);
                    w *= (1.0 - CONFIG.VISUALS.turnCompression * 0.2);
                }
            }

            const drawSegment = () => {
                ctx.fillRect(
                    pos.x * cellSize + padding + (cellSize - w)/2,
                    pos.y * cellSize + padding + (cellSize - h)/2,
                    w, h
                );
            };

            if (isHead && chromaticOffset > 0) {
                drawWithChromatic(drawSegment);
            } else {
                drawSegment();
            }
        });

        // --- RENDER LAYER: PARTICLES ---
        ctx.shadowBlur = 15;
        particles.forEach(p => {
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            
            ctx.beginPath();
            ctx.arc(p.x * cellSize, p.y * cellSize, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;

        // Portfolio Mode Grid Bounds Highlight
        if (state.portfolioMode) {
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
        }

        ctx.restore();
    }
}
