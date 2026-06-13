import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Course, NoteEntry, Task } from "../app/types";
import {
  getTasks, saveTasks,
  getCourses, saveCourses,
  getNotes, saveNotes,
} from "./repo";
import { supabase, isSupabaseEnabled } from "./supabase";
import { useAuth } from "./auth/useAuth";

type DataContextType = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  notes: NoteEntry[];
  setNotes: React.Dispatch<React.SetStateAction<NoteEntry[]>>;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

/** Odczytuje i synchronizuje dane aplikacji.
 *  Tryb DEMO: czysto localStorage.
 *  Tryb Supabase: przy logowaniu ściąga dane z bazy, przy zapisie wysyła w tle. */
export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>(() => getTasks());
  const [courses, setCourses] = useState<Course[]>(() => getCourses());
  const [notes, setNotes] = useState<NoteEntry[]>(() => getNotes());

  // Persist to localStorage on every change
  useEffect(() => { saveTasks(tasks); }, [tasks]);
  useEffect(() => { saveCourses(courses); }, [courses]);
  useEffect(() => { saveNotes(notes); }, [notes]);

  // Supabase: pull fresh data when user signs in
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase || !user) return;

    const fetchAll = async () => {
      const [{ data: dbTasks }, { data: dbCourses }, { data: dbNotes }] =
        await Promise.all([
          supabase!.from("tasks").select("*").eq("user_id", user.id),
          supabase!.from("courses").select("*").eq("user_id", user.id),
          supabase!.from("notes").select("*").eq("user_id", user.id),
        ]);

      if (dbTasks)   { setTasks(dbTasks as Task[]); saveTasks(dbTasks as Task[]); }
      if (dbCourses) { setCourses(dbCourses as Course[]); saveCourses(dbCourses as Course[]); }
      if (dbNotes)   { setNotes(dbNotes as NoteEntry[]); saveNotes(dbNotes as NoteEntry[]); }
    };

    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <DataContext.Provider value={{ tasks, setTasks, courses, setCourses, notes, setNotes }}>
      {children}
    </DataContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData musi być użyte wewnątrz <DataProvider>");
  return ctx;
};
