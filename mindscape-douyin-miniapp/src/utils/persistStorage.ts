import Taro from '@tarojs/taro';

export interface PersistStorage {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
}

export const taroPersistStorage: PersistStorage = {
  getItem: (name) => {
    try {
      const value = Taro.getStorageSync<string>(name);
      return value ?? null;
    } catch (err) {
      console.error('[Storage] getItem failed', { name, err });
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      Taro.setStorageSync(name, value);
    } catch (err) {
      console.error('[Storage] setItem failed', { name, err });
    }
  },
  removeItem: (name) => {
    try {
      Taro.removeStorageSync(name);
    } catch (err) {
      console.error('[Storage] removeItem failed', { name, err });
    }
  },
};
