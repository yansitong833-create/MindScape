/** 包内粒子云 gzip bundle 是否已 pack */
export {
  hasStaticParticleInline as hasStaticParticlePack,
  getStaticParticleInlineHtml,
  buildStaticParticleInlineDataUri,
} from './staticParticleInlineLoader';

/** WebView 加载的 bundle 路径（相对 H5 站点根） */
export const PARTICLE_BUNDLE_STATIC_PATH = 'static/particle-bundle.html';
