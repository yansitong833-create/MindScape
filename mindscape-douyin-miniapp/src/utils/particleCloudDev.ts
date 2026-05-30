import { hasStaticParticleInline } from '@/plugins/particle-cloud/staticParticleInlineLoader';
import { isParticleCloudUrlValid } from './particleCloudWebUrl';

/** 本地静态服务根（npm run h5:serve），可选 */
export const DEV_H5_ORIGIN =
  (typeof process !== 'undefined' &&
    process.env &&
    (process.env.TARO_APP_PC_DEV_ORIGIN || process.env.PARTICLE_CLOUD_DEV_ORIGIN)) ||
  'http://127.0.0.1:5173';

export const isParticleCloudDevMode = (): boolean => {
  try {
    const env = typeof process !== 'undefined' ? process.env : undefined;
    if (env?.PARTICLE_CLOUD_DEV_MODE === 'true') return true;
    if (env?.NODE_ENV === 'development') return true;
  } catch {
    /* ignore */
  }
  return false;
};

/** 包内已 pack-static、或 HTTPS、或开发态本地 http */
export const canOpenParticleCloud = (h5BaseUrl: string, isHttpsValid: (url: string) => boolean): boolean =>
  hasStaticParticleInline() || isHttpsValid(h5BaseUrl) || isParticleCloudDevMode();
