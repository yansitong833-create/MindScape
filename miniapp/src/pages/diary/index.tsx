import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import Scrapbook from '@/components/Scrapbook';
import { useDiaryStore } from '@/store/useDiaryStore';
import { useApplyTheme } from '@/hooks/useApplyTheme';

const DiaryPage: React.FC = () => {
  const entries = useDiaryStore((s) => s.entries);
  const removeEntry = useDiaryStore((s) => s.removeEntry);

  const { primary } = useApplyTheme();

  const today = dayjs().format('YYYY-MM-DD');
  const todayStart = dayjs(today).startOf('day').valueOf();
  const todayEnd = dayjs(today).endOf('day').valueOf();
  const todayEntries = entries
    .filter((e) => e.createdAt >= todayStart && e.createdAt <= todayEnd)
    .sort((a, b) => b.createdAt - a.createdAt);

  const createNew = () => {
    Taro.navigateTo({ url: '/pages/diaryEdit/index' });
  };

  const editEntry = (id: string) => Taro.navigateTo({ url: `/pages/diaryEdit/index?id=${encodeURIComponent(id)}` });

  const confirmDelete = (id: string) => {
    Taro.showModal({
      title: '删除这条日记？',
      content: '删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (!res.confirm) return;
        removeEntry(id);
        Taro.showToast({ title: '已删除', icon: 'success' });
      },
    });
  };

  return (
    <View className={styles.container}>
      <View className={styles.body}>
        <Scrapbook
          scope="day"
          date={today}
          entries={todayEntries}
          allowEdit
          allowDelete
          onEdit={editEntry}
          onDelete={confirmDelete}
        />
      </View>

      <View className={styles.fab} style={{ background: primary }} onClick={createNew}>
        <Text className={styles.fabIcon}>✎</Text>
      </View>
    </View>
  );
};

export default DiaryPage;
