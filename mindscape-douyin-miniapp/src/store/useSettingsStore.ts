import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { taroPersistStorage } from '@/utils/persistStorage';
import type { ThemePreset } from '@/utils/theme';
import { isPlaceholderH5Url } from '@/utils/particleCloudWebUrl';

const STORAGE_KEY = 'mindscape:settings';

export interface SettingsState {
  webUrl: string;
  setWebUrl: (url: string) => void;
  themePreset: ThemePreset;
  setThemePreset: (preset: ThemePreset) => void;
}

/** H5 站点根地址（https），粒子云页部署在其下的 particle-cloud/ */
const DEFAULT_WEB_URL = '';
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
      version: 3,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<SettingsState> | undefined;
        let webUrl = state?.webUrl ?? DEFAULT_WEB_URL;
        if (version < 3 && isPlaceholderH5Url(webUrl)) {
          webUrl = DEFAULT_WEB_URL;
        }
        return {
          webUrl,
          themePreset: state?.themePreset ?? DEFAULT_THEME_PRESET,
        } as unknown as SettingsState;
      },
    }
  )
);
