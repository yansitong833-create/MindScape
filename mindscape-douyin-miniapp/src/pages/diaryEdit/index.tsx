import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Textarea } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import Tag from '@/components/Tag';
import PrimaryButton from '@/components/PrimaryButton';
import type { Mood } from '@/types/diary';
import { useDiaryStore } from '@/store/useDiaryStore';
import { useApplyTheme } from '@/hooks/useApplyTheme';

const MOODS: Mood[] = ['平静', '开心', '低落', '焦虑', '疲惫'];

const DiaryEditPage: React.FC = () => {
  const { primary } = useApplyTheme();

  const router = useRouter();
  const id = useMemo(() => (router.params?.id ? decodeURIComponent(router.params.id) : ''), [router.params]);

  const getEntryById = useDiaryStore((s) => s.getEntryById);
  const addEntry = useDiaryStore((s) => s.addEntry);
  const updateEntry = useDiaryStore((s) => s.updateEntry);

  const [content, setContent] = useState<string>('');
  const [mood, setMood] = useState<Mood>('平静');

  const isEdit = Boolean(id);

  useEffect(() => {
    if (!id) return;
    const entry = getEntryById(id);
    if (!entry) return;
    setContent(entry.content);
    setMood(entry.mood);
  }, [getEntryById, id]);

  const goBack = () => {
    Taro.navigateBack();
  };

  const save = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      Taro.showToast({ title: '先写点什么', icon: 'none' });
      return;
    }

    if (isEdit) {
      updateEntry({ id, content: trimmed, mood });
      Taro.showToast({ title: '已保存', icon: 'success' });
      goBack();
      return;
    }

    addEntry({ content: trimmed, mood });
    Taro.showToast({ title: '已创建', icon: 'success' });
    goBack();
  };

  return (
    <View className={styles.container}>
      <View className={styles.topBar}>
        <Text className={styles.back} onClick={goBack}>
          ‹ 返回
        </Text>
        <Text className={styles.barTitle} style={{ color: primary }}>{isEdit ? '编辑日记' : '新增日记'}</Text>
        <View className={styles.barRight} />
      </View>

      <View className={styles.panel}>
        <Text className={styles.label}>内容</Text>
        <Textarea
          className={styles.textarea}
          value={content}
          placeholder="写下今天的心情与发生的事…"
          maxlength={600}
          onInput={(e) => setContent(e.detail.value)}
        />

        <Text className={styles.label} style={{ marginTop: 24 }}>
          情绪
        </Text>
        <View className={styles.moodRow}>
          {MOODS.map((m) => (
            <View key={m} className={styles.moodItem}>
              <Tag active={mood === m} onClick={() => setMood(m)}>
                {m}
              </Tag>
            </View>
          ))}
        </View>

        <View className={styles.actions}>
          <PrimaryButton onClick={save}>{isEdit ? '保存' : '创建'}</PrimaryButton>
          <PrimaryButton variant="secondary" onClick={goBack}>
            取消
          </PrimaryButton>
        </View>
      </View>
    </View>
  );
};

export default DiaryEditPage;
