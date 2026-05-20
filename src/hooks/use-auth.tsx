import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/auth.functions";

export type Role = "admin" | "staff";

type AuthValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: Role | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AuthCtx = React.createContext<AuthValue | null>(null);

const ROLE_KEY = "stockhub.role";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [role, setRole] = React.useState<Role | null>(() => {
    if (typeof window === "undefined") return null;
    const cached = window.localStorage.getItem(ROLE_KEY);
    return cached === "admin" || cached === "staff" ? cached : null;
  });
  const [loading, setLoading] = React.useState(true);

  const loadRole = React.useCallback(async () => {
    try {
      const { role } = await getMyRole();
      setRole(role);
      if (typeof window !== "undefined") window.localStorage.setItem(ROLE_KEY, role);
    } catch {
      setRole(null);
      if (typeof window !== "undefined") window.localStorage.removeItem(ROLE_KEY);
    }
  }, []);

  React.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      if (!s) {
        setRole(null);
        if (typeof window !== "undefined") window.localStorage.removeItem(ROLE_KEY);
      } else if (event === "SIGNED_IN") {
        void loadRole();
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session && typeof window !== "undefined" && !window.localStorage.getItem(ROLE_KEY)) {
        void loadRole();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadRole]);

  const value: AuthValue = {
    loading,
    session,
    user: session?.user ?? null,
    role,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshRole: loadRole,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
