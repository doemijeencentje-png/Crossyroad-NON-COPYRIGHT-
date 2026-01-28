// ============================================
// HOP ROAD - Audio System
// Synthesized sounds using Web Audio API
// ============================================

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Resume context if suspended (browser autoplay policy)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    play(type) {
        if (!this.ctx || !this.enabled) return;

        try {
            switch (type) {
                case 'hop':
                    this.playHop();
                    break;
                case 'land':
                    this.playLand();
                    break;
                case 'coin':
                    this.playCoin();
                    break;
                case 'hit':
                    this.playHit();
                    break;
                case 'splash':
                    this.playSplash();
                    break;
                case 'train':
                    this.playTrainHorn();
                    break;
                case 'trainPass':
                    this.playTrainPass();
                    break;
                case 'click':
                    this.playClick();
                    break;
                case 'score':
                    this.playScore();
                    break;
            }
        } catch (e) {
            // Audio failed, ignore
        }
    }

    createOscillator(type = 'sine') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        gain.gain.value = 0;
        return { osc, gain };
    }

    playHop() {
        const { osc, gain } = this.createOscillator('sine');
        const t = this.ctx.currentTime;

        osc.frequency.setValueAtTime(280, t);
        osc.frequency.exponentialRampToValueAtTime(450, t + 0.08);
        osc.frequency.exponentialRampToValueAtTime(380, t + 0.12);

        gain.gain.setValueAtTime(this.volume * 0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.start(t);
        osc.stop(t + 0.12);
    }

    playLand() {
        const { osc, gain } = this.createOscillator('triangle');
        const t = this.ctx.currentTime;

        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);

        gain.gain.setValueAtTime(this.volume * 0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        osc.start(t);
        osc.stop(t + 0.06);
    }

    playCoin() {
        const { osc, gain } = this.createOscillator('sine');
        const t = this.ctx.currentTime;

        // Two-tone coin sound
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.setValueAtTime(1100, t + 0.08);

        gain.gain.setValueAtTime(this.volume * 0.12, t);
        gain.gain.setValueAtTime(this.volume * 0.1, t + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.start(t);
        osc.stop(t + 0.2);
    }

    playHit() {
        // Low thump + noise
        const { osc, gain } = this.createOscillator('sawtooth');
        const t = this.ctx.currentTime;

        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);

        gain.gain.setValueAtTime(this.volume * 0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.start(t);
        osc.stop(t + 0.25);

        // Add noise burst
        this.playNoise(0.15, 0.1);
    }

    playSplash() {
        // Filtered noise for water splash
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        const gain = this.ctx.createGain();
        gain.gain.value = this.volume * 0.25;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
    }

    playTrainHorn() {
        const { osc: osc1, gain: gain1 } = this.createOscillator('sawtooth');
        const { osc: osc2, gain: gain2 } = this.createOscillator('sawtooth');
        const t = this.ctx.currentTime;

        // Two-tone horn
        osc1.frequency.setValueAtTime(220, t);
        osc2.frequency.setValueAtTime(277, t); // Major third

        gain1.gain.setValueAtTime(this.volume * 0.15, t);
        gain1.gain.setValueAtTime(this.volume * 0.12, t + 0.3);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        gain2.gain.setValueAtTime(this.volume * 0.12, t);
        gain2.gain.setValueAtTime(this.volume * 0.1, t + 0.3);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        osc1.start(t);
        osc1.stop(t + 0.6);
        osc2.start(t);
        osc2.stop(t + 0.6);
    }

    playTrainPass() {
        // Doppler-like rumble
        const { osc, gain } = this.createOscillator('sawtooth');
        const t = this.ctx.currentTime;

        osc.frequency.setValueAtTime(80, t);
        osc.frequency.linearRampToValueAtTime(60, t + 0.5);

        gain.gain.setValueAtTime(this.volume * 0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        osc.start(t);
        osc.stop(t + 0.5);
    }

    playClick() {
        const { osc, gain } = this.createOscillator('sine');
        const t = this.ctx.currentTime;

        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);

        gain.gain.setValueAtTime(this.volume * 0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.start(t);
        osc.stop(t + 0.05);
    }

    playScore() {
        const { osc, gain } = this.createOscillator('sine');
        const t = this.ctx.currentTime;

        osc.frequency.setValueAtTime(523, t); // C5
        osc.frequency.setValueAtTime(659, t + 0.06); // E5

        gain.gain.setValueAtTime(this.volume * 0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.start(t);
        osc.stop(t + 0.12);
    }

    playNoise(duration, volume) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.value = this.volume * volume;

        noise.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
    }
}

// Singleton instance
export const audio = new AudioManager();
