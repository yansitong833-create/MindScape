export type Mood = '低落' | '平静' | '开心' | '焦虑' | '疲惫';

export interface DiaryEntry {
  id: string;
  content: string;
  mood: Mood;
  createdAt: number;
}
