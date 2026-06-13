/**
 * Warstwa repozytorium — jedyne miejsce, które wie SKĄD biorą się dane.
 *
 * Tryb DEMO  (brak env):   czyta/zapisuje localStorage, zero latencji.
 * Tryb Supabase (z env):   localStorage jako cache, Supabase jako backend.
 *   — odczyt: DataContext synchronizuje dane z Supabase przy logowaniu.
 *   — zapis:  repo zapisuje w localStorage (natychmiastowo) ORAZ wysyła do Supabase w tle.
 *
 * Gdy backend dojrzeje (DB + API), wystarczy zmienić implementacje poniżej.
 */
import { loadJson, saveJson } from "./storage";
import {
  LS_TASKS, LS_COURSES, LS_NOTES,
  LS_SCHEDULE, LS_GRADES, LS_CALENDAR,
} from "../app/constants";
import type { Task, Course, NoteEntry, ScheduleItem, Grade, CalendarEvent } from "../app/types";
import { supabase, isSupabaseEnabled } from "./supabase";

// Pomocnik: zapis w tle do Supabase bez blokowania UI
const bgSync = (table: string, data: unknown[]) => {
  if (!isSupabaseEnabled || !supabase || data.length === 0) return;
  // "upsert" nadpisuje wiersze z tym samym id; delete-then-upsert przy usuwaniu
  void supabase.from(table).upsert(data).then(({ error }) => {
    if (error) console.warn(`Supabase bgSync [${table}]:`, error.message);
  });
};

export const getTasks    = () => loadJson<Task[]>         (LS_TASKS,    []);
export const getCourses  = () => loadJson<Course[]>       (LS_COURSES,  []);
export const getNotes    = () => loadJson<NoteEntry[]>    (LS_NOTES,    []);
export const getSchedule = () => loadJson<ScheduleItem[]> (LS_SCHEDULE, []);
export const getGrades   = () => loadJson<Grade[]>        (LS_GRADES,   []);
export const getCalendarEvents = () => loadJson<CalendarEvent[]>(LS_CALENDAR, []);

export const saveTasks   = (v: Task[])          => { saveJson(LS_TASKS, v);    bgSync("tasks", v); };
export const saveCourses = (v: Course[])        => { saveJson(LS_COURSES, v);  bgSync("courses", v); };
export const saveNotes   = (v: NoteEntry[])     => { saveJson(LS_NOTES, v);    bgSync("notes", v); };
export const saveSchedule = (v: ScheduleItem[]) => { saveJson(LS_SCHEDULE, v); bgSync("schedule_items", v); };
export const saveGrades  = (v: Grade[])         => { saveJson(LS_GRADES, v);   bgSync("grades", v); };
export const saveCalendarEvents = (v: CalendarEvent[]) => { saveJson(LS_CALENDAR, v); bgSync("calendar_events", v); };
