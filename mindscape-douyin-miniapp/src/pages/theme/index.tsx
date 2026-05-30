import React, { useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useSettingsStore } from '@/store/useSettingsStore';
import { THEME_OPTIONS, isDarkColor, mixHex } from '@/utils/theme';
import { useApplyTheme } from '@/hooks/useApplyTheme';

const ThemePage: React.FC = () => {
  useApplyTheme();

  const themePreset = useSettingsStore((s) => s.themePreset);
  const setThemePreset = useSettingsStore((s) => s.setThemePreset);

  const selectedLabel = useMemo(() => {
    const option = THEME_OPTIONS.find((o) => o.key === themePreset);
    return option?.label ?? '默认';
  }, [themePreset]);

  const select = (preset: typeof themePreset) => {
    setThemePreset(preset);
    Taro.showToast({ title: '已切换', icon: 'success' });
  };

  const goBack = () => {
    Taro.navigateBack();
  };

  return (
    <View className={styles.container}>
      <View className={styles.content}>
        <View className={styles.topBar}>
          <Text className={styles.back} onClick={goBack}>
            ‹ 返回
          </Text>
          <Text className={styles.barTitle}>主题色</Text>
          <View className={styles.barRight} />
        </View>

        <Text className={styles.title}>当前：{selectedLabel} · 未选为偏灰版本，选中为原色</Text>

        <View className={styles.grid}>
          {THEME_OPTIONS.map((option) => {
            const active = option.key === themePreset;
            const primary = option.colors.primary;
            const muted = mixHex(primary, '#F2F3F5', 0.78);
            const bg = active ? primary : muted;
            const textColor = active ? '#FFFFFF' : isDarkColor(muted) ? '#FFFFFF' : '#1D2129';
            return (
              <View
                key={option.key}
                className={classnames(styles.card, active && styles.cardActive)}
                style={{
                  background: bg,
                  color: textColor,
                  borderColor: active ? primary : undefined,
                }}
                onClick={() => select(option.key)}
              >
                <Text className={styles.label}>{option.label}</Text>
                <View className={styles.meta}>
                  <Text className={styles.color}>{primary}</Text>
                  <View className={styles.badge} style={{ borderColor: active ? 'rgba(255,255,255,0.65)' : primary, color: active ? '#FFFFFF' : primary }}>
                    <Text>{active ? '已选' : '选择'}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default ThemePage;
