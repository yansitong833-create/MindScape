import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classNames from 'classnames';
import { useSettingsStore } from '@/store/useSettingsStore';
import { hasStaticParticlePack } from '@/plugins/particle-cloud/staticParticleData';
import { canOpenParticleCloud } from '@/utils/particleCloudDev';
import { isParticleCloudUrlValid } from '@/utils/particleCloudWebUrl';
import {
  getParticleWebViewHint,
  resolveParticleWebViewSrc,
  resolveParticleWebViewSrcSync,
  type ResolvedParticleWebViewSrc,
} from './particleWebViewSrc';
import ParticleWebViewHost, { ParticleWebViewExitCover } from './ParticleWebViewHost';
import type { ParticleCloudPluginProps } from './types';
import styles from './ParticleCloudView.module.scss';

/** 粒子云仅通过 WebView / H5 iframe 展示（Three.js），不走原生 Canvas */
const ParticleCloudView: React.FC<ParticleCloudPluginProps> = ({ cacheKey, className, onExit }) => {
  const webUrl = useSettingsStore((s) => s.webUrl);
  const base = (webUrl || '').trim();
  const ready = useMemo(() => canOpenParticleCloud(base, isParticleCloudUrlValid), [base]);

  const syncResolved = useMemo(
    () => (ready ? resolveParticleWebViewSrcSync(base, cacheKey, isParticleCloudUrlValid) : null),
    [base, cacheKey, ready],
  );

  const [resolved, setResolved] = useState<ResolvedParticleWebViewSrc | null>(syncResolved);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(!!syncResolved?.src);

  useEffect(() => {
    setResolved(syncResolved);
    setLoading(!!syncResolved?.src);
  }, [syncResolved]);

  useEffect(() => {
    if (!ready || syncResolved) return;
    let cancelled = false;
    setLoadError(false);
    setLoading(true);
    resolveParticleWebViewSrc(base, cacheKey, isParticleCloudUrlValid).then((r) => {
      if (!cancelled) {
        setResolved(r);
        setLoading(!!r?.src);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [base, cacheKey, ready, syncResolved]);

  const handleExit = () => {
    if (onExit) {
      onExit();
      return;
    }
    const pages = Taro.getCurrentPages();
    if (pages.length > 1) Taro.navigateBack();
    else Taro.switchTab({ url: '/pages/index/index' });
  };

  const hint = useMemo(
    () => getParticleWebViewHint(cacheKey, resolved?.mode ?? null),
    [cacheKey, resolved?.mode],
  );

  if (!ready || !resolved?.src) {
    return (
      <View className={classNames(styles.box, styles.fallback, className)}>
        <Text className={styles.fallbackTitle}>粒子云暂不可用</Text>
        <Text className={styles.fallbackDesc}>
          {hasStaticParticlePack()
            ? '包内静态数据未加载。请执行 npm run import:data-single 或 npm run particle:pack-static 后重新编译。'
            : '请执行 npm run import:data-single 导入 data-single.zip 并打包。'}
        </Text>
        <Text className={styles.fallbackHint}>{hint}</Text>
      </View>
    );
  }

  return (
    <View className={classNames(styles.box, styles.fullscreen, className)}>
      {loading && !loadError ? (
        <View className={styles.loadingMask}>
          <Text className={styles.loadingText}>粒子云加载中…</Text>
        </View>
      ) : null}
      {loadError ? (
        <View className={classNames(styles.fallback, styles.fallbackOverlay)}>
          <Text className={styles.fallbackTitle}>粒子云页面加载失败</Text>
          <Text className={styles.fallbackDesc}>
            {resolved.mode === 'dev-http'
              ? 'H5 预览将使用包内 Blob；抖音请重新编译并勾选不校验 web-view 域名。'
              : '请确认已执行 npm run particle:pack-static。'}
          </Text>
          <Text className={styles.fallbackHint}>{hint}</Text>
        </View>
      ) : null}
      <ParticleWebViewHost
        src={resolved.src}
        onError={() => {
          setLoadError(true);
          setLoading(false);
        }}
        onLoad={() => {
          setLoadError(false);
          setLoading(false);
        }}
        coverExit={<ParticleWebViewExitCover onExit={handleExit} />}
      />
      {process.env.TARO_ENV === 'h5' ? (
        <View className={styles.h5ExitBtn} onClick={handleExit}>
          <Text className={styles.h5ExitBtnText}>退出</Text>
        </View>
      ) : null}
    </View>
  );
};

export default ParticleCloudView;
