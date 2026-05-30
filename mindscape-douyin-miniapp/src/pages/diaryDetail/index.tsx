import React, { useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import EmptyState from '@/components/EmptyState';
import { useDiaryStore } from '@/store/useDiaryStore';

const DiaryDetailPage: React.FC = () => {
  const router = useRouter();
  const id = useMemo(() => (router.params?.id ? decodeURIComponent(router.params.id) : ''), [router.params]);

  const entry = useDiaryStore((s) => (id ? s.getEntryById(id) : undefined));
  const removeEntry = useDiaryStore((s) => s.removeEntry);

  const backToList = () => {
    Taro.navigateBack();
  };

  const confirmDelete = () => {
    if (!entry) return;
    Taro.showModal({
      title: '删除这条日记？',
      content: '删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (!res.confirm) return;
        removeEntry(entry.id);
        Taro.showToast({ title: '已删除', icon: 'success' });
        backToList();
      },
    });
  };

  return (
    <View className={styles.container}>
      <View className={styles.content}>
        {!entry ? (
          <EmptyState title="找不到这条日记" description="可能已经被删除，或链接参数无效。" />
        ) : (
          <Card title="">
            <View className={styles.metaRow}>
              <View className={styles.mood}>
                <Text>{entry.mood}</Text>
              </View>
              <Text className={styles.time}>{dayjs(entry.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
            </View>
            <Text className={styles.text}>{entry.content}</Text>
          </Card>
        )}

        <View className={styles.actions}>
          <PrimaryButton variant="secondary" onClick={backToList}>
            返回
          </PrimaryButton>
          <PrimaryButton disabled={!entry} onClick={confirmDelete}>
            删除
          </PrimaryButton>
        </View>
      </View>
    </View>
  );
};

export default DiaryDetailPage;
