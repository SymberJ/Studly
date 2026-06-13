/**
 * Import planu zajęć z pliku.
 *
 * Obsługiwane formaty:
 *  • CSV  — prosty plik (np. z arkusza). Kolumny: dzień, godzina, przedmiot,
 *           prowadzący, sala. Separator , lub ; (auto-wykrywanie).
 *  • ICS  — standard iCalendar (eksport z Kalendarza Google, USOS, Outlooka).
 *           Z każdego wydarzenia (VEVENT) bierzemy nazwę, salę, dzień i godzinę.
 *
 * Parser jest „czysty" — zwraca surowe wiersze (z nazwą przedmiotu jako tekstem).
 * Dopasowanie/utworzenie przedmiotów robi widok planu.
 */

export type ParsedRow = {
  day: string;       // znormalizowany polski dzień, np. "Poniedziałek"
  time: string;      // HH:MM
  course: string;    // nazwa przedmiotu
  teacher: string;
  room: string;
};

export type ImportResult = {
  rows: ParsedRow[];
  format: "csv" | "ics";
  skipped: number;   // wiersze pominięte (brak dnia/godziny/przedmiotu)
};

const DNI = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];

/** Znormalizuj nazwę dnia (różne pisownie PL/EN) do polskiej formy. */
export const normalizeDay = (input: string): string => {
  const s = input.trim().toLowerCase();
  if (!s) return "";
  const map: Record<string, string> = {
    "poniedzialek": "Poniedziałek", "poniedziałek": "Poniedziałek", "pon": "Poniedziałek", "pn": "Poniedziałek", "monday": "Poniedziałek", "mon": "Poniedziałek",
    "wtorek": "Wtorek", "wt": "Wtorek", "tuesday": "Wtorek", "tue": "Wtorek",
    "sroda": "Środa", "środa": "Środa", "sr": "Środa", "śr": "Środa", "wednesday": "Środa", "wed": "Środa",
    "czwartek": "Czwartek", "czw": "Czwartek", "cz": "Czwartek", "thursday": "Czwartek", "thu": "Czwartek",
    "piatek": "Piątek", "piątek": "Piątek", "pt": "Piątek", "friday": "Piątek", "fri": "Piątek",
    "sobota": "Sobota", "sob": "Sobota", "saturday": "Sobota", "sat": "Sobota",
    "niedziela": "Niedziela", "ndz": "Niedziela", "nd": "Niedziela", "sunday": "Niedziela", "sun": "Niedziela",
  };
  return map[s] ?? "";
};

/** Wyciągnij HH:MM z różnych zapisów godziny. */
export const normalizeTime = (input: string): string => {
  const s = input.trim();
  const m = s.match(/(\d{1,2})[:.](\d{2})/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  const digits = s.replace(/\D/g, "");
  if (digits.length === 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  if (digits.length === 3) return `0${digits[0]}:${digits.slice(1)}`;
  return "";
};

/* ── CSV ──────────────────────────────────────────────────── */
const splitCsvLine = (line: string, delim: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delim && !inQuotes) {
      out.push(cur); cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
};

const parseCsv = (text: string): { rows: ParsedRow[]; skipped: number } => {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { rows: [], skipped: 0 };

  const delim = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";

  // Wykryj nagłówek i zmapuj kolumny
  const first = splitCsvLine(lines[0], delim).map((c) => c.toLowerCase());
  const hasHeader = first.some((c) => /dzie|day|godz|time|przedmiot|course|subject/.test(c));
  const idx = { day: 0, time: 1, course: 2, teacher: 3, room: 4 };
  if (hasHeader) {
    first.forEach((c, i) => {
      if (/dzie|day/.test(c)) idx.day = i;
      else if (/godz|time|hour/.test(c)) idx.time = i;
      else if (/przedmiot|course|subject|nazwa/.test(c)) idx.course = i;
      else if (/prowadz|teacher|wyklad|nauczyc/.test(c)) idx.teacher = i;
      else if (/sala|room|miejsce|location/.test(c)) idx.room = i;
    });
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const line of dataLines) {
    const cols = splitCsvLine(line, delim);
    const day = normalizeDay(cols[idx.day] ?? "");
    const time = normalizeTime(cols[idx.time] ?? "");
    const course = (cols[idx.course] ?? "").trim();
    if (!day || !time || !course) { skipped++; continue; }
    rows.push({ day, time, course, teacher: (cols[idx.teacher] ?? "").trim(), room: (cols[idx.room] ?? "").trim() });
  }
  return { rows, skipped };
};

/* ── ICS ──────────────────────────────────────────────────── */
const parseIcs = (text: string): { rows: ParsedRow[]; skipped: number } => {
  // Rozwiń złożone linie (ICS łamie długie linie: kolejna zaczyna się spacją/tab)
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const rows: ParsedRow[] = [];
  let skipped = 0;
  let cur: Record<string, string> | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") {
      if (cur) {
        const r = eventToRow(cur);
        if (r) rows.push(r); else skipped++;
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const ci = line.indexOf(":");
    if (ci < 0) continue;
    const keyPart = line.slice(0, ci);      // np. DTSTART;TZID=Europe/Warsaw
    const value = line.slice(ci + 1);
    const key = keyPart.split(";")[0].toUpperCase();
    if (key === "DTSTART") cur["DTSTART"] = value;
    else if (key === "SUMMARY") cur["SUMMARY"] = value;
    else if (key === "LOCATION") cur["LOCATION"] = value;
    else if (key === "DESCRIPTION") cur["DESCRIPTION"] = value;
  }

  // Deduplikacja (wydarzenia cykliczne dają wiele wpisów tego samego zajęcia)
  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    const k = `${r.day}|${r.time}|${r.course.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { rows: deduped, skipped };
};

const eventToRow = (ev: Record<string, string>): ParsedRow | null => {
  const dt = ev["DTSTART"];
  const summary = (ev["SUMMARY"] ?? "").replace(/\\,/g, ",").replace(/\\n/g, " ").trim();
  if (!dt || !summary) return null;

  // DTSTART: 20260302T080000(Z) lub 20260302 (sam dzień — bez godziny)
  const m = dt.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m;
  if (!hh || !mm) return null; // brak godziny — pomijamy (to nie zajęcia)
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm));
  const day = DNI[date.getDay()];
  const time = `${hh}:${mm}`;
  const room = (ev["LOCATION"] ?? "").replace(/\\,/g, ",").trim();
  return { day, time, course: summary, teacher: "", room };
};

/* ── Wejście publiczne ────────────────────────────────────── */
export const parseScheduleFile = (filename: string, text: string): ImportResult => {
  const isIcs = /\.ics$/i.test(filename) || /BEGIN:VCALENDAR/i.test(text);
  if (isIcs) {
    const { rows, skipped } = parseIcs(text);
    return { rows, format: "ics", skipped };
  }
  const { rows, skipped } = parseCsv(text);
  return { rows, format: "csv", skipped };
};

/** Szablon CSV do pobrania. */
export const CSV_TEMPLATE =
  "dzień,godzina,przedmiot,prowadzący,sala\n" +
  "Poniedziałek,08:00,Matematyka dyskretna,dr Jan Kowalski,A-105\n" +
  "Poniedziałek,10:00,Programowanie,mgr Anna Nowak,B-12\n" +
  "Środa,14:30,Bazy danych,dr hab. Piotr Wiśniewski,C-3\n";
