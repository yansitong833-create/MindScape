import { gunzipSync } from 'fflate';

let decodeCache: Map<string, string> | null = null;

const decodeBase64ToBytes = (b64: string): Uint8Array => {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const buf = require('buffer').Buffer.from(b64, 'base64');
  return new Uint8Array(buf);
};

/** 解压 pack-static 生成的 gzip base64（须用 gunzip，不能用 unzip） */
export const decompressGzipBase64 = (b64: string): string => {
  if (decodeCache?.has(b64)) return decodeCache.get(b64)!;
  const inflated = gunzipSync(decodeBase64ToBytes(b64));
  const text = new TextDecoder().decode(inflated);
  if (!decodeCache) decodeCache = new Map();
  decodeCache.set(b64, text);
  return text;
};
