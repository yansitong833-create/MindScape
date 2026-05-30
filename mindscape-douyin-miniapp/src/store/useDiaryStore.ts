import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DiaryEntry, Mood } from '@/types/diary';
import { taroPersistStorage } from '@/utils/persistStorage';
import { createId } from '@/utils/id';

const STORAGE_KEY = 'mindscape:diary';

export interface DiaryState {
  entries: DiaryEntry[];
  addEntry: (payload: { content: string; mood: Mood }) => DiaryEntry;
  removeEntry: (id: string) => void;
  clearAll: () => void;
  getEntryById: (id: string) => DiaryEntry | undefined;
}

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: ({ content, mood }) => {
        const entry: DiaryEntry = {
          id: createId(),
          content: content.trim(),
          mood,
          createdAt: Date.now(),
        };

        set((state) => ({ entries: [entry, ...state.entries] }));
        return entry;
      },
      removeEntry: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
      clearAll: () => set({ entries: [] }),
      getEntryById: (id) => get().entries.find((e) => e.id === id),
    }),
    {
      name: STORAGE_KEY,
      storage: {
        getItem: (name) => taroPersistStorage.getItem(name),
        setItem: (name, value) => taroPersistStorage.setItem(name, value),
        removeItem: (name) => taroPersistStorage.removeItem(name),
      },
      version: 1,
    }
  )
);
