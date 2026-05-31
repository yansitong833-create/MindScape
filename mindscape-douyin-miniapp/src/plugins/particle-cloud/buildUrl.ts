import { resolveParticleWebViewSrc } from './particleWebViewSrc';
import { isParticleCloudUrlValid } from '@/utils/particleCloudWebUrl';

export const resolvePluginWebViewSrc = (h5Base: string, cacheKey: string) =>
  resolveParticleWebViewSrc(h5Base, cacheKey, isParticleCloudUrlValid);
