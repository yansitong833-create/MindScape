/**
 * 静态粒子云 HTML 清单（相对 H5 站点根路径）。
 * 新增页面：将导出的 HTML 放到 h5/static/，在此登记 cacheKey → 文件路径。
 */
export const STATIC_PARTICLE_DEFAULT = 'static/particle-default.html';

/** 精确匹配手账 cacheKey（如 day:2026-05-31、month:2026-05） */
export const STATIC_PARTICLE_HTML: Record<string, string> = {
  default: STATIC_PARTICLE_DEFAULT,
};

export const getStaticParticleHtmlPath = (cacheKey: string): string => {
  const key = (cacheKey || '').trim();
  if (key && STATIC_PARTICLE_HTML[key]) return STATIC_PARTICLE_HTML[key];
  return STATIC_PARTICLE_DEFAULT;
};
