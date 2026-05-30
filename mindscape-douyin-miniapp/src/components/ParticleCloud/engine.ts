export type Rgba = { r: number; g: number; b: number; a: number };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const rafImpl: (cb: FrameRequestCallback) => number =
  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : ((cb: any) => setTimeout(() => cb(Date.now()), 16) as any);
const cafImpl: (handle: number) => void =
  typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : ((h: any) => clearTimeout(h));

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const raw = hex.replace('#', '').trim();
  const s = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = Number.parseInt(s, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

export interface ParticleCloudEngineOptions {
  width: number;
  height: number;
  dpr: number;
  targets: Float32Array;
  seed: number;
  themeColor: string;
  onError?: (err: unknown) => void;
}

export class ParticleCloudEngine {
  private width: number;
  private height: number;
  private dpr: number;
  private targets: Float32Array;
  private current: Float32Array;
  private start: Float32Array;
  private colors: Uint8ClampedArray;
  private raf: number | null = null;
  private t0: number = 0;
  private assembling = true;
  private pointerX = 9999;
  private pointerY = 9999;
  private ctx: any;
  private onError?: (err: unknown) => void;

  constructor(ctx: any, options: ParticleCloudEngineOptions) {
    this.ctx = ctx;
    this.width = options.width;
    this.height = options.height;
    this.dpr = options.dpr;
    this.targets = options.targets;
    this.onError = options.onError;
    this.current = new Float32Array(this.targets.length);
    this.start = new Float32Array(this.targets.length);
    this.colors = new Uint8ClampedArray((this.targets.length / 3) * 4);
    this.initNebula(options.seed, options.themeColor);
  }

  private initNebula(seed: number, themeColor: string) {
    const n = this.targets.length / 3;
    const rnd = mulberry32(seed);
    const tint = hexToRgb(themeColor);

    const palette: Array<{ r: number; g: number; b: number; w: number }> = [
      { r: 128, g: 61, b: 77, w: 16 },
      { r: 43, g: 61, b: 79, w: 14 },
      { r: 51, g: 87, b: 66, w: 12 },
      { r: 89, g: 77, b: 99, w: 12 },
      { r: 140, g: 92, b: 92, w: 10 },
      { r: 97, g: 66, b: 46, w: 8 },
      { r: 242, g: 89, b: 102, w: 4 },
      { r: 51, g: 153, b: 140, w: 3 },
      { r: 204, g: 115, b: 38, w: 2 },
      { r: 77, g: 115, b: 191, w: 2 },
      { r: 217, g: 77, b: 140, w: 1 },
    ];
    const total = palette.reduce((s, c) => s + c.w, 0);
    const thresholds: number[] = [];
    let acc = 0;
    palette.forEach((c) => {
      acc += c.w / total;
      thresholds.push(acc);
    });

    for (let i = 0; i < n; i += 1) {
      const i3 = i * 3;
      const theta = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * 0.9;
      this.current[i3] = Math.cos(theta) * r;
      this.current[i3 + 1] = Math.sin(theta) * r * 0.78;
      this.current[i3 + 2] = (rnd() - 0.5) * 0.25;
    }
    this.start.set(this.current);

    for (let i = 0; i < n; i += 1) {
      const roll = rnd();
      let picked = palette[0];
      for (let j = 0; j < thresholds.length; j += 1) {
        if (roll < thresholds[j]) {
          picked = palette[j];
          break;
        }
      }
      const t = 0.25;
      const r = Math.round(mix(picked.r, tint.r, t));
      const g = Math.round(mix(picked.g, tint.g, t));
      const b = Math.round(mix(picked.b, tint.b, t));
      const baseA = picked.r > 200 || picked.g > 140 ? 230 : 200;
      this.colors[i * 4] = clamp(r, 0, 255);
      this.colors[i * 4 + 1] = clamp(g, 0, 255);
      this.colors[i * 4 + 2] = clamp(b, 0, 255);
      this.colors[i * 4 + 3] = baseA;
    }
  }

  setPointer(clientX: number, clientY: number) {
    this.pointerX = clientX;
    this.pointerY = clientY;
  }

  clearPointer() {
    this.pointerX = 9999;
    this.pointerY = 9999;
  }

  startRender() {
    this.stopRender();
    this.assembling = true;
    this.t0 = Date.now();
    this.loop();
  }

  stopRender() {
    if (this.raf != null) {
      cafImpl(this.raf);
      this.raf = null;
    }
  }

  private loop = () => {
    try {
      this.step();
      this.draw();
      this.raf = rafImpl(this.loop as any);
    } catch (e) {
      this.stopRender();
      if (this.onError) this.onError(e);
    }
  };

  private step() {
    const n = this.targets.length / 3;
    const now = Date.now();
    const t = clamp((now - this.t0) / 2200, 0, 1);
    const ease = 1 - Math.pow(1 - t, 3.6);

    if (this.assembling) {
      for (let i = 0; i < n * 3; i += 1) {
        this.current[i] = this.start[i] + (this.targets[i] - this.start[i]) * ease;
      }
      if (t >= 1) this.assembling = false;
      return;
    }

    const px = (this.pointerX / this.width) * 2 - 1;
    const py = -((this.pointerY / this.height) * 2 - 1);
    const pointerActive = Number.isFinite(px) && Number.isFinite(py) && Math.abs(px) < 3 && Math.abs(py) < 3;
    const radius = 0.22;
    const repel = 0.12;

    for (let i = 0; i < n; i += 1) {
      const i3 = i * 3;
      const tx = this.targets[i3];
      const ty = this.targets[i3 + 1];
      const tz = this.targets[i3 + 2];

      let x = this.current[i3];
      let y = this.current[i3 + 1];
      let z = this.current[i3 + 2];

      x += (tx - x) * 0.05;
      y += (ty - y) * 0.05;
      z += (tz - z) * 0.03;

      if (pointerActive) {
        const dx = x - px;
        const dy = y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.0001 && dist < radius) {
          const f = (1 - dist / radius) * repel;
          x += (dx / dist) * f;
          y += (dy / dist) * f;
        }
      }

      this.current[i3] = x;
      this.current[i3 + 1] = y;
      this.current[i3 + 2] = z;
    }
  }

  private draw() {
    const ctx = this.ctx;
    const w = this.width * this.dpr;
    const h = this.height * this.dpr;
    if (!ctx || !w || !h) return;

    ctx.save?.();
    if (ctx.setTransform) ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect?.(0, 0, w, h);
    if ('globalCompositeOperation' in ctx) {
      try {
        ctx.globalCompositeOperation = 'lighter';
      } catch {
        return;
      }
    }

    const n = this.targets.length / 3;
    for (let i = 0; i < n; i += 1) {
      const i3 = i * 3;
      const x = (this.current[i3] * 0.46 + 0.5) * w;
      const y = (-this.current[i3 + 1] * 0.46 + 0.5) * h;
      const depth = this.current[i3 + 2] * 0.5 + 0.5;
      const base = 1.2 + depth * 1.1;

      const r = this.colors[i * 4];
      const g = this.colors[i * 4 + 1];
      const b = this.colors[i * 4 + 2];

      ctx.fillStyle = `rgba(${r},${g},${b},0.14)`;
      ctx.beginPath?.();
      ctx.arc?.(x, y, base * 2.4, 0, Math.PI * 2);
      ctx.fill?.();

      ctx.fillStyle = `rgba(${r},${g},${b},0.62)`;
      ctx.beginPath?.();
      ctx.arc?.(x, y, base, 0, Math.PI * 2);
      ctx.fill?.();
    }

    ctx.restore?.();
  }
}
