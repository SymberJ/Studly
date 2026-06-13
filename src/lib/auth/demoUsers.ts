/**
 * Logowanie w trybie DEMO. Weryfikacja danych odbywa się teraz względem
 * lokalnej "bazy" użytkowników (src/lib/auth/usersDb.ts), którą zarządza
 * panel administratora. Dzięki temu studenci dodani przez admina mogą się
 * od razu zalogować — bez backendu.
 *
 * W trybie Supabase ten plik jest nieużywany (logowanie idzie przez auth).
 */
import type { User } from "../../app/types";
import { verifyCredentials } from "./usersDb";

export const findDemoUser = (email: string, password: string): User | null =>
  verifyCredentials(email.trim(), password);
