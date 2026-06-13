import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../../app/types";
import { loadJson, saveJson } from "../storage";
import { LS_SESSION } from "../../app/constants";
import { supabase, isSupabaseEnabled } from "../supabase";
import { findDemoUser } from "./demoUsers";
import { AuthContext } from "./context";
import { logEvent } from "../audit";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() =>
    loadJson<User | null>(LS_SESSION, null)
  );
  const [loading, setLoading] = useState(isSupabaseEnabled);

  // Supabase: odtwórz sesję z tokena i nasłuchuj zmian
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase!
          .from("profiles")
          .select("id, name, role, avatar_url, status, must_change_password")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              const u: User = {
                id: data.id,
                name: data.name,
                email: session.user.email ?? "",
                role: data.role,
                avatarUrl: data.avatar_url ?? undefined,
                status: data.status ?? "active",
                mustChangePassword: data.must_change_password ?? false,
              };
              setUser(u);
              saveJson(LS_SESSION, u);
            }
          });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session?.user) {
          setUser(null);
          saveJson(LS_SESSION, null);
          return;
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const { data } = await supabase!
            .from("profiles")
            .select("id, name, role, avatar_url, status, must_change_password")
            .eq("id", session.user.id)
            .single();
          if (data) {
            const u: User = {
              id: data.id,
              name: data.name,
              email: session.user.email ?? "",
              role: data.role,
              avatarUrl: data.avatar_url ?? undefined,
              status: data.status ?? "active",
              mustChangePassword: data.must_change_password ?? false,
            };
            setUser(u);
            saveJson(LS_SESSION, u);
            if (event === "SIGNED_IN") logEvent("login", { actor: u });
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Demo: persist session in localStorage
  useEffect(() => {
    if (isSupabaseEnabled) return;
    saveJson(LS_SESSION, user);
  }, [user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      // ── Tryb Supabase ─────────────────────────────────────
      if (isSupabaseEnabled && supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return false;
        return true; // setUser jest obsługiwane przez onAuthStateChange
      }

      // ── Tryb DEMO ─────────────────────────────────────────
      const found = findDemoUser(email.trim(), password);
      if (found) { setUser(found); logEvent("login", { actor: found }); return true; }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (user) logEvent("logout", { actor: user });
    if (isSupabaseEnabled && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    saveJson(LS_SESSION, null);
  };

  const updateUser = async (patch: Partial<User>) => {
    const updated = user ? { ...user, ...patch } : null;
    setUser(updated);
    if (updated) saveJson(LS_SESSION, updated);

    // Supabase: zapisz zmiany w profilu
    if (isSupabaseEnabled && supabase && user) {
      await supabase.from("profiles").update({
        name: patch.name ?? user.name,
        avatar_url: patch.avatarUrl ?? user.avatarUrl ?? null,
      }).eq("id", user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, loading, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
