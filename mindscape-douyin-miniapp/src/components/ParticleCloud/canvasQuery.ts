import Taro, { getCurrentInstance } from '@tarojs/taro';

const scopeQuery = (scope: any) => {
  const q = Taro.createSelectorQuery();
  return scope ? q.in(scope) : q;
};

/** 自定义组件内查 Canvas：组件 scope → 页面 scope → 全局 */
export const createScopedSelectorQuery = () => {
  const inst = getCurrentInstance();
  if (!inst || process.env.TARO_ENV === 'h5') {
    return Taro.createSelectorQuery();
  }
  return scopeQuery(inst);
};

export const createPageSelectorQuery = () => {
  const page = getCurrentInstance()?.page;
  if (!page || process.env.TARO_ENV === 'h5') {
    return Taro.createSelectorQuery();
  }
  return scopeQuery(page);
};

export const createFallbackSelectorQuery = () => Taro.createSelectorQuery();
