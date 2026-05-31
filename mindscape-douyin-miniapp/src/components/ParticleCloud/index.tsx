import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { pickPreset } from './presets';
import { ParticleCloudEngine } from './engine';
import { loadParticleCloudCache, readTargetsFile, saveParticleCloudCache } from './storage';
import {
  createFallbackSelectorQuery,
  createPageSelectorQuery,
  createScopedSelectorQuery,
} from './canvasQuery';
import { buildTargetsFromPresetDraw } from './presetDraw';
import { buildParticleStorageKey, hashString } from '@/utils/hashString';
export interface ParticleCloudProps {
  cacheKey: string;
  text: string;
  contentVersion?: number;
  /** data-single 包内压缩图，优先于预设绘制 */
  staticImageUrl?: string;
  staticThemeColor?: string;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Rect = { width: number; height: number; left: number; top: number };
type CanvasPair = { canvas: any; ctx: any };

const queryRect = (selector: string, scope: 'component' | 'page' | 'global') =>
  new Promise<Rect>((resolve, reject) => {
    if (process.env.TARO_ENV === 'h5' && typeof document !== 'undefined') {
      const id = selector.startsWith('#') ? selector.slice(1) : selector;
      const el = document.getElementById(id) as any;
      const rect = el?.getBoundingClientRect?.();
      if (rect && rect.width > 0) {
        return resolve({ width: rect.width, height: rect.height, left: rect.left, top: rect.top });
      }
      return reject(new Error('rect_not_found'));
    }

    const query =
      scope === 'page'
        ? createPageSelectorQuery()
        : scope === 'global'
          ? createFallbackSelectorQuery()
          : createScopedSelectorQuery();

    query
      .select(selector)
      .boundingClientRect()
      .exec((res) => {
        const r = res?.[0] as { width?: number; height?: number; left?: number; top?: number } | undefined;
        if (!r || !r.width || !r.height) return reject(new Error('rect_not_found'));
        resolve({ width: r.width, height: r.height, left: r.left ?? 0, top: r.top ?? 0 });
      });
  });

const queryCanvasNode = (selector: string, scope: 'component' | 'page' | 'global') =>
  new Promise<CanvasPair>((resolve, reject) => {
    if (process.env.TARO_ENV === 'h5' && typeof document !== 'undefined') {
      const id = selector.startsWith('#') ? selector.slice(1) : selector;
      const el = document.getElementById(id) as any;
      const ctx = el?.getContext?.('2d');
      if (el && ctx) return resolve({ canvas: el, ctx });
      return reject(new Error('h5_canvas_not_ready'));
    }

    const query =
      scope === 'page'
        ? createPageSelectorQuery()
        : scope === 'global'
          ? createFallbackSelectorQuery()
          : createScopedSelectorQuery();

    query
      .select(selector)
      .fields({ node: true, size: true })
      .exec((res) => {
        const node = res?.[0]?.node;
        if (!node) return reject(new Error('canvas_node_not_found'));
        const ctx = node.getContext?.('2d');
        if (!ctx) return reject(new Error('canvas_ctx_not_found'));
        resolve({ canvas: node, ctx });
      });
  });

const getRectWithFallback = async (selector: string) => {
  const scopes: Array<'component' | 'page' | 'global'> = ['component', 'page', 'global'];
  let lastErr: unknown;
  for (const scope of scopes) {
    try {
      return await queryRect(selector, scope);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
};

const getCanvasNodeWithFallback = async (selector: string) => {
  const scopes: Array<'component' | 'page' | 'global'> = ['component', 'page', 'global'];
  let lastErr: unknown;
  for (const scope of scopes) {
    try {
      return await queryCanvasNode(selector, scope);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
};

const buildTargetsFromImage = async (canvas: any, ctx: any, imgSrc: string, seed: number) => {
  const w = 256;
  const h = 256;
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);

  const ImgCtor = (globalThis as any).Image;
  const img = canvas.createImage ? canvas.createImage() : ImgCtor ? new ImgCtor() : null;
  if (!img) throw new Error('image_ctor_not_found');
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('image_load_failed'));
    img.src = imgSrc;
  });

  const s = Math.min(w / (img.width || w), h / (img.height || h));
  const dw = Math.round((img.width || w) * s);
  const dh = Math.round((img.height || h) * s);
  const dx = Math.round((w - dw) / 2);
  const dy = Math.round((h - dh) / 2);
  ctx.drawImage(img, dx, dy, dw, dh);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data: Uint8ClampedArray = imgData.data;
  const step = 8;
  const brightnessThreshold = 128;

  const rnd = mulberry32(seed);
  const halfW = w / 2;
  const halfH = h / 2;
  const scale = 0.05;
  const arr: number[] = [];

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const brightness = (r + g + b) / 3;
      if (brightness < brightnessThreshold && a > 128) {
        arr.push(
          (x - halfW) * scale + (rnd() - 0.5) * 0.2,
          -((y - halfH) * scale) + (rnd() - 0.5) * 0.2,
          (rnd() - 0.5) * 1.5,
        );
      }
    }
  }

  if (arr.length >= 9) return new Float32Array(arr);

  const fallback: number[] = [];
  for (let i = 0; i < 3000; i += 1) fallback.push((rnd() - 0.5) * 24);
  return new Float32Array(fallback);
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const quantizeTargets = (targets: Float32Array, q: number) => {
  const out = new Int16Array(targets.length);
  for (let i = 0; i < targets.length; i += 1) {
    out[i] = Math.max(-32767, Math.min(32767, Math.round(targets[i] * q)));
  }
  return out;
};

