import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

const isMockMode = !process.env.EXPO_PUBLIC_SUPABASE_URL || supabaseUrl.includes('placeholder');

/**
 * SSR-safe storage adapter.
 * During Expo Router's server-side render pass, `window` is undefined.
 * This adapter silently no-ops on the server and delegates to AsyncStorage on the client.
 */
const ssrSafeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    return AsyncStorage.removeItem(key);
  },
};

// Use native WebSocket on browser/React Native; fall back to 'ws' on Node.js (Metro/SSR)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebSocketImpl = typeof WebSocket !== 'undefined' ? WebSocket : require('ws');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ssrSafeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    // @ts-ignore
    transport: WebSocketImpl,
    params: isMockMode ? { eventsPerSecond: 0 } : { eventsPerSecond: 10 },
  },
});
