import React, { useMemo } from 'react';

import { View, WebView, Text, CoverView } from '@tarojs/components';

import Taro from '@tarojs/taro';

import classNames from 'classnames';

import { useSettingsStore } from '@/store/useSettingsStore';

import { hasStaticParticleInline } from '@/plugins/particle-cloud/staticParticleInlineLoader';
import { canOpenParticleCloud, isParticleCloudDevMode } from '@/utils/particleCloudDev';

import { isParticleCloudUrlValid } from '@/utils/particleCloudWebUrl';

import { getStaticParticleHtmlPath } from '@/data/staticParticleManifest';

import { resolvePluginWebViewSrc } from './buildUrl';

import type { ParticleCloudPluginProps } from './types';

import styles from './ParticleCloudView.module.scss';



/** 静态 HTML WebView 展示（无运行时生成） */

const ParticleCloudView: React.FC<ParticleCloudPluginProps> = ({ cacheKey, className, onExit }) => {

  const webUrl = useSettingsStore((s) => s.webUrl);

  const base = (webUrl || '').trim();

  const ready = useMemo(() => canOpenParticleCloud(base, isParticleCloudUrlValid), [base]);



  const resolved = useMemo(

    () => (ready ? resolvePluginWebViewSrc(base, cacheKey) : null),

    [base, cacheKey, ready],

  );



  const staticPath = useMemo(() => getStaticParticleHtmlPath(cacheKey), [cacheKey]);



  const handleExit = () => {

    if (onExit) {

      onExit();

      return;

    }

    const pages = Taro.getCurrentPages();

    if (pages.length > 1) Taro.navigateBack();

    else Taro.switchTab({ url: '/pages/diary/index' });

  };



  if (!resolved?.src) {

    return (

      <View className={classNames(styles.box, styles.fallback, className)}>

        <Text className={styles.fallbackTitle}>粒子云暂不可用</Text>

        <Text className={styles.fallbackDesc}>
          {hasStaticParticleInline()
            ? '包内静态页加载失败，请重新编译。'
            : isParticleCloudDevMode()
              ? '请执行 npm run particle:pack-static 后重新编译，或 npm run h5:serve。'
              : '请执行 npm run particle:pack-static 打包静态 HTML，或配置 HTTPS 部署。'}
        </Text>

        <Text className={styles.fallbackHint}>预期页面：{staticPath}</Text>

      </View>

    );

  }



  return (

    <View className={classNames(styles.box, styles.fullscreen, className)}>

      <WebView src={resolved.src} className={styles.webView}>

        <CoverView className={styles.coverExit} onClick={handleExit}>

          <CoverView className={styles.coverExitInner}>退出</CoverView>

        </CoverView>

      </WebView>

    </View>

  );

};



export default ParticleCloudView;


