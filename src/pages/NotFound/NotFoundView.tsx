import { Link } from "react-router-dom";
import { useT } from "../../lib/i18n/context";

export default function NotFoundView() {
  const { t } = useT();
  return (
    <div className="view-section-wrap" style={{ minHeight: "60vh", justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column", gap: "20px", textAlign: "center" }}>
      <div style={{ fontSize: "72px", lineHeight: 1 }}>404</div>
      <h2 style={{ fontSize: "24px", color: "var(--text)", margin: 0 }}>{t("notFound.title")}</h2>
      <p style={{ color: "var(--text-muted)", margin: 0 }}>{t("notFound.desc")}</p>
      <Link to="/dashboard" style={{ color: "var(--primary)", textDecoration: "none", fontSize: "14px" }}>
        {t("notFound.back")}
      </Link>
    </div>
  );
}
