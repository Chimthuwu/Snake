import { state } from './state';

class AudioManager {
    ctx: AudioContext;
    masterGain: GainNode;
    musicTracks: string[];
    currentTrackIndex: number;
    musicPlayer: HTMLAudioElement;
    analyser: AnalyserNode | null;
    source: MediaElementAudioSourceNode | null;
    frequencyData: Uint8Array | null;

    constructor() {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.3;
        this.analyser = null;
        this.source = null;
        this.frequencyData = null;

        // Music support
        this.musicTracks = [
            '/music/AfternoonGlow.mp3',
            '/music/InThisSafe.mp3',
            '/music/LandOnYourNew.mp3',
            '/music/LEDJuggling.mp3',
            '/music/LilLamplight.mp3',
            '/music/LowLowRumble.mp3',
            '/music/MelancholicsAnonymous.mp3',
            '/music/Memowave.mp3',
            '/music/ScrambledCircuitry.mp3',
            '/music/ThePurge.mp3'
        ];
        this.currentTrackIndex = 0;
        this.musicPlayer = new Audio();
        this.musicPlayer.crossOrigin = "anonymous";
        this.musicPlayer.loop = false;
        this.musicPlayer.onended = () => this.nextTrack();
        this.musicPlayer.volume = 0.2;
    }

    setupAnalyser() {
        if (this.source) return;
        this.source = this.ctx.createMediaElementSource(this.musicPlayer);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        const bufferLength = this.analyser.frequencyBinCount;
        this.frequencyData = new Uint8Array(bufferLength);
        this.source.connect(this.analyser);
        this.analyser.connect(this.masterGain);
    }

    getAudioData(): Uint8Array | null {
        if (this.analyser && this.frequencyData) {
            this.analyser.getByteFrequencyData(this.frequencyData);
            return this.frequencyData;
        }
        return null;
    }

    playMusic(): void {
        if (state.isMuted) return;
        this.setupAnalyser();
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
