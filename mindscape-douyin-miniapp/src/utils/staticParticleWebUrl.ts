import { getStaticParticleHtmlPath } from '@/data/staticParticleManifest';
import { normalizeH5BaseUrl } from '@/utils/particleCloudWebUrl';
import { DEV_H5_ORIGIN, isParticleCloudDevMode } from '@/utils/particleCloudDev';
import {
  buildStaticParticleInlineDataUri,
  hasStaticParticleInline,
} from '@/plugins/particle-cloud/staticParticleInlineLoader';

export const buildStaticParticleHttpsUrl = (h5BaseUrl: string, cacheKey: string): string | null => {
  const base = normalizeH5BaseUrl(h5BaseUrl);
  if (!base) return null;
  const path = getStaticParticleHtmlPath(cacheKey);
  return `${base}/${path}`;
};

/** 开发者工具：本地 serve h5/（可选，与包内 inline 二选一） */
export const buildStaticParticleDevUrl = (cacheKey: string): string => {
  const origin = DEV_H5_ORIGIN.replace(/\/+$/, '');
  const path = getStaticParticleHtmlPath(cacheKey);
  return `${origin}/${path}`;
};

export type StaticParticleSrcMode = 'inline' | 'https' | 'dev-http';

export interface ResolvedStaticParticleSrc {
  src: string;
  mode: StaticParticleSrcMode;
}

/**
 * 解析顺序：包内静态 HTML（完全本地）→ HTTPS → 开发态本地 http
 */
export const resolveStaticParticleWebViewSrc = (
  h5BaseUrl: string,
  cacheKey: string,
  isHttpsValid: (url: string) => boolean,
): ResolvedStaticParticleSrc | null => {
  const base = (h5BaseUrl || '').trim();

  if (hasStaticParticleInline()) {
    const inline = buildStaticParticleInlineDataUri(cacheKey);
    if (inline) return { src: inline, mode: 'inline' };
  }

  if (isHttpsValid(base)) {
    const httpsSrc = buildStaticParticleHttpsUrl(base, cacheKey);
    if (httpsSrc) return { src: httpsSrc, mode: 'https' };
  }

  if (isParticleCloudDevMode()) {
    return { src: buildStaticParticleDevUrl(cacheKey), mode: 'dev-http' };
  }

  return null;
};
