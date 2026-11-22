/**
 * Generative "chill cyber" ambient soundtrack, synthesised live with the Web Audio API.
 * Original by construction (no samples, no third-party recordings, nothing to license) and seamless (never loops).
 *
 * Layers: warm detuned pads through a slow-moving low-pass filter, a mellow sub bass, sparse delayed plucks,
 * a soft slow pulse (sub kick + brushed hats) and a faint filtered-noise texture, all into a generated reverb.
 * Progression (A minor, ~72 BPM, 2 bars per chord): Am9 - Fmaj7 - Cmaj7 - Em7.
 */
type Note = number; // MIDI

const PROGRESSION: { root: Note; tones: Note[] }[] = [
  { root: 45, tones: [57, 60, 64, 67, 71] }, // Am9
  { root: 41, tones: [53, 57, 60, 64, 69] }, // Fmaj7 (add 9 colour)
  { root: 48, tones: [55, 60, 64, 67, 71] }, // Cmaj7
  { root: 40, tones: [52, 55, 59, 62, 67] }, // Em7
];
const BPM = 72;
const BEAT = 60 / BPM;
const CHORD_BEATS = 8;
const hz = (n: Note) => 440 * Math.pow(2, (n - 69) / 12);

export interface AudioSettings { music: boolean; sfx: boolean; volume: number }

const STORAGE_KEY = 'cv.audio';

