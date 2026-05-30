import React, { useMemo } from 'react';
import { View, WebView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import EmptyState from '@/components/EmptyState';
import PrimaryButton from '@/components/PrimaryButton';
import { useSettingsStore } from '@/store/useSettingsStore';

const WebviewPage: React.FC = () => {
  const router = useRouter();
  const fallbackUrl = useSettingsStore((s) => s.webUrl);

  const url = useMemo(() => {
    const raw = router.params?.url ? decodeURIComponent(router.params.url) : '';
    return raw || fallbackUrl;
  }, [fallbackUrl, router.params]);

  const goConfig = () => {
    Taro.switchTab({ url: '/pages/mine/index' });
  };

  return (
    <View className={styles.container}>
      {url ? (
        <WebView src={url} />
      ) : (
        <View className={styles.fallback}>
          <EmptyState title="未配置地址" description="请先在“我的”页面设置 H5 地址，并在抖音后台配置业务域名。" />
          <PrimaryButton onClick={goConfig}>去配置</PrimaryButton>
        </View>
      )}
    </View>
  );
};

export default WebviewPage;
