import React, { useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import EmptyState from '@/components/EmptyState';
import PrimaryButton from '@/components/PrimaryButton';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { ParticleCloudPlugin } from '@/plugins/particle-cloud';
import ParticleWebViewHost, { ParticleWebViewExitCover } from '@/plugins/particle-cloud/ParticleWebViewHost';
import { hasStaticParticlePack } from '@/plugins/particle-cloud/staticParticleData';
import { canOpenParticleCloud, isParticleCloudDevMode } from '@/utils/particleCloudDev';
import { isParticleCloudUrlValid } from '@/utils/particleCloudWebUrl';
import { pickRouteParam } from '@/utils/routeParams';

const WebviewPage: React.FC = () => {
  const { primary } = useApplyTheme();
  const fallbackUrl = useSettingsStore((s) => s.webUrl);
  const particleCloudReady = useMemo(
    () => canOpenParticleCloud(fallbackUrl, isParticleCloudUrlValid),
    [fallbackUrl],
  );

  const cacheKey = useMemo(() => pickRouteParam('cacheKey', ''), []);
  const mode = useMemo(() => {
    const raw = pickRouteParam('mode', '');
    if (raw === 'particleCloud') return 'particleCloud';
    if (cacheKey) return 'particleCloud';
    return raw;
  }, [cacheKey]);

  const particleCacheKey = cacheKey || 'default';

  const url = useMemo(() => {
    const raw = pickRouteParam('url', '');
    return raw || fallbackUrl;
  }, [fallbackUrl]);

  const goConfig = () => {
    Taro.switchTab({ url: '/pages/mine/index' });
  };

  const goBack = () => {
    const pages = Taro.getCurrentPages();
    if (pages.length > 1) {
      Taro.navigateBack();
      return;
    }
    Taro.switchTab({ url: '/pages/index/index' });
  };

  const isParticle = mode === 'particleCloud';

  return (
    <View className={styles.container}>
      <View className={styles.topBar}>
        <Text className={styles.back} onClick={goBack}>
          ‹ 返回
        </Text>
        <Text className={styles.barTitle} style={{ color: primary }}>
          {isParticle ? '粒子云' : '3D 心境'}
        </Text>
        <View className={styles.barRight}>
          <Text className={styles.exit} onClick={goBack}>
            退出
          </Text>
        </View>
      </View>

      {isParticle ? (
        particleCloudReady ? (
          <View className={styles.particleArea}>
            <ParticleCloudPlugin cacheKey={particleCacheKey} onExit={goBack} />
          </View>
        ) : (
          <View className={styles.fallback}>
            <EmptyState
              title="无法打开粒子云"
              description={
                hasStaticParticlePack()
                  ? '包内数据未加载，请执行 npm run particle:pack-static 后重新编译。'
                  : isParticleCloudDevMode()
                    ? '请执行 npm run dev:tt 或 npm run build:h5（含 pack-static）。'
                    : '请执行 npm run import:data-single 导入资源并打包。'
              }
            />
            <PrimaryButton onClick={goConfig}>去设置</PrimaryButton>
          </View>
        )
      ) : url ? (
        <View className={styles.particleArea}>
          <ParticleWebViewHost src={url} coverExit={<ParticleWebViewExitCover onExit={goBack} />} />
        </View>
      ) : (
        <View className={styles.fallback}>
          <EmptyState title="未配置地址" description="请先在「我的」页面设置 H5 地址。" />
          <PrimaryButton onClick={goConfig}>去设置</PrimaryButton>
        </View>
      )}
    </View>
  );
};

export default WebviewPage;
