import { isParticleCloudUrlValid } from '@/utils/particleCloudWebUrl';
import { resolveStaticParticleWebViewSrc } from '@/utils/staticParticleWebUrl';

export const resolvePluginWebViewSrc = (h5Base: string, cacheKey: string) =>
  resolveStaticParticleWebViewSrc(h5Base, cacheKey, isParticleCloudUrlValid);
