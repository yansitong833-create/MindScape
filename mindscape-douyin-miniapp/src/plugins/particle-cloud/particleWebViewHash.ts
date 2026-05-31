/**
 * 将手账 cacheKey 转为粒子 bundle 的 location.hash。
 * 月度视图使用该月 1 日剪影（如 month:2026-05 → 2026-05-01），不再打开日期索引页。
 */
export const cacheKeyToWebViewHash = (cacheKey: string): string => {
  const key = (cacheKey || '').trim();
  if (!key || key === 'default') return '';
  if (key.startsWith('month:')) {
    const ym = key.slice(6);
    if (/^\d{4}-\d{2}$/.test(ym)) return `${ym}-01`;
    return '__month__';
  }
  if (key.startsWith('day:')) return key.slice(4);
  return key;
};
