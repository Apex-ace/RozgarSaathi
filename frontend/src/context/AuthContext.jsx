import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [backendUser, setBackendUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshBackendUser = async () => {
    try {
      const data = await apiFetch("/me");
      setBackendUser(data.user);
      setProfile(data.profile);
      return data;
    } catch (error) {
      setBackendUser(null);
      setProfile(null);
      throw error;
    }
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      if (data.session) {
        try {
          await refreshBackendUser();
        } catch {}
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session || null);
      if (session) {
        try {
          await refreshBackendUser();
        } catch {}
      } else {
        setBackendUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      backendUser,
      profile,
      loading,
      setProfile,
      refreshBackendUser,
      signOut: () => supabase.auth.signOut(),
    }),
    [session, backendUser, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthCtx() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthCtx must be used inside AuthProvider");
  return ctx;
}
