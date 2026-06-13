/**
 * Warstwa danych panelu administratora — jedno API, dwa źródła.
 *
 *  Tryb DEMO (brak env):  operuje na lokalnej "bazie" usersDb (localStorage).
 *                          Pełny CRUD działa natychmiast, bez backendu.
 *  Tryb Supabase (z env): czyta z widoku `admin_users` i tabeli `profiles`,
 *                          a tworzenie/usuwanie kont auth oraz reset hasła
 *                          realizuje przez funkcję brzegową (Edge Function)
 *                          `admin-users` (wymaga klucza service_role po stronie
 *                          serwera — patrz supabase/functions/admin-users).
 *
 *  Dzięki temu reszta aplikacji nie wie, skąd biorą się dane.
 */
import { supabase, isSupabaseEnabled } from "../supabase";
import { uid } from "../utils";
import {
  getTasks, getCourses, getNotes,
} from "../repo";
import {
  listUsers as demoListUsers,
  addUser, updateUserDb, removeUser,
  setUserRole, setUserStatus, emailExists, resetDb,
} from "../auth/usersDb";
import type {
  AdminStats, AdminUserRow, StudentInput, User, UserRole, UserStatus,
} from "../../app/types";

export type Result = { ok: boolean; error?: string };

/* ── Mapowanie wiersza widoku Supabase → AdminUserRow ─────── */
type SbAdminRow = {
  id: string; name: string; email: string; role: UserRole;
  avatar_url: string | null; status: string | null;
  album_number: string | null; field_of_study: string | null;
  study_year: number | null; study_group: string | null; phone: string | null;
  created_at: string; last_sign_in_at: string | null;
  task_count: number; course_count: number;
};

const fromSb = (r: SbAdminRow): AdminUserRow => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  avatarUrl: r.avatar_url ?? undefined,
  status: (r.status as UserStatus) ?? "active",
  albumNumber: r.album_number ?? undefined,
  fieldOfStudy: r.field_of_study ?? undefined,
  studyYear: r.study_year ?? undefined,
  studyGroup: r.study_group ?? undefined,
  phone: r.phone ?? undefined,
  createdAt: r.created_at,
  lastSignInAt: r.last_sign_in_at ?? undefined,
  taskCount: r.task_count,
  courseCount: r.course_count,
});

/* ── Lista użytkowników ───────────────────────────────────── */
export const fetchUsers = async (): Promise<AdminUserRow[]> => {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase
      .from("admin_users")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as SbAdminRow[]).map(fromSb);
  }

  // DEMO: liczniki znamy tylko dla aktualnej przeglądarki → null dla innych
  return demoListUsers().map((u) => ({
    ...u,
    status: u.status ?? "active",
    taskCount: null,
    courseCount: null,
  }));
};

/* ── Statystyki ──────────────────────────────────────────── */
export const fetchStats = async (): Promise<AdminStats> => {
  if (isSupabaseEnabled && supabase) {
    const [profiles, tasks, courses, notes] = await Promise.all([
      supabase.from("profiles").select("role, status"),
      supabase.from("tasks").select("id", { count: "exact", head: true }),
      supabase.from("courses").select("id", { count: "exact", head: true }),
      supabase.from("notes").select("id", { count: "exact", head: true }),
    ]);
    const rows = (profiles.data as { role: UserRole; status: string | null }[]) ?? [];
    return {
      users: rows.length,
      students: rows.filter((r) => r.role === "student").length,
      admins: rows.filter((r) => r.role === "admin").length,
      active: rows.filter((r) => (r.status ?? "active") === "active").length,
      inactive: rows.filter((r) => r.status === "inactive").length,
      tasks: tasks.count ?? 0,
      courses: courses.count ?? 0,
      notes: notes.count ?? 0,
    };
  }

  // DEMO
  const users = demoListUsers();
  return {
    users: users.length,
    students: users.filter((u) => u.role === "student").length,
    admins: users.filter((u) => u.role === "admin").length,
    active: users.filter((u) => (u.status ?? "active") === "active").length,
    inactive: users.filter((u) => u.status === "inactive").length,
    tasks: getTasks().length,
    courses: getCourses().length,
    notes: getNotes().length,
  };
};

