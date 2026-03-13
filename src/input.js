import { state } from './state.js';

export class InputManager {
    constructor() {
        this.direction = { x: 0, y: -1 };
        this.nextDirection = { x: 0, y: -1 };
        this.keys = {};
        
        // Touch handling
        this.touchStartX = 0;
        this.touchStartY = 0;
        
        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.handleInput(e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Touch events for mobile
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => {
                this.touchStartX = e.changedTouches[0].screenX;
                this.touchStartY = e.changedTouches[0].screenY;
            }, { passive: true });

            canvas.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].screenX;
                const touchEndY = e.changedTouches[0].screenY;
                this.handleSwipe(this.touchStartX, this.touchStartY, touchEndX, touchEndY);
            }, { passive: true });
        }
    }

    handleInput(code) {
        // Prevent reversing direction
        if ((code === 'ArrowUp' || code === 'KeyW') && this.direction.y === 0) {
            this.nextDirection = { x: 0, y: -1 };
        } else if ((code === 'ArrowDown' || code === 'KeyS') && this.direction.y === 0) {
            this.nextDirection = { x: 0, y: 1 };
        } else if ((code === 'ArrowLeft' || code === 'KeyA') && this.direction.x === 0) {
            this.nextDirection = { x: -1, y: 0 };
        } else if ((code === 'ArrowRight' || code === 'KeyD') && this.direction.x === 0) {
            this.nextDirection = { x: 1, y: 0 };
        }
    }

    handleSwipe(startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (dx > 0 && this.direction.x === 0) this.nextDirection = { x: 1, y: 0 };
            else if (dx < 0 && this.direction.x === 0) this.nextDirection = { x: -1, y: 0 };
        } else {
            // Vertical swipe
            if (dy > 0 && this.direction.y === 0) this.nextDirection = { x: 0, y: 1 };
            else if (dy < 0 && this.direction.y === 0) this.nextDirection = { x: 0, y: -1 };
        }
    }

    update() {
        this.direction = { ...this.nextDirection };
    }

    reset() {
        this.direction = { x: 0, y: -1 };
        this.nextDirection = { x: 0, y: -1 };
    }
}
