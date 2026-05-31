import { getStaticParticleHtmlPath } from '@/data/staticParticleManifest';
import { normalizeH5BaseUrl } from '@/utils/particleCloudWebUrl';
import { DEV_H5_ORIGIN } from '@/utils/particleCloudDev';
import {
  getStaticParticleInlineHtml,
  hasStaticParticleInline,
} from './staticParticleInlineLoader';
import { ensureParticleBundleLocalFile } from './particleBundleFile';
import { cacheKeyToWebViewHash } from './particleWebViewHash';

export { cacheKeyToWebViewHash } from './particleWebViewHash';

export const PARTICLE_BUNDLE_STATIC_PATH = 'static/particle-bundle.html';

const isMiniHost = (): boolean => {
  const env = process.env.TARO_ENV;
  return env === 'tt' || env === 'weapp' || env === 'swan' || env === 'alipay';
};

const appendHash = (url: string, cacheKey: string): string => {
  const hash = cacheKeyToWebViewHash(cacheKey);
  if (!hash) return url;
  const base = url.split('#')[0];
  return `${base}#${hash}`;
};

export const buildPackagedParticleHttpUrl = (origin: string, cacheKey: string): string => {
  const root = origin.replace(/\/+$/, '');
  return appendHash(`${root}/${PARTICLE_BUNDLE_STATIC_PATH}`, cacheKey);
};

let h5BlobUrl: string | null = null;

const getH5BlobBundleUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  if (h5BlobUrl) return h5BlobUrl;
  const html = getStaticParticleInlineHtml('default');
  if (!html) return null;
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    h5BlobUrl = URL.createObjectURL(blob);
    return h5BlobUrl;
  } catch {
    return null;
  }
};

export type ParticleWebViewSrcMode = 'inline' | 'local-file' | 'https' | 'dev-http';

export interface ResolvedParticleWebViewSrc {
  src: string;
  mode: ParticleWebViewSrcMode;
}

/** H5 预览可同步解析（Blob / data URI），避免先请求 localhost */
export const resolveParticleWebViewSrcSync = (
  h5BaseUrl: string,
  cacheKey: string,
  isHttpsValid: (url: string) => boolean,
): ResolvedParticleWebViewSrc | null => {
  if (!hasStaticParticleInline()) return null;

  const base = (h5BaseUrl || '').trim();
  if (isHttpsValid(base)) {
    const httpsBase = normalizeH5BaseUrl(base);
    if (httpsBase) {
      return {
        src: appendHash(`${httpsBase}/${PARTICLE_BUNDLE_STATIC_PATH}`, cacheKey),
        mode: 'https',
      };
    }
  }

  if (process.env.TARO_ENV === 'h5') {
    const blob = getH5BlobBundleUrl();
    if (blob) return { src: appendHash(blob, cacheKey), mode: 'inline' };
  }

  return null;
};

/**
 * 解析 web-view 地址（仅 WebView，不用原生 Canvas）：
 * 1. 包内 gzip → H5 用 Blob URL；小程序写入 USER_DATA_PATH 本地路径
 * 2. 用户配置 HTTPS
 * 3. 开发兜底 localhost（需 h5:serve，仅当 1 失败时）
 */
export const resolveParticleWebViewSrc = async (
  h5BaseUrl: string,
  cacheKey: string,
  isHttpsValid: (url: string) => boolean,
): Promise<ResolvedParticleWebViewSrc | null> => {
  const sync = resolveParticleWebViewSrcSync(h5BaseUrl, cacheKey, isHttpsValid);
  if (sync) return sync;

  if (!hasStaticParticleInline()) return null;

  if (isMiniHost()) {
    const localPath = await ensureParticleBundleLocalFile();
    if (localPath) {
      return { src: appendHash(localPath, cacheKey), mode: 'local-file' };
    }
  }

  const base = (h5BaseUrl || '').trim();
  if (isHttpsValid(base)) {
    const httpsBase = normalizeH5BaseUrl(base);
    if (httpsBase) {
      return {
        src: appendHash(`${httpsBase}/${PARTICLE_BUNDLE_STATIC_PATH}`, cacheKey),
        mode: 'https',
      };
    }
  }

  return {
    src: buildPackagedParticleHttpUrl(DEV_H5_ORIGIN, cacheKey),
    mode: 'dev-http',
  };
};

export const getParticleWebViewHint = (cacheKey: string, mode: ParticleWebViewSrcMode | null): string => {
  const path = getStaticParticleHtmlPath(cacheKey);
  if (mode === 'https') return `线上 H5：${path}`;
  if (mode === 'inline') return '包内粒子云（H5 Blob 内联）';
  if (mode === 'local-file') return '包内粒子云（已写入本地缓存文件）';
  return `开发兜底：请先 npm run dev:tt 或 npm run h5:serve，路径 ${PARTICLE_BUNDLE_STATIC_PATH}`;
};
