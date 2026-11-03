/**
 * Synthesised victory fanfare (Web Audio, no asset files): the opening phrase
 * of Beethoven's "Ode to Joy" — public domain — with a bright harmony, a final
 * chord, and a short "pop" for every firework burst.
 */

// [semitones above D5, beats]. E E F G G F E D C C D E E. D D-  (in D major)
const MELODY = [
  [6, 1], [6, 1], [7, 1], [9, 1], [9, 1], [7, 1], [6, 1], [4, 1],
  [2, 1], [2, 1], [4, 1], [6, 1], [6, 1.5], [4, 0.5], [4, 2],
]; // fmt: skip
const BASE_HZ = 587.33; // D5
const BEAT_SECONDS = 0.4;
const FINAL_CHORD = [0, 4, 7, 12]; // D major triad + octave

const hz = (semitones) => BASE_HZ * 2 ** (semitones / 12);

export class Fanfare {
  #ctx = null;
  #master = null;

  #ensure() {
    if (this.#ctx) return this.#ctx;
    const Context = window.AudioContext ?? window.webkitAudioContext;
    if (!Context) return null;
    this.#ctx = new Context();
    this.#master = this.#ctx.createGain();
    this.#master.gain.value = 0.3;
    this.#master.connect(this.#ctx.destination);
    return this.#ctx;
  }

  #tone(frequency, start, length, { type = 'triangle', volume = 0.5 } = {}) {
    const ctx = this.#ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(this.#master);
    osc.start(start);
    osc.stop(start + length + 0.05);
  }

  /** Play the melody and return how long it lasts (seconds). */
  play() {
    const ctx = this.#ensure();
    if (!ctx) return 0;
    try {
      ctx.resume?.();
      let t = ctx.currentTime + 0.05;
      for (const [semitones, beats] of MELODY) {
        const length = beats * BEAT_SECONDS;
        this.#tone(hz(semitones), t, length * 0.95, { type: 'triangle', volume: 0.55 });
        this.#tone(hz(semitones - 12), t, length * 0.95, { type: 'sine', volume: 0.35 });
        this.#tone(hz(semitones + 4), t, length * 0.9, { type: 'square', volume: 0.06 });
        t += length;
      }
      FINAL_CHORD.forEach((n) => this.#tone(hz(n + 7), t, 1.8, { type: 'sawtooth', volume: 0.09 }));
      FINAL_CHORD.forEach((n) => this.#tone(hz(n), t, 2.2, { type: 'triangle', volume: 0.3 }));
      return t - ctx.currentTime + 1.8;
    } catch {
      return 0;
    }
  }

  /** A short crackling burst for one firework. */
  pop(volume = 0.5) {
    const ctx = this.#ctx;
    if (!ctx) return;
    try {
      const length = 0.35;
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.value = 900 + Math.random() * 1400;
      gain.gain.value = volume;
      source.connect(filter).connect(gain).connect(this.#master);
      source.start();
    } catch {
      /* audio is a bonus; never break the results screen */
    }
  }
}
