import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthContextValue } from "./authTypes";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const devBypassAuthEnabled =
  import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === "true";
const devBypassUser = {
  id: "dev-bypass-user",
  email: "dev@guildledger.local",
  app_metadata: {
    provider: "email",
    providers: ["email"]
  },
  user_metadata: {
    display_name: "Dev User"
  },
  aud: "authenticated",
  created_at: "1970-01-01T00:00:00.000Z"
} as User;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevBypassActive, setIsDevBypassActive] = useState(devBypassAuthEnabled);

  useEffect(() => {
    if (isDevBypassActive) {
      setSession(null);
      setUser(devBypassUser);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setSession(null);
          setUser(null);
        } else {
          setSession(data.session ?? null);
          setUser(data.session?.user ?? null);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setIsLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [isDevBypassActive]);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    if (devBypassAuthEnabled) {
      setIsDevBypassActive(true);
      setSession(null);
      setUser(devBypassUser);
      setIsLoading(false);
      return { ok: true };
    }

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      return { ok: false, error: "Email and password are required." };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    if (devBypassAuthEnabled) {
      setIsDevBypassActive(false);
      setSession(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthenticated: Boolean(user),
      isLoading,
      signIn,
      signOut
    }),
    [user, session, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
