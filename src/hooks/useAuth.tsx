import { useState, createContext, useContext, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  role: 'user' | 'admin';
  full_name: string;
  nickname?: string;
  avatar_url?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // --- MOCK DATA FOR "NO-LOGIN" MODE ---
  const MOCK_USER: User = {
    id: 'mock-admin-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@emilly.com',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmation_sent_at: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
    user_metadata: {
      full_name: 'Admin User',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    identities: [],
  };

  const MOCK_PROFILE: Profile = {
    id: 'mock-admin-id',
    role: 'admin',
    full_name: 'Admin User',
    nickname: 'Admin'
  };
  // -------------------------------------

  // We are bypassing login, so these states are static mock data
  const [user] = useState<User | null>(MOCK_USER);
  const [session] = useState<Session | null>(null);
  const [profile] = useState<Profile | null>(MOCK_PROFILE);
  const loading = false;

  const signOut = async () => {
    console.log('Mock sign out - doing nothing or arguably could reload');
    window.location.reload(); 
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      signOut,
      isAdmin: true // Always admin
    }}>
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
