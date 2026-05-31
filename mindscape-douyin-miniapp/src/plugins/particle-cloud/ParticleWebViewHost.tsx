import React from 'react';
import { WebView, CoverView } from '@tarojs/components';
import classNames from 'classnames';
import styles from './ParticleCloudView.module.scss';

export interface ParticleWebViewHostProps {
  src: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  coverExit?: React.ReactNode;
}

/**
 * 小程序用原生 WebView；H5/PAI 预览用 iframe（Taro WebView 在 H5 不渲染内容）。
 */
const ParticleWebViewHost: React.FC<ParticleWebViewHostProps> = ({
  src,
  className,
  onLoad,
  onError,
  coverExit,
}) => {
  if (process.env.TARO_ENV === 'h5') {
    return (
      <iframe
        title="MindScape 粒子云"
        src={src}
        className={classNames(styles.webView, styles.h5Iframe, className)}
        onLoad={() => onLoad?.()}
        onError={() => onError?.()}
      />
    );
  }

  return (
    <WebView src={src} className={classNames(styles.webView, className)} onLoad={onLoad} onError={onError}>
      {coverExit}
    </WebView>
  );
};

export const ParticleWebViewExitCover: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  if (process.env.TARO_ENV === 'h5') return null;
  return (
    <CoverView className={styles.coverExit} onClick={onExit}>
      <CoverView className={styles.coverExitInner}>退出</CoverView>
    </CoverView>
  );
};

export default ParticleWebViewHost;
