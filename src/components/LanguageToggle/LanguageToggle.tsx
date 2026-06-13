import { useT } from "../../lib/i18n/context";
import "./LanguageToggle.css";

/* Małe flagi jako SVG — niezależne od emoji (na Windowsie emoji flag się nie renderują). */
function FlagPL() {
  return (
    <svg viewBox="0 0 20 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="20" height="7" fill="#ffffff" />
      <rect y="7" width="20" height="7" fill="#dc143c" />
    </svg>
  );
}

function FlagUK() {
  return (
    <svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 60,30 M60,0 0,30" stroke="#ffffff" strokeWidth="6" />
      <path d="M0,0 60,30 M60,0 0,30" stroke="#c8102e" strokeWidth="4" />
      <rect x="25" width="10" height="30" fill="#ffffff" />
      <rect y="10" width="60" height="10" fill="#ffffff" />
      <rect x="27" width="6" height="30" fill="#c8102e" />
      <rect y="12" width="60" height="6" fill="#c8102e" />
    </svg>
  );
}

/** Przełącznik języka PL ↔ EN — flaga bieżącego języka z płynnym przejściem przy zmianie. */
export default function LanguageToggle() {
  const { lang, setLang, t } = useT();
  const toggle = () => setLang(lang === "pl" ? "en" : "pl");

  return (
    <button
      className="lang-toggle"
      onClick={toggle}
      title={t("lang.toggle")}
      aria-label={t("lang.toggle")}
    >
      {/* key={lang} → remount przy zmianie, więc animacja odpala się za każdym razem */}
      <span className="lang-toggle__inner" key={lang}>
        <span className="lang-toggle__flag">{lang === "pl" ? <FlagPL /> : <FlagUK />}</span>
        <span className="lang-toggle__code">{lang.toUpperCase()}</span>
      </span>
    </button>
  );
}
