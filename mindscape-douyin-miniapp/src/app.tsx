import React, { useEffect } from 'react';
import { useDidShow, useDidHide } from '@tarojs/taro';
// 全局样式
import './app.scss';
import dayjs from 'dayjs';
import { useDiaryStore } from '@/store/useDiaryStore';

function App(props) {
  // 可以使用所有的 React Hooks
  useEffect(() => {
    useDiaryStore.getState().ensureMonthSampleVisible(dayjs().format('YYYY-MM'));
    if (process.env.TARO_ENV === 'h5') {
      const id = 'mindscape-scrollbar-style';
      if (!document.getElementById(id)) {
        const style = document.createElement('style');
        style.id = id;
        style.innerHTML = '::-webkit-scrollbar{width:0;height:0}';
        document.head.appendChild(style);
      }
    }
  }, []);

  // 对应 onShow
  useDidShow(() => {});

  // 对应 onHide
  useDidHide(() => {});

  return props.children;
}

export default App;
