/** 将 #RRGGBB 转为带透明度的 rgba，用于日记卡片淡色背景 */
export const hexToRgba = (hex: string, alpha: number): string => {
  const raw = (hex || '').replace('#', '').trim();
  const s =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw.length >= 6
        ? raw.slice(0, 6)
        : '6D5DFE';

  const r = Number.parseInt(s.slice(0, 2), 16);
  const g = Number.parseInt(s.slice(2, 4), 16);
  const b = Number.parseInt(s.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(109, 93, 254, ${a})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
