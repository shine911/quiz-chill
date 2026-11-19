import type { BgmVibe } from '../types/quiz';

export type SfxType = 'click' | 'correct' | 'streak' | 'wrong' | 'tick' | 'timeout' | 'finish';

export interface AudioStateSnapshot {
  bgmPlaying: boolean;
  vibe: BgmVibe;
  volume: number;
  customTrackName: string | null;
}

type AudioListener = (state: AudioStateSnapshot) => void;

const LOFI_CHORDS: number[][] = [
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [164.81, 196.0, 246.94, 293.66], // Em7
  [146.83, 220.0, 261.63, 329.63], // Dm9 (voicing)
  [130.81, 196.0, 246.94, 329.63], // Cmaj7
];

const LOFI_BASS: number[] = [87.31, 82.41, 73.42, 65.41];

const AMBIENT_CHORDS: number[][] = [
  [130.81, 196.0, 246.94, 293.66], // Cmaj9
  [110.0, 164.81, 220.0, 261.63], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [196.0, 246.94, 293.66, 392.0], // G6
];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private bgmUserGain: GainNode | null = null;
  private bgmDuckGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;

  private bgmEnabled = false;
  private sfxEnabled = true;
  private vibe: BgmVibe = 'lofi';
  private volume = 0.35;
  private ducked = false;

  private loopTimer: number | null = null;
  private stepIndex = 0;

  private rainSource: AudioBufferSourceNode | null = null;
  private rainLfo: OscillatorNode | null = null;
  private vinylSource: AudioBufferSourceNode | null = null;
  private vinylGain: GainNode | null = null;

  private customAudioEl: HTMLAudioElement | null = null;
  private customMediaNode: MediaElementAudioSourceNode | null = null;
  private customObjectUrl: string | null = null;
  private customTrackName: string | null = null;

  private listeners = new Set<AudioListener>();

  public subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): AudioStateSnapshot {
    return {
      bgmPlaying: this.bgmEnabled,
      vibe: this.vibe,
      volume: this.volume,
      customTrackName: this.customTrackName,
    };
  }

  private emit(): void {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.bgmUserGain = this.ctx.createGain();
      this.bgmDuckGain = this.ctx.createGain();
      this.masterFilter = this.ctx.createBiquadFilter();
      this.masterFilter.type = 'lowpass';
      this.masterFilter.frequency.value = 1400;
      this.masterFilter.Q.value = 0.6;

      this.bgmUserGain.gain.value = this.bgmEnabled ? this.volume : 0;
      this.bgmDuckGain.gain.value = this.ducked ? 0.22 : 1.0;

      this.masterFilter.connect(this.bgmUserGain);
      this.bgmUserGain.connect(this.bgmDuckGain);
      this.bgmDuckGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /**
   * Unlocks Web Audio on direct user gesture (required by iOS Safari & Chrome autoplay policy).
   */
  public unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    if (this.bgmEnabled && this.vibe === 'custom' && this.customAudioEl) {
      void this.customAudioEl.play().catch(() => {});
    }
  }

  public syncPreferences(opts: {
    bgmEnabled: boolean;
    vibe: BgmVibe;
    volume: number;
    sfxEnabled: boolean;
  }): void {
    const vibeChanged = this.vibe !== opts.vibe;
    const enabledChanged = this.bgmEnabled !== opts.bgmEnabled;

    this.vibe = opts.vibe;
    this.volume = Math.max(0, Math.min(1, opts.volume));
    this.sfxEnabled = opts.sfxEnabled;
    this.bgmEnabled = opts.bgmEnabled;

    if (this.ctx && this.bgmUserGain) {
      const now = this.ctx.currentTime;
      const targetGain = this.bgmEnabled ? this.volume : 0;
      this.bgmUserGain.gain.setTargetAtTime(targetGain, now, 0.08);
    }

    this.updateCustomElementVolume();

    if (enabledChanged || vibeChanged) {
      this.stopActiveGenerators();
      if (this.bgmEnabled) {
        this.startCurrentVibe();
      }
    }

    this.emit();
  }

  public setDucked(ducked: boolean): void {
    this.ducked = ducked;
    if (this.ctx && this.bgmDuckGain) {
      const now = this.ctx.currentTime;
      this.bgmDuckGain.gain.setTargetAtTime(ducked ? 0.22 : 1.0, now, ducked ? 0.06 : 0.22);
    }
    this.updateCustomElementVolume();
  }

  public setCustomTrack(file: File): void {
    if (typeof window === 'undefined') return;
    this.stopActiveGenerators();

    if (this.customObjectUrl) {
      URL.revokeObjectURL(this.customObjectUrl);
      this.customObjectUrl = null;
    }

    this.customObjectUrl = URL.createObjectURL(file);
    this.customTrackName = file.name;

    if (!this.customAudioEl) {
      this.customAudioEl = new Audio();
      this.customAudioEl.loop = true;
      this.customAudioEl.preload = 'auto';
    }
    this.customAudioEl.src = this.customObjectUrl;

    const ctx = this.ensureContext();
    if (ctx && this.bgmUserGain && !this.customMediaNode) {
      try {
        this.customMediaNode = ctx.createMediaElementSource(this.customAudioEl);
        this.customMediaNode.connect(this.bgmUserGain);
      } catch {
        // Fallback: control element volume directly if MediaElementSource fails
        this.customMediaNode = null;
      }
    }

    this.vibe = 'custom';
    this.bgmEnabled = true;
    this.updateCustomElementVolume();
    this.startCurrentVibe();
    this.emit();
  }

  private updateCustomElementVolume(): void {
    if (!this.customAudioEl) return;
    if (this.customMediaNode) {
      // Routed through Web Audio gain chain
      this.customAudioEl.volume = 1;
    } else {
      const duckFactor = this.ducked ? 0.22 : 1;
      this.customAudioEl.volume = this.bgmEnabled ? this.volume * duckFactor : 0;
    }
  }

  private stopActiveGenerators(): void {
    if (this.loopTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.rainSource) {
      try {
        this.rainSource.stop();
        this.rainSource.disconnect();
      } catch {
        // ignore
      }
      this.rainSource = null;
    }
    if (this.rainLfo) {
      try {
        this.rainLfo.stop();
        this.rainLfo.disconnect();
      } catch {
        // ignore
      }
      this.rainLfo = null;
    }
    if (this.vinylSource) {
      try {
        this.vinylSource.stop();
        this.vinylSource.disconnect();
      } catch {
        // ignore
      }
      this.vinylSource = null;
    }
    if (this.vinylGain) {
      try {
        this.vinylGain.disconnect();
      } catch {
        // ignore
      }
      this.vinylGain = null;
    }
    if (this.customAudioEl) {
      this.customAudioEl.pause();
    }
  }

  private startCurrentVibe(): void {
    if (!this.bgmEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    if (this.bgmUserGain) {
      this.bgmUserGain.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.08);
    }

    if (this.vibe === 'custom') {
      if (this.customAudioEl) {
        this.updateCustomElementVolume();
        void this.customAudioEl.play().catch(() => {});
        return;
      }
      // Fallback to lofi if custom track not uploaded yet
    }

    if (this.vibe === 'rain') {
      this.startRainGenerator(ctx);
    } else if (this.vibe === 'ambient') {
      this.startAmbientGenerator(ctx);
    } else {
      this.startLofiGenerator(ctx);
    }
  }

  private startLofiGenerator(ctx: AudioContext): void {
    if (!this.masterFilter) return;
    this.masterFilter.frequency.setTargetAtTime(980, ctx.currentTime, 0.1);
    this.stepIndex = 0;

    // Subtle soft vinyl warmth bed
    this.startSubtleVinyl(ctx);

    const scheduleBar = () => {
      if (!this.bgmEnabled || (this.vibe !== 'lofi' && !(this.vibe === 'custom' && !this.customAudioEl))) {
        return;
      }
      const chord = LOFI_CHORDS[this.stepIndex % LOFI_CHORDS.length];
      const bass = LOFI_BASS[this.stepIndex % LOFI_BASS.length];
      this.stepIndex += 1;

      const now = ctx.currentTime;
      const barSec = 3.2;

      // Warm electric piano chord notes with slight arpeggio roll
      chord.forEach((freq, idx) => {
        this.playWarmKey(ctx, freq, now + idx * 0.045, barSec * 0.92, 0.11);
      });

      // Soft sub bass pulse
      this.playWarmBass(ctx, bass, now, barSec * 0.85, 0.14);
      // Gentle upper bell accent mid-bar
      const accentFreq = chord[2] * 2;
      this.playWarmKey(ctx, accentFreq, now + barSec * 0.5, 1.3, 0.045);
    };

    scheduleBar();
    if (typeof window !== 'undefined') {
      this.loopTimer = window.setInterval(scheduleBar, 3200);
    }
  }

  private startAmbientGenerator(ctx: AudioContext): void {
    if (!this.masterFilter) return;
    this.masterFilter.frequency.setTargetAtTime(750, ctx.currentTime, 0.15);
    this.stepIndex = 0;

    const schedulePad = () => {
      if (!this.bgmEnabled || this.vibe !== 'ambient') return;
      const chord = AMBIENT_CHORDS[this.stepIndex % AMBIENT_CHORDS.length];
      this.stepIndex += 1;

      const now = ctx.currentTime;
      const padDuration = 6.2;

      chord.forEach((freq) => {
        this.playAmbientPadVoice(ctx, freq, now, padDuration, 0.09);
      });
    };

    schedulePad();
    if (typeof window !== 'undefined') {
      this.loopTimer = window.setInterval(schedulePad, 5400);
    }
  }

  private startRainGenerator(ctx: AudioContext): void {
    if (!this.masterFilter) return;
    this.masterFilter.frequency.setTargetAtTime(1150, ctx.currentTime, 0.15);

    const sampleRate = ctx.sampleRate;
    const bufferSize = sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Pink-ish noise synthesis for gentle cozy rainfall
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      data[i] = (b0 + b1 + b2 + b3 + white * 0.12) * 0.14;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.65;

    // Gentle slow swell LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.14;
    lfoGain.gain.value = 0.15;
    lfo.connect(lfoGain);
    lfoGain.connect(rainGain.gain);
    lfo.start();

    source.connect(rainGain);
    rainGain.connect(this.masterFilter);
    source.start();

    this.rainSource = source;
    this.rainLfo = lfo;
  }

  private startSubtleVinyl(ctx: AudioContext): void {
    if (!this.masterFilter) return;
    const sampleRate = ctx.sampleRate;
    const bufferSize = sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      const crackle = Math.random() < 0.0012 ? (Math.random() * 2 - 1) * 0.25 : 0;
      data[i] = (Math.random() * 2 - 1) * 0.009 + crackle;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = 0.25;

    src.connect(gain);
    gain.connect(this.masterFilter);
    src.start();

    this.vinylSource = src;
    this.vinylGain = gain;
  }

  private playWarmKey(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number,
  ): void {
    if (!this.masterFilter) return;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 1.003, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(peakGain * 0.45, startTime + duration * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterFilter);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
  }

  private playWarmBass(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number,
  ): void {
    if (!this.masterFilter) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterFilter);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  private playAmbientPadVoice(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number,
  ): void {
    if (!this.masterFilter) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 1.4);
    gain.gain.setValueAtTime(peakGain * 0.85, startTime + duration - 1.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterFilter);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  /**
   * Plays short crisp UI / Quiz sound effects when sfxEnabled is true.
   */
  public playSfx(type: SfxType): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    switch (type) {
      case 'click': {
        this.tone(ctx, 560, now, 0.055, 'sine', 0.07);
        break;
      }
      case 'correct': {
        this.tone(ctx, 523.25, now, 0.14, 'triangle', 0.14);
        this.tone(ctx, 659.25, now + 0.08, 0.2, 'triangle', 0.16);
        break;
      }
      case 'streak': {
        this.tone(ctx, 523.25, now, 0.12, 'triangle', 0.14);
        this.tone(ctx, 659.25, now + 0.07, 0.12, 'triangle', 0.15);
        this.tone(ctx, 783.99, now + 0.14, 0.24, 'triangle', 0.17);
        break;
      }
      case 'wrong': {
        this.tone(ctx, 260, now, 0.15, 'sawtooth', 0.08);
        this.tone(ctx, 210, now + 0.11, 0.2, 'sawtooth', 0.08);
        break;
      }
      case 'tick': {
        this.tone(ctx, 880, now, 0.045, 'sine', 0.06);
        break;
      }
      case 'timeout': {
        this.tone(ctx, 392, now, 0.16, 'triangle', 0.12);
        this.tone(ctx, 311.13, now + 0.14, 0.26, 'triangle', 0.12);
        break;
      }
      case 'finish': {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          this.tone(ctx, freq, now + i * 0.09, 0.28, 'triangle', 0.14);
        });
        break;
      }
    }
  }

  private tone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    wave: OscillatorType,
    peakGain: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2600;

    osc.type = wave;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.03);
  }
}

export const audioEngine = new AudioEngine();
