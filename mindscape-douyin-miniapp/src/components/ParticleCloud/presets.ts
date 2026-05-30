import catPng from '@/assets/particle/cat.png';
import towerPng from '@/assets/particle/tower.png';
import ferrisWheelPng from '@/assets/particle/ferris_wheel.png';

export type ParticlePresetKey = 'cat' | 'tower' | 'ferris_wheel';

export interface ParticlePreset {
  key: ParticlePresetKey;
  src: string;
  themeColor: string;
}

export const PRESETS: Record<ParticlePresetKey, ParticlePreset> = {
  cat: { key: 'cat', src: catPng, themeColor: '#FFFACD' },
  tower: { key: 'tower', src: towerPng, themeColor: '#8A2BE2' },
  ferris_wheel: { key: 'ferris_wheel', src: ferrisWheelPng, themeColor: '#FF7F50' },
};

export const pickPresetKey = (text: string, seed: number): ParticlePresetKey => {
  if (/猫|冰淇淋/.test(text)) return 'cat';
  if (/塔|压抑|工作/.test(text)) return 'tower';
  if (/游乐场|开心/.test(text)) return 'ferris_wheel';
  const list: ParticlePresetKey[] = ['tower', 'cat', 'ferris_wheel'];
  return list[Math.abs(seed) % list.length];
};

export const pickPreset = (text: string, seed: number): ParticlePreset => {
  return PRESETS[pickPresetKey(text, seed)];
};

