/**
 * Warstwa dostępu AI do danych aplikacji.
 *
 * Zbiera zwięzły „obraz" tego, co student ma w aplikacji (notatki, zadania,
 * przedmioty, oceny, plan, kalendarz) i zamienia go na tekst, który trafia do
 * modelu jako kontekst. Czyta przez te same repozytoria co reszta apki
 * (repo.ts), więc działa i w trybie demo (localStorage), i po wpięciu Supabase.
 *
 * Wszystko jest przycinane (limity znaków), żeby nie rozdmuchać zużycia tokenów.
 */
import { getTasks, getCourses, getNotes, getSchedule, getGrades, getCalendarEvents } from "../repo";
import type { Course, User } from "../../app/types";

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) + "…" : s);
const courseName = (courses: Course[], id?: string) =>
  courses.find((c) => c.id === id)?.name ?? "—";

/** Lista przedmiotów (do wyboru w UI, np. „streść notatki z…"). */
export function listCourses(): Course[] {
  return getCourses();
}

/** Notatki danego przedmiotu (lub wszystkie) jako tekst — na potrzeby streszczeń/fiszek. */
export function notesText(courseId?: string, maxChars = 12000): string {
  const courses = getCourses();
  const notes = getNotes()
    .filter((n) => (courseId ? n.courseId === courseId : true))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (notes.length === 0) return "";
  const blocks = notes.map(
    (n) => `### ${courseName(courses, n.courseId)} — ${n.date}\n${n.content.trim()}`,
  );
  return clip(blocks.join("\n\n"), maxChars);
}

/** Zwięzły przegląd całej aplikacji — wstrzykiwany jako kontekst systemowy czatu. */
export function buildOverview(user: User | null): string {
  const courses = getCourses();
  const tasks = getTasks();
  const grades = getGrades();
  const schedule = getSchedule();
  const events = getCalendarEvents();
  const notes = getNotes();

  const lines: string[] = [];

  if (user) {
    const who = [user.name, user.fieldOfStudy, user.studyYear ? `rok ${user.studyYear}` : ""]
      .filter(Boolean)
      .join(", ");
    lines.push(`STUDENT: ${who}`);
  }

  lines.push(
    `PRZEDMIOTY (${courses.length}): ${courses.map((c) => c.name).join(", ") || "brak"}`,
  );

  const openTasks = tasks.filter((t) => !t.done);
  if (openTasks.length) {
    lines.push(
      `ZADANIA OTWARTE (${openTasks.length}):\n` +
        openTasks
          .slice(0, 25)
          .map(
            (t) =>
              `- ${t.title}${t.dueDate ? ` (termin ${t.dueDate})` : ""}${
                t.priority ? ` [${t.priority}]` : ""
              }${t.courseId ? ` – ${courseName(courses, t.courseId)}` : ""}`,
          )
          .join("\n"),
    );
  }

  if (grades.length) {
    const byCourse = courses
      .map((c) => {
        const cg = grades.filter((g) => g.courseId === c.id);
        if (!cg.length) return null;
        const avg =
          cg.reduce((a, g) => a + g.value * g.weight, 0) /
          cg.reduce((a, g) => a + g.weight, 0);
        return `${c.name}: śr. ${avg.toFixed(2)} (${cg.length} ocen)`;
      })
      .filter(Boolean);
    if (byCourse.length) lines.push(`OCENY:\n- ${byCourse.join("\n- ")}`);
  }

  if (schedule.length) {
    lines.push(
      `PLAN ZAJĘĆ (${schedule.length}):\n` +
        schedule
          .slice(0, 30)
          .map(
            (s) =>
              `- ${s.day} ${s.time} ${courseName(courses, s.courseId)}${
                s.room ? ` (s. ${s.room})` : ""
              }`,
          )
          .join("\n"),
    );
  }

  const upcoming = [...events].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 15);
  if (upcoming.length) {
    lines.push(
      `KALENDARZ (najbliższe):\n` +
        upcoming
          .map((e) => `- ${e.date} ${e.time} ${e.title}${e.courseId ? ` – ${courseName(courses, e.courseId)}` : ""}`)
          .join("\n"),
    );
  }

  lines.push(`LICZBA NOTATEK: ${notes.length}`);

  return clip(lines.join("\n\n"), 8000);
}

/** Czy w ogóle jest co analizować (do komunikatów typu „brak notatek"). */
export function hasNotes(courseId?: string): boolean {
  return getNotes().some((n) => (courseId ? n.courseId === courseId : true));
}
