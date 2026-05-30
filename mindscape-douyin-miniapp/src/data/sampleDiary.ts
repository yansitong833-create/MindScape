import dayjs from 'dayjs';
import type { DiaryEntry } from '@/types/diary';
import { DIARY_COLOR_OPTIONS } from '@/constants/diaryColors';

const CONTENTS = [
  '今天的节奏刚刚好，做了重要的事。',
  '有点忙，但我把事情一件件理顺了。',
  '情绪有些低，允许自己慢一点。',
  '焦虑冒出来了，我先做一个小步骤。',
  '有点疲惫，决定早点睡。',
  '遇到一件小开心，心里亮了一下。',
  '平静的一天，适合整理与复盘。',
  '有些卡顿，但我没有放弃。',
  '想法很多，先写下来再决定。',
  '今天更想好好照顾自己。',
];

const createSampleId = (date: string, index: number): string => {
  return `sample-${date}-${index}`;
};

export const generateSampleDiaryEntriesForMonth = (monthCursor: string): DiaryEntry[] => {
  const monthStart = dayjs(`${monthCursor}-01`).startOf('month');
  const daysInMonth = monthStart.daysInMonth();

  const list: DiaryEntry[] = [];

  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = monthStart.date(d);
    const weekday = date.day();
    const baseColor = DIARY_COLOR_OPTIONS[(d + weekday) % DIARY_COLOR_OPTIONS.length];

    const contentA = `${date.format('M月D日')}：${CONTENTS[(d * 3) % CONTENTS.length]}`;
    list.push({
      id: createSampleId(date.format('YYYY-MM-DD'), 1),
      content: contentA,
      color: baseColor,
      createdAt: date.hour(12).minute(10).second(0).millisecond(0).valueOf(),
    });

    const extra = d % 6 === 0 || (weekday === 0 && d % 2 === 0);
    if (extra) {
      const colorB = DIARY_COLOR_OPTIONS[(d + 2) % DIARY_COLOR_OPTIONS.length];
      const contentB = `${CONTENTS[(d * 5 + 1) % CONTENTS.length]}（补充）`;
      list.push({
        id: createSampleId(date.format('YYYY-MM-DD'), 2),
        content: contentB,
        color: colorB,
        createdAt: date.hour(20).minute(30).valueOf(),
      });
    }
  }

  return list.sort((a, b) => b.createdAt - a.createdAt);
};
