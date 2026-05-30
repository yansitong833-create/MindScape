import Taro from '@tarojs/taro';
import { useSettingsStore } from '@/store/useSettingsStore';
import { hasStaticParticleInline } from '@/plugins/particle-cloud/staticParticleInlineLoader';
import { canOpenParticleCloud, isParticleCloudDevMode } from '@/utils/particleCloudDev';
import { isParticleCloudUrlValid } from '@/utils/particleCloudWebUrl';

export const navigateToParticleCloud = (payload: { cacheKey: string }) => {
  const base = (useSettingsStore.getState().webUrl || '').trim();
  const ready = canOpenParticleCloud(base, isParticleCloudUrlValid);

  if (!ready) {
    Taro.showToast({
      title: hasStaticParticleInline()
        ? '粒子云资源未就绪'
        : isParticleCloudDevMode()
          ? '请执行 npm run particle:pack-static 或 h5:serve'
          : '请执行 npm run particle:pack-static 或配置 HTTPS',
      icon: 'none',
    });
    return;
  }

  const query = ['mode=particleCloud', `cacheKey=${encodeURIComponent(payload.cacheKey)}`].join('&');
  Taro.navigateTo({ url: `/pages/webview/index?${query}` });
};
