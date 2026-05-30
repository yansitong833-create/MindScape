/** 相对业务域名根路径部署的粒子云页面（见 h5/particle-cloud/） */
export const PARTICLE_CLOUD_H5_PATH = 'particle-cloud/index.html';

export interface ParticleCloudUrlPayload {
  cacheKey: string;
  text: string;
}

const trimSlash = (s: string) => s.replace(/\/+$/, '');

/** 文档示例域名，勿当作真实 H5 站点 */
const PLACEHOLDER_HOSTS = new Set(['example.com', 'www.example.com', 'example.org', 'www.example.org']);

export const isPlaceholderH5Url = (raw: string): boolean => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return false;
  try {
    return PLACEHOLDER_HOSTS.has(new URL(trimmed).hostname.toLowerCase());
  } catch {
    return false;
  }
};

export const normalizeH5BaseUrl = (raw: string): string | null => {
  const trimmed = (raw || '').trim();
  if (!trimmed || isPlaceholderH5Url(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return null;
    return trimSlash(url.origin + url.pathname);
  } catch {
    return null;
  }
};

export const buildParticleCloudPageUrl = (
  h5BaseUrl: string,
  payload: ParticleCloudUrlPayload,
): string | null => {
  const base = normalizeH5BaseUrl(h5BaseUrl);
  if (!base) return null;

  const page = new URL(`${base}/${PARTICLE_CLOUD_H5_PATH}`);
  page.searchParams.set('cacheKey', payload.cacheKey || 'unknown');
  page.searchParams.set('text', payload.text || '');
  return page.toString();
};

export const isParticleCloudUrlValid = (h5BaseUrl: string): boolean => normalizeH5BaseUrl(h5BaseUrl) !== null;
