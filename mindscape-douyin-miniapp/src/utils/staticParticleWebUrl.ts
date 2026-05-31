import { isParticleCloudUrlValid } from '@/utils/particleCloudWebUrl';
import {
  resolveParticleWebViewSrc,
  type ParticleWebViewSrcMode,
  type ResolvedParticleWebViewSrc,
} from '@/plugins/particle-cloud/particleWebViewSrc';

export type StaticParticleSrcMode = ParticleWebViewSrcMode;

export type ResolvedStaticParticleSrc = ResolvedParticleWebViewSrc;

/** @deprecated 使用 resolveParticleWebViewSrc */
export const resolveStaticParticleWebViewSrc = (
  h5BaseUrl: string,
  cacheKey: string,
  isHttpsValid: (url: string) => boolean,
): ResolvedStaticParticleSrc | null => {
  void h5BaseUrl;
  void cacheKey;
  void isHttpsValid;
  return null;
};

export const resolveStaticParticleWebViewSrcAsync = (
  h5BaseUrl: string,
  cacheKey: string,
): Promise<ResolvedStaticParticleSrc | null> =>
  resolveParticleWebViewSrc(h5BaseUrl, cacheKey, isParticleCloudUrlValid);
