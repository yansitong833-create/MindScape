import React, { useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import EmptyState from '@/components/EmptyState';
import { navigateToParticleCloud } from '@/plugins/particle-cloud';
import type { DiaryEntry } from '@/types/diary';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getThemeColors } from '@/utils/theme';
import { hexToRgba } from '@/utils/color';

/** 日记卡片背景透明度 */
const ENTRY_BG_ALPHA = 0.14;

export type ScrapbookScope = 'day' | 'month';

export interface ScrapbookProps {
  scope: ScrapbookScope;
  date: string;
  entries: DiaryEntry[];
  allowEdit?: boolean;
  allowDelete?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const Scrapbook: React.FC<ScrapbookProps> = ({
  scope,
  date,
  entries,
  allowEdit,
  allowDelete,
  onEdit,
  onDelete,
}) => {
  const themePreset = useSettingsStore((s) => s.themePreset);
  const theme = useMemo(() => getThemeColors(themePreset), [themePreset]);

  const title = useMemo(() => {
    if (scope === 'month') return dayjs(`${date}-01`).format('YYYY 年 M 月');
    return dayjs(date).format('M 月 D 日');
  }, [date, scope]);

  const subtitle = useMemo(() => {
    if (scope === 'month') return '本月全部记录';
    return '当日全部记录';
  }, [scope]);

  const sorted = useMemo(() => entries.slice().sort((a, b) => b.createdAt - a.createdAt), [entries]);

  const groups = useMemo(() => {
    if (scope === 'day') {
      return [{ key: date, label: '', list: sorted }];
    }
    const map: Record<string, DiaryEntry[]> = Object.create(null);
    sorted.forEach((e) => {
      const key = dayjs(e.createdAt).format('YYYY-MM-DD');
      (map[key] ||= []).push(e);
    });
    const keys = Object.keys(map).sort((a, b) => (a < b ? 1 : -1));
    return keys.map((k) => ({ key: k, label: dayjs(k).format('M 月 D 日'), list: map[k] ?? [] }));
  }, [date, scope, sorted]);

  const particleCacheKey = useMemo(() => `${scope}:${date}`, [scope, date]);

  const onOpenParticleCloud = () => {
    navigateToParticleCloud({ cacheKey: particleCacheKey });
  };

  const onClickEdit = (id: string) => {
    if (onEdit) return onEdit(id);
    Taro.navigateTo({ url: `/pages/diaryEdit/index?id=${encodeURIComponent(id)}` });
  };

  const onClickDelete = (id: string) => {
    if (onDelete) return onDelete(id);
    Taro.showModal({
      title: '删除这条日记？',
      content: '删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (!res.confirm) return;
      },
    });
  };

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.title} style={{ color: theme.primary }}>
          {title}
        </Text>
        <Text className={styles.subtitle}>{subtitle}</Text>
      </View>

      <View className={styles.cloudEntry} onClick={onOpenParticleCloud}>
        <Text className={styles.cloudEntryTitle}>粒子云</Text>
        <Text className={styles.cloudEntryDesc}>
          预置静态 HTML 展示，点击进入 WebView 查看
        </Text>
        <View className={styles.cloudEntryBtn} style={{ borderColor: theme.primary }}>
          <Text className={styles.cloudEntryBtnText} style={{ color: theme.primary }}>
            查看粒子云
          </Text>
        </View>
      </View>

      <View className={styles.list}>
        {sorted.length === 0 ? (
          <EmptyState title="暂无记录" description="先写下一句话，记录会显示在这里。" />
        ) : (
          groups.map((g) => (
            <View key={g.key} className={styles.dateGroup}>
              {g.label ? <Text className={styles.dateTitle}>{g.label}</Text> : null}
              {g.list.map((entry) => (
                <View
                  key={entry.id}
                  className={styles.item}
                  style={{ backgroundColor: hexToRgba(entry.color, ENTRY_BG_ALPHA) }}
                >
                  <View className={styles.itemTop}>
                    <Text className={styles.time}>{dayjs(entry.createdAt).format('HH:mm')}</Text>

                    {allowEdit || allowDelete ? (
                      <View className={styles.actions}>
                        {allowEdit ? (
                          <Button className={styles.actionBtn} onClick={() => onClickEdit(entry.id)}>
                            编辑
                          </Button>
                        ) : null}
                        {allowDelete ? (
                          <Button
                            className={styles.actionBtn}
                            style={{ borderColor: '#F53F3F', color: '#F53F3F' }}
                            onClick={() => onClickDelete(entry.id)}
                          >
                            删除
                          </Button>
                        ) : null}
                      </View>
                    ) : null}
                  </View>

                  <Text className={styles.contentText}>{entry.content}</Text>
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </View>
  );
};

export default Scrapbook;
