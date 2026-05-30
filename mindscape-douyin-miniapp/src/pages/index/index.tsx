import React, { useMemo, useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import styles from './index.module.scss';
import Card from '@/components/Card';
import { useDiaryStore } from '@/store/useDiaryStore';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import dayjs from 'dayjs';
import type { Mood } from '@/types/diary';

const HomePage: React.FC = () => {
  useApplyTheme();

  const entries = useDiaryStore((s) => s.entries);
  const now = useMemo(() => dayjs(), []);
  const [monthCursor, setMonthCursor] = useState<string>(now.startOf('month').format('YYYY-MM'));

  const monthStart = useMemo(() => dayjs(`${monthCursor}-01`).startOf('month'), [monthCursor]);
  const monthEnd = useMemo(() => monthStart.endOf('month'), [monthStart]);
  const monthLabel = useMemo(() => monthStart.format('YYYY年M月'), [monthStart]);

  const moodColors = useMemo<Record<Mood, string>>(
    () => ({
      开心: '#00B42A',
      平静: '#00B8A9',
      低落: '#4E5969',
      焦虑: '#FF7D00',
      疲惫: '#6D5DFE',
    }),
    []
  );

  const monthEntries = useMemo(() => {
    const startMs = monthStart.startOf('day').valueOf();
    const endMs = monthEnd.endOf('day').valueOf();
    const list = entries.filter((e) => e.createdAt >= startMs && e.createdAt <= endMs);

    return list;
  }, [entries, monthEnd, monthStart]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, Array<{ id: string; content: string; mood: Mood; createdAt: number }>>();
    monthEntries.forEach((e) => {
      const key = dayjs(e.createdAt).format('YYYY-MM-DD');
      const list = map.get(key) ?? [];
      list.push({ id: e.id, content: e.content, mood: e.mood, createdAt: e.createdAt });
      map.set(key, list);
    });
    return map;
  }, [monthEntries]);

  const majorMoodByDate = useMemo(() => {
    const map = new Map<string, Mood>();
    groupedByDate.forEach((list, key) => {
      const counter = new Map<Mood, number>();
      list.forEach((e) => counter.set(e.mood, (counter.get(e.mood) ?? 0) + 1));
      let best: Mood = list[0].mood;
      let bestCount = -1;
      counter.forEach((count, mood) => {
        if (count > bestCount) {
          bestCount = count;
          best = mood;
        }
      });
      map.set(key, best);
    });
    return map;
  }, [groupedByDate]);

  const [selectedDate, setSelectedDate] = useState<string>(() => now.format('YYYY-MM-DD'));
  const selectedInMonth = useMemo(() => {
    const d = dayjs(selectedDate);
    return d.isSame(monthStart, 'month');
  }, [monthStart, selectedDate]);

  const selectedDateForView = useMemo(() => {
    if (selectedInMonth) return selectedDate;
    return monthStart.format('YYYY-MM-DD');
  }, [monthStart, selectedDate, selectedInMonth]);

  const selectedList = useMemo(() => {
    const list = groupedByDate.get(selectedDateForView) ?? [];
    return list.slice().sort((a, b) => b.createdAt - a.createdAt);
  }, [groupedByDate, selectedDateForView]);

  const calendarCells = useMemo(() => {
    const startWeekday = monthStart.day();
    const daysInMonth = monthStart.daysInMonth();
    const total = 42;
    const cells: Array<{ key: string; date: string; day: number; inMonth: boolean } | null> = Array(total).fill(null);
    for (let i = 0; i < daysInMonth; i += 1) {
      const day = i + 1;
      const cellIndex = startWeekday + i;
      const date = monthStart.date(day).format('YYYY-MM-DD');
      cells[cellIndex] = { key: date, date, day, inMonth: true };
    }
    return cells;
  }, [monthStart]);

  return (
    <View className={styles.container}>
      <View className={styles.content}>
        <View className={styles.hero}>
          <Text className={styles.title}>查阅</Text>
          <Text className={styles.subtitle}>按月份查看日历与本月记录。</Text>
        </View>

        <View className={styles.calendarSection}>
          <View className={styles.calendarHeader}>
            <Button className={styles.navBtn} onClick={() => setMonthCursor(monthStart.subtract(1, 'month').format('YYYY-MM'))}>
              <Text>‹</Text>
            </Button>
            <Text className={styles.monthText}>{monthLabel}</Text>
            <Button className={styles.navBtn} onClick={() => setMonthCursor(monthStart.add(1, 'month').format('YYYY-MM'))}>
              <Text>›</Text>
            </Button>
          </View>

          <View className={styles.weekRow}>
            {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
              <Text key={w} className={styles.weekCell}>
                {w}
              </Text>
            ))}
          </View>

          <View className={styles.grid}>
            {calendarCells.map((cell, idx) => {
              if (!cell) {
                return <View key={`empty-${idx}`} className={styles.dayCell} />;
              }

              const isSelected = cell.date === selectedDateForView;
              const isToday = cell.date === now.format('YYYY-MM-DD');
              const majorMood = majorMoodByDate.get(cell.date);
              const moodColor = majorMood ? moodColors[majorMood] : undefined;
              const bg = moodColor ?? '#FFFFFF';
              const dayColor = moodColor ? '#FFFFFF' : isToday ? '#1D2129' : '#4E5969';

              return (
                <View key={cell.key} className={styles.dayCell}>
                  <Button
                    className={styles.dayBtn}
                    style={{
                      background: bg,
                      borderColor: isSelected ? '#1D2129' : 'transparent',
                    }}
                    onClick={() => setSelectedDate(cell.date)}
                  >
                    <View className={styles.dayInner}>
                      <Text className={styles.dayText} style={{ color: dayColor }}>
                        {cell.day}
                      </Text>
                    </View>
                  </Button>
                </View>
              );
            })}
          </View>

          <View className={styles.dayRecords}>
            <Text className={styles.sectionTitle}>{dayjs(selectedDateForView).format('M月D日')}</Text>
            {selectedList.length === 0 ? (
              <Text className={styles.emptyHint}>暂无记录</Text>
            ) : (
              <View className={styles.recordList}>
                {selectedList.map((r) => (
                  <View key={r.id} className={styles.recordItem}>
                    <View className={styles.recordBar} style={{ background: moodColors[r.mood] }} />
                    <Text className={styles.recordText}>{r.content}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <Card title="月度日记情况" subtitle="功能开发中">
          <View className={styles.placeholder} />
        </Card>
      </View>
    </View>
  );
};

export default HomePage;
