import React from 'react';
import { Button } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

export interface TagProps {
  active?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const Tag: React.FC<TagProps> = ({ active, className, children, onClick }) => {
  return (
    <Button className={classnames(styles.tag, active && styles.active, className)} onClick={onClick}>
      {children}
    </Button>
  );
};

export default Tag;