export function loadAudioSettings(): AudioSettings {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (s && typeof s.volume === 'number') return { music: !!s.music, sfx: !!s.sfx, volume: Math.min(1, Math.max(0, s.volume)) };
  } catch { /* storage unavailable */ }
  return { music: true, sfx: true, volume: 0.45 };
}

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private music!: GainNode;
  private sfx!: GainNode;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  private delay!: DelayNode;
  private padFilter!: BiquadFilterNode;
  private noise!: AudioBuffer;
  private timer = 0;
  private nextBeat = 0;
  private beat = 0;
  private playing = false;
  settings: AudioSettings = loadAudioSettings();

  /** Must be called from a user gesture (click / key): browsers only allow audio after one. */
  start() {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    void ctx.resume();
    if (!this.playing) {
      this.playing = true;
      this.nextBeat = ctx.currentTime + 0.1;
      this.timer = window.setInterval(() => this.schedule(), 120);
      document.addEventListener('visibilitychange', this.onVisibility);
    }
    this.applyLevels(3);
  }

  stop() {
    if (!this.ctx || !this.playing) return;
    this.fadeTo(this.music, 0, 1.5);
    window.setTimeout(() => { if (!this.settings.music) { window.clearInterval(this.timer); this.playing = false; } }, 1600);
  }

  set(patch: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...patch };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); } catch { /* storage unavailable */ }
    if (!this.ctx) return; // the engine is created by start(), from a user gesture
    if (this.settings.music && !this.playing) this.start();
    this.applyLevels(0.6);
  }

  get running() {
    return this.playing;
  }

  /** Short synthesised UI / world sound effects. */
  sfxPlay(kind: 'click' | 'open' | 'portal' | 'door' | 'travel') {
    if (!this.ctx || !this.settings.sfx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    if (kind === 'click' || kind === 'open') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(kind === 'click' ? 1320 : 660, t);
      o.frequency.exponentialRampToValueAtTime(kind === 'click' ? 990 : 990, t + 0.09);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'click' ? 0.12 : 0.3));
      o.connect(g).connect(this.sfx);
      g.connect(this.reverbSend);
      o.start(t); o.stop(t + 0.35);
      return;
    }
    // Filtered noise sweeps: portal / travel (rising), door (low swoosh).
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = kind === 'door' ? 0.8 : 4;
    const g = ctx.createGain();
    const dur = kind === 'door' ? 0.9 : 1.2;
    f.frequency.setValueAtTime(kind === 'door' ? 300 : 400, t);
    f.frequency.exponentialRampToValueAtTime(kind === 'door' ? 140 : 3200, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(kind === 'door' ? 0.25 : 0.35, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    g.connect(this.reverbSend);
    src.start(t); src.stop(t + dur + 0.1);
  }

  private build() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    comp.connect(ctx.destination);
    this.music = ctx.createGain(); this.music.gain.value = 0; this.music.connect(comp);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0; this.sfx.connect(comp);
    // Generated stereo impulse response (~4 s, darkened) for a large, soft space.
    const len = ctx.sampleRate * 4.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) { lp += (Math.random() * 2 - 1 - lp) * 0.35; d[i] = lp * Math.pow(1 - i / len, 2.6); }
    }
    this.reverb = ctx.createConvolver(); this.reverb.buffer = ir;
    this.reverbSend = ctx.createGain(); this.reverbSend.gain.value = 0.9;
    this.reverbSend.connect(this.reverb).connect(this.music);
    // Ping-pong-ish feedback delay with a darkening filter in the loop.
    this.delay = ctx.createDelay(2); this.delay.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
    this.delay.connect(dl).connect(fb).connect(this.delay);
    dl.connect(this.music); dl.connect(this.reverbSend);
    // Shared pad filter with a slow LFO on the cutoff ("breathing").
    this.padFilter = ctx.createBiquadFilter(); this.padFilter.type = 'lowpass'; this.padFilter.frequency.value = 900; this.padFilter.Q.value = 0.7;
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    lfo.frequency.value = 0.045; lfoGain.gain.value = 420;
    lfo.connect(lfoGain).connect(this.padFilter.frequency); lfo.start();
    const padOut = ctx.createGain(); padOut.gain.value = 0.55;
    this.padFilter.connect(padOut); padOut.connect(this.music); padOut.connect(this.reverbSend);
    // Noise buffer (texture, hats, sweeps).
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // Faint digital texture: band-passed noise with a slow swell.
    const tex = ctx.createBufferSource(); tex.buffer = this.noise; tex.loop = true;
    const tf = ctx.createBiquadFilter(); tf.type = 'bandpass'; tf.frequency.value = 2600; tf.Q.value = 6;
    const tg = ctx.createGain(); tg.gain.value = 0.012;
    const tl = ctx.createOscillator(), tlg = ctx.createGain(); tl.frequency.value = 0.07; tlg.gain.value = 0.01;
    tl.connect(tlg).connect(tg.gain); tl.start();
    tex.connect(tf).connect(tg).connect(this.reverbSend); tex.start();
  }

  private applyLevels(fade: number) {
    const v = this.settings.volume;
    this.fadeTo(this.music, this.settings.music ? 0.32 * v * v + 0.0001 : 0.0001, fade);
    this.fadeTo(this.sfx, this.settings.sfx ? 0.5 * v + 0.0001 : 0.0001, 0.3);
  }

  private fadeTo(g: GainNode, value: number, seconds: number) {
    const t = this.ctx!.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
    g.gain.exponentialRampToValueAtTime(Math.max(value, 0.0001), t + Math.max(0.05, seconds));
  }

  private readonly onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) {
      this.fadeTo(this.music, 0.0001, 0.6);
      window.setTimeout(() => { if (document.hidden) void this.ctx?.suspend(); }, 700);
    } else {
      void this.ctx.resume().then(() => this.applyLevels(1.5));
    }
  };

  /** Look-ahead scheduler: queues every beat that falls in the next 0.6 s. */
  private schedule() {
    const ctx = this.ctx!;
    if (ctx.state !== 'running') return;
    while (this.nextBeat < ctx.currentTime + 0.6) {
      this.playBeat(this.beat, this.nextBeat);
      this.nextBeat += BEAT;
      this.beat++;
    }
  }

  private playBeat(beat: number, t: number) {
    const chord = PROGRESSION[Math.floor(beat / CHORD_BEATS) % PROGRESSION.length];
    const inChord = beat % CHORD_BEATS;
    if (inChord === 0) {
      this.pad(chord.tones, t, CHORD_BEATS * BEAT);
      this.bass(chord.root, t, CHORD_BEATS * BEAT);
    }
    // Slow pulse: soft sub kick on beats 1 and 5 of the chord, brushed hat on the off-beats.
    if (inChord % 4 === 0) this.kick(t);
    if (beat % 2 === 1) this.hat(t + BEAT * 0.5, 0.018 + Math.random() * 0.008);
    // Sparse plucks (chord tones up an octave), more likely on even beats.
    if (Math.random() < (inChord % 2 === 0 ? 0.55 : 0.25)) {
      const n = chord.tones[Math.floor(Math.random() * chord.tones.length)] + 12;
      this.pluck(n, t + (Math.random() < 0.3 ? BEAT * 0.5 : 0));
    }
  }

  private pad(tones: Note[], t: number, dur: number) {
    const ctx = this.ctx!;
    for (const n of tones) {
      for (const detune of [-7, 6]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = hz(n);
        o.detune.value = detune + (Math.random() - 0.5) * 4;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.022, t + 2.6);
        g.gain.setValueAtTime(0.022, t + dur - 0.5);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 2.8);
        o.connect(g).connect(this.padFilter);
        o.start(t); o.stop(t + dur + 3);
      }
    }
  }

  private bass(root: Note, t: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = hz(root - 12);
    f.type = 'lowpass'; f.frequency.value = 220;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.6);
    g.gain.setValueAtTime(0.16, t + dur - 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
    o.connect(f).connect(g).connect(this.music);
    o.start(t); o.stop(t + dur + 0.8);
  }

  private pluck(n: Note, t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = hz(n);
    f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(f).connect(g);
    g.connect(this.delay); g.connect(this.reverbSend); g.connect(this.music);
    o.start(t); o.stop(t + 1.5);
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.35);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g).connect(this.music);
    o.start(t); o.stop(t + 0.65);
  }

  private hat(t: number, level: number) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noise;
    f.type = 'highpass'; f.frequency.value = 7000;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    s.connect(f).connect(g).connect(this.music);
    g.connect(this.reverbSend);
    s.start(t, Math.random()); s.stop(t + 0.1);
  }
}

/** Single shared instance (the UI controls it, the game triggers sound effects). */
export const ambient = new AmbientEngine();
