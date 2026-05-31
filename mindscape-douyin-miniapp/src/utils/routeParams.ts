import Taro from '@tarojs/taro';

/** 兼容 H5 hash 路由与小程序 useRouter 的查询参数 */
export const getRouteQuery = (): Record<string, string> => {
  const fromRouter = { ...(Taro.getCurrentInstance()?.router?.params ?? {}) };

  if (process.env.TARO_ENV !== 'h5' || typeof window === 'undefined') {
    return fromRouter;
  }

  const merged = { ...fromRouter };
  const parseSearch = (search: string) => {
    if (!search) return;
    const q = search.startsWith('?') ? search.slice(1) : search;
    q.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (!k) return;
      merged[k] = decodeURIComponent(v ?? '');
    });
  };

  parseSearch(window.location.search);

  const hash = window.location.hash || '';
  const hashQ = hash.indexOf('?');
  if (hashQ >= 0) {
    parseSearch(hash.slice(hashQ));
  }

  return merged;
};

export const pickRouteParam = (key: string, fallback = ''): string => {
  const q = getRouteQuery();
  const raw = q[key];
  return raw ? decodeURIComponent(raw) : fallback;
};
