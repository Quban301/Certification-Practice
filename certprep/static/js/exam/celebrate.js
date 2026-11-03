/**
 * Peggle-style "extreme fever" finale for a passing result: white flash,
 * rotating rainbow sun-rays, a rainbow "YOU PASSED!" banner, a rising barrage
 * of rainbow fireworks (with glowing trails and screen shake), confetti
 * cannons and a synthesised "Ode to Joy" fanfare.
 */

import { Fanfare } from './fanfare.js';

const SHOW_MS = 9000;
const BANNER_OUT_MS = 7600;
const MAX_PARTICLES = 2200;
const GRAVITY = 0.07;

const rand = (min, max) => min + Math.random() * (max - min);
const hsl = (h, l = 60, a = 1) => `hsla(${h % 360}, 100%, ${l}%, ${a})`;

export class Celebration {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.banner = document.getElementById('celebrate-banner');
    this.shakeTarget = document.querySelector('main');
    this.fanfare = new Fanfare();
    this.reset();
    window.addEventListener('resize', () => this.#resize());
  }

  reset() {
    this.rockets = [];
    this.sparks = [];
    this.confetti = [];
    this.glows = [];
    this.startedAt = 0;
    this.nextLaunch = 0;
    this.frame = null;
    this.flash = 0;
    this.shake = 0;
    this.hue = 0;
  }

