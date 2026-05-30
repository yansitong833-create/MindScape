import React, { useMemo, useState } from 'react';
import { View, Text, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import Tag from '@/components/Tag';
import EmptyState from '@/components/EmptyState';
import type { Mood } from '@/types/diary';
import { useDiaryStore } from '@/store/useDiaryStore';

const MOODS: Mood[] = ['平静', '开心', '低落', '焦虑', '疲惫'];

const DiaryPage: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [mood, setMood] = useState<Mood>('平静');

  const entries = useDiaryStore((s) => s.entries);
  const addEntry = useDiaryStore((s) => s.addEntry);
  const removeEntry = useDiaryStore((s) => s.removeEntry);

  const canSave = useMemo(() => content.trim().length > 0, [content]);

  const save = () => {
    if (!canSave) {
      Taro.showToast({ title: '先写点什么', icon: 'none' });
      return;
    }

    addEntry({ content, mood });
    setContent('');
    setMood('平静');
    Taro.showToast({ title: '已保存', icon: 'success' });
  };

  const openDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/diaryDetail/index?id=${encodeURIComponent(id)}` });
  };

  const confirmDelete = (id: string) => {
    Taro.showModal({
      title: '删除这条日记？',
      content: '删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (!res.confirm) return;
        removeEntry(id);
        Taro.showToast({ title: '已删除', icon: 'success' });
      },
    });
  };

  return (
    <View className={styles.container}>
      <View className={styles.content}>
        <View className={styles.composer}>
          <Text className={styles.label}>写一条心境</Text>
          <Textarea
            className={styles.textarea}
            value={content}
            placeholder="今天发生了什么？你更想被怎样理解？"
            maxlength={400}
            onInput={(e) => setContent(e.detail.value)}
          />

          <Text className={styles.label} style={{ marginTop: 24 }}>
            选择情绪
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
            <PrimaryButton disabled={!canSave} onClick={save}>
              保存
            </PrimaryButton>
          </View>
        </View>

        <Text className={styles.listTitle}>最近记录</Text>

        {entries.length === 0 ? (
          <EmptyState title="还没有日记" description="先从一句话开始，日记会保存在本机，不会自动上传。" />
        ) : (
          entries.slice(0, 20).map((entry) => (
            <Card
              key={entry.id}
              className={styles.entryCard}
              title=""
              headerRight={
                <PrimaryButton
                  size="sm"
                  variant="secondary"
                  onClick={() => confirmDelete(entry.id)}
                >
                  删除
                </PrimaryButton>
              }
            >
              <View className={styles.entryHeader} onClick={() => openDetail(entry.id)}>
                <View className={styles.metaLeft}>
                  <View className={styles.mood}>
                    <Text>{entry.mood}</Text>
                  </View>
                  <Text className={styles.time}>{dayjs(entry.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
                </View>
              </View>
              <Text className={styles.preview} onClick={() => openDetail(entry.id)}>
                {entry.content}
              </Text>
            </Card>
          ))
        )}
      </View>
    </View>
  );
};

export default DiaryPage;
