export const COLOR_TAGS = ['#00B42A', '#00B8A9', '#4E5969', '#FF7D00', '#6D5DFE'] as const;

export type ColorTag = (typeof COLOR_TAGS)[number];

export interface DiaryEntry {
  id: string;
  content: string;
  color: ColorTag;
  createdAt: number;
}
