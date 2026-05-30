import React, { useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import Scrapbook from '@/components/Scrapbook';
import { useDiaryStore } from '@/store/useDiaryStore';
import { useApplyTheme } from '@/hooks/useApplyTheme';

type ScopeParam = 'day' | 'month';

const ScrapbookPage: React.FC = () => {
  const { primary } = useApplyTheme();
  const router = useRouter();

  const scope = useMemo<ScopeParam>(() => {
    const s = router.params?.scope as ScopeParam | undefined;
    return s === 'month' ? 'month' : 'day';
  }, [router.params]);

  const readonly = useMemo(() => {
    const raw = router.params?.readonly ? decodeURIComponent(router.params.readonly) : '';
    return raw === '1' || raw === 'true';
  }, [router.params]);

  const now = useMemo(() => dayjs(), []);

  const date = useMemo(() => {
    if (scope === 'month') {
      const raw = router.params?.month ? decodeURIComponent(router.params.month) : '';
      return raw || now.format('YYYY-MM');
    }
    const raw = router.params?.date ? decodeURIComponent(router.params.date) : '';
    return raw || now.format('YYYY-MM-DD');
  }, [now, router.params, scope]);

  const entries = useDiaryStore((s) => s.entries);
  const removeEntry = useDiaryStore((s) => s.removeEntry);

  const scopedEntries = useMemo(() => {
    if (scope === 'month') {
      const monthStart = dayjs(`${date}-01`).startOf('month');
      const monthEnd = monthStart.endOf('month');
      const startMs = monthStart.startOf('day').valueOf();
      const endMs = monthEnd.endOf('day').valueOf();
      return entries.filter((e) => e.createdAt >= startMs && e.createdAt <= endMs);
    }

    const startMs = dayjs(date).startOf('day').valueOf();
    const endMs = dayjs(date).endOf('day').valueOf();
    return entries.filter((e) => e.createdAt >= startMs && e.createdAt <= endMs);
  }, [date, entries, scope]);

  const goBack = () => {
    Taro.navigateBack();
  };

  const edit = (id: string) => {
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

  const createNew = () => {
    Taro.navigateTo({ url: '/pages/diaryEdit/index' });
  };

  return (
    <View className={styles.container}>
      <View className={styles.topBar}>
        <Text className={styles.back} onClick={goBack}>
          ‹ 返回
        </Text>
        <Text className={styles.barTitle} style={{ color: primary }}>手账</Text>
        <View className={styles.barRight} />
      </View>

      <View className={styles.body}>
        <Scrapbook
          scope={scope}
          date={date}
          entries={scopedEntries}
          allowEdit={scope === 'day' && !readonly}
          allowDelete={scope === 'day' && !readonly}
          onEdit={edit}
          onDelete={confirmDelete}
        />
      </View>

      {scope === 'day' && !readonly ? (
        <View className={styles.fab} style={{ background: primary }} onClick={createNew}>
          <Text className={styles.fabIcon}>✎</Text>
        </View>
      ) : null}
    </View>
  );
};

export default ScrapbookPage;
