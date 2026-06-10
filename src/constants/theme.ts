/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1B3D',             // Deep Navy/Black
    background: '#F9F6F0',       // Beige/Off-White
    backgroundElement: '#FFFFFF',// Surface White
    backgroundSelected: '#E2ECF8',// Soft Blue Tint
    textSecondary: '#606A80',    // Muted Gray-Blue
    primary: '#0066CC',          // Primary Blue
    success: '#4CAF50',          // Eco Green
  },
  dark: {
    text: '#FFFFFF',             // White
    background: '#090E1A',       // Very Deep Navy
    backgroundElement: '#131B2E',// Lighter Navy Card
    backgroundSelected: '#1E2D4A',// Darker Selected State
    textSecondary: '#A0AABF',    // Muted Gray-Blue
    primary: '#1A8CFF',          // Bright Blue
    success: '#66BB6A',          // Bright Green
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
