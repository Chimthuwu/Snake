import { state } from './state';

class AudioManager {
    ctx: AudioContext;
    masterGain: GainNode;
    musicTracks: string[];
    currentTrackIndex: number;
    musicPlayer: HTMLAudioElement;
    analyser: AnalyserNode | null;
    source: MediaElementAudioSourceNode | null;
    frequencyData: (Uint8Array<ArrayBuffer>) | null;
    isMusicPlaying: boolean;

    constructor() {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.3;
        this.analyser = null;
        this.source = null;
        this.frequencyData = null;
        this.isMusicPlaying = false;

        // Music tracks (cleaned filenames)
        this.musicTracks = [
            '/music/track01.mp3',
            '/music/track02.mp3',
            '/music/track03.mp3',
            '/music/track04.mp3',
            '/music/track05.mp3',
            '/music/track06.mp3',
            '/music/track07.mp3',
            '/music/track08.mp3',
            '/music/track09.mp3',
            '/music/track10.mp3'
        ];
        this.currentTrackIndex = 0;
        this.musicPlayer = new Audio();
        this.musicPlayer.crossOrigin = "anonymous";
        this.musicPlayer.loop = false;
        this.musicPlayer.volume = 0.25;

        // Auto-advance to next track
        this.musicPlayer.addEventListener('ended', () => this.nextTrack());

        // Handle load errors gracefully
        this.musicPlayer.addEventListener('error', () => {
            console.warn('Audio: failed to load track, skipping...');
            this.nextTrack();
        });
    }

    async ensureContextReady(): Promise<void> {
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    setupAnalyser() {
        if (this.source) return; // Can only create MediaElementSource once
        try {
            this.source = this.ctx.createMediaElementSource(this.musicPlayer);
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            const bufferLength = this.analyser.frequencyBinCount;
            this.frequencyData = new Uint8Array(bufferLength);
            this.source.connect(this.analyser);
            this.analyser.connect(this.masterGain);
        } catch (e) {
            console.warn('Audio: analyser setup failed, music-reactive effects disabled', e);
        }
    }

    getAudioData(): Uint8Array | null {
        if (this.analyser && this.frequencyData) {
            this.analyser.getByteFrequencyData(this.frequencyData);
            return this.frequencyData;
        }
        return null;
    }

    async playMusic(): Promise<void> {
        if (state.isMuted) return;
        await this.ensureContextReady();
        this.setupAnalyser();
        this.musicPlayer.src = this.musicTracks[this.currentTrackIndex];
        try {
            await this.musicPlayer.play();
            this.isMusicPlaying = true;
        } catch (e) {
            console.log('Audio: play blocked (user interaction may be needed)', e);
        }
    }

    pauseMusic(): void {
        this.musicPlayer.pause();
        this.isMusicPlaying = false;
    }

    async toggleMusic(): Promise<void> {
        if (this.isMusicPlaying) {
            this.pauseMusic();
        } else {
            await this.playMusic();
        }
    }

    nextTrack(): void {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.musicTracks.length;
        this.isMusicPlaying = false;
        // Small delay before next track to avoid rapid-fire errors
        setTimeout(() => this.playMusic(), 300);
    }

    async resume(): Promise<void> {
        await this.ensureContextReady();
        if (!this.isMusicPlaying && !state.isMuted) {
            this.playMusic();
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
