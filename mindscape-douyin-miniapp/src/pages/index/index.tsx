import React, { useMemo, useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import Scrapbook from '@/components/Scrapbook';
import { useDiaryStore } from '@/store/useDiaryStore';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import dayjs from 'dayjs';
import { hexToRgba } from '@/utils/color';

const HomePage: React.FC = () => {
  const { primary } = useApplyTheme();

  const entries = useDiaryStore((s) => s.entries);
  const now = useMemo(() => dayjs(), []);
  const [monthCursor, setMonthCursor] = useState<string>('2026-05');

  const monthStart = useMemo(() => dayjs(`${monthCursor}-01`).startOf('month'), [monthCursor]);
  const monthEnd = useMemo(() => monthStart.endOf('month'), [monthStart]);
  const monthLabel = useMemo(() => monthStart.format('YYYY年M月'), [monthStart]);

  const monthEntries = useMemo(() => {
    const startMs = monthStart.startOf('day').valueOf();
    const endMs = monthEnd.endOf('day').valueOf();
    const list = entries.filter((e) => e.createdAt >= startMs && e.createdAt <= endMs);

    return list;
  }, [entries, monthEnd, monthStart]);

  /** 日历格：取当天最新一条记录的颜色 */
  const dayColorByDate = useMemo(() => {
    const map: Record<string, string | undefined> = Object.create(null);
    const sorted = monthEntries.slice().sort((a, b) => b.createdAt - a.createdAt);
    sorted.forEach((e) => {
      const key = dayjs(e.createdAt).format('YYYY-MM-DD');
      if (!Object.prototype.hasOwnProperty.call(map, key)) map[key] = e.color;
    });
    return map;
  }, [monthEntries]);

  const [selectedDate, setSelectedDate] = useState<string>(() => now.format('YYYY-MM-DD'));
  const selectedInMonth = useMemo(() => {
    const d = dayjs(selectedDate);
    return d.isSame(monthStart, 'month');
  }, [monthStart, selectedDate]);

  const selectedDateForView = useMemo(() => {
    if (selectedInMonth) return selectedDate;
    return monthStart.format('YYYY-MM-DD');
  }, [monthStart, selectedDate, selectedInMonth]);

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
        <View className={styles.calendarSection}>
          <View className={styles.calendarHeader}>
            <Button className={styles.navBtn} onClick={() => setMonthCursor(monthStart.subtract(1, 'month').format('YYYY-MM'))}>
              <Text>‹</Text>
            </Button>
            <Text className={styles.monthText} style={{ color: primary }}>{monthLabel}</Text>
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
              const dayTint = dayColorByDate[cell.date];
              const bg = dayTint ? hexToRgba(dayTint, 0.32) : '#FFFFFF';
              const dayColor = isToday ? '#1D2129' : '#4E5969';

              return (
                <View key={cell.key} className={styles.dayCell}>
                  <Button
                    className={styles.dayBtn}
                    style={{
                      background: bg,
                      borderColor: isSelected ? '#1D2129' : 'transparent',
                    }}
                    onClick={() => {
                      setSelectedDate(cell.date);
                      Taro.navigateTo({
                        url: `/pages/scrapbook/index?scope=day&date=${encodeURIComponent(cell.date)}&readonly=1`,
                      });
                    }}
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
        </View>

        <Scrapbook scope="month" date={monthCursor} entries={monthEntries} />
      </View>
    </View>
  );
};

export default HomePage;
