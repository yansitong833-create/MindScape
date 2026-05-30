import React, { useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import PrimaryButton from '@/components/PrimaryButton';
import { useDiaryStore } from '@/store/useDiaryStore';
import { useApplyTheme } from '@/hooks/useApplyTheme';

type ScopeParam = 'day' | 'month';

const CloudPage: React.FC = () => {
  const { primary } = useApplyTheme();
  const router = useRouter();

  const scope = useMemo<ScopeParam>(() => {
    const raw = router.params?.scope ? decodeURIComponent(router.params.scope) : '';
    return raw === 'month' ? 'month' : 'day';
  }, [router.params]);

  const date = useMemo(() => {
    const raw = router.params?.date ? decodeURIComponent(router.params.date) : '';
    if (raw) return raw;
    return scope === 'month' ? dayjs().format('YYYY-MM') : dayjs().format('YYYY-MM-DD');
  }, [router.params, scope]);

  const cloud = useDiaryStore((s) => s.getCloudPage({ scope, date }));

  const goBack = () => {
    Taro.navigateBack();
  };

  const title = useMemo(() => {
    if (scope === 'month') return `${dayjs(`${date}-01`).format('YYYY年M月')} 插图`;
    return `${dayjs(date).format('M月D日')} 插图`;
  }, [date, scope]);

  return (
    <View className={styles.container}>
      <View className={styles.content}>
        <View className={styles.topBar}>
          <Text className={styles.back} onClick={goBack}>
            ‹ 返回
          </Text>
          <Text className={styles.barTitle} style={{ color: primary }}>
            插图
          </Text>
          <View className={styles.barRight} />
        </View>

        {!cloud ? (
          <EmptyState title="还未生成" description="返回手账页，点击“生成插图”即可生成。" />
        ) : (
          <Card title={title} subtitle={`更新时间：${dayjs(cloud.updatedAt).format('YYYY-MM-DD HH:mm')}`}>
            <View className={styles.metaRow}>
              <View className={styles.metaLeft}>
                <View className={styles.colorBadge} style={{ background: cloud.emotionColor }}>
                  <Text className={styles.colorText}>{cloud.emotionColor}</Text>
                </View>
              </View>
              <Text className={styles.metaRight}>{scope === 'month' ? '月汇总' : '日汇总'}</Text>
            </View>
            <Text className={styles.text}>{cloud.text}</Text>
          </Card>
        )}

        <View className={styles.actions}>
          <PrimaryButton variant="secondary" onClick={goBack}>
            返回
          </PrimaryButton>
        </View>
      </View>
    </View>
  );
};

export default CloudPage;

