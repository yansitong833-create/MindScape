/**
 * 静态粒子云 HTML 清单（相对 H5 站点根路径）。
 * 由 scripts/import-data-single.mjs 根据 data-single 包更新，亦可手改。
 */
export const STATIC_PARTICLE_DEFAULT = 'static/particle-default.html';

/** 精确匹配手账 cacheKey（如 day:2026-05-31、month:2026-05） */
export const STATIC_PARTICLE_HTML: Record<string, string> = {
  default: STATIC_PARTICLE_DEFAULT,
  /** 月度粒子云：展示当月 1 日剪影（与 day:2026-05-01 一致） */
  'month:2026-05': 'static/particle-2026-05-01.html',
  'day:2026-05-01': 'static/particle-2026-05-01.html',
  'day:2026-05-02': 'static/particle-2026-05-02.html',
  'day:2026-05-03': 'static/particle-2026-05-03.html',
  'day:2026-05-04': 'static/particle-2026-05-04.html',
  'day:2026-05-05': 'static/particle-2026-05-05.html',
  'day:2026-05-06': 'static/particle-2026-05-06.html',
  'day:2026-05-07': 'static/particle-2026-05-07.html',
  'day:2026-05-08': 'static/particle-2026-05-08.html',
  'day:2026-05-09': 'static/particle-2026-05-09.html',
  'day:2026-05-10': 'static/particle-2026-05-10.html',
  'day:2026-05-11': 'static/particle-2026-05-11.html',
  'day:2026-05-12': 'static/particle-2026-05-12.html',
  'day:2026-05-13': 'static/particle-2026-05-13.html',
  'day:2026-05-14': 'static/particle-2026-05-14.html',
  'day:2026-05-15': 'static/particle-2026-05-15.html',
  'day:2026-05-16': 'static/particle-2026-05-16.html',
  'day:2026-05-17': 'static/particle-2026-05-17.html',
  'day:2026-05-18': 'static/particle-2026-05-18.html',
  'day:2026-05-19': 'static/particle-2026-05-19.html',
  'day:2026-05-20': 'static/particle-2026-05-20.html',
  'day:2026-05-21': 'static/particle-2026-05-21.html',
  'day:2026-05-22': 'static/particle-2026-05-22.html',
  'day:2026-05-23': 'static/particle-2026-05-23.html',
  'day:2026-05-24': 'static/particle-2026-05-24.html',
  'day:2026-05-25': 'static/particle-2026-05-25.html',
  'day:2026-05-26': 'static/particle-2026-05-26.html',
  'day:2026-05-27': 'static/particle-2026-05-27.html',
  'day:2026-05-28': 'static/particle-2026-05-28.html',
  'day:2026-05-29': 'static/particle-2026-05-29.html',
  'day:2026-05-30': 'static/particle-2026-05-30.html',
  'day:2026-05-31': 'static/particle-2026-05-31.html',
};

export const getStaticParticleHtmlPath = (cacheKey: string): string => {
  const key = (cacheKey || '').trim();
  if (key && STATIC_PARTICLE_HTML[key]) return STATIC_PARTICLE_HTML[key];
  return STATIC_PARTICLE_DEFAULT;
};
