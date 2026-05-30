export const hashString = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const buildParticleStorageKey = (cacheKey: string, text: string): string => {
  const textHash = hashString(text.trim());
  return `${cacheKey}__${textHash.toString(16)}`;
};
