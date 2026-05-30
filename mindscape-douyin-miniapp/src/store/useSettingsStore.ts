import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { taroPersistStorage } from '@/utils/persistStorage';
import type { ThemePreset } from '@/utils/theme';

const STORAGE_KEY = 'mindscape:settings';

export interface SettingsState {
  webUrl: string;
  setWebUrl: (url: string) => void;
  textAnalysisOpenAIConfigJson: string;
  setTextAnalysisOpenAIConfigJson: (json: string) => void;
  textAnalysisDefaultApiKey: string;
  setTextAnalysisDefaultApiKey: (key: string) => void;
  imageGenerationOpenAIConfigJson: string;
  setImageGenerationOpenAIConfigJson: (json: string) => void;
  themePreset: ThemePreset;
  setThemePreset: (preset: ThemePreset) => void;
}

const DEFAULT_WEB_URL = 'https://example.com/mindscape';
const DEFAULT_TEXT_ANALYSIS_OPENAI_CONFIG_JSON = '';
const DEFAULT_TEXT_ANALYSIS_DEFAULT_API_KEY = '';
const DEFAULT_IMAGE_GENERATION_OPENAI_CONFIG_JSON = '';
const DEFAULT_THEME_PRESET: ThemePreset = 'blue';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      webUrl: DEFAULT_WEB_URL,
      setWebUrl: (url) => set({ webUrl: url.trim() || DEFAULT_WEB_URL }),
      textAnalysisOpenAIConfigJson: DEFAULT_TEXT_ANALYSIS_OPENAI_CONFIG_JSON,
      setTextAnalysisOpenAIConfigJson: (json) =>
        set({ textAnalysisOpenAIConfigJson: json.trim() || DEFAULT_TEXT_ANALYSIS_OPENAI_CONFIG_JSON }),
      textAnalysisDefaultApiKey: DEFAULT_TEXT_ANALYSIS_DEFAULT_API_KEY,
      setTextAnalysisDefaultApiKey: (key) =>
        set({ textAnalysisDefaultApiKey: key.trim() || DEFAULT_TEXT_ANALYSIS_DEFAULT_API_KEY }),
      imageGenerationOpenAIConfigJson: DEFAULT_IMAGE_GENERATION_OPENAI_CONFIG_JSON,
      setImageGenerationOpenAIConfigJson: (json) =>
        set({ imageGenerationOpenAIConfigJson: json.trim() || DEFAULT_IMAGE_GENERATION_OPENAI_CONFIG_JSON }),
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
      version: 4,
      migrate: (persistedState) => {
        const state = persistedState as Partial<SettingsState> | undefined;
        const raw = state as any;

        const legacyTextUrl = typeof raw?.textAnalysisModelUrl === 'string' ? raw.textAnalysisModelUrl.trim() : '';
        const legacyImageUrl = typeof raw?.imageGenerationModelUrl === 'string' ? raw.imageGenerationModelUrl.trim() : '';

        const baseTextConfig =
          typeof raw?.textAnalysisOpenAIConfigJson === 'string' ? raw.textAnalysisOpenAIConfigJson : '';
        const baseImageConfig =
          typeof raw?.imageGenerationOpenAIConfigJson === 'string' ? raw.imageGenerationOpenAIConfigJson : '';

        const migratedTextConfig =
          baseTextConfig ||
          (legacyTextUrl
            ? JSON.stringify(
              {
                url: legacyTextUrl,
                body: {
                  model: 'gpt-5',
                  messages: [{ role: 'user', content: '{{PROMPT}}' }],
                },
              },
              null,
              2
            )
            : DEFAULT_TEXT_ANALYSIS_OPENAI_CONFIG_JSON);

        const migratedImageConfig =
          baseImageConfig ||
          (legacyImageUrl
            ? JSON.stringify(
              {
                url: legacyImageUrl,
                body: {
                  model: 'gpt-5',
                  messages: [{ role: 'user', content: '{{PROMPT}}' }],
                },
              },
              null,
              2
            )
            : DEFAULT_IMAGE_GENERATION_OPENAI_CONFIG_JSON);

        return {
          webUrl: state?.webUrl ?? DEFAULT_WEB_URL,
          textAnalysisOpenAIConfigJson: migratedTextConfig,
          textAnalysisDefaultApiKey: raw?.textAnalysisDefaultApiKey ?? DEFAULT_TEXT_ANALYSIS_DEFAULT_API_KEY,
          imageGenerationOpenAIConfigJson: migratedImageConfig,
          themePreset: state?.themePreset ?? DEFAULT_THEME_PRESET,
        } as unknown as SettingsState;
      },
    }
  )
);
