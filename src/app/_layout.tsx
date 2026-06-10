import React, { useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme, View, ActivityIndicator, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import AppTabs from '@/components/app-tabs';

import LandingScreen from '@/components/auth/LandingScreen';
import LoginScreen from '@/components/auth/LoginScreen';
import SignupScreen from '@/components/auth/SignupScreen';

function AppContent() {
  const { user, loading } = useAuth();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const [authView, setAuthView] = useState<'landing' | 'login' | 'signup'>('landing');

  if (loading) {
    const bgColor = colorScheme === 'dark' ? '#090E1A' : '#F9F6F0';
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <ThemeProvider value={theme}>
      {user ? (
        <AppTabs />
      ) : (
        <>
          {authView === 'landing' && <LandingScreen onNavigate={setAuthView} />}
          {authView === 'login' && <LoginScreen onNavigate={setAuthView} />}
          {authView === 'signup' && <SignupScreen onNavigate={setAuthView} />}
        </>
      )}
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
