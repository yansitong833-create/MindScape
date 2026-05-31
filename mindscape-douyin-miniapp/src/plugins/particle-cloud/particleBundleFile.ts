import Taro from '@tarojs/taro';
import { getStaticParticleInlineHtml } from './staticParticleInlineLoader';

const BUNDLE_FILE = 'mindscape-particle-bundle.html';
let cachedPath: string | null = null;
let writeTask: Promise<string | null> | null = null;

/** 将包内解压后的 bundle 写入用户目录，供小程序 web-view 以本地路径打开 */
export const ensureParticleBundleLocalFile = async (): Promise<string | null> => {
  if (cachedPath) return cachedPath;
  if (writeTask) return writeTask;

  writeTask = (async () => {
    const html = getStaticParticleInlineHtml('default');
    const userPath = (Taro.env as { USER_DATA_PATH?: string }).USER_DATA_PATH;
    if (!html || !userPath) return null;

    const filePath = `${userPath}/${BUNDLE_FILE}`;
    const fs = Taro.getFileSystemManager();
    try {
      await new Promise<void>((resolve, reject) => {
        fs.writeFile({
          filePath,
          data: html,
          encoding: 'utf8',
          success: () => resolve(),
          fail: (err) => reject(err),
        });
      });
      cachedPath = filePath;
      return filePath;
    } catch {
      return null;
    }
  })();

  return writeTask;
};

export const preloadParticleBundleLocalFile = (): void => {
  void ensureParticleBundleLocalFile();
};