/* ── Tworzenie użytkownika ───────────────────────────────── */
export const createUser = async (input: StudentInput): Promise<Result> => {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "create", payload: input },
    });
    if (error) return { ok: false, error: humanizeFnError(error.message) };
    if (data?.error) return { ok: false, error: data.error };
    return { ok: true };
  }

  // DEMO
  if (!input.email.trim()) return { ok: false, error: "admin.api.email" };
  if (!input.password) return { ok: false, error: "admin.api.password" };
  if (emailExists(input.email)) return { ok: false, error: "admin.api.emailExists" };

  const newUser: User = {
    id: uid(),
    name: input.name.trim() || input.email.split("@")[0],
    email: input.email.trim(),
    role: input.role,
    status: input.status ?? "active",
    mustChangePassword: input.mustChangePassword ?? false,
    albumNumber: input.albumNumber || undefined,
    fieldOfStudy: input.fieldOfStudy || undefined,
    studyYear: input.studyYear || undefined,
    studyGroup: input.studyGroup || undefined,
    phone: input.phone || undefined,
    createdAt: new Date().toISOString(),
  };
  addUser({ user: newUser, password: input.password });
  return { ok: true };
};

/* ── Edycja profilu ──────────────────────────────────────── */
export const updateUser = async (id: string, patch: Partial<StudentInput>): Promise<Result> => {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase
      .from("profiles")
      .update({
        name: patch.name,
        role: patch.role,
        status: patch.status,
        album_number: patch.albumNumber ?? null,
        field_of_study: patch.fieldOfStudy ?? null,
        study_year: patch.studyYear ?? null,
        study_group: patch.studyGroup ?? null,
        phone: patch.phone ?? null,
      })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    // zmiana hasła wymaga funkcji brzegowej
    if (patch.password) {
      const { error: fnErr, data } = await supabase.functions.invoke("admin-users", {
        body: { action: "reset-password", payload: { id, password: patch.password } },
      });
      if (fnErr) return { ok: false, error: humanizeFnError(fnErr.message) };
      if (data?.error) return { ok: false, error: data.error };
    }
    return { ok: true };
  }

  // DEMO
  if (patch.email && emailExists(patch.email, id))
    return { ok: false, error: "admin.api.emailExists" };
  updateUserDb(
    id,
    {
      name: patch.name,
      email: patch.email,
      role: patch.role,
      status: patch.status,
      albumNumber: patch.albumNumber,
      fieldOfStudy: patch.fieldOfStudy,
      studyYear: patch.studyYear,
      studyGroup: patch.studyGroup,
      phone: patch.phone,
    },
    patch.password
  );
  return { ok: true };
};

/* ── Usuwanie użytkownika ────────────────────────────────── */
export const deleteUser = async (id: string): Promise<Result> => {
  if (isSupabaseEnabled && supabase) {
    const { error, data } = await supabase.functions.invoke("admin-users", {
      body: { action: "delete", payload: { id } },
    });
    if (error) return { ok: false, error: humanizeFnError(error.message) };
    if (data?.error) return { ok: false, error: data.error };
    return { ok: true };
  }
  removeUser(id);
  return { ok: true };
};

/* ── Szybkie akcje: rola / status ────────────────────────── */
export const changeRole = async (id: string, role: UserRole): Promise<Result> => {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  setUserRole(id, role);
  return { ok: true };
};

export const changeStatus = async (id: string, status: UserStatus): Promise<Result> => {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  setUserStatus(id, status);
  return { ok: true };
};

/* ── Reset hasła (opcjonalnie z wymuszeniem zmiany) ──────── */
export const resetPassword = async (
  id: string,
  password: string,
  forceChange: boolean
): Promise<Result> => {
  if (isSupabaseEnabled && supabase) {
    const { error: fnErr, data } = await supabase.functions.invoke("admin-users", {
      body: { action: "reset-password", payload: { id, password } },
    });
    if (fnErr) return { ok: false, error: humanizeFnError(fnErr.message) };
    if (data?.error) return { ok: false, error: data.error };
    const { error } = await supabase
      .from("profiles")
      .update({ must_change_password: forceChange })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  // DEMO
  if (!password) return { ok: false, error: "admin.api.newPassword" };
  updateUserDb(id, { mustChangePassword: forceChange }, password);
  return { ok: true };
};

/* ── Reset bazy DEMO ─────────────────────────────────────── */
export const resetDemoData = (): User[] => resetDb();

/* ── Pomocnik komunikatów ────────────────────────────────── */
const humanizeFnError = (msg: string): string =>
  /not found|404|failed to fetch/i.test(msg)
    ? "admin.api.edgeMissing"
    : msg;
