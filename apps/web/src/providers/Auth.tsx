"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { SupabaseAuthProvider } from "@/lib/auth/supabase-utils";
import {
  AuthProvider as CustomAuthProvider,
  Session,
  User,
  AuthCredentials,
  AuthError,
} from "@/lib/auth/types";

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: AuthCredentials) => Promise<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
  }>;
  signUp: (credentials: AuthCredentials) => Promise<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
  }>;
  signInWithGoogle: () => Promise<{
    user: User | null;
    session: Session | null;
    error: AuthError | null;
  }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  updateUser: (attributes: Partial<User>) => Promise<{
    user: User | null;
    error: AuthError | null;
  }>;
}

// Create auth context
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({
  children,
  customAuthProvider,
}: {
  children: React.ReactNode;
  customAuthProvider?: CustomAuthProvider;
}) {
  // Use the provided auth provider or default to Supabase (created at runtime on client)
  const provider = React.useMemo(() => {
    if (customAuthProvider) return customAuthProvider;
    return new SupabaseAuthProvider({
      redirectUrl:
        typeof window !== "undefined" ? window.location.origin : undefined,
    });
  }, [customAuthProvider]);

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get the current session
        const currentSession = await provider.getSession();
        setSession(currentSession);
        console.log("[AuthProvider] currentSession", currentSession);

        // If we have a session, get the user
        if (currentSession?.user) {
          setUser(currentSession.user);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [provider]);

  // Set up auth state change listener
  useEffect(() => {
    const { unsubscribe } = provider.onAuthStateChange(
      (newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user || null);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [provider]);

  // Proactively refresh session ~60s before expiry to avoid using an expired JWT
  useEffect(() => {
    if (!session?.expiresAt) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const scheduleRefresh = () => {
      const nowMs = Date.now();
      const expMs = session.expiresAt! * 1000;
      const bufferMs = 60_000; // refresh 60s before expiry
      const delay = Math.max(0, expMs - nowMs - bufferMs);
      timeout = setTimeout(() => {
        provider
          .refreshSession()
          .catch((e: any) => console.warn("[AuthProvider] proactive refresh failed", e));
      }, delay);
    };

    scheduleRefresh();

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [session?.expiresAt, provider]);

  const value = {
    session,
    user,
    isLoading,
    isAuthenticated: !!session?.user,
    signIn: provider.signIn.bind(provider),
    signUp: provider.signUp.bind(provider),
    signInWithGoogle: provider.signInWithGoogle.bind(provider),
    signOut: provider.signOut.bind(provider),
    resetPassword: provider.resetPassword.bind(provider),
    updatePassword: provider.updatePassword.bind(provider),
    updateUser: provider.updateUser.bind(provider),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }

  return context;
}
