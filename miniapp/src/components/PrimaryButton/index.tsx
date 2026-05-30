import React, { useMemo } from 'react';
import { Button } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getThemeColors } from '@/utils/theme';

export interface PrimaryButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'sm';
  disabled?: boolean;
  onClick?: () => void;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  disabled,
  onClick,
}) => {
  const themePreset = useSettingsStore((s) => s.themePreset);
  const theme = useMemo(() => getThemeColors(themePreset), [themePreset]);

  const themeStyle = useMemo(() => {
    if (variant === 'secondary') {
      return {
        background: '#ffffff',
        border: `2rpx solid ${theme.primary}`,
        color: theme.primary,
      } as const;
    }

    return {
      background: theme.primary,
      border: '2rpx solid transparent',
      color: '#ffffff',
    } as const;
  }, [theme, variant]);

  return (
    <Button
      className={classnames(
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        size === 'sm' && styles.buttonSmall,
        disabled && styles.disabled,
        className
      )}
      style={themeStyle}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
};

export default PrimaryButton;
