/**
 * "Baza danych" użytkowników dla trybu DEMO (localStorage).
 *
 * To jest lokalny odpowiednik tabeli `profiles` z Supabase. Przechowuje
 * studentów i administratorów wraz z (demonstracyjnymi) hasłami, dzięki czemu
 * panel admina i logowanie działają BEZ podłączonego backendu.
 *
 * W trybie Supabase ten plik jest nieużywany — źródłem prawdy jest baza.
 */
import { loadJson, saveJson } from "../storage";
import { LS_USERS_DB } from "../../app/constants";
import type { User, UserRole, UserStatus } from "../../app/types";

/** Rekord przechowywany w bazie DEMO — profil + hasło (tylko demo!). */
export type DbRecord = { user: User; password: string };

/** Konta zakładane przy pierwszym uruchomieniu (gdy baza jest pusta). */
const SEED: DbRecord[] = [
  {
    password: "admin",
    user: {
      id: "u-admin",
      name: "Administrator",
      email: "admin@atins.pl",
      role: "admin",
      status: "active",
      createdAt: "2024-09-01T08:00:00.000Z",
      lastSignInAt: new Date().toISOString(),
    },
  },
  {
    password: "student",
    user: {
      id: "u-student",
      name: "Jan Kowalski",
      email: "student@atins.pl",
      role: "student",
      status: "active",
      albumNumber: "12345",
      fieldOfStudy: "Informatyka",
      studyYear: 2,
      studyGroup: "INF-2A",
      phone: "+48 600 100 200",
      createdAt: "2024-10-02T10:15:00.000Z",
      lastSignInAt: "2025-05-30T18:42:00.000Z",
    },
  },
  {
    password: "haslo123",
    user: {
      id: "u-002",
      name: "Anna Nowak",
      email: "anna.nowak@atins.pl",
      role: "student",
      status: "active",
      albumNumber: "12290",
      fieldOfStudy: "Informatyka",
      studyYear: 2,
      studyGroup: "INF-2A",
      createdAt: "2024-10-03T09:00:00.000Z",
      lastSignInAt: "2025-05-28T12:10:00.000Z",
    },
  },
  {
    password: "haslo123",
    user: {
      id: "u-003",
      name: "Piotr Wiśniewski",
      email: "piotr.wisniewski@atins.pl",
      role: "student",
      status: "active",
      albumNumber: "12101",
      fieldOfStudy: "Zarządzanie",
      studyYear: 3,
      studyGroup: "ZAR-3B",
      createdAt: "2023-10-04T11:30:00.000Z",
      lastSignInAt: "2025-05-20T08:05:00.000Z",
    },
  },
  {
    password: "haslo123",
    user: {
      id: "u-004",
      name: "Katarzyna Wójcik",
      email: "katarzyna.wojcik@atins.pl",
      role: "student",
      status: "inactive",
      albumNumber: "11980",
      fieldOfStudy: "Grafika",
      studyYear: 1,
      studyGroup: "GRAF-1A",
      createdAt: "2025-02-18T14:00:00.000Z",
    },
  },
  {
    password: "haslo123",
    user: {
      id: "u-005",
      name: "Michał Kamiński",
      email: "michal.kaminski@atins.pl",
      role: "student",
      status: "active",
      albumNumber: "12450",
      fieldOfStudy: "Informatyka",
      studyYear: 1,
      studyGroup: "INF-1C",
      createdAt: "2025-02-20T15:20:00.000Z",
      lastSignInAt: "2025-05-31T20:00:00.000Z",
    },
  },
];

/** Wczytuje całą bazę (z auto-seedem przy pierwszym uruchomieniu). */
export const getDb = (): DbRecord[] => {
  const db = loadJson<DbRecord[]>(LS_USERS_DB, []);
  if (db.length === 0) {
    saveJson(LS_USERS_DB, SEED);
    return SEED;
  }
  return db;
};

const persist = (db: DbRecord[]) => saveJson(LS_USERS_DB, db);

/** Lista profili (bez haseł) — używana w panelu admina. */
export const listUsers = (): User[] => getDb().map((r) => r.user);

/** Weryfikuje dane logowania. Zwraca profil albo null. */
export const verifyCredentials = (email: string, password: string): User | null => {
  const rec = getDb().find(
    (r) => r.user.email.toLowerCase() === email.toLowerCase() && r.password === password
  );
  if (!rec) return null;
  if (rec.user.status === "inactive") return null; // konto zablokowane
  // zapisz czas logowania
  touchLastSignIn(rec.user.id);
  return { ...rec.user, lastSignInAt: new Date().toISOString() };
};

const touchLastSignIn = (id: string) => {
  const db = getDb();
  const i = db.findIndex((r) => r.user.id === id);
  if (i >= 0) {
    db[i].user.lastSignInAt = new Date().toISOString();
    persist(db);
  }
};

/** Czy istnieje już użytkownik z tym e-mailem? */
export const emailExists = (email: string, exceptId?: string): boolean =>
  getDb().some(
    (r) => r.user.email.toLowerCase() === email.toLowerCase() && r.user.id !== exceptId
  );

/** Dodaje nowego użytkownika. */
export const addUser = (rec: DbRecord) => {
  const db = getDb();
  db.push(rec);
  persist(db);
};

/** Aktualizuje profil (i opcjonalnie hasło). */
export const updateUserDb = (id: string, patch: Partial<User>, password?: string) => {
  const db = getDb();
  const i = db.findIndex((r) => r.user.id === id);
  if (i < 0) return;
  db[i].user = { ...db[i].user, ...patch };
  if (password) db[i].password = password;
  persist(db);
};

/** Usuwa użytkownika. */
export const removeUser = (id: string) => {
  persist(getDb().filter((r) => r.user.id !== id));
};

/** Zmienia rolę. */
export const setUserRole = (id: string, role: UserRole) => updateUserDb(id, { role });

/** Zmienia status (aktywny / zablokowany). */
export const setUserStatus = (id: string, status: UserStatus) => updateUserDb(id, { status });

/** Przywraca bazę DEMO do stanu początkowego. */
export const resetDb = () => {
  saveJson(LS_USERS_DB, SEED);
  return SEED.map((r) => r.user);
};
