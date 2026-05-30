import { state } from './state';

class AudioManager {
    ctx: AudioContext;
    masterGain: GainNode;
    musicTracks: string[];
    currentTrackIndex: number;
    musicPlayer: HTMLAudioElement;

    constructor() {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.3;

        // Music support
        this.musicTracks = [
            'music/Afternoon Glow - Lyserge (ft Olga).mp3',
            'music/In this safe - serge rybak.mp3',
            'music/Land On Your NEW.mp3',
            'music/LED Juggling_(Doof)_19.mp3',
            'music/Lil lamplight.mp3',
            'music/Low Low Rumble.mp3',
            'music/Melancholics Anonymous - S3rge Rybak.mp3',
            'music/Memowave.mp3',
            'music/Scrambled Circuitry - Serg [FREE DL].mp3',
            'music/The Purge - Lyserge.mp3'
        ];
        this.currentTrackIndex = 0;
        this.musicPlayer = new Audio();
        this.musicPlayer.loop = false;
        this.musicPlayer.onended = () => this.nextTrack();
        this.musicPlayer.volume = 0.2;
    }

    playMusic(): void {
        if (state.isMuted) return;
        this.musicPlayer.src = this.musicTracks[this.currentTrackIndex];
        this.musicPlayer.play().catch(e => console.log('Music play blocked', e));
    }

    pauseMusic(): void {
        this.musicPlayer.pause();
    }

    nextTrack(): void {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.musicTracks.length;
        this.playMusic();
    }

    resume(): void {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (this.musicPlayer.paused) {
            this.musicPlayer.play().catch(e => console.log('Autoplay blocked', e));
        }
    }

    playTone(freq: number, type: OscillatorType, duration: number, vol: number = 1): void {
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
// ... existing code ...

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
