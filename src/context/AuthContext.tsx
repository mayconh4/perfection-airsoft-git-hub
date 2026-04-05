import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  isAdmin: boolean;
  isVerified: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Session expiry timer
  useEffect(() => {
    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (session) {
        const isPersistent = localStorage.getItem('auth_persistent') === 'true';
        const expiryTime = isPersistent ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000; 

        timeoutId = setTimeout(async () => {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            await signOut();
            alert('Sua sessão expirou por inatividade.');
          }
        }, expiryTime);
      }
    };

    const activities = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];
    const attachListeners = () => activities.forEach(event => document.addEventListener(event, resetTimer, { passive: true }));
    const detachListeners = () => activities.forEach(event => document.removeEventListener(event, resetTimer));

    if (session) {
      attachListeners();
      resetTimer();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      detachListeners();
    };
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      updateStatus(session?.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      updateStatus(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateStatus = async (user: any) => {
    if (!user) {
      setIsAdmin(false);
      setIsVerified(false);
      return;
    }
    
    setIsAdmin(
      user.email === 'admin@perfectionairsoft.com.br' || 
      user.email === 'maycontuliofs@gmail.com'
    );

    try {
      const { data } = await supabase
        .from('profiles')
        .select('asaas_wallet_id')
        .eq('id', user.id)
        .single();
      
      setIsVerified(!!data?.asaas_wallet_id);
    } catch (err) {
      console.error('Erro ao buscar status de verificação:', err);
      setIsVerified(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await updateStatus(user);
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    // Store persistence preference
    localStorage.setItem('auth_persistent', rememberMe.toString());
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    // Default persistent for new signups
    localStorage.setItem('auth_persistent', 'true');
    
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { 
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    localStorage.removeItem('auth_persistent');
    await supabase.auth.signOut();
  };

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { error: error as Error | null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, loading, signIn, signUp, signOut, resendConfirmation, resetPassword,
      isAdmin, isVerified, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
