'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';

type OAuthProvider = 'google' | 'facebook' | 'azure' | 'github' | 'discord';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  credits: number | null;
  signInWithProvider: (provider: OAuthProvider) => Promise<void>;
  /** @deprecated use signInWithProvider('google') */
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  credits: null,
  signInWithProvider: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshCredits: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);

  // Fetch credit balance from our API (uses service-role client server-side)
  const fetchCredits = async (accessToken: string) => {
    try {
      const res = await fetch('/api/credits', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits ?? null);
      }
    } catch {
      // Silently fail — credits are non-critical for UX
    }
  };

  const refreshCredits = async () => {
    if (session?.access_token) await fetchCredits(session.access_token);
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Restore session on mount (handles OAuth redirect too)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.access_token) fetchCredits(session.access_token);
    });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.access_token) fetchCredits(session.access_token);
      else setCredits(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithProvider = async (provider: OAuthProvider) => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        ...(provider === 'azure' ? { 
          scopes: 'email profile',
          queryParams: { prompt: 'select_account' } 
        } : {}),
      },
    });
  };

  // Backwards-compatible alias
  const signInWithGoogle = () => signInWithProvider('google');

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCredits(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, credits, signInWithProvider, signInWithGoogle, signOut, refreshCredits }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
