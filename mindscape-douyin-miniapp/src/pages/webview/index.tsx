import React, { useEffect, useMemo, useState } from 'react';
import { View, WebView, Text, CoverView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import EmptyState from '@/components/EmptyState';
import PrimaryButton from '@/components/PrimaryButton';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { ParticleCloudPlugin } from '@/plugins/particle-cloud';
import { hasStaticParticleInline } from '@/plugins/particle-cloud/staticParticleInlineLoader';
import { canOpenParticleCloud, isParticleCloudDevMode } from '@/utils/particleCloudDev';
import { isParticleCloudUrlValid } from '@/utils/particleCloudWebUrl';

const WebviewPage: React.FC = () => {
  const { primary } = useApplyTheme();
  const router = useRouter();
  const fallbackUrl = useSettingsStore((s) => s.webUrl);
  const particleCloudReady = useMemo(
    () => canOpenParticleCloud(fallbackUrl, isParticleCloudUrlValid),
    [fallbackUrl],
  );

  const mode = useMemo(() => {
    const raw = router.params?.mode ? decodeURIComponent(router.params.mode) : '';
    return raw;
  }, [router.params]);

  const [particleCacheKey, setParticleCacheKey] = useState('default');

  const url = useMemo(() => {
    const raw = router.params?.url ? decodeURIComponent(router.params.url) : '';
    return raw || fallbackUrl;
  }, [fallbackUrl, router.params]);

  useEffect(() => {
    if (mode !== 'particleCloud') return;
    const cacheKeyFromUrl = router.params?.cacheKey
      ? decodeURIComponent(router.params.cacheKey)
      : 'default';
    setParticleCacheKey(cacheKeyFromUrl || 'default');
  }, [mode, router.params?.cacheKey]);

  const goConfig = () => {
    Taro.switchTab({ url: '/pages/mine/index' });
  };

  const goBack = () => {
    const pages = Taro.getCurrentPages();
    if (pages.length > 1) {
      Taro.navigateBack();
      return;
    }
    Taro.switchTab({ url: '/pages/diary/index' });
  };

  return (
    <View className={styles.container}>
      <View className={styles.topBar}>
        <Text className={styles.back} onClick={goBack}>
          ‹ 返回
        </Text>
        <Text className={styles.barTitle} style={{ color: primary }}>
          {mode === 'particleCloud' ? '粒子云' : '3D 心境'}
        </Text>
        <View className={styles.barRight}>
          <Text className={styles.exit} onClick={goBack}>
            退出
          </Text>
        </View>
      </View>

      {mode === 'particleCloud' ? (
        particleCloudReady ? (
          <View className={styles.particleArea}>
            <ParticleCloudPlugin cacheKey={particleCacheKey} onExit={goBack} />
          </View>
        ) : (
          <View className={styles.fallback}>
            <EmptyState
              title="无法打开粒子云"
              description={
                hasStaticParticleInline()
                  ? '静态 HTML 已打进包内，若仍失败请重新执行 npm run build:tt:local-demo。'
                  : isParticleCloudDevMode()
                    ? '请执行 npm run dev:tt:local-demo 或 h5:serve。'
                    : '请执行 npm run build:tt:local-demo 或配置 HTTPS。'
              }
            />
            <PrimaryButton onClick={goConfig}>去设置</PrimaryButton>
          </View>
        )
      ) : url ? (
        <WebView src={url} className={styles.webView}>
          <CoverView className={styles.coverExit} onClick={goBack}>
            <CoverView className={styles.coverExitInner}>退出</CoverView>
          </CoverView>
        </WebView>
      ) : (
        <View className={styles.fallback}>
          <EmptyState title="未配置地址" description="请先在「我的」页面设置 H5 地址，并在抖音后台配置业务域名。" />
          <PrimaryButton onClick={goConfig}>去设置</PrimaryButton>
        </View>
      )}
    </View>
  );
};

export default WebviewPage;
