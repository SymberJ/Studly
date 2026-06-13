import { useMemo, useState } from "react";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
import { DEFAULT_TEACHERS } from "../../app/teachers";
import { useT } from "../../lib/i18n/context";
import "./TeachersView.css";

export default function TeachersView() {
  const teachers = DEFAULT_TEACHERS;
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const filteredAndSorted = useMemo(() => {
    const filtered = teachers.filter((tt) => tt.name.toLowerCase().includes(search.toLowerCase()));

    return [...filtered].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();

      if (sortOrder === "asc") {
        return nameA.localeCompare(nameB, "pl");
      } else {
        return nameB.localeCompare(nameA, "pl");
      }
    });
  }, [teachers, search, sortOrder]);

  return (
    <div className="view-section-wrap">
      <SectionHeader
        title={t("teachers.title")}
        subtitle={t("teachers.subtitle")}
        emoji="👨‍🏫"
      />

      {/* UJEDNOLICONY KONTENER TREŚCI */}
      <div className="section-content-glass">
        <div className="teach-search-wrapper" style={{ marginBottom: "30px" }}>
          <div className="teach-search-box">
            <input
              type="text"
              className="teach-search-input"
              placeholder={t("teachers.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="teach-search-clear" onClick={() => setSearch("")}>
                ✕
              </button>
            )}
            <span className="teach-search-icon">🔍</span>
          </div>

          <button
            className="teach-sort-btn"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            title={sortOrder === "asc" ? t("teachers.sortDesc") : t("teachers.sortAsc")}
          >
            <span className="teach-sort-text">{sortOrder === "asc" ? "A-Z" : "Z-A"}</span>
            <span className={`teach-sort-icon ${sortOrder === "desc" ? "is-desc" : ""}`}>↓</span>
          </button>
        </div>

        <div className="teach-grid-modern">
          {filteredAndSorted.map((tt) => (
            <div key={tt.id} className="teacher-card-modern">
              <div className="teacher-card-modern__avatar">
                <span>👨‍🏫</span>
              </div>
              <div className="teacher-card-modern__info">
                <span className="teacher-card-modern__title-label">{tt.title}</span>
                <h4 className="teacher-card-modern__name">{tt.name}</h4>
                <p className="teacher-card-modern__email">{tt.email}</p>
              </div>
              <a href={`mailto:${tt.email}`} className="teacher-card-modern__link" title={t("teachers.emailTitle")}>
                {t("teachers.contact")}
              </a>
            </div>
          ))}
        </div>

        {filteredAndSorted.length === 0 && (
          <div className="info-banner" style={{ textAlign: "center", marginTop: "40px", opacity: 0.6 }}>
            {t("teachers.notFound")}
          </div>
        )}
      </div>
    </div>
  );
}
