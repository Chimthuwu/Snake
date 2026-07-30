import { state } from './state';

interface Direction {
    x: number;
    y: number;
}

const GAME_KEYS = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','Space','KeyP']);

export class InputManager {
    direction: Direction;
    inputQueue: Direction[];
    lastQueuedDirection: Direction;
    keys: { [key: string]: boolean };
    
    touchStartX: number;
    touchStartY: number;
    
    // Mobile touch D-Pad
    dpadUp: HTMLElement | null;
    dpadDown: HTMLElement | null;
    dpadLeft: HTMLElement | null;
    dpadRight: HTMLElement | null;
    
    constructor() {
        this.direction = { x: 0, y: -1 };
        this.inputQueue = [];
        this.lastQueuedDirection = { x: 0, y: -1 };
        this.keys = {};
        
        // Touch handling
        this.touchStartX = 0;
        this.touchStartY = 0;
        
        // D-Pad references
        this.dpadUp = document.getElementById('dpad-up');
        this.dpadDown = document.getElementById('dpad-down');
        this.dpadLeft = document.getElementById('dpad-left');
        this.dpadRight = document.getElementById('dpad-right');
        
        this.bindEvents();
    }

    bindEvents(): void {
        // Keyboard: passive:true so the browser delivers events without waiting on our handler
        // — every microsecond of latency matters in a real-time game. The body is overflow:hidden
        // on every page that mounts the canvas, so arrow keys / Space won't scroll the page even
        // without e.preventDefault().
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            this.keys[e.code] = true;
            this.handleInput(e.code);
        }, { passive: true });

        window.addEventListener('keyup', (e: KeyboardEvent) => {
            this.keys[e.code] = false;
        }, { passive: true });

        // Touch events for swipe (passive: false so we can preventDefault)
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (canvas) {
            canvas.addEventListener('touchstart', (e: TouchEvent) => {
                e.preventDefault();
                this.touchStartX = e.changedTouches[0].screenX;
                this.touchStartY = e.changedTouches[0].screenY;
            }, { passive: false });

            canvas.addEventListener('touchend', (e: TouchEvent) => {
                e.preventDefault();
                const touchEndX = e.changedTouches[0].screenX;
                const touchEndY = e.changedTouches[0].screenY;
                this.handleSwipe(this.touchStartX, this.touchStartY, touchEndX, touchEndY);
            }, { passive: false });
        }

        // D-Pad button events for mobile
        const dpadAction = (code: string) => {
            this.handleInput(code);
        };
        
        const bindDpad = (btn: HTMLElement | null, code: string) => {
            if (!btn) return;
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dpadAction(code);
            }, { passive: false });
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                dpadAction(code);
            });
        };
        
        bindDpad(this.dpadUp, 'ArrowUp');
        bindDpad(this.dpadDown, 'ArrowDown');
        bindDpad(this.dpadLeft, 'ArrowLeft');
        bindDpad(this.dpadRight, 'ArrowRight');
    }

    handleInput(code: string): void {
        let newDir: Direction | null = null;
        if (code === 'ArrowUp' || code === 'KeyW') newDir = { x: 0, y: -1 };
        else if (code === 'ArrowDown' || code === 'KeyS') newDir = { x: 0, y: 1 };
        else if (code === 'ArrowLeft' || code === 'KeyA') newDir = { x: -1, y: 0 };
        else if (code === 'ArrowRight' || code === 'KeyD') newDir = { x: 1, y: 0 };

        if (!newDir) return;

        // Prevent reversing direction
        if (newDir.x !== 0 && this.lastQueuedDirection.x !== 0) return;
        if (newDir.y !== 0 && this.lastQueuedDirection.y !== 0) return;
        
        // Prevent 180 degree flip
        if (newDir.x === -this.lastQueuedDirection.x && newDir.y === -this.lastQueuedDirection.y) return;

        if (this.inputQueue.length < 2) {
            this.inputQueue.push(newDir);
            this.lastQueuedDirection = newDir;
        }
    }

    handleSwipe(startX: number, startY: number, endX: number, endY: number): void {
        const dx = endX - startX;
        const dy = endY - startY;
        
        let swipeDir: Direction | null = null;
        if (Math.abs(dx) > Math.abs(dy)) {
            swipeDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
        } else {
            swipeDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
        }

        // Validate swipe
        if (swipeDir.x !== 0 && this.lastQueuedDirection.x !== 0) return;
        if (swipeDir.y !== 0 && this.lastQueuedDirection.y !== 0) return;
        if (swipeDir.x === -this.lastQueuedDirection.x && swipeDir.y === -this.lastQueuedDirection.y) return;

        if (this.inputQueue.length < 2) {
            this.inputQueue.push(swipeDir);
            this.lastQueuedDirection = swipeDir;
        }
    }

    update(): void {
        if (this.inputQueue.length > 0) {
            this.direction = this.inputQueue.shift()!;
        }
    }

    setDirection(dir: Direction): void {
        this.direction = { ...dir };
        this.inputQueue = [];
        this.lastQueuedDirection = { ...dir };
    }

    reset(): void {
        this.direction = { x: 0, y: -1 };
        this.inputQueue = [];
        this.lastQueuedDirection = { x: 0, y: -1 };
    }
}
