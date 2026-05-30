/** 运行 npm run particle:pack-static 后由 staticParticleInline.generated.ts 提供 */
export const STATIC_PARTICLE_INLINE_HTML: Record<string, string> | null = null;

export const hasStaticParticleInline = (): boolean => false;

export const getStaticParticleInlineHtml = (_cacheKey: string): string | null => null;
