import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DiaryEntry, Mood } from '@/types/diary';
import { taroPersistStorage } from '@/utils/persistStorage';
import { createId } from '@/utils/id';
import dayjs from 'dayjs';
import { generateSampleDiaryEntriesForMonth } from '@/data/sampleDiary';

const STORAGE_KEY = 'mindscape:diary';

export interface DiaryState {
  entries: DiaryEntry[];
  sampleMonth: string | null;
  addEntry: (payload: { content: string; mood: Mood }) => DiaryEntry;
  updateEntry: (payload: { id: string; content: string; mood: Mood }) => void;
  removeEntry: (id: string) => void;
  clearAll: () => void;
  getEntryById: (id: string) => DiaryEntry | undefined;
  ensureMonthSampleVisible: (monthCursor?: string) => void;
}

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set, get) => ({
      entries: [],
      sampleMonth: null,
      addEntry: ({ content, mood }) => {
        const entry: DiaryEntry = {
          id: createId(),
          content: content.trim(),
          mood,
          createdAt: Date.now(),
        };

        set((state) => ({ entries: [entry, ...state.entries], sampleMonth: state.sampleMonth }));
        return entry;
      },
      updateEntry: ({ id, content, mood }) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id
              ? {
                ...e,
                content: content.trim(),
                mood,
              }
              : e
          ),
          sampleMonth: state.sampleMonth,
        })),
      removeEntry: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
      clearAll: () => set({ entries: [], sampleMonth: null }),
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
    }),
    {
      name: STORAGE_KEY,
      storage: {
        getItem: (name) => taroPersistStorage.getItem(name),
        setItem: (name, value) => taroPersistStorage.setItem(name, value),
        removeItem: (name) => taroPersistStorage.removeItem(name),
      },
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<DiaryState> | undefined;
        return {
          entries: state?.entries ?? [],
          sampleMonth: (state as any)?.sampleMonth ?? null,
        } as unknown as DiaryState;
      },
    }
  )
);
