import React, { useMemo, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import Tag from '@/components/Tag';
import type { Mood } from '@/types/diary';
import { useDiaryStore } from '@/store/useDiaryStore';
import { useSettingsStore } from '@/store/useSettingsStore';

const MOODS: Mood[] = ['平静', '开心', '低落', '焦虑', '疲惫'];

const HomePage: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [mood, setMood] = useState<Mood>('平静');

  const addEntry = useDiaryStore((s) => s.addEntry);
  const entryCount = useDiaryStore((s) => s.entries.length);
  const webUrl = useSettingsStore((s) => s.webUrl);

  const canSave = useMemo(() => content.trim().length > 0, [content]);

  const open3D = () => {
    const url = encodeURIComponent(webUrl);
    Taro.navigateTo({ url: `/pages/webview/index?url=${url}` });
  };

  const saveQuick = () => {
    if (!canSave) {
      Taro.showToast({ title: '先写一句', icon: 'none' });
      return;
    }

    addEntry({ content, mood });
    setContent('');
    Taro.showToast({ title: '已保存', icon: 'success' });
  };

  return (
    <View className={styles.container}>
      <View className={styles.content}>
        <View className={styles.hero}>
          <Text className={styles.title}>MindScape</Text>
          <Text className={styles.subtitle}>用一句话记录心境，用一段三维旅程安放情绪。</Text>
        </View>

        <Card title="3D 心境" subtitle="抖音小程序内以 WebView 打开 H5 体验。">
          <View className={styles.row}>
            <PrimaryButton onClick={open3D}>打开 3D 体验</PrimaryButton>
            <PrimaryButton
              variant="secondary"
              onClick={() => Taro.switchTab({ url: '/pages/mine/index' })}
            >
              配置 3D 地址
            </PrimaryButton>
          </View>
        </Card>

        <View className={styles.quickInput}>
          <Text className={styles.inputLabel}>
            快速记录（已累计 {entryCount} 条）
          </Text>
          <Input
            className={styles.input}
            value={content}
            placeholder="今天感觉如何？"
            maxlength={120}
            onInput={(e) => setContent(e.detail.value)}
            confirmType="done"
          />

          <View className={styles.row} style={{ marginTop: 24 }}>
            <View className={styles.moodRow}>
              {MOODS.map((m) => (
                <View key={m} className={styles.moodItem}>
                  <Tag active={mood === m} onClick={() => setMood(m)}>
                    {m}
                  </Tag>
                </View>
              ))}
            </View>
            <PrimaryButton disabled={!canSave} onClick={saveQuick}>
              保存到日记
            </PrimaryButton>
          </View>
        </View>
      </View>
    </View>
  );
};

export default HomePage;
