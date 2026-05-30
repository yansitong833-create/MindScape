import React, { useMemo, useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import EmptyState from '@/components/EmptyState';
import PrimaryButton from '@/components/PrimaryButton';
import type { ColorTag, DiaryEntry } from '@/types/diary';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useDiaryStore } from '@/store/useDiaryStore';
import { getThemeColors, mixHex } from '@/utils/theme';
import { LOG_ANALYSIS_PROMPT } from '@/utils/prompts';

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
  const textAnalysisOpenAIConfigJson = useSettingsStore((s) => s.textAnalysisOpenAIConfigJson);
  const textAnalysisDefaultApiKey = useSettingsStore((s) => s.textAnalysisDefaultApiKey);

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

  const seed = useMemo(() => hashString(`${scope}:${date}:${emotionColor ?? 'none'}`), [date, emotionColor, scope]);
  const particles = useMemo(() => {
    const rnd = mulberry32(seed);
    const base = emotionColor ?? '#86909C';
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
  }, [emotionColor, seed]);

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

  const parseConfigJson = (raw: string) => {
    const s = raw.trim();
    if (!s) return null;
    try {
      return JSON.parse(s) as any;
    } catch {
      return null;
    }
  };

  const applyVars = (value: any, vars: Record<string, string>): any => {
    if (typeof value === 'string') {
      let out = value;
      Object.keys(vars).forEach((k) => {
        out = out.replaceAll(k, vars[k]);
      });
      return out;
    }
    if (Array.isArray(value)) return value.map((v) => applyVars(v, vars));
    if (value && typeof value === 'object') {
      const out: Record<string, any> = {};
      Object.keys(value).forEach((k) => {
        out[k] = applyVars(value[k], vars);
      });
      return out;
    }
    return value;
  };

  const extractModelText = (payload: any): string => {
    if (payload == null) return '';
    if (typeof payload === 'string') return payload;
    if (typeof payload?.text === 'string') return payload.text;
    if (typeof payload?.result === 'string') return payload.result;
    if (typeof payload?.output === 'string') return payload.output;
    if (typeof payload?.data === 'string') return payload.data;
    if (typeof payload?.data?.text === 'string') return payload.data.text;
    if (typeof payload?.data?.result === 'string') return payload.data.result;

    const choiceText = payload?.choices?.[0]?.message?.content;
    if (typeof choiceText === 'string') return choiceText;
    const choiceText2 = payload?.choices?.[0]?.text;
    if (typeof choiceText2 === 'string') return choiceText2;

    try {
      return JSON.stringify(payload);
    } catch {
      return String(payload);
    }
  };

  const generateCloudPageStub = (text: string) => text;

  const generateIllustration = async () => {
    if (generating) return;
    if (sorted.length === 0) {
      Taro.showToast({ title: '暂无记录', icon: 'none' });
      return;
    }
    if (!textAnalysisOpenAIConfigJson.trim()) {
      Taro.showToast({ title: '请先在设置中填写文本分析配置', icon: 'none' });
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

      const config = parseConfigJson(textAnalysisOpenAIConfigJson);
      const url = typeof config?.url === 'string' ? config.url.trim() : '';
      if (!url) {
        Taro.hideLoading();
        Taro.showToast({ title: '配置缺少 url', icon: 'none' });
        return;
      }

      const apiKey = (typeof config?.apiKey === 'string' ? config.apiKey.trim() : '') || textAnalysisDefaultApiKey;
      const extraHeaders = config?.headers && typeof config.headers === 'object' ? (config.headers as Record<string, string>) : {};

      const header: Record<string, string> = {
        'content-type': 'application/json',
        ...extraHeaders,
      };
      if (apiKey) {
        header.Authorization = `Bearer ${apiKey}`;
      }

      const baseBody =
        config?.body && typeof config.body === 'object'
          ? config.body
          : {
            model: typeof config?.model === 'string' ? config.model : 'gpt-5',
            messages: [{ role: 'user', content: '{{PROMPT}}' }],
          };

      const data = applyVars(baseBody, {
        '{{PROMPT}}': prompt,
        '{{EMOTION_COLOR}}': dominantColor,
      });

      const res = await Taro.request({
        url,
        method: 'POST',
        header,
        data,
      });

      const analysisText = extractModelText(res.data);
      const pageText = generateCloudPageStub(analysisText);

      upsertCloudPage({ scope, date, emotionColor: dominantColor, text: pageText });
      Taro.hideLoading();
      Taro.showToast({ title: '已生成', icon: 'success' });
      Taro.navigateTo({ url: `/pages/cloud/index?scope=${encodeURIComponent(scope)}&date=${encodeURIComponent(date)}` });
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
