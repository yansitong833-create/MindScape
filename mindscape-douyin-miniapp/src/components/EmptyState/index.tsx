import React, { useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getThemeColors } from '@/utils/theme';

export interface EmptyStateProps {
  title: string;
  description: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description }) => {
  const themePreset = useSettingsStore((s) => s.themePreset);
  const theme = useMemo(() => getThemeColors(themePreset), [themePreset]);
  return (
    <View className={styles.container}>
      <Text className={styles.title} style={{ color: theme.primary }}>{title}</Text>
      <Text className={styles.desc}>{description}</Text>
    </View>
  );
};

export default EmptyState;
