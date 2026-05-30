import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { taroPersistStorage } from '@/utils/persistStorage';

const STORAGE_KEY = 'mindscape:settings';

export interface SettingsState {
  webUrl: string;
  setWebUrl: (url: string) => void;
}

const DEFAULT_WEB_URL = 'https://example.com/mindscape';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      webUrl: DEFAULT_WEB_URL,
      setWebUrl: (url) => set({ webUrl: url.trim() || DEFAULT_WEB_URL }),
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
