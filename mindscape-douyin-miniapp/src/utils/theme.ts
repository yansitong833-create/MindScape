export type ThemePreset = 'blue' | 'purple' | 'green' | 'orange' | 'teal' | 'pink';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
}

export interface ThemeOption {
  key: ThemePreset;
  label: string;
  colors: ThemeColors;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    key: 'blue',
    label: '深海蓝',
    colors: { primary: '#165DFF', primaryLight: '#4080FF' },
  },
  {
    key: 'purple',
    label: '梦境紫',
    colors: { primary: '#6D5DFE', primaryLight: '#9B8CFF' },
  },
  {
    key: 'green',
    label: '森林绿',
    colors: { primary: '#00B42A', primaryLight: '#2BD56A' },
  },
  {
    key: 'orange',
    label: '日落橙',
    colors: { primary: '#FF7D00', primaryLight: '#FFB100' },
  },
  {
    key: 'teal',
    label: '薄荷青',
    colors: { primary: '#00B8A9', primaryLight: '#48D1C7' },
  },
  {
    key: 'pink',
    label: '玫瑰粉',
    colors: { primary: '#F53F8C', primaryLight: '#FF7DB3' },
  },
];

export const getThemeColors = (preset: ThemePreset): ThemeColors => {
  const option = THEME_OPTIONS.find((o) => o.key === preset);
  return option?.colors ?? THEME_OPTIONS[0].colors;
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const normalized = hex.trim().replace('#', '');
  if (![3, 6].includes(normalized.length)) return null;
  const full = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized;
  const intVal = Number.parseInt(full, 16);
  if (Number.isNaN(intVal)) return null;
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
};

export const rgbToHex = (rgb: { r: number; g: number; b: number }): string => {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
};

export const mixHex = (a: string, b: string, bRatio: number): string => {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  if (!ar || !br) return a;
  const t = Math.max(0, Math.min(1, bRatio));
  return rgbToHex({
    r: ar.r * (1 - t) + br.r * t,
    g: ar.g * (1 - t) + br.g * t,
    b: ar.b * (1 - t) + br.b * t,
  });
};

export const isDarkColor = (hex: string): boolean => {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance < 0.55;
};
