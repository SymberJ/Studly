import { useEffect, useState } from "react";
import { useT } from "../../lib/i18n/context";
import "./ThemeToggle.css";

type Theme = "dark" | "light";

const getInitial = (): Theme =>
  (document.documentElement.getAttribute("data-theme") as Theme) || "dark";

/** Przycisk przełączający jasny/ciemny motyw (księżyc ↔ słońce). */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitial);
  const { t } = useT();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("studly-theme", theme); } catch { /* brak dostępu do localStorage */ }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const isDark = theme === "dark";

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      title={isDark ? t("theme.toLight") : t("theme.toDark")}
      aria-label={t("theme.label")}
    >
      <i className={`ti ${isDark ? "ti-moon" : "ti-sun"}`} />
    </button>
  );
}
