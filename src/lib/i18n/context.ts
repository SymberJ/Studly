import { createContext, useContext } from "react";
import type { Lang } from "./translations";

export type LangCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Zwraca tłumaczenie dla klucza w bieżącym języku (lub sam klucz, gdy brak). */
  t: (key: string) => string;
};

export const LanguageContext = createContext<LangCtx | null>(null);

export function useT(): LangCtx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT musi być użyte wewnątrz <LanguageProvider>");
  return ctx;
}
