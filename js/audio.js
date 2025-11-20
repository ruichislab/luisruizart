export class AudioEngine {
    constructor() {
        this.context = null;
        this.isInit = false;
        this.oscillators = [];
        this.gainNodes = [];
        this.filter = null;
    }

    init() {
        if (this.isInit) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContext();

        // Master Gain
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.context.destination);

        // Reverb Convolver (Simulated)
        this.setupReverb();

        // Base Drones
        this.createDrone(110); // A2
        this.createDrone(164.81); // E3
        this.createDrone(196.00); // G3
        this.createDrone(220.00); // A3 (Octave)

        this.isInit = true;
    }

    setupReverb() {
        // Create a simple impulse response for reverb
        const duration = 3;
        const decay = 2.0;
        const rate = this.context.sampleRate;
        const length = rate * duration;
        const impulse = this.context.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const n = length - i;
            left[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
            right[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
        }

        this.convolver = this.context.createConvolver();
        this.convolver.buffer = impulse;
        this.convolver.connect(this.masterGain);
    }

    createDrone(freq) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        // Detune slightly for thickness
        osc.detune.value = (Math.random() - 0.5) * 10;

        gain.gain.value = 0; // Start silent

        osc.connect(gain);
        gain.connect(this.convolver); // Send to reverb

        osc.start();

        // Store reference
        this.oscillators.push(osc);
        this.gainNodes.push(gain);

        // Fade in
        const now = this.context.currentTime;
        gain.gain.linearRampToValueAtTime(0.1, now + 2);
    }

    playDrone() {
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    modulate(x, y) {
        if (!this.isInit) return;

        const now = this.context.currentTime;

        // X axis controls pitch detune
        this.oscillators.forEach((osc, i) => {
            const baseFreq = osc.frequency.value;
            // Gentle pitch shift based on mouse X
            osc.frequency.setTargetAtTime(baseFreq + (x * 5), now, 0.1);
        });

        // Y axis controls amplitude/mix
        this.gainNodes.forEach((gain, i) => {
            // Create a "wave" of volume across the drones based on Y
            // This makes different harmonics fade in and out
            const offset = i * 0.5;
            const volume = (Math.sin((y * 3) + offset) + 1) / 2 * 0.15;
            gain.gain.setTargetAtTime(volume, now, 0.1);
        });
    }

    playEnterSound() {
        if (!this.isInit) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.context.currentTime + 1);

        gain.gain.setValueAtTime(0.5, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.context.currentTime + 1);
    }
}
