import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

type Particle = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  r: number;
  a: number;
};

export interface ParticleCloudProps {
  id: string;
  imagePath?: string | null;
  tint?: string;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

const parseHex = (hex: string): { r: number; g: number; b: number } => {
  const s = hex.trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(s);
  if (!m) return { r: 130, g: 144, b: 156 };
  const v = parseInt(m[1], 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
};

const useStableRandom = (seed: number) => {
  return useMemo(() => {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }, [seed]);
};

const ParticleCloud: React.FC<ParticleCloudProps> = ({ id, imagePath, tint = '#6D5DFE' }) => {
  const isH5 = process.env.TARO_ENV === 'h5';
  const canvasRef = useRef<any>(null);
  const ctxRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const touchRef = useRef<{ x: number; y: number; active: boolean }>({ x: 9999, y: 9999, active: false });
  const sizeRef = useRef<{ w: number; h: number; dpr: number; left: number; top: number }>({
    w: 0,
    h: 0,
    dpr: 1,
    left: 0,
    top: 0,
  });
  const [ready, setReady] = useState(false);

  const requestFrame = (cb: (t: number) => void) => {
    if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(cb);
    return window.setTimeout(() => cb(Date.now()), 16);
  };

  const cancelFrame = (id_: number) => {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id_);
    else clearTimeout(id_);
  };

  const rnd = useStableRandom(
    (() => {
      let h = 2166136261;
      const src = `${id}:${tint}`;
      for (let i = 0; i < src.length; i += 1) {
        h ^= src.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    })()
  );

  const stop = () => {
    if (rafRef.current != null) {
      cancelFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const drawFrame = (timeMs: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const { w, h, dpr } = sizeRef.current;
    ctx.clearRect(0, 0, w * dpr, h * dpr);

    const bg = '#F7F6F2';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w * dpr, h * dpr);

    const { r, g, b } = parseHex(tint);
    const now = timeMs * 0.001;
    const touch = touchRef.current;
    const repelR = 42 * dpr;

    const list = particlesRef.current;
    for (let i = 0; i < list.length; i += 1) {
      const p = list[i];
      const swayX = Math.sin(now * 0.9 + p.ty * 0.02) * 0.7 * dpr;
      const swayY = Math.cos(now * 0.8 + p.tx * 0.02) * 0.6 * dpr;

      const tx = p.tx + swayX;
      const ty = p.ty + swayY;

      p.x += (tx - p.x) * 0.06;
      p.y += (ty - p.y) * 0.06;

      if (touch.active) {
        const dx = p.x - touch.x;
        const dy = p.y - touch.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.001 && dist < repelR) {
          const f = (1 - dist / repelR) * 2.2 * dpr;
          p.x += (dx / dist) * f;
          p.y += (dy / dist) * f;
        }
      }

      ctx.beginPath();
      ctx.fillStyle = `rgba(${r},${g},${b},${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    rafRef.current = requestFrame(drawFrame);
  };

  const buildNebula = (count: number, w: number, h: number, dpr: number) => {
    const cx = (w * dpr) / 2;
    const cy = (h * dpr) / 2;
    const radius = Math.min(w, h) * 0.36 * dpr;
    const list: Particle[] = [];
    for (let i = 0; i < count; i += 1) {
      const a = rnd() * Math.PI * 2;
      const rr = radius * (0.15 + Math.pow(rnd(), 0.6) * 0.85);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      list.push({
        x,
        y,
        tx: x,
        ty: y,
        r: (0.9 + rnd() * 1.8) * dpr,
        a: 0.06 + rnd() * 0.22,
      });
    }
    particlesRef.current = list;
  };

  const sampleImageTargets = async (canvas: any, ctx: any, path: string, w: number, h: number, dpr: number) => {
    const img = canvas.createImage ? canvas.createImage() : new Image();
    const loaded = await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = path;
    });
    void loaded;

    const targetW = Math.max(220, Math.floor(w * dpr));
    const targetH = Math.max(160, Math.floor(h * dpr));

    ctx.clearRect(0, 0, w * dpr, h * dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);

    const scale = Math.min(targetW / img.width, targetH / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (targetW - dw) / 2;
    const dy = (targetH - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);

    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const { data } = imgData as any;

    const points: Array<{ x: number; y: number }> = [];
    const step = 5;
    const threshold = 200;
    for (let y = 0; y < targetH; y += step) {
      for (let x = 0; x < targetW; x += step) {
        const idx = (y * targetW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (a < 20) continue;
        const brightness = (r + g + b) / 3;
        if (brightness < threshold) points.push({ x, y });
      }
    }

    const cx = (w * dpr) / 2;
    const cy = (h * dpr) / 2;
    const scaleToCanvas = Math.min((w * dpr) / targetW, (h * dpr) / targetH) * 0.86;
    const ox = cx - (targetW * scaleToCanvas) / 2;
    const oy = cy - (targetH * scaleToCanvas) / 2;

    const desired = Math.min(2600, Math.max(900, Math.floor(points.length * 0.65)));
    const picked: Array<{ x: number; y: number }> = [];
    if (points.length <= desired) {
      picked.push(...points);
    } else {
      for (let i = 0; i < desired; i += 1) {
        picked.push(points[Math.floor(rnd() * points.length)]);
      }
    }

    const list = particlesRef.current;
    const count = Math.min(list.length, picked.length);
    for (let i = 0; i < count; i += 1) {
      const pt = picked[i];
      list[i].tx = ox + pt.x * scaleToCanvas;
      list[i].ty = oy + pt.y * scaleToCanvas;
    }
    for (let i = count; i < list.length; i += 1) {
      const j = Math.floor(rnd() * count);
      list[i].tx = list[j].tx + (rnd() - 0.5) * 10 * dpr;
      list[i].ty = list[j].ty + (rnd() - 0.5) * 10 * dpr;
    }
  };

  const animateToTargets = (durationMs: number) => {
    const start = Date.now();
    const list = particlesRef.current;
    const from = list.map((p) => ({ x: p.x, y: p.y }));

    const tick = () => {
      const p = clamp((Date.now() - start) / durationMs, 0, 1);
      const k = easeOutExpo(p);
      for (let i = 0; i < list.length; i += 1) {
        list[i].x = from[i].x + (list[i].tx - from[i].x) * k;
        list[i].y = from[i].y + (list[i].ty - from[i].y) * k;
      }
      if (p < 1) {
        requestFrame(tick);
      }
    };
    requestFrame(tick);
  };

  const initCanvas = async () => {
    const sys = await Taro.getSystemInfo();
    const dpr = clamp(sys.pixelRatio ?? 1, 1, 2);

    if (isH5 && typeof document !== 'undefined') {
      const root = document.getElementById(id);
      if (!root) return;

      let el: any = root as any;
      if (typeof el.getContext !== 'function') {
        el =
          (root.querySelector && root.querySelector('canvas')) ||
          document.querySelector(`canvas#${id}`) ||
          null;
      }
      if (!el || typeof el.getContext !== 'function') return;

      const rect = (el.getBoundingClientRect ? el.getBoundingClientRect() : root.getBoundingClientRect()) as DOMRect;
      const w = rect.width || (root as any).clientWidth || 0;
      const h = rect.height || (root as any).clientHeight || 0;
      if (!w || !h) return;

      const ctx = el.getContext('2d');
      if (!ctx) return;

      canvasRef.current = el;
      ctxRef.current = ctx;
      sizeRef.current = { w, h, dpr, left: rect.left, top: rect.top };
      el.width = Math.floor(w * dpr);
      el.height = Math.floor(h * dpr);
      buildNebula(2600, w, h, dpr);
      setReady(true);
      return;
    }

    try {
      const query = Taro.createSelectorQuery();
      query
        .select(`#${id}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          const first = res?.[0] as any;
          const node = first?.node;
          const w = first?.width ?? 0;
          const h = first?.height ?? 0;
          if (!node || !w || !h) return;

          const canvas = node;
          canvasRef.current = canvas;
          const ctx = canvas.getContext('2d');
          ctxRef.current = ctx;
          sizeRef.current = { w, h, dpr, left: 0, top: 0 };
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);

          buildNebula(2600, w, h, dpr);
          setReady(true);
        });
    } catch {
      return;
    }
  };

  useEffect(() => {
    initCanvas();
    return () => stop();
  }, []);

  useEffect(() => {
    if (!ready) return;
    stop();
    rafRef.current = requestFrame(drawFrame);
    return () => stop();
  }, [ready, tint]);

  useEffect(() => {
    const run = async () => {
      if (!ready) return;
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      const { w, h, dpr } = sizeRef.current;
      if (!canvas || !ctx || !w || !h) return;

      buildNebula(2600, w, h, dpr);
      if (!imagePath) {
        animateToTargets(600);
        return;
      }

      try {
        await sampleImageTargets(canvas, ctx, imagePath, w, h, dpr);
        animateToTargets(1400);
      } catch {
        animateToTargets(600);
      }
    };
    run();
  }, [imagePath, ready]);

  return (
    <View className={styles.container}>
      {isH5 ? (
        <canvas
          id={id}
          className={styles.canvas}
          onMouseDown={(e) => {
            const { dpr, left, top } = sizeRef.current;
            touchRef.current = { x: (e.clientX - left) * dpr, y: (e.clientY - top) * dpr, active: true };
          }}
          onMouseMove={(e) => {
            if (!touchRef.current.active) return;
            const { dpr, left, top } = sizeRef.current;
            touchRef.current = { x: (e.clientX - left) * dpr, y: (e.clientY - top) * dpr, active: true };
          }}
          onMouseUp={() => {
            touchRef.current = { x: 9999, y: 9999, active: false };
          }}
          onMouseLeave={() => {
            touchRef.current = { x: 9999, y: 9999, active: false };
          }}
          onTouchStart={(e) => {
            const t = e.touches?.[0];
            if (!t) return;
            const { dpr, left, top } = sizeRef.current;
            touchRef.current = { x: (t.clientX - left) * dpr, y: (t.clientY - top) * dpr, active: true };
          }}
          onTouchMove={(e) => {
            const t = e.touches?.[0];
            if (!t) return;
            const { dpr, left, top } = sizeRef.current;
            touchRef.current = { x: (t.clientX - left) * dpr, y: (t.clientY - top) * dpr, active: true };
          }}
          onTouchEnd={() => {
            touchRef.current = { x: 9999, y: 9999, active: false };
          }}
        />
      ) : (
        <Canvas
          type="2d"
          id={id}
          canvasId={id}
          className={styles.canvas}
          onTouchStart={(e) => {
            const t = e.touches?.[0];
            if (!t) return;
            const { dpr } = sizeRef.current;
            const x = (t as any).x ?? (t as any).pageX ?? (t as any).clientX ?? 0;
            const y = (t as any).y ?? (t as any).pageY ?? (t as any).clientY ?? 0;
            touchRef.current = { x: x * dpr, y: y * dpr, active: true };
          }}
          onTouchMove={(e) => {
            const t = e.touches?.[0];
            if (!t) return;
            const { dpr } = sizeRef.current;
            const x = (t as any).x ?? (t as any).pageX ?? (t as any).clientX ?? 0;
            const y = (t as any).y ?? (t as any).pageY ?? (t as any).clientY ?? 0;
            touchRef.current = { x: x * dpr, y: y * dpr, active: true };
          }}
          onTouchEnd={() => {
            touchRef.current = { x: 9999, y: 9999, active: false };
          }}
        />
      )}
    </View>
  );
};

export default ParticleCloud;
