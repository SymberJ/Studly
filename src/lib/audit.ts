/**
 * Dziennik audytu — rejestruje istotne akcje (logowania i operacje admina).
 *
 *  Tryb DEMO:      zapisuje wpisy w localStorage (z limitem).
 *  Tryb Supabase:  zapisuje w tabeli `audit_log`. Wpisy tworzą tylko admini
 *                  (polityka RLS), więc logowania zwykłych studentów nie są
 *                  duplikowane — ich ostatnie logowanie i tak widać w kolumnie
 *                  „Ostatnie logowanie" (auth.users.last_sign_in_at).
 */
import { loadJson, saveJson } from "./storage";
import { LS_AUDIT } from "../app/constants";
import { uid } from "./utils";
import { supabase, isSupabaseEnabled } from "./supabase";
import type { AuditAction, AuditEntry, User } from "../app/types";

const MAX_DEMO_ENTRIES = 300;

type LogOpts = {
  actor?: Pick<User, "id" | "name" | "email" | "role">;
  target?: string;
  details?: string;
};

/** Zapisuje zdarzenie do dziennika. Nie rzuca wyjątków (fire-and-forget). */
export const logEvent = (action: AuditAction, opts: LogOpts = {}) => {
  const actor = opts.actor;
  const actorName = actor?.name ?? "—";
  const actorEmail = actor?.email ?? "—";

  if (isSupabaseEnabled && supabase) {
    // Wpisy tworzą tylko admini (RLS); pomijamy, by nie generować błędów.
    if (actor?.role !== "admin") return;
    void supabase
      .from("audit_log")
      .insert({
        actor_id: actor.id,
        actor_email: actorEmail,
        action,
        target_email: opts.target ?? null,
        details: opts.details ?? null,
      })
      .then(({ error }) => {
        if (error) console.warn("audit_log insert:", error.message);
      });
    return;
  }

  // DEMO
  const entry: AuditEntry = {
    id: uid(),
    at: new Date().toISOString(),
    actorName,
    actorEmail,
    action,
    target: opts.target,
    details: opts.details,
  };
  const log = loadJson<AuditEntry[]>(LS_AUDIT, []);
  log.unshift(entry);
  saveJson(LS_AUDIT, log.slice(0, MAX_DEMO_ENTRIES));
};

/** Pobiera dziennik (najnowsze najpierw). */
export const fetchAuditLog = async (): Promise<AuditEntry[]> => {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: {
      id: string; created_at: string; actor_email: string | null;
      action: AuditAction; target_email: string | null; details: string | null;
    }) => ({
      id: r.id,
      at: r.created_at,
      actorName: r.actor_email ?? "—",
      actorEmail: r.actor_email ?? "—",
      action: r.action,
      target: r.target_email ?? undefined,
      details: r.details ?? undefined,
    }));
  }
  return loadJson<AuditEntry[]>(LS_AUDIT, []);
};

/** Czyści dziennik (tryb DEMO). */
export const clearAuditLog = () => saveJson(LS_AUDIT, []);
