import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (isWeb) {
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      }
      const { default: AsyncStorage } = require('@react-native-async-storage/async-storage');
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('Storage getItem error:', e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (isWeb) {
        if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
        return;
      }
      const { default: AsyncStorage } = require('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('Storage setItem error:', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (isWeb) {
        if (typeof window !== 'undefined') window.localStorage.removeItem(key);
        return;
      }
      const { default: AsyncStorage } = require('@react-native-async-storage/async-storage');
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage removeItem error:', e);
    }
  }
};
