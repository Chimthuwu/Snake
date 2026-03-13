import { state } from './state.js';

class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.3;
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, vol = 1) {
        if (state.isMuted) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playMove() {
        this.playTone(150, 'sine', 0.1, 0.1);
    }

    playEat(combo = 1) {
        const baseFreq = 880 + (combo * 20);
        this.playTone(baseFreq, 'square', 0.1, 0.3);
        setTimeout(() => this.playTone(baseFreq * 2, 'square', 0.15, 0.3), 50);
    }

    playPowerup() {
        this.playTone(440, 'triangle', 0.1, 0.4);
        setTimeout(() => this.playTone(660, 'triangle', 0.1, 0.4), 100);
        setTimeout(() => this.playTone(880, 'triangle', 0.3, 0.4), 200);
    }

    playDie() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 1);
        
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 1);
    }

    playUIHover() {
        this.playTone(600, 'sine', 0.05, 0.1);
    }

    playUISelect() {
        this.playTone(1200, 'square', 0.1, 0.2);
    }
}

export const audio = new AudioManager();
