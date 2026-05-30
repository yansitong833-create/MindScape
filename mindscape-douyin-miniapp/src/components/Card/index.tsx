import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

export interface CardProps {
  className?: string;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ className, title, subtitle, headerRight, children }) => {
  const hasHeader = Boolean(title || subtitle || headerRight);

  return (
    <View className={classnames(styles.card, className)}>
      {hasHeader ? (
        <View className={styles.cardHeader}>
          <View>
            {title ? <Text className={styles.title}>{title}</Text> : null}
            {subtitle ? <Text className={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {headerRight ? <View>{headerRight}</View> : null}
        </View>
      ) : null}
      <View className={styles.content}>{children}</View>
    </View>
  );
};

export default Card;
