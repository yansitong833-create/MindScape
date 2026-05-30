import React, { useMemo } from 'react';
import { View, Text, Input, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import { useDiaryStore } from '@/store/useDiaryStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { THEME_OPTIONS } from '@/utils/theme';

const SettingsPage: React.FC = () => {
  const { primary } = useApplyTheme();

  const themePreset = useSettingsStore((s) => s.themePreset);
  const textAnalysisOpenAIConfigJson = useSettingsStore((s) => s.textAnalysisOpenAIConfigJson);
  const setTextAnalysisOpenAIConfigJson = useSettingsStore((s) => s.setTextAnalysisOpenAIConfigJson);
  const textAnalysisDefaultApiKey = useSettingsStore((s) => s.textAnalysisDefaultApiKey);
  const setTextAnalysisDefaultApiKey = useSettingsStore((s) => s.setTextAnalysisDefaultApiKey);
  const imageGenerationOpenAIConfigJson = useSettingsStore((s) => s.imageGenerationOpenAIConfigJson);
  const setImageGenerationOpenAIConfigJson = useSettingsStore((s) => s.setImageGenerationOpenAIConfigJson);

  const entryCount = useDiaryStore((s) => s.entries.length);
  const clearAll = useDiaryStore((s) => s.clearAll);

  const confirmClear = () => {
    if (entryCount === 0) {
      Taro.showToast({ title: '暂无数据', icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '清空本机日记？',
      content: `将删除本机保存的 ${entryCount} 条日记，且无法恢复。`,
      confirmText: '清空',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (!res.confirm) return;
        clearAll();
        Taro.showToast({ title: '已清空', icon: 'success' });
      },
    });
  };

  const themeLabel = useMemo(() => {
    const option = THEME_OPTIONS.find((o) => o.key === themePreset);
    return option?.label ?? '默认';
  }, [themePreset]);

  const openThemePicker = () => {
    Taro.navigateTo({ url: '/pages/theme/index' });
  };

  return (
    <View className={styles.container}>
      <View className={styles.content}>
        <Text className={styles.sectionTitle} style={{ color: primary }}>主题</Text>

        <View className={styles.list}>
          <View className={styles.item} onClick={openThemePicker}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemTitle}>主题</Text>
              <Text className={styles.itemDesc}>切换按钮与标签的强调色</Text>
            </View>
            <View className={styles.itemRight}>
              <Text>{themeLabel}</Text>
              <Text className={styles.chevron}>›</Text>
            </View>
          </View>
        </View>

        <Text className={styles.sectionTitle} style={{ color: primary }}>数据</Text>
        <Card title="本机日记" subtitle={`当前保存 ${entryCount} 条`} headerRight={null}>
          <PrimaryButton variant="secondary" onClick={confirmClear}>
            清空本机日记
          </PrimaryButton>
        </Card>

        <Text className={styles.sectionTitle} style={{ color: primary }}>AI</Text>
        <View className={styles.field}>
          <Text className={styles.label}>文本分析（OpenAI 兼容）配置 JSON</Text>
          <Textarea
            className={styles.textarea}
            value={textAnalysisOpenAIConfigJson}
            placeholder={`{\n  "url": "https://api.openai-next.com/v1/chat/completions",\n  "apiKey": "",\n  "body": {\n    "model": "gpt-5",\n    "messages": [\n      { "role": "user", "content": "{{PROMPT}}" }\n    ]\n  }\n}`}
            maxlength={2400}
            autoHeight
            onInput={(e) => setTextAnalysisOpenAIConfigJson(e.detail.value)}
          />
          <Text className={styles.hint}>
            body 中可用占位符：{'{{PROMPT}}'}、{'{{EMOTION_COLOR}}'}。
          </Text>
        </View>
        <View className={styles.field}>
          <Text className={styles.label}>文本分析默认 API Key（可选）</Text>
          <Input
            className={styles.input}
            value={textAnalysisDefaultApiKey}
            placeholder="sk-..."
            password
            onInput={(e) => setTextAnalysisDefaultApiKey(e.detail.value)}
          />
          <Text className={styles.hint}>当 JSON 未填写 apiKey 时，会优先使用这里的 Key。</Text>
        </View>
        <View className={styles.field}>
          <Text className={styles.label}>图片生成（OpenAI 兼容）配置 JSON</Text>
          <Textarea
            className={styles.textarea}
            value={imageGenerationOpenAIConfigJson}
            placeholder={`{\n  "url": "https://api.openai-next.com/v1/chat/completions",\n  "apiKey": "",\n  "body": {\n    "model": "gpt-5",\n    "messages": [\n      { "role": "user", "content": "{{PROMPT}}" }\n    ]\n  }\n}`}
            maxlength={2400}
            autoHeight
            onInput={(e) => setImageGenerationOpenAIConfigJson(e.detail.value)}
          />
          <Text className={styles.hint}>预留给云图生成模块使用（当前模块为占位）。</Text>
        </View>

        <Text className={styles.sectionTitle} style={{ color: primary }}>说明</Text>
        <Card title="关于数据" subtitle="日记保存在本机，不会自动上传。">
          <Text className={styles.hint}>
            你可以在“查阅”页按月份查看日历分布，也可以在“日记”页新增、编辑、删除条目。
          </Text>
        </Card>
      </View>
    </View>
  );
};

export default SettingsPage;
