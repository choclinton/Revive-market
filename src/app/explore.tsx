import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// This screen is a placeholder — the Explore/Search feature is integrated into index.tsx
export default function ExploreScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Explore</ThemedText>
      <ThemedText type="small" style={{ opacity: 0.6 }}>
        Use the search bar and filters on the Home tab to browse all products by category, quality, price, and region.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
