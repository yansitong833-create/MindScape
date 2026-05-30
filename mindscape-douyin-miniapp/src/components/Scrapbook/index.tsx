import React, { useMemo, useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import EmptyState from '@/components/EmptyState';
import PrimaryButton from '@/components/PrimaryButton';
import ParticleCloud from '@/components/ParticleCloud';
import type { ColorTag, DiaryEntry } from '@/types/diary';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useDiaryStore } from '@/store/useDiaryStore';
import { getThemeColors, mixHex } from '@/utils/theme';
import { LOG_ANALYSIS_PROMPT } from '@/utils/prompts';
import { analyzeDiaryText, generateImageFromPrompt } from '@/utils/ai';

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

const DEFAULT_EMOTION_COLOR: ColorTag = '#00B8A9';

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

  const upsertCloudPage = useDiaryStore((s) => s.upsertCloudPage);
  const savedCloudPage = useDiaryStore((s) => s.getCloudPage({ scope, date }));

  const [generating, setGenerating] = useState(false);

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

  const emotionColor = useMemo<ColorTag | null>(() => {
    if (sorted.length === 0) return null;
    const counter = new Map<ColorTag, number>();
    sorted.forEach((e) => counter.set(e.color, (counter.get(e.color) ?? 0) + 1));
    let best = sorted[0].color;
    let bestCount = -1;
    counter.forEach((count, color) => {
      if (count > bestCount) {
        bestCount = count;
        best = color;
      }
    });
    return best;
  }, [sorted]);

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

  const buildInputDiaryText = (list: DiaryEntry[]) => {
    return list
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((e) => e.content.trim())
      .filter(Boolean)
      .join('; ');
  };

  const fillPrompt = (template: string, diaryText: string) => {
    return template.replaceAll('{{用户输入的日记文本}}', diaryText);
  };

  const generateIllustration = async () => {
    if (generating) return;
    if (sorted.length === 0) {
      Taro.showToast({ title: '暂无记录', icon: 'none' });
      return;
    }

    const diaryText = buildInputDiaryText(sorted);
    if (!diaryText) {
      Taro.showToast({ title: '内容为空', icon: 'none' });
      return;
    }

    const dominantColor = emotionColor ?? DEFAULT_EMOTION_COLOR;
    const prompt = fillPrompt(LOG_ANALYSIS_PROMPT, diaryText);

    try {
      setGenerating(true);
      Taro.showLoading({ title: '生成中…' });

      const analysis = await analyzeDiaryText({ prompt });
      if (!analysis.rawText.trim()) {
        Taro.hideLoading();
        Taro.showToast({ title: '文本分析失败', icon: 'none' });
        return;
      }
      if (!analysis.imagePrompt.trim()) {
        Taro.hideLoading();
        Taro.showToast({ title: '缺少生图提示词', icon: 'none' });
        return;
      }

      const img = await generateImageFromPrompt({ prompt: analysis.imagePrompt });
      upsertCloudPage({ scope, date, emotionColor: dominantColor, text: analysis.rawText, imagePath: img.filePath });
      Taro.hideLoading();
      Taro.showToast({ title: '已生成', icon: 'success' });
    } catch (e) {
      Taro.hideLoading();
      const msg = e instanceof Error ? e.message : '请求失败';
      Taro.showToast({ title: msg.slice(0, 18), icon: 'none' });
    } finally {
      setGenerating(false);
    }
  };

  const openCloudPage = () => {
    if (!savedCloudPage) {
      Taro.showToast({ title: '还未生成', icon: 'none' });
      return;
    }
    Taro.navigateTo({ url: `/pages/cloud/index?scope=${encodeURIComponent(scope)}&date=${encodeURIComponent(date)}` });
  };

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.title} style={{ color: theme.primary }}>
          {title}
        </Text>
        <Text className={styles.subtitle}>{subtitle}</Text>
      </View>

      <ParticleCloud
        id={`particle-cloud-${scope}-${date}`}
        imagePath={savedCloudPage?.imagePath}
        tint={emotionColor ?? DEFAULT_EMOTION_COLOR}
      />

      <View className={styles.illustrationActions}>
        <PrimaryButton disabled={generating} onClick={generateIllustration}>
          {savedCloudPage ? '重新生成插图' : '生成插图'}
        </PrimaryButton>
        <PrimaryButton variant="secondary" disabled={!savedCloudPage} onClick={openCloudPage}>
          查看插图
        </PrimaryButton>
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
                  style={{
                    background: mixHex(entry.color, '#FFFFFF', 0.88),
                    borderColor: mixHex(entry.color, '#FFFFFF', 0.68),
                  }}
                >
                  <View className={styles.itemTop}>
                    <View className={styles.metaLeft}>
                      <Text className={styles.time}>{dayjs(entry.createdAt).format('HH:mm')}</Text>
                    </View>

                    {allowEdit || allowDelete ? (
                      <View className={styles.actions}>
                        {allowEdit ? (
                          <Button
                            className={styles.actionBtn}
                            style={{ borderColor: entry.color, color: entry.color }}
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
