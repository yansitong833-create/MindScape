import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import { useDiaryStore } from '@/store/useDiaryStore';
import { useApplyTheme } from '@/hooks/useApplyTheme';

const DiaryPage: React.FC = () => {
  const entries = useDiaryStore((s) => s.entries);
  const removeEntry = useDiaryStore((s) => s.removeEntry);

  const { primary } = useApplyTheme();

  const todayStart = dayjs().startOf('day').valueOf();
  const todayEnd = dayjs().endOf('day').valueOf();
  const todayEntries = entries
    .filter((e) => e.createdAt >= todayStart && e.createdAt <= todayEnd)
    .sort((a, b) => b.createdAt - a.createdAt);

  const createNew = () => {
    Taro.navigateTo({ url: '/pages/diaryEdit/index' });
  };

  const editEntry = (id: string) => {
    Taro.navigateTo({ url: `/pages/diaryEdit/index?id=${encodeURIComponent(id)}` });
  };

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
      <View className={styles.listArea}>
        {todayEntries.length === 0 ? (
          <EmptyState title="今天还没有记录" description="点击右下角按钮新增一条日记。" />
        ) : (
          <View className={styles.list}>
            {todayEntries.map((entry) => (
              <Card key={entry.id} className={styles.entryCard} title="">
                <View className={styles.cardTop}>
                  <View className={styles.metaLeft}>
                    <View className={styles.mood} style={{ background: primary }}>
                      <Text>{entry.mood}</Text>
                    </View>
                    <Text className={styles.time}>{dayjs(entry.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
                  </View>

                  <View className={styles.actions}>
                    <Button
                      className={styles.actionBtn}
                      style={{ borderColor: primary, color: primary }}
                      onClick={() => editEntry(entry.id)}
                    >
                      编辑
                    </Button>
                    <Button
                      className={styles.actionBtn}
                      style={{ borderColor: '#F53F3F', color: '#F53F3F' }}
                      onClick={() => confirmDelete(entry.id)}
                    >
                      删除
                    </Button>
                  </View>
                </View>

                <Text className={styles.contentText}>{entry.content}</Text>
              </Card>
            ))}
          </View>
        )}
      </View>

      <View className={styles.fab} style={{ background: primary }} onClick={createNew}>
        <Text className={styles.fabIcon}>✎</Text>
      </View>
    </View>
  );
};

export default DiaryPage;
