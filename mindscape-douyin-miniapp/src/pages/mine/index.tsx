import React, { useMemo, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import Card from '@/components/Card';
import PrimaryButton from '@/components/PrimaryButton';
import { useDiaryStore } from '@/store/useDiaryStore';
import { useSettingsStore } from '@/store/useSettingsStore';

const MinePage: React.FC = () => {
  const webUrl = useSettingsStore((s) => s.webUrl);
  const setWebUrl = useSettingsStore((s) => s.setWebUrl);
  const [draftUrl, setDraftUrl] = useState<string>(webUrl);

  const entryCount = useDiaryStore((s) => s.entries.length);
  const clearAll = useDiaryStore((s) => s.clearAll);

  const canSaveUrl = useMemo(() => draftUrl.trim().length > 0, [draftUrl]);

  const saveUrl = () => {
    if (!canSaveUrl) {
      Taro.showToast({ title: '请输入 URL', icon: 'none' });
      return;
    }
    setWebUrl(draftUrl);
    Taro.showToast({ title: '已保存', icon: 'success' });
  };

  const open3D = () => {
    const url = encodeURIComponent(draftUrl.trim() || webUrl);
    Taro.navigateTo({ url: `/pages/webview/index?url=${url}` });
  };

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

  return (
    <View className={styles.container}>
      <View className={styles.content}>
        <Text className={styles.sectionTitle}>3D 体验设置</Text>

        <View className={styles.field}>
          <Text className={styles.label}>H5 地址（需 HTTPS 且已在抖音小程序后台配置业务域名）</Text>
          <Input
            className={styles.input}
            value={draftUrl}
            placeholder="https://..."
            onInput={(e) => setDraftUrl(e.detail.value)}
          />
          <Text className={styles.hint}>
            小程序 WebView 只能打开已配置的业务域名。三维渲染建议在真机上测试性能与兼容性。
          </Text>

          <View className={styles.actions}>
            <PrimaryButton onClick={saveUrl}>保存地址</PrimaryButton>
            <PrimaryButton variant="secondary" onClick={open3D}>
              打开 3D 测试
            </PrimaryButton>
          </View>
        </View>

        <Text className={styles.sectionTitle}>数据</Text>
        <Card title="本机日记" subtitle={`当前保存 ${entryCount} 条`} headerRight={null}>
          <PrimaryButton variant="secondary" onClick={confirmClear}>
            清空本机日记
          </PrimaryButton>
        </Card>

        <Text className={styles.sectionTitle}>说明</Text>
        <Card title="关于发布" subtitle="这是抖音小程序工程外壳，3D 体验通过 WebView 加载。">
          <Text className={styles.hint}>
            如果需要把 3D 效果原生化（不依赖 WebView），需要重做渲染与资源加载方案，并把 AI 能力迁移到服务端。
          </Text>
        </Card>
      </View>
    </View>
  );
};

export default MinePage;
