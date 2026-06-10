import React from 'react';
import { View, StyleSheet, Image, Pressable, Dimensions, Platform } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';

interface LandingScreenProps {
  onNavigate: (view: 'landing' | 'login' | 'signup') => void;
}

export default function LandingScreen({ onNavigate }: LandingScreenProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];
  const screenWidth = Dimensions.get('window').width;
  const isLargeScreen = screenWidth > 768;

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, isLargeScreen && styles.rowContent]}>
        
        {/* Branding Area */}
        <View style={[styles.brandArea, isLargeScreen && styles.splitArea]}>
          <Image
            source={require('@/assets/images/revive-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="subtitle" style={styles.title}>
            REVIVE MARKET
          </ThemedText>
          <ThemedText type="default" style={styles.tagline}>
            Buy and sell quality verified electronics with ease and trust.
          </ThemedText>
        </View>

        {/* Buttons / CTA Area */}
        <View style={[styles.ctaArea, isLargeScreen && styles.splitArea]}>
          <ThemedText type="small" style={styles.welcomeText}>
            Welcome to Cameroon's Premium Electronics Marketplace
          </ThemedText>
          
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => onNavigate('login')}
          >
            <ThemedText style={styles.primaryButtonText}>Sign In</ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: colors.primary },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => onNavigate('signup')}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: colors.primary }]}>
              Create Account
            </ThemedText>
          </Pressable>

          <ThemedText type="small" style={styles.footerText}>
            Explore Grade A, B, and C devices with 30-day warranty.
          </ThemedText>
        </View>

      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
  },
  rowContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  brandArea: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: Spacing.two,
  },
  splitArea: {
    flex: 1,
    maxWidth: 400,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
    marginTop: Spacing.one,
  },
  ctaArea: {
    width: '100%',
    gap: Spacing.three,
    justifyContent: 'center',
  },
  welcomeText: {
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: Spacing.two,
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  footerText: {
    textAlign: 'center',
    opacity: 0.5,
    marginTop: Spacing.two,
    fontSize: 12,
  },
});