const dequantizeTargets = (packed: Int16Array, q: number) => {
  const out = new Float32Array(packed.length);
  for (let i = 0; i < packed.length; i += 1) out[i] = packed[i] / q;
  return out;
};

const getTouchClient = (e: any) => {
  const t = e?.touches?.[0] ?? e?.changedTouches?.[0];
  if (!t) return null;
  const x = typeof t.x === 'number' ? t.x : t.clientX ?? t.pageX;
  const y = typeof t.y === 'number' ? t.y : t.clientY ?? t.pageY;
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  return { x, y };
};

const stringifyError = (err: unknown) => {
  if (err instanceof Error) return err.message || String(err);
  if (typeof err === 'string') return err;
  const anyErr: any = err as any;
  if (anyErr?.errMsg) return anyErr.errMsg;
  return String(err);
};

const ParticleCloud: React.FC<ParticleCloudProps> = ({
  cacheKey,
  text,
  contentVersion,
  staticImageUrl,
  staticThemeColor,
}) => {
  const mountId = useRef(`m${Date.now().toString(36)}`);
  const merged = useMemo(() => text.trim(), [text]);
  const textHash = useMemo(() => contentVersion ?? hashString(merged), [contentVersion, merged]);
  const storageKey = useMemo(() => buildParticleStorageKey(cacheKey, merged), [cacheKey, merged]);
  const presetSeed = useMemo(() => hashString(`${cacheKey}|${merged}`), [cacheKey, merged]);

  const renderCanvasId = `pc_r_${mountId.current}`;
  const wrapId = `pc_wrap_${mountId.current}`;

  const engineRef = useRef<ParticleCloudEngine | null>(null);
  const rectRef = useRef<Rect | null>(null);
  const initGenRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const gen = ++initGenRef.current;
    let disposed = false;

    const run = async () => {
      setLoading(true);
      setErrorText('');
      engineRef.current?.stopRender();
      engineRef.current = null;

      try {
        await new Promise<void>((resolve) => {
          const fn = (Taro as any).nextTick;
          if (typeof fn !== 'function') return resolve();
          fn(resolve);
        });
        await sleep(120);

        let rect: Rect | null = null;
        for (let i = 0; i < 50; i += 1) {
          if (disposed || gen !== initGenRef.current) return;
          try {
            rect = await getRectWithFallback(`#${wrapId}`);
            if (rect.width > 0 && rect.height > 0) break;
          } catch {
            rect = null;
          }
          await sleep(80);
        }
        if (!rect) throw new Error('rect_not_found');
        rectRef.current = rect;

        let renderPair: CanvasPair | null = null;
        for (let i = 0; i < 50; i += 1) {
          if (disposed || gen !== initGenRef.current) return;
          try {
            renderPair = await getCanvasNodeWithFallback(`#${renderCanvasId}`);
            break;
          } catch {
            renderPair = null;
          }
          await sleep(80);
        }
        if (!renderPair) throw new Error('canvas_node_not_found');

        const { canvas: renderCanvas, ctx: renderCtx } = renderPair;
        const preset = pickPreset(merged || cacheKey, presetSeed);

        const fsSupported = (() => {
          try {
            const fn = (Taro as any).getFileSystemManager;
            return typeof fn === 'function' && !!fn();
          } catch {
            return false;
          }
        })();

        const cached = fsSupported ? await loadParticleCloudCache(storageKey).catch(() => null) : null;
        let targets: Float32Array | null = null;
        let themeColor = preset.themeColor;

        if (cached && cached.textHash === textHash && cached.key === storageKey) {
          try {
            const buf = await readTargetsFile(cached.targetsFilePath);
            const packed = new Int16Array(buf);
            if (packed.length >= 3) {
              targets = dequantizeTargets(packed, cached.quantize);
              themeColor = cached.themeColor;
            }
          } catch {
            targets = null;
          }
        }

        if (!targets) {
          if (staticImageUrl) {
            targets = await buildTargetsFromImage(renderCanvas, renderCtx, staticImageUrl, presetSeed);
            themeColor = staticThemeColor || preset.themeColor;
          } else {
            targets = buildTargetsFromPresetDraw(preset.key, presetSeed, renderCtx, renderCanvas);
            themeColor = preset.themeColor;
          }

          const q = 10000;
          const packed = quantizeTargets(targets, q);
          if (fsSupported) {
            await saveParticleCloudCache({
              key: storageKey,
              textHash,
              presetKey: preset.key,
              themeColor,
              targets: packed,
              quantize: q,
            }).catch(() => null);
          }
        }

        if (disposed || gen !== initGenRef.current) return;

        const dpr = Math.max(1, Math.min(3, Taro.getSystemInfoSync().pixelRatio ?? 2));
        renderCanvas.width = Math.max(1, Math.round(rect.width * dpr));
        renderCanvas.height = Math.max(1, Math.round(rect.height * dpr));

        engineRef.current = new ParticleCloudEngine(renderCtx, {
          width: rect.width,
          height: rect.height,
          dpr,
          targets,
          seed: presetSeed,
          themeColor,
          onError: (e) => setErrorText(stringifyError(e)),
        });
        engineRef.current.startRender();
      } catch (e) {
        if (!disposed && gen === initGenRef.current) setErrorText(stringifyError(e));
      } finally {
        if (!disposed && gen === initGenRef.current) setLoading(false);
      }
    };

    run();

    return () => {
      disposed = true;
      engineRef.current?.stopRender();
      engineRef.current = null;
    };
  }, [cacheKey, merged, presetSeed, storageKey, textHash, staticImageUrl, staticThemeColor]);

  const onTouchMove = (e: any) => {
    const p = getTouchClient(e);
    const rect = rectRef.current;
    if (!p || !rect) return;
    engineRef.current?.setPointer(p.x - rect.left, p.y - rect.top);
  };

  const onTouchEnd = () => {
    engineRef.current?.clearPointer();
  };

  return (
    <View className={styles.container} id={wrapId}>
      <Canvas
        id={renderCanvasId}
        canvasId={renderCanvasId}
        type="2d"
        className={styles.canvas}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      />
      {loading ? <View className={styles.loading}>生成中…</View> : null}
      {!loading && errorText ? <View className={styles.loading}>{errorText}</View> : null}
    </View>
  );
};

export default ParticleCloud;
