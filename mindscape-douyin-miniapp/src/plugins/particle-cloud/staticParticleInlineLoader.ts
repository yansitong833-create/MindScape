import { decompressGzipBase64 } from '@/utils/gzipBase64';
import { cacheKeyToWebViewHash } from './particleWebViewHash';

/** 由 npm run particle:pack-static 生成；缺省时构建会失败，请先执行 pack */
import {
  STATIC_PARTICLE_BUNDLE_GZIP_B64,
  STATIC_PARTICLE_CACHE_KEYS,
  STATIC_PARTICLE_DAY_KEYS,
} from './staticParticleInline.generated';

export { STATIC_PARTICLE_CACHE_KEYS, STATIC_PARTICLE_DAY_KEYS };

let bundleHtml: string | null | undefined;

const getBundleHtml = (): string | null => {
  if (bundleHtml !== undefined) return bundleHtml;
  const b64 = (STATIC_PARTICLE_BUNDLE_GZIP_B64 || '').trim();
  if (!b64) {
    bundleHtml = null;
    return null;
  }
  try {
    bundleHtml = decompressGzipBase64(b64);
  } catch {
    bundleHtml = null;
  }
  return bundleHtml;
};

export const hasStaticParticleInline = (): boolean => {
  const b64 = (STATIC_PARTICLE_BUNDLE_GZIP_B64 || '').trim();
  return b64.length > 100;
};

export const getStaticParticleInlineHtml = (_cacheKey: string): string | null => {
  return getBundleHtml();
};

export const buildStaticParticleInlineDataUri = (cacheKey: string): string | null => {
  const html = getBundleHtml();
  if (!html) return null;
  const hash = cacheKeyToWebViewHash(cacheKey);
  const base = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  return hash ? `${base}#${hash}` : base;
};
