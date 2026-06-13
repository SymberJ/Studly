/**
 * Eksport danych użytkownika (RODO / GDPR — prawo do przenoszenia danych).
 *
 * Zbiera wszystkie dane konta i zwraca je jako jeden obiekt JSON.
 *  Tryb DEMO:     czyta z repo (localStorage).
 *  Tryb Supabase: pobiera bezpośrednio z bazy (komplet, nie tylko cache).
 */
import {
  getTasks, getCourses, getNotes,
  getSchedule, getGrades, getCalendarEvents,
} from "./repo";
import { supabase, isSupabaseEnabled } from "./supabase";
import type { User } from "../app/types";

export type UserDataExport = {
  exportedAt: string;
  source: "demo" | "supabase";
  profile: {
    name: string;
    email: string;
    role: string;
    albumNumber?: string;
    fieldOfStudy?: string;
    studyYear?: number;
    studyGroup?: string;
    phone?: string;
  };
  tasks: unknown[];
  courses: unknown[];
  notes: unknown[];
  schedule: unknown[];
  grades: unknown[];
  calendarEvents: unknown[];
};

export const gatherUserData = async (user: User): Promise<UserDataExport> => {
  const profile = {
    name: user.name,
    email: user.email,
    role: user.role,
    albumNumber: user.albumNumber,
    fieldOfStudy: user.fieldOfStudy,
    studyYear: user.studyYear,
    studyGroup: user.studyGroup,
    phone: user.phone,
  };

  if (isSupabaseEnabled && supabase) {
    const [tasks, courses, notes, schedule, grades, calendar] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id),
      supabase.from("courses").select("*").eq("user_id", user.id),
      supabase.from("notes").select("*").eq("user_id", user.id),
      supabase.from("schedule_items").select("*").eq("user_id", user.id),
      supabase.from("grades").select("*").eq("user_id", user.id),
      supabase.from("calendar_events").select("*").eq("user_id", user.id),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      source: "supabase",
      profile,
      tasks: tasks.data ?? [],
      courses: courses.data ?? [],
      notes: notes.data ?? [],
      schedule: schedule.data ?? [],
      grades: grades.data ?? [],
      calendarEvents: calendar.data ?? [],
    };
  }

  // DEMO
  return {
    exportedAt: new Date().toISOString(),
    source: "demo",
    profile,
    tasks: getTasks(),
    courses: getCourses(),
    notes: getNotes(),
    schedule: getSchedule(),
    grades: getGrades(),
    calendarEvents: getCalendarEvents(),
  };
};

/** Uruchamia pobranie pliku JSON w przeglądarce. */
export const downloadJson = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};
