import Taro from '@tarojs/taro';
import type { ParticlePresetKey } from './presets';

const STORAGE_PREFIX = 'mindscape:particle-cloud:';
const CACHE_VERSION = 1;

export interface ParticleCloudCache {
  version: number;
  key: string;
  textHash: number;
  presetKey: ParticlePresetKey;
  themeColor: string;
  pointCount: number;
  quantize: number;
  targetsFilePath: string;
  createdAt: number;
}

const safeKey = (raw: string) => raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);

const readStorage = async <T>(key: string): Promise<T | null> => {
  try {
    const res = await Taro.getStorage<T>({ key });
    return (res as any).data ?? null;
  } catch {
    return null;
  }
};

const writeStorage = async (key: string, data: any) => {
  await Taro.setStorage({ key, data });
};

const ensureDir = async (dir: string) => {
  const fs = Taro.getFileSystemManager();
  try {
    await new Promise<void>((resolve, reject) => {
      fs.mkdir({
        dirPath: dir,
        recursive: true,
        success: () => resolve(),
        fail: (e: any) => reject(e),
      });
    });
  } catch {
    return;
  }
};

const fileExists = async (filePath: string): Promise<boolean> => {
  const fs = Taro.getFileSystemManager();
  try {
    await new Promise<void>((resolve, reject) => {
      fs.access({
        path: filePath,
        success: () => resolve(),
        fail: (e: any) => reject(e),
      });
    });
    return true;
  } catch {
    return false;
  }
};

export const getTargetsDir = async () => {
  const base = (Taro.env as any).USER_DATA_PATH as string | undefined;
  const root = `${base ?? ''}/mindscape/particle-cloud`;
  await ensureDir(root);
  return root;
};

export const loadParticleCloudCache = async (key: string): Promise<ParticleCloudCache | null> => {
  const cache = await readStorage<ParticleCloudCache>(`${STORAGE_PREFIX}${key}`);
  if (!cache) return null;
  if (cache.version !== CACHE_VERSION) return null;
  const ok = await fileExists(cache.targetsFilePath);
  if (!ok) return null;
  return cache;
};

export const saveParticleCloudCache = async (payload: {
  key: string;
  text?: string;
  textHash?: number;
  presetKey: ParticlePresetKey;
  themeColor: string;
  targets: Int16Array;
  quantize: number;
}): Promise<ParticleCloudCache> => {
  const textHash = payload.textHash ?? (() => {
    let h = 2166136261;
    const s = payload.text ?? '';
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  })();
  const dir = await getTargetsDir();
  const fs = Taro.getFileSystemManager();
  const filePath = `${dir}/${safeKey(payload.key)}.bin`;

  await new Promise<void>((resolve, reject) => {
    fs.writeFile({
      filePath,
      data: payload.targets.buffer,
      success: () => resolve(),
      fail: (e: any) => reject(e),
    });
  });

  const cache: ParticleCloudCache = {
    version: CACHE_VERSION,
    key: payload.key,
    textHash,
    presetKey: payload.presetKey,
    themeColor: payload.themeColor,
    pointCount: payload.targets.length / 3,
    quantize: payload.quantize,
    targetsFilePath: filePath,
    createdAt: Date.now(),
  };

  await writeStorage(`${STORAGE_PREFIX}${payload.key}`, cache);
  return cache;
};

export const readTargetsFile = async (filePath: string): Promise<ArrayBuffer> => {
  const fs = Taro.getFileSystemManager();
  const res = await new Promise<{ data: any }>((resolve, reject) => {
    fs.readFile({
      filePath,
      success: (r: any) => resolve(r),
      fail: (e: any) => reject(e),
    });
  });
  return res.data as ArrayBuffer;
};