  #resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /** Start the show. Safe to call again; any show in progress is replaced. */
  play(durationMs = SHOW_MS) {
    cancelAnimationFrame(this.frame);
    this.reset();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.#showBanner(reduced);
    this.fanfare.play();
    if (reduced) return;

    this.#resize();
    this.canvas.style.display = 'block';
    this.startedAt = performance.now();
    this.durationMs = durationMs;
    this.flash = 1;
    this.shake = 14;
    this.#cannons();
    this.frame = requestAnimationFrame(this.#loop);
  }

  // -- banner ------------------------------------------------------------
  #showBanner(reduced) {
    if (!this.banner) return;
    this.banner.classList.remove('out');
    this.banner.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.banner.classList.add('out'), reduced ? 4000 : BANNER_OUT_MS);
    clearTimeout(this.bannerHide);
    this.bannerHide = setTimeout(() => this.banner.classList.remove('show', 'out'), (reduced ? 4000 : BANNER_OUT_MS) + 900);
  }

  // -- spawning ----------------------------------------------------------
  #cannons() {
    const { width, height } = this.canvas;
    for (const direction of [1, -1]) {
      for (let i = 0; i < 90; i++) {
        this.confetti.push({
          x: direction === 1 ? 0 : width,
          y: height,
          vx: direction * rand(5, 17),
          vy: -rand(14, 27),
          size: rand(6, 12),
          hue: rand(0, 360),
          rot: rand(0, 360),
          vrot: rand(-18, 18),
          life: 0,
          max: rand(150, 260),
        });
      }
    }
  }

  #launch() {
    const { width, height } = this.canvas;
    const x = rand(width * 0.1, width * 0.9);
    this.rockets.push({
      x,
      y: height + 10,
      vx: rand(-0.6, 0.6),
      vy: -rand(11, 16),
      targetY: rand(height * 0.12, height * 0.5),
      hue: rand(0, 360),
      trail: [],
    });
  }

  #explode(x, y, hue) {
    if (this.sparks.length > MAX_PARTICLES) return;
    const style = ['rainbow', 'ring', 'willow', 'double', 'rainbow'][Math.floor(Math.random() * 5)];
    const count = style === 'double' ? 70 : 90;
    const power = rand(5.5, 8.5);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + rand(-0.03, 0.03);
      const ring = style === 'double' && i % 2 ? 0.55 : 1;
      const speed = (style === 'willow' ? power * 0.8 : power) * ring * rand(0.92, 1.05);
      this.sparks.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        hue: style === 'rainbow' ? (i / count) * 360 : hue + rand(-15, 15),
        drag: style === 'willow' ? 0.985 : 0.965,
        gravity: style === 'willow' ? GRAVITY * 1.6 : GRAVITY,
        life: 0,
        max: style === 'willow' ? rand(90, 130) : rand(55, 85),
        trail: [],
        twinkle: Math.random() < 0.35,
      });
    }
    this.glows.push({ x, y, hue, life: 0, max: 22 });
    this.shake = Math.max(this.shake, 6);
    this.fanfare.pop(rand(0.25, 0.6));
  }

  // -- main loop ---------------------------------------------------------
  #loop = (now) => {
    const elapsed = now - this.startedAt;
    const { ctx, canvas } = this;
    const progress = elapsed / this.durationMs;
    this.hue = (this.hue + 3) % 360;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';
    this.#drawRays(elapsed);

    // Barrage ramps up, peaks around the final chord, then tapers.
    const intensity = progress < 0.75 ? 0.35 + progress * 1.2 : Math.max(0, 1.3 - progress) * 2;
    if (elapsed >= this.nextLaunch && progress < 0.92) {
      const volleys = 1 + Math.floor(intensity * 2.2);
      for (let i = 0; i < volleys; i++) this.#launch();
      this.nextLaunch = elapsed + rand(120, 300) / Math.max(0.4, intensity);
    }

    this.#updateRockets();
    this.#updateSparks();
    this.#drawGlows();
    this.#drawConfetti();
    ctx.globalCompositeOperation = 'source-over';
    this.#drawFlash();
    this.#applyShake();

    const busy = this.rockets.length || this.sparks.length || this.confetti.length;
    if (progress < 1 || busy) {
      this.frame = requestAnimationFrame(this.#loop);
    } else {
      this.#finish();
    }
  };

  #finish() {
    this.frame = null;
    this.canvas.style.display = 'none';
    if (this.shakeTarget) this.shakeTarget.style.transform = '';
  }

  #drawRays(elapsed) {
    const fade = Math.max(0, 1 - elapsed / 4200);
    if (fade <= 0) return;
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.42;
    const reach = Math.hypot(canvas.width, canvas.height);
    const rays = 18;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(elapsed / 1800);
    for (let i = 0; i < rays; i++) {
      const a0 = (i / rays) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / rays / 2;
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, reach * 0.7);
      gradient.addColorStop(0, hsl((i / rays) * 360 + this.hue, 62, 0.55 * fade));
      gradient.addColorStop(1, hsl((i / rays) * 360 + this.hue, 55, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, reach, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  #updateRockets() {
    const { ctx } = this;
    this.rockets = this.rockets.filter((r) => {
      r.trail.push([r.x, r.y]);
      if (r.trail.length > 10) r.trail.shift();
      r.x += r.vx;
      r.y += r.vy;
      r.vy += 0.12;
      ctx.lineCap = 'round';
      r.trail.forEach(([tx, ty], i) => {
        ctx.fillStyle = hsl(r.hue, 80, (i / r.trail.length) * 0.9);
        ctx.beginPath();
        ctx.arc(tx, ty, 1 + (i / r.trail.length) * 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
      if (r.y <= r.targetY || r.vy >= -1) {
        this.#explode(r.x, r.y, r.hue);
        return false;
      }
      return true;
    });
  }

  #updateSparks() {
    const { ctx, canvas } = this;
    ctx.lineCap = 'round';
    this.sparks = this.sparks.filter((p) => {
      p.life++;
      p.trail.push([p.x, p.y]);
      if (p.trail.length > 7) p.trail.shift();
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      const t = p.life / p.max;
      const alpha = (p.twinkle && p.life % 4 < 2 ? 0.35 : 1) * (1 - t);
      ctx.strokeStyle = hsl(p.hue + t * 40, 62 + t * 20, alpha);
      ctx.lineWidth = 3.2 * (1 - t) + 0.6;
      ctx.beginPath();
      p.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      if (p.life === p.max - 8 && Math.random() < 0.12) this.#crackle(p);
      return p.life < p.max && p.y < canvas.height + 40;
    });
  }

  /** A few late sparks pop into tiny secondary bursts. */
  #crackle(p) {
    if (this.sparks.length > MAX_PARTICLES) return;
    for (let i = 0; i < 6; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(1, 3.2);
      this.sparks.push({
        x: p.x, y: p.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        hue: p.hue + rand(-30, 30), drag: 0.95, gravity: GRAVITY, life: 0, max: rand(18, 30),
        trail: [], twinkle: true,
      });
    }
  }

  #drawGlows() {
    const { ctx } = this;
    this.glows = this.glows.filter((g) => {
      g.life++;
      const t = g.life / g.max;
      const radius = 40 + t * 220;
      const gradient = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, radius);
      gradient.addColorStop(0, hsl(g.hue, 85, 0.5 * (1 - t)));
      gradient.addColorStop(1, hsl(g.hue, 70, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(g.x - radius, g.y - radius, radius * 2, radius * 2);
      return g.life < g.max;
    });
  }

  #drawConfetti() {
    const { ctx, canvas } = this;
    this.confetti = this.confetti.filter((c) => {
      c.life++;
      c.vx *= 0.985;
      c.vy = c.vy * 0.985 + 0.22;
      c.x += c.vx + Math.sin(c.life / 6) * 0.8;
      c.y += c.vy;
      c.rot += c.vrot;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - c.life / c.max) * 1.5);
      ctx.translate(c.x, c.y);
      ctx.rotate((c.rot * Math.PI) / 180);
      ctx.scale(1, Math.abs(Math.cos(c.life / 5)) * 0.8 + 0.2); // flutter
      ctx.fillStyle = hsl(c.hue + this.hue, 58);
      ctx.fillRect(-c.size / 2, -c.size / 3, c.size, (c.size * 2) / 3);
      ctx.restore();
      return c.life < c.max && c.y < canvas.height + 40;
    });
  }

  #drawFlash() {
    if (this.flash <= 0.01) return;
    const { ctx, canvas } = this;
    ctx.fillStyle = `rgba(255, 255, 255, ${this.flash * 0.85})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.flash *= 0.88;
  }

  #applyShake() {
    if (!this.shakeTarget) return;
    if (this.shake < 0.3) {
      this.shakeTarget.style.transform = '';
      return;
    }
    this.shakeTarget.style.transform = `translate(${rand(-1, 1) * this.shake}px, ${rand(-1, 1) * this.shake}px)`;
    this.shake *= 0.86;
  }
}
