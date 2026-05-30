/** 日记可选颜色（仅作记录，界面不展示文字标签） */
export const DIARY_COLOR_OPTIONS = [
  '#6D5DFE',
  '#00B8A9',
  '#00B42A',
  '#FF7D00',
  '#F53F3F',
  '#4E5969',
  '#C9A227',
  '#E08F81',
] as const;

export type DiaryColor = (typeof DIARY_COLOR_OPTIONS)[number];

export const DEFAULT_DIARY_COLOR: DiaryColor = DIARY_COLOR_OPTIONS[0];

/** 旧版情绪 → 颜色，用于数据迁移 */
export const LEGACY_MOOD_TO_COLOR: Record<string, string> = {
  开心: '#00B42A',
  平静: '#00B8A9',
  低落: '#4E5969',
  焦虑: '#FF7D00',
  疲惫: '#6D5DFE',
};

export const normalizeDiaryColor = (raw?: string): string => {
  const v = (raw || '').trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v;
  if (v && LEGACY_MOOD_TO_COLOR[v]) return LEGACY_MOOD_TO_COLOR[v];
  return DEFAULT_DIARY_COLOR;
};
