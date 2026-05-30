export interface ParticleCloudPluginProps {
  /** 手账页标识，如 day:2026-05-31、month:2026-05，用于映射静态 HTML */
  cacheKey: string;
  className?: string;
  onExit?: () => void;
}
