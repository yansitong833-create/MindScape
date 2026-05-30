export interface DiaryEntry {
  id: string;
  content: string;
  /** 记录用颜色标签（#RRGGBB），手账仅作淡色背景，不展示文字 */
  color: string;
  createdAt: number;
}
