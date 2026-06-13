import { useCallback, useEffect, useState, type ReactNode } from "react";
import { translations, type Lang } from "./translations";
import { LanguageContext } from "./context";

const STORAGE_KEY = "studly-lang";

const getInitial = (): Lang => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "pl" || saved === "en") return saved;
  } catch { /* brak dostępu do localStorage */ }
  return "pl";
};

/** Dostarcza język aplikacji (PL/EN) i funkcję tłumaczącą t(). Domyślnie polski. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(getInitial);

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* brak dostępu do localStorage */ }
  }, [lang]);

  const t = useCallback((key: string) => translations[key]?.[lang] ?? key, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
