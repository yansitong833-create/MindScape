import React, { useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import EmptyState from '@/components/EmptyState';
import type { DiaryEntry, Mood } from '@/types/diary';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getThemeColors } from '@/utils/theme';

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

const MOOD_COLORS: Record<Mood, string> = {
  开心: '#00B42A',
  平静: '#00B8A9',
  低落: '#4E5969',
  焦虑: '#FF7D00',
  疲惫: '#6D5DFE',
};

const hashString = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

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
    const map = new Map<string, DiaryEntry[]>();
    sorted.forEach((e) => {
      const key = dayjs(e.createdAt).format('YYYY-MM-DD');
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    });
    const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return keys.map((k) => ({ key: k, label: dayjs(k).format('M 月 D 日'), list: map.get(k) ?? [] }));
  }, [date, scope, sorted]);

  const majorMood = useMemo(() => {
    if (sorted.length === 0) return null;
    const counter = new Map<Mood, number>();
    sorted.forEach((e) => counter.set(e.mood, (counter.get(e.mood) ?? 0) + 1));
    let best = sorted[0].mood;
    let bestCount = -1;
    counter.forEach((count, mood) => {
      if (count > bestCount) {
        bestCount = count;
        best = mood;
      }
    });
    return best;
  }, [sorted]);

  const seed = useMemo(() => hashString(`${scope}:${date}:${majorMood ?? 'none'}`), [date, majorMood, scope]);
  const particles = useMemo(() => {
    const rnd = mulberry32(seed);
    const base = majorMood ? MOOD_COLORS[majorMood] : '#86909C';
    const list: Array<{ left: string; top: string; size: string; opacity: number; background: string }> = [];

    const count = 72;
    for (let i = 0; i < count; i += 1) {
      const u = rnd();
      const v = rnd();
      const r = Math.sqrt(-2 * Math.log(Math.max(1e-6, u)));
      const theta = 2 * Math.PI * v;
      const dx = r * Math.cos(theta);
      const dy = r * Math.sin(theta);

      const x = 50 + dx * 12;
      const y = 50 + dy * 16;
      const size = 6 + rnd() * 16;
      const opacity = 0.08 + rnd() * 0.22;
      const tint = rnd() < 0.75 ? base : '#C9CDD4';
      list.push({
        left: `${Math.max(2, Math.min(98, x))}%`,
        top: `${Math.max(2, Math.min(98, y))}%`,
        size: `${size}rpx`,
        opacity,
        background: tint,
      });
    }
    return list;
  }, [majorMood, seed]);

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

      <View className={styles.cloud}>
        {particles.map((p, i) => (
          <View
            key={`${date}-${i}`}
            className={styles.particle}
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              background: p.background,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </View>

      <View className={styles.list}>
        {sorted.length === 0 ? (
          <EmptyState title="暂无记录" description="先写下一句话，记录会显示在这里。" />
        ) : (
          groups.map((g) => (
            <View key={g.key} className={styles.dateGroup}>
              {g.label ? <Text className={styles.dateTitle}>{g.label}</Text> : null}
              {g.list.map((entry) => (
                <View key={entry.id} className={styles.item}>
                  <View className={styles.itemTop}>
                    <View className={styles.metaLeft}>
                      <View className={styles.moodBadge} style={{ background: MOOD_COLORS[entry.mood] }}>
                        <Text className={styles.moodText}>{entry.mood}</Text>
                      </View>
                      <Text className={styles.time}>{dayjs(entry.createdAt).format('HH:mm')}</Text>
                    </View>

                    {allowEdit || allowDelete ? (
                      <View className={styles.actions}>
                        {allowEdit ? (
                          <Button
                            className={styles.actionBtn}
                            style={{ borderColor: MOOD_COLORS[entry.mood], color: MOOD_COLORS[entry.mood] }}
                            onClick={() => onClickEdit(entry.id)}
                          >
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
