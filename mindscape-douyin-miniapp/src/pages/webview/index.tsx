import React, { useMemo } from 'react';
import { View, WebView, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import EmptyState from '@/components/EmptyState';
import PrimaryButton from '@/components/PrimaryButton';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useApplyTheme } from '@/hooks/useApplyTheme';

const WebviewPage: React.FC = () => {
  const { primary } = useApplyTheme();

  const router = useRouter();
  const fallbackUrl = useSettingsStore((s) => s.webUrl);

  const url = useMemo(() => {
    const raw = router.params?.url ? decodeURIComponent(router.params.url) : '';
    return raw || fallbackUrl;
  }, [fallbackUrl, router.params]);

  const goConfig = () => {
    Taro.switchTab({ url: '/pages/mine/index' });
  };

  const goBack = () => {
    Taro.navigateBack();
  };

  return (
    <View className={styles.container}>
      <View className={styles.topBar}>
        <Text className={styles.back} onClick={goBack}>
          ‹ 返回
        </Text>
        <Text className={styles.barTitle} style={{ color: primary }}>3D 心境</Text>
        <View className={styles.barRight} />
      </View>
      {url ? (
        <WebView src={url} className={styles.webView} />
      ) : (
        <View className={styles.fallback}>
          <EmptyState title="未配置地址" description="请先在“设置”页面设置 H5 地址，并在抖音后台配置业务域名。" />
          <PrimaryButton onClick={goConfig}>去设置</PrimaryButton>
        </View>
      )}
    </View>
  );
};

export default WebviewPage;
