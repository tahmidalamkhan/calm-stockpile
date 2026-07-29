import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/custom-client";
import { getMyAccessStatus, type AccessStatus } from "@/lib/access";

export type Role = "admin" | "staff";

type AuthValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: Role | null;
  /** Approval state for the signed-in account. */
  access: AccessStatus | null;
  /** True once the role/approval lookup has completed at least once. */
  roleChecked: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AuthCtx = React.createContext<AuthValue | null>(null);

const ROLE_KEY = "stockhub.role";
const ACCESS_KEY = "stockhub.access";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [role, setRole] = React.useState<Role | null>(() => {
    if (typeof window === "undefined") return null;
    const cached = window.localStorage.getItem(ROLE_KEY);
    return cached === "admin" || cached === "staff" ? cached : null;
  });
  const [access, setAccess] = React.useState<AccessStatus | null>(() => {
    if (typeof window === "undefined") return null;
    const cached = window.localStorage.getItem(ACCESS_KEY);
    return cached === "approved" || cached === "pending" || cached === "rejected"
      ? (cached as AccessStatus)
      : null;
  });
  const [loading, setLoading] = React.useState(true);
  const [roleChecked, setRoleChecked] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ROLE_KEY) !== null;
  });

  const loadRole = React.useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("no user");
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      if (error) throw error;
      const roles = (data ?? []).map((r) => r.role as Role);

      if (roles.length === 0) {
        // No role granted yet — the account still needs admin approval.
        const status = await getMyAccessStatus(userData.user.id);
        const resolved: AccessStatus = status === "rejected" ? "rejected" : "pending";
        setRole(null);
        setAccess(resolved);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(ROLE_KEY);
          window.localStorage.setItem(ACCESS_KEY, resolved);
        }
        return;
      }

      const resolved: Role = roles.includes("admin") ? "admin" : "staff";
      setRole(resolved);
      setAccess("approved");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ROLE_KEY, resolved);
        window.localStorage.setItem(ACCESS_KEY, "approved");
      }
    } catch {
      // Never fall through to granting access on failure — stay pending.
      setRole(null);
      setAccess("pending");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ROLE_KEY);
        window.localStorage.setItem(ACCESS_KEY, "pending");
      }
    } finally {
      setRoleChecked(true);
    }
  }, []);

  React.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      if (!s) {
        setRole(null);
        setAccess(null);
        setRoleChecked(false);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(ROLE_KEY);
          window.localStorage.removeItem(ACCESS_KEY);
        }
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
    access,
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
