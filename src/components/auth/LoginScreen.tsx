import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useAuth } from '../../context/AuthContext';

interface LoginScreenProps {
  onNavigate: (view: 'landing' | 'login' | 'signup') => void;
}

export default function LoginScreen({ onNavigate }: LoginScreenProps) {
  const { signIn } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.formCard}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => onNavigate('landing')} style={styles.backButton}>
            <ThemedText style={{ color: colors.primary, fontWeight: '700' }}>← Back</ThemedText>
          </Pressable>
          <ThemedText type="subtitle" style={styles.title}>
            Sign In
          </ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Enter your credentials to access your account
          </ThemedText>
        </View>

        {/* Error message banner */}
        {errorMsg && (
          <View style={[styles.errorBanner, { backgroundColor: '#FFECEC' }]}>
            <ThemedText style={{ color: '#D32F2F', fontSize: 14, fontWeight: '600' }}>
              {errorMsg}
            </ThemedText>
          </View>
        )}

        {/* Inputs */}
        <View style={styles.inputsContainer}>
          <View style={styles.inputGroup}>
            <ThemedText type="smallBold" style={styles.label}>Email Address</ThemedText>
            <TextInput
              style={[
                styles.input,
                { 
                  borderColor: colors.textSecondary, 
                  color: colors.text,
                  backgroundColor: colors.background
                }
              ]}
              placeholder="e.g., buyer@revive.com"
              placeholderTextColor={colors.textSecondary + '80'}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="smallBold" style={styles.label}>Password</ThemedText>
            <TextInput
              style={[
                styles.input,
                { 
                  borderColor: colors.textSecondary, 
                  color: colors.text,
                  backgroundColor: colors.background
                }
              ]}
              placeholder="Enter your password"
              placeholderTextColor={colors.textSecondary + '80'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: colors.primary },
            pressed && styles.buttonPressed,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.submitButtonText}>Log In</ThemedText>
          )}
        </Pressable>

        {/* Toggle Signup */}
        <View style={styles.footer}>
          <ThemedText type="small">Don't have an account? </ThemedText>
          <Pressable onPress={() => onNavigate('signup')}>
            <ThemedText type="smallBold" style={{ color: colors.primary }}>
              Create One
            </ThemedText>
          </Pressable>
        </View>

        {/* Hint accounts */}
        <View style={[styles.hintBox, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="smallBold" style={{ marginBottom: 4 }}>Demo Logins (Mock Mode):</ThemedText>
          <ThemedText type="small">Client: <ThemedText type="code">buyer@revive.com</ThemedText> / password: <ThemedText type="code">buyer123</ThemedText></ThemedText>
          <ThemedText type="small">Admin: <ThemedText type="code">admin@revive.com</ThemedText> / password: <ThemedText type="code">admin123</ThemedText></ThemedText>
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
  formCard: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    marginBottom: Spacing.one,
  },
  title: {
    fontWeight: '800',
    fontSize: 32,
  },
  subtitle: {
    opacity: 0.6,
  },
  errorBanner: {
    padding: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  inputsContainer: {
    gap: Spacing.three,
  },
  inputGroup: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 14,
    opacity: 0.8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  hintBox: {
    padding: Spacing.two,
    borderRadius: 8,
    marginTop: Spacing.three,
    gap: 2,
  },
});
