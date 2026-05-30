import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ColorTag, DiaryEntry } from '@/types/diary';
import { taroPersistStorage } from '@/utils/persistStorage';
import { createId } from '@/utils/id';
import dayjs from 'dayjs';
import { generateSampleDiaryEntriesForMonth } from '@/data/sampleDiary';

const STORAGE_KEY = 'mindscape:diary';

export type CloudScope = 'day' | 'month';

export interface CloudPage {
  scope: CloudScope;
  date: string;
  emotionColor: ColorTag;
  text: string;
  imagePath?: string;
  updatedAt: number;
}

export interface DiaryState {
  entries: DiaryEntry[];
  sampleMonth: string | null;
  cloudPages: Record<string, CloudPage>;
  addEntry: (payload: { content: string; color: ColorTag }) => DiaryEntry;
  updateEntry: (payload: { id: string; content: string; color: ColorTag }) => void;
  removeEntry: (id: string) => void;
  clearAll: () => void;
  getEntryById: (id: string) => DiaryEntry | undefined;
  ensureMonthSampleVisible: (monthCursor?: string) => void;
  upsertCloudPage: (payload: Omit<CloudPage, 'updatedAt'> & { updatedAt?: number }) => void;
  getCloudPage: (payload: { scope: CloudScope; date: string }) => CloudPage | undefined;
}

const cloudKey = (scope: CloudScope, date: string) => `${scope}:${date}`;

const moodToColorTag = (mood: string): ColorTag => {
  if (mood === '开心') return '#00B42A';
  if (mood === '平静') return '#00B8A9';
  if (mood === '低落') return '#4E5969';
  if (mood === '焦虑') return '#FF7D00';
  return '#6D5DFE';
};

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set, get) => ({
      entries: [],
      sampleMonth: null,
      cloudPages: {},
      addEntry: ({ content, color }) => {
        const entry: DiaryEntry = {
          id: createId(),
          content: content.trim(),
          color,
          createdAt: Date.now(),
        };

        set((state) => ({ entries: [entry, ...state.entries], sampleMonth: state.sampleMonth }));
        return entry;
      },
      updateEntry: ({ id, content, color }) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id
              ? {
                ...e,
                content: content.trim(),
                color,
              }
              : e
          ),
          sampleMonth: state.sampleMonth,
        })),
      removeEntry: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
      clearAll: () => set({ entries: [], sampleMonth: null, cloudPages: {} }),
      getEntryById: (id) => get().entries.find((e) => e.id === id),
      ensureMonthSampleVisible: (monthCursor) => {
        const state = get();
        const cursor = monthCursor ?? dayjs().format('YYYY-MM');
        const monthStart = dayjs(`${cursor}-01`).startOf('month');
        const monthEnd = monthStart.endOf('month');
        const startMs = monthStart.startOf('day').valueOf();
        const endMs = monthEnd.endOf('day').valueOf();

        const hasSampleInMonth = state.entries.some(
          (e) => e.createdAt >= startMs && e.createdAt <= endMs && e.id.startsWith('sample-')
        );
        if (hasSampleInMonth) return;

        const filtered = state.entries.filter(
          (e) => !(e.createdAt >= startMs && e.createdAt <= endMs && e.id.startsWith('sample-'))
        );
        const sample = generateSampleDiaryEntriesForMonth(cursor);
        set({ entries: [...sample, ...filtered].sort((a, b) => b.createdAt - a.createdAt), sampleMonth: cursor });
      },
      upsertCloudPage: ({ scope, date, emotionColor, text, imagePath, updatedAt }) =>
        set((state) => ({
          cloudPages: {
            ...state.cloudPages,
            [cloudKey(scope, date)]: { scope, date, emotionColor, text, imagePath, updatedAt: updatedAt ?? Date.now() },
          },
          entries: state.entries,
          sampleMonth: state.sampleMonth,
        })),
      getCloudPage: ({ scope, date }) => get().cloudPages[cloudKey(scope, date)],
    }),
    {
      name: STORAGE_KEY,
      storage: {
        getItem: (name) => taroPersistStorage.getItem(name),
        setItem: (name, value) => taroPersistStorage.setItem(name, value),
        removeItem: (name) => taroPersistStorage.removeItem(name),
      },
      version: 4,
      migrate: (persistedState) => {
        const state = persistedState as Partial<DiaryState> | undefined;
        const rawEntries = (state?.entries ?? []) as Array<any>;
        const entries: DiaryEntry[] = rawEntries.map((e) => {
          const content = typeof e?.content === 'string' ? e.content : '';
          const createdAt = typeof e?.createdAt === 'number' ? e.createdAt : Date.now();
          const id = typeof e?.id === 'string' ? e.id : createId();

          const color =
            typeof e?.color === 'string'
              ? (e.color as ColorTag)
              : typeof e?.mood === 'string'
                ? moodToColorTag(e.mood)
                : '#00B8A9';

          return { id, content, createdAt, color };
        });

        const rawCloudPages = ((state as any)?.cloudPages ?? {}) as Record<string, any>;
        const cloudPages: Record<string, CloudPage> = {};
        Object.keys(rawCloudPages).forEach((k) => {
          const v = rawCloudPages[k];
          if (!v || typeof v !== 'object') return;
          if (typeof v.scope !== 'string' || typeof v.date !== 'string') return;
          const emotionColor = typeof v.emotionColor === 'string' ? (v.emotionColor as ColorTag) : '#00B8A9';
          const text = typeof v.text === 'string' ? v.text : '';
          const updatedAt = typeof v.updatedAt === 'number' ? v.updatedAt : Date.now();
          const imagePath = typeof v.imagePath === 'string' ? v.imagePath : undefined;
          cloudPages[k] = { scope: v.scope, date: v.date, emotionColor, text, updatedAt, imagePath };
        });

        return {
          entries,
          sampleMonth: (state as any)?.sampleMonth ?? null,
          cloudPages,
        } as unknown as DiaryState;
      },
    }
  )
);
