import Taro, { useDidShow } from '@tarojs/taro';
import { useMemo } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getThemeColors } from '@/utils/theme';

export const useApplyTheme = (): { primary: string; primaryLight: string } => {
  const themePreset = useSettingsStore((s) => s.themePreset);

  const theme = useMemo(() => getThemeColors(themePreset), [themePreset]);

  useDidShow(() => {
    try {
      Taro.setTabBarStyle({ selectedColor: theme.primary });
    } catch (err) {
      console.error('[Theme] setTabBarStyle failed', err);
    }
  });

  return { primary: theme.primary, primaryLight: theme.primaryLight };
};
