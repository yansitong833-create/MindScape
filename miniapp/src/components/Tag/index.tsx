import React, { useMemo } from 'react';
import { Button } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getThemeColors } from '@/utils/theme';

export interface TagProps {
  active?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const Tag: React.FC<TagProps> = ({ active, className, children, onClick }) => {
  const themePreset = useSettingsStore((s) => s.themePreset);
  const theme = useMemo(() => getThemeColors(themePreset), [themePreset]);
  const themeStyle = useMemo(() => {
    if (!active) return undefined;
    return { background: theme.primary } as const;
  }, [active, theme]);

  return (
    <Button
      className={classnames(styles.tag, active && styles.active, className)}
      style={themeStyle}
      onClick={onClick}
    >
      {children}
    </Button>
  );
};

export default Tag;
