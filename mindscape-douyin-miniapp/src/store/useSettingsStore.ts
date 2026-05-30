import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { taroPersistStorage } from '@/utils/persistStorage';
import type { ThemePreset } from '@/utils/theme';

const STORAGE_KEY = 'mindscape:settings';

export interface SettingsState {
  webUrl: string;
  setWebUrl: (url: string) => void;
  themePreset: ThemePreset;
  setThemePreset: (preset: ThemePreset) => void;
}

const DEFAULT_WEB_URL = 'https://example.com/mindscape';
const DEFAULT_THEME_PRESET: ThemePreset = 'blue';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      webUrl: DEFAULT_WEB_URL,
      setWebUrl: (url) => set({ webUrl: url.trim() || DEFAULT_WEB_URL }),
      themePreset: DEFAULT_THEME_PRESET,
      setThemePreset: (preset) => set({ themePreset: preset }),
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
        const state = persistedState as Partial<SettingsState> | undefined;
        return {
          webUrl: state?.webUrl ?? DEFAULT_WEB_URL,
          themePreset: state?.themePreset ?? DEFAULT_THEME_PRESET,
        } as unknown as SettingsState;
      },
    }
  )
);
