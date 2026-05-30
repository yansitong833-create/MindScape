import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Textarea, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import PrimaryButton from '@/components/PrimaryButton';
import type { ColorTag } from '@/types/diary';
import { COLOR_TAGS } from '@/types/diary';
import { useDiaryStore } from '@/store/useDiaryStore';
import { useApplyTheme } from '@/hooks/useApplyTheme';

const DiaryEditPage: React.FC = () => {
  const { primary } = useApplyTheme();

  const router = useRouter();
  const id = useMemo(() => (router.params?.id ? decodeURIComponent(router.params.id) : ''), [router.params]);

  const getEntryById = useDiaryStore((s) => s.getEntryById);
  const addEntry = useDiaryStore((s) => s.addEntry);
  const updateEntry = useDiaryStore((s) => s.updateEntry);

  const [content, setContent] = useState<string>('');
  const [color, setColor] = useState<ColorTag>(COLOR_TAGS[1]);
  const [generating, setGenerating] = useState(false);

  const isEdit = Boolean(id);

  useEffect(() => {
    if (!id) return;
    const entry = getEntryById(id);
    if (!entry) return;
    setContent(entry.content);
    setColor(entry.color);
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
      updateEntry({ id, content: trimmed, color });
      Taro.showToast({ title: '已保存', icon: 'success' });
      goBack();
      return;
    }

    addEntry({ content: trimmed, color });
    Taro.showToast({ title: '已创建', icon: 'success' });
    goBack();
  };

  // 生成心境粒子 — 调用后端 API → WebView 展示
  const generateMindscape = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      Taro.showToast({ title: '先写点什么', icon: 'none' });
      return;
    }

    setGenerating(true);
    Taro.showLoading({ title: 'AI 正在思考...' });

    try {
      const resp = await Taro.request({
        url: 'https://8.216.5.177/api/analyze',
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: { text: trimmed },
        timeout: 180000,
      });

      Taro.hideLoading();
      setGenerating(false);

      if (resp.statusCode === 200 && (resp.data as any)?.success) {
        const data = resp.data as any;
        const { imageUrl, themeColor } = data;

        // 保存日记
        addEntry({ content: trimmed, color });

        // 跳转 WebView — 粒子引擎用 URL 参数直接加载
        const encodedImg = encodeURIComponent(imageUrl);
        const encodedColor = encodeURIComponent(themeColor || '#803E4D');
        const engineUrl = encodeURIComponent(
          `https://8.216.5.177/?img=${encodedImg}&color=${encodedColor}`,
        );

        Taro.navigateTo({
          url: `/pages/webview/index?url=${engineUrl}`,
        });
      } else {
        Taro.showToast({ title: '生成失败，请重试', icon: 'none' });
      }
    } catch (err: any) {
      Taro.hideLoading();
      setGenerating(false);
      console.error('[MindScape] API 调用失败:', err);
      Taro.showToast({ title: '网络错误，请检查连接', icon: 'none' });
    }
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
          颜色标签
        </Text>
        <View className={styles.colorRow}>
          {COLOR_TAGS.map((c) => {
            const active = color === c;
            return (
              <View key={c} className={styles.colorItem}>
                <Button
                  className={styles.colorBtn}
                  style={{
                    background: c,
                    borderColor: active ? '#1D2129' : 'transparent',
                    boxShadow: active ? '0 0 0 2rpx rgba(29,33,41,0.25)' : 'none',
                  }}
                  onClick={() => setColor(c)}
                />
              </View>
            );
          })}
        </View>

        <View className={styles.actions}>
          <PrimaryButton onClick={save}>{isEdit ? '保存' : '创建'}</PrimaryButton>
          <PrimaryButton onClick={generateMindscape} disabled={generating}>
            {generating ? '生成中...' : '✨ 生成心境'}
          </PrimaryButton>
          <PrimaryButton variant="secondary" onClick={goBack}>
            取消
          </PrimaryButton>
        </View>
      </View>
    </View>
  );
};

export default DiaryEditPage;
