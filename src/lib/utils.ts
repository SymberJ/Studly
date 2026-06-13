import type { Lang } from "./i18n/translations";

export const uid = () => crypto.randomUUID();

export const isoToDisplay = (iso: string) => (iso ? iso.split("-").reverse().join("-") : "");

/** Mapowanie języka aplikacji na locale do formatowania dat. */
export const dateLocale = (lang: Lang) => (lang === "en" ? "en-GB" : "pl-PL");

/* Długa data zależna od języka, np. "wtorek, 2 czerwca 2026" / "Tuesday, 2 June 2026". */
export const formatLongDate = (lang: Lang, date: Date = new Date()) =>
  date.toLocaleDateString(dateLocale(lang), { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/* Liczebniki zależne od języka. Dla PL trzy formy, dla EN dwie (singular/plural). */
export const pluralize = (
  n: number, lang: Lang,
  pl: [one: string, few: string, many: string],
  en: [one: string, many: string],
) => {
  if (lang === "en") return Math.abs(n) === 1 ? en[0] : en[1];
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (abs === 1) return pl[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return pl[1];
  return pl[2];
};
