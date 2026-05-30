import { getStaticParticleHtmlPath } from '@/data/staticParticleManifest';

let cache: Record<string, string> | null | undefined;

const loadMap = (): Record<string, string> | null => {
  if (cache !== undefined) return cache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./staticParticleInline.generated') as {
      STATIC_PARTICLE_INLINE_HTML?: Record<string, string>;
    };
    const m = mod?.STATIC_PARTICLE_INLINE_HTML;
    cache = m && typeof m === 'object' && Object.keys(m).length > 0 ? m : null;
  } catch {
    cache = null;
  }
  return cache;
};

export const hasStaticParticleInline = (): boolean => {
  const m = loadMap();
  return !!m && Object.keys(m).length > 0;
};

export const getStaticParticleInlineHtml = (cacheKey: string): string | null => {
  const m = loadMap();
  if (!m) return null;
  const key = (cacheKey || '').trim();
  if (key && m[key]) return m[key];
  const rel = getStaticParticleHtmlPath(key);
  if (m[rel]) return m[rel];
  return m.default ?? m['static/particle-default.html'] ?? null;
};

export const buildStaticParticleInlineDataUri = (cacheKey: string): string | null => {
  const html = getStaticParticleInlineHtml(cacheKey);
  if (!html) return null;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
};
