import React from 'react';
import { Button } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

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
  return (
    <Button
      className={classnames(
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        size === 'sm' && styles.buttonSmall,
        disabled && styles.disabled,
        className
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
};

export default PrimaryButton;
