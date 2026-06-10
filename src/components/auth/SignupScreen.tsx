import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useAuth } from '../../context/AuthContext';

interface SignupScreenProps {
  onNavigate: (view: 'landing' | 'login' | 'signup') => void;
}

export default function SignupScreen({ onNavigate }: SignupScreenProps) {
  const { signUp } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'admin'>('client');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignup = async () => {
    if (!name || !email || !phone || !address || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await signUp(email, password, name, phone, address, role);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => onNavigate('landing')} style={styles.backButton}>
              <ThemedText style={{ color: colors.primary, fontWeight: '700' }}>← Back</ThemedText>
            </Pressable>
            <ThemedText type="subtitle" style={styles.title}>
              Create Account
            </ThemedText>
            <ThemedText type="small" style={styles.subtitle}>
              Join Revive Market to buy or sell devices
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

          {/* Form Fields */}
          <View style={styles.inputsContainer}>
            <View style={styles.inputGroup}>
              <ThemedText type="smallBold" style={styles.label}>Full Name</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.textSecondary, color: colors.text, backgroundColor: colors.background }]}
                placeholder="e.g., Samuel Eto'o"
                placeholderTextColor={colors.textSecondary + '80'}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="smallBold" style={styles.label}>Email Address</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.textSecondary, color: colors.text, backgroundColor: colors.background }]}
                placeholder="e.g., samuel@gmail.com"
                placeholderTextColor={colors.textSecondary + '80'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="smallBold" style={styles.label}>Phone Number</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.textSecondary, color: colors.text, backgroundColor: colors.background }]}
                placeholder="e.g., +237 6xx xx xx xx"
                placeholderTextColor={colors.textSecondary + '80'}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="smallBold" style={styles.label}>Default Delivery/Town Address</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.textSecondary, color: colors.text, backgroundColor: colors.background }]}
                placeholder="e.g., Molyko, Buea"
                placeholderTextColor={colors.textSecondary + '80'}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="smallBold" style={styles.label}>Password</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: colors.textSecondary, color: colors.text, backgroundColor: colors.background }]}
                placeholder="Choose a strong password"
                placeholderTextColor={colors.textSecondary + '80'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* Role Toggle Selector */}
            <View style={styles.inputGroup}>
              <ThemedText type="smallBold" style={styles.label}>Account Role</ThemedText>
              <View style={styles.roleToggleRow}>
                <Pressable
                  style={[
                    styles.roleToggleBtn,
                    role === 'client' ? { backgroundColor: colors.primary } : { backgroundColor: colors.backgroundElement }
                  ]}
                  onPress={() => setRole('client')}
                >
                  <ThemedText style={[styles.roleText, role === 'client' && { color: '#FFF' }]}>
                    Buyer / Client
                  </ThemedText>
                </Pressable>
                
                <Pressable
                  style={[
                    styles.roleToggleBtn,
                    role === 'admin' ? { backgroundColor: colors.primary } : { backgroundColor: colors.backgroundElement }
                  ]}
                  onPress={() => setRole('admin')}
                >
                  <ThemedText style={[styles.roleText, role === 'admin' && { color: '#FFF' }]}>
                    Seller / Admin
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: colors.primary },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.submitButtonText}>Register</ThemedText>
            )}
          </Pressable>

          {/* Toggle Login */}
          <View style={styles.footer}>
            <ThemedText type="small">Already have an account? </ThemedText>
            <Pressable onPress={() => onNavigate('login')}>
              <ThemedText type="smallBold" style={{ color: colors.primary }}>
                Sign In
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.three,
    paddingVertical: Spacing.three,
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
  roleToggleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  roleToggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleText: {
    fontWeight: '600',
    fontSize: 14,
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
    marginBottom: Spacing.four,
  },
});
