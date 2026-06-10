import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';

export interface UserProfile {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  role: 'client' | 'admin';
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isMock: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string, address: string, role?: 'client' | 'admin') => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'revive_market_mock_user';
const LOCAL_USERS_DB_KEY = 'revive_market_mock_users_db';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if we are running in mock mode (i.e., Supabase isn't configured)
  const isMock = !process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL.includes('placeholder');

  useEffect(() => {
    async function loadSession() {
      try {
        if (isMock) {
          const savedUser = await AsyncStorage.getItem(LOCAL_USER_KEY);
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (profile) {
              setUser(profile as UserProfile);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load auth session:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSession();

    if (!isMock) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profile) setUser(profile as UserProfile);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isMock]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      if (isMock) {
        // Mock DB Authentication
        const dbStr = await AsyncStorage.getItem(LOCAL_USERS_DB_KEY);
        const db = dbStr ? JSON.parse(dbStr) : {};
        const normalizedEmail = email.toLowerCase().trim();

        if (db[normalizedEmail] && db[normalizedEmail].password === password) {
          const mockUser = db[normalizedEmail].profile;
          await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
          setUser(mockUser);
        } else {
          // Default mock accounts
          if (email === 'admin@revive.com' && password === 'admin123') {
            const defaultAdmin: UserProfile = { id: 'admin-id', name: 'Admin Revive', role: 'admin', phone: '+237600000000', address: 'Douala' };
            await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(defaultAdmin));
            setUser(defaultAdmin);
          } else if (email === 'buyer@revive.com' && password === 'buyer123') {
            const defaultBuyer: UserProfile = { id: 'buyer-id', name: 'John Doe', role: 'client', phone: '+237655123456', address: 'Yaoundé' };
            await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(defaultBuyer));
            setUser(defaultBuyer);
          } else {
            throw new Error('Invalid email or password (Mock Mode)');
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    address: string,
    role: 'client' | 'admin' = 'client'
  ) => {
    setLoading(true);
    try {
      if (isMock) {
        const normalizedEmail = email.toLowerCase().trim();
        const dbStr = await AsyncStorage.getItem(LOCAL_USERS_DB_KEY);
        const db = dbStr ? JSON.parse(dbStr) : {};

        if (db[normalizedEmail]) {
          throw new Error('User already exists in mock database.');
        }

        const newProfile: UserProfile = {
          id: Math.random().toString(36).substring(2, 11),
          name,
          phone,
          address,
          role,
        };

        db[normalizedEmail] = { password, profile: newProfile };
        await AsyncStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify(db));
        await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newProfile));
        setUser(newProfile);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, phone, address, role },
          },
        });
        if (error) throw error;
        // The PostgreSQL trigger will create the profile, which onAuthStateChange will capture
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      if (isMock) {
        await AsyncStorage.removeItem(LOCAL_USER_KEY);
        setUser(null);
      } else {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileUpdate: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const updated = { ...user, ...profileUpdate };
      if (isMock) {
        await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
        setUser(updated);
      } else {
        const { error } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', user.id);
        if (error) throw error;
        setUser(updated);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isMock, signIn, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
