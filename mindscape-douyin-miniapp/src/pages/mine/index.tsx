import React, { useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import { useDiaryStore } from '@/store/useDiaryStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { THEME_OPTIONS } from '@/utils/theme';

const SettingsPage: React.FC = () => {
  useApplyTheme();

  const themePreset = useSettingsStore((s) => s.themePreset);

  const entryCount = useDiaryStore((s) => s.entries.length);
  const clearAll = useDiaryStore((s) => s.clearAll);

  const confirmClear = () => {
    if (entryCount === 0) {
      Taro.showToast({ title: '暂无数据', icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '清空本机日记？',
      content: `将删除本机保存的 ${entryCount} 条日记，且无法恢复。`,
      confirmText: '清空',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (!res.confirm) return;
        clearAll();
        Taro.showToast({ title: '已清空', icon: 'success' });
      },
    });
  };

  const themeLabel = useMemo(() => {
    const option = THEME_OPTIONS.find((o) => o.key === themePreset);
    return option?.label ?? '默认';
  }, [themePreset]);

  const openThemePicker = () => {
    Taro.navigateTo({ url: '/pages/theme/index' });
  };

  return (
    <View className={styles.container}>
      <View className={styles.content}>
        <Text className={styles.sectionTitle}>主题色</Text>

        <View className={styles.list}>
          <View className={styles.item} onClick={openThemePicker}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemTitle}>主题色</Text>
              <Text className={styles.itemDesc}>切换按钮与标签的强调色</Text>
            </View>
            <View className={styles.itemRight}>
              <Text>{themeLabel}</Text>
              <Text className={styles.chevron}>›</Text>
            </View>
          </View>
        </View>

        <Text className={styles.sectionTitle}>数据</Text>
        <Card title="本机日记" subtitle={`当前保存 ${entryCount} 条`} headerRight={null}>
          <PrimaryButton variant="secondary" onClick={confirmClear}>
            清空本机日记
          </PrimaryButton>
        </Card>

        <Text className={styles.sectionTitle}>说明</Text>
        <Card title="关于数据" subtitle="日记保存在本机，不会自动上传。">
          <Text className={styles.hint}>
            你可以在“查阅”页按月份查看日历分布，也可以在“日记”页新增、编辑、删除条目。
          </Text>
        </Card>
      </View>
    </View>
  );
};

export default SettingsPage;
