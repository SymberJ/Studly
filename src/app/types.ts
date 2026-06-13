export type TaskPriority = "high" | "medium" | "low";

export type Task = {
  id: string;
  title: string;
  dueDate?: string;
  done: boolean;
  createdAt: number;
  priority?: TaskPriority;
  courseId?: string;
};

export type Course = {
  id: string;
  name: string;
};

export type NoteEntry = {
  id: string;
  courseId: string;
  date: string;
  content: string;
};

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  courseId: string;
  color?: string;
  description?: string;
}

export type Teacher = {
  id: string;
  name: string;
  title: string;
  email?: string;
};

export type Grade = {
  id: string;
  courseId: string;
  value: number;
  weight: number;
  label: string;
};

export type UserRole = "student" | "admin";

export type UserStatus = "active" | "inactive";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  // ── Dane studenckie (opcjonalne — admin nie musi ich mieć) ──
  albumNumber?: string;   // nr albumu / indeksu
  fieldOfStudy?: string;  // kierunek
  studyYear?: number;     // rok studiów
  studyGroup?: string;    // grupa dziekańska
  phone?: string;
  status?: UserStatus;    // aktywny / nieaktywny (zablokowany)
  mustChangePassword?: boolean; // wymuś zmianę hasła przy następnym logowaniu
  isPremium?: boolean;    // plan Premium (asystent AI)
  createdAt?: string;     // ISO data utworzenia konta
  lastSignInAt?: string;  // ISO data ostatniego logowania
};

/** Akcje zapisywane w dzienniku audytu. */
export type AuditAction =
  | "login" | "logout"
  | "user.create" | "user.update" | "user.delete"
  | "user.role" | "user.status" | "user.password";

/** Wpis dziennika audytu. */
export type AuditEntry = {
  id: string;
  at: string;            // ISO timestamp
  actorName: string;
  actorEmail: string;
  action: AuditAction;
  target?: string;       // kogo dotyczy (e-mail lub nazwa)
  details?: string;      // dodatkowy opis
};

/** Rekord listy w panelu admina (rozszerza User o liczniki).
 *  Liczniki mogą być `null` w trybie DEMO (dane innych użytkowników
 *  nie są dostępne w localStorage tej przeglądarki). */
export type AdminUserRow = User & {
  taskCount: number | null;
  courseCount: number | null;
};

/** Agregaty na pulpit administratora. */
export type AdminStats = {
  users: number;
  students: number;
  admins: number;
  active: number;
  inactive: number;
  tasks: number;
  courses: number;
  notes: number;
};

/** Dane formularza tworzenia / edycji studenta. */
export type StudentInput = {
  name: string;
  email: string;
  password?: string;      // wymagane tylko przy tworzeniu
  role: UserRole;
  albumNumber?: string;
  fieldOfStudy?: string;
  studyYear?: number;
  studyGroup?: string;
  phone?: string;
  status?: UserStatus;
  mustChangePassword?: boolean;
};

export type ScheduleItem = {
  id: string;
  courseId: string;
  teacher: string;
  room: string;
  time: string;
  day: string;
};
