import Taro from '@tarojs/taro';
import { pickPreset, type ParticlePresetKey } from '@/components/ParticleCloud/presets';
import { buildParticleStorageKey, hashString } from '@/utils/hashString';
import {
  loadParticleCloudCache,
  saveParticleCloudCache,
  readTargetsFile,
  getTargetsDir,
  type ParticleCloudCache,
} from '@/components/ParticleCloud/storage';
import type { ParticleCloudManifest, ParticleCloudRenderConfig } from './types';
import { PARTICLE_CLOUD_PLUGIN_VERSION } from './types';

const MANIFEST_PREFIX = 'mindscape:particle-cloud:manifest:';
const CONFIG_SUFFIX = '.config.json';

const safeKey = (raw: string) => raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);

const readStorage = async <T>(key: string): Promise<T | null> => {
  try {
    const res = await Taro.getStorage<T>({ key });
    return (res as any).data ?? null;
  } catch {
    return null;
  }
};

const writeStorage = async (key: string, data: unknown) => {
  await Taro.setStorage({ key, data });
};

const fileExists = async (filePath: string): Promise<boolean> => {
  const fs = Taro.getFileSystemManager();
  try {
    await new Promise<void>((resolve, reject) => {
      fs.access({ path: filePath, success: () => resolve(), fail: (e: any) => reject(e) });
    });
    return true;
  } catch {
    return false;
  }
};

export const buildRenderConfig = (
  presetKey: ParticlePresetKey,
  themeColor: string,
  textHash: number,
): ParticleCloudRenderConfig => ({
  version: PARTICLE_CLOUD_PLUGIN_VERSION,
  presetKey,
  themeColor,
  textHash,
  sampleStep: 8,
  brightnessThreshold: 128,
  nebulaRadius: 14,
});

export const getConfigFilePath = async (cacheKey: string) => {
  const dir = await getTargetsDir();
  return `${dir}/${safeKey(cacheKey)}${CONFIG_SUFFIX}`;
};

export const writeRenderConfigFile = async (cacheKey: string, config: ParticleCloudRenderConfig) => {
  const fs = Taro.getFileSystemManager();
  const filePath = await getConfigFilePath(cacheKey);
  await new Promise<void>((resolve, reject) => {
    fs.writeFile({
      filePath,
      data: JSON.stringify(config),
      encoding: 'utf8',
      success: () => resolve(),
      fail: (e: any) => reject(e),
    });
  });
  return filePath;
};

export const readRenderConfigFile = async (filePath: string): Promise<ParticleCloudRenderConfig | null> => {
  const fs = Taro.getFileSystemManager();
  try {
    const res = await new Promise<{ data: string }>((resolve, reject) => {
      fs.readFile({
        filePath,
        encoding: 'utf8',
        success: (r: any) => resolve(r),
        fail: (e: any) => reject(e),
      });
    });
    return JSON.parse(res.data) as ParticleCloudRenderConfig;
  } catch {
    return null;
  }
};

export const loadManifest = async (cacheKey: string): Promise<ParticleCloudManifest | null> => {
  const m = await readStorage<ParticleCloudManifest>(`${MANIFEST_PREFIX}${cacheKey}`);
  if (!m || m.version !== PARTICLE_CLOUD_PLUGIN_VERSION) return null;
  if (!(await fileExists(m.targetsFilePath))) return null;
  if (!(await fileExists(m.configFilePath))) return null;
  return m;
};

export const saveManifest = async (
  cache: ParticleCloudCache,
  configFilePath: string,
): Promise<ParticleCloudManifest> => {
  const manifest: ParticleCloudManifest = {
    version: PARTICLE_CLOUD_PLUGIN_VERSION,
    cacheKey: cache.key,
    textHash: cache.textHash,
    presetKey: cache.presetKey,
    themeColor: cache.themeColor,
    pointCount: cache.pointCount,
    quantize: cache.quantize,
    targetsFilePath: cache.targetsFilePath,
    configFilePath,
    createdAt: cache.createdAt,
    updatedAt: Date.now(),
  };
  await writeStorage(`${MANIFEST_PREFIX}${cache.key}`, manifest);
  return manifest;
};

export const cacheFromManifest = (m: ParticleCloudManifest): ParticleCloudCache => ({
  version: 1,
  key: m.cacheKey,
  textHash: m.textHash,
  presetKey: m.presetKey,
  themeColor: m.themeColor,
  pointCount: m.pointCount,
  quantize: m.quantize,
  targetsFilePath: m.targetsFilePath,
  createdAt: m.createdAt,
});

export const loadCachedTargets = async (cacheKey: string, text: string): Promise<{
  manifest: ParticleCloudManifest;
  targets: Float32Array;
} | null> => {
  const merged = text.trim();
  const textHash = hashString(merged);
  const storageKey = buildParticleStorageKey(cacheKey, merged);
  const manifest = await loadManifest(storageKey);
  if (!manifest || manifest.textHash !== textHash) return null;

  const buf = await readTargetsFile(manifest.targetsFilePath);
  const packed = new Int16Array(buf);
  const targets = new Float32Array(packed.length);
  for (let i = 0; i < packed.length; i += 1) targets[i] = packed[i] / manifest.quantize;
  return { manifest, targets };
};

export const saveParticleCloudBundle = async (payload: {
  cacheKey: string;
  text: string;
  presetKey: ParticlePresetKey;
  themeColor: string;
  targets: Float32Array;
  quantize?: number;
  textHash?: number;
}): Promise<ParticleCloudManifest> => {
  const textHash = payload.textHash ?? hashString(payload.text.trim());
  const q = payload.quantize ?? 10000;
  const packed = new Int16Array(payload.targets.length);
  for (let i = 0; i < payload.targets.length; i += 1) {
    packed[i] = Math.max(-32767, Math.min(32767, Math.round(payload.targets[i] * q)));
  }

  const cache = await saveParticleCloudCache({
    key: payload.cacheKey,
    text: payload.text,
    textHash,
    presetKey: payload.presetKey,
    themeColor: payload.themeColor,
    targets: packed,
    quantize: q,
  });

  const configPath = await writeRenderConfigFile(
    payload.cacheKey,
    buildRenderConfig(payload.presetKey, payload.themeColor, textHash),
  );

  return saveManifest(cache, configPath);
};

export const persistFromWebViewMessage = async (msg: {
  cacheKey: string;
  textHash: number;
  presetKey: ParticlePresetKey;
  themeColor: string;
  targets: number[];
}): Promise<ParticleCloudManifest | null> => {
  if (!msg.targets?.length) return null;
  const storageKey = `${msg.cacheKey}__${msg.textHash.toString(16)}`;
  return saveParticleCloudBundle({
    cacheKey: storageKey,
    text: '',
    textHash: msg.textHash,
    presetKey: msg.presetKey,
    themeColor: msg.themeColor,
    targets: new Float32Array(msg.targets),
  });
};

export const resolvePresetForText = (text: string, pageCacheKey?: string) => {
  const merged = text.trim();
  const textHash = hashString(merged);
  const presetSeed = hashString(pageCacheKey ? `${pageCacheKey}|${merged}` : merged);
  const preset = pickPreset(merged || pageCacheKey || '', presetSeed);
  return { textHash, preset, presetSeed };
};
