import { useEffect, useState, useMemo } from "react";
import type { Course, Grade } from "../../app/types";
import { getGrades, saveGrades } from "../../lib/repo";
import { uid } from "../../lib/utils";
import { useCountUp } from "../../lib/useCountUp";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
import { useData } from "../../lib/DataContext";
import { useT } from "../../lib/i18n/context";
import "./GradesView.css";

export default function GradesView() {
  const { courses, setCourses } = useData();
  const { t } = useT();
  const [grades, setGrades] = useState<Grade[]>(() => getGrades());

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState<string>("5.0");
  const [weight, setWeight] = useState<string>("1");

  const activeCourseId = selectedCourseId || courses[0]?.id || "";

  useEffect(() => {
    saveGrades(grades);
  }, [grades]);

  const addCourse = () => {
    const name = window.prompt(t("grades.promptNewCourse"));
    if (!name || name.trim() === "") return;

    const newCourse: Course = {
      id: uid(),
      name: name.trim(),
    };

    setCourses([...courses, newCourse]);
    setSelectedCourseId(newCourse.id);
  };

  const deleteCourse = (courseId: string) => {
    if (window.confirm(t("grades.confirmDeleteCourse"))) {
      setCourses(courses.filter((c) => c.id !== courseId));
      setGrades(grades.filter((g) => g.courseId !== courseId));
      if (activeCourseId === courseId) {
        setSelectedCourseId(courses.find((c) => c.id !== courseId)?.id || "");
      }
    }
  };

  const addGrade = () => {
    if (!label.trim() || !activeCourseId) return;

    const newGrade: Grade = {
      id: uid(),
      courseId: activeCourseId,
      label: label.trim(),
      value: parseFloat(value),
      weight: parseFloat(weight),
    };

    setGrades([...grades, newGrade]);
    setLabel("");
  };

  const deleteGrade = (id: string) => {
    setGrades(grades.filter((g) => g.id !== id));
  };

  const calculateAverage = (courseGrades: Grade[]) => {
    if (courseGrades.length === 0) return "0.00";
    const sum = courseGrades.reduce((acc, g) => acc + g.value * g.weight, 0);
    const weights = courseGrades.reduce((acc, g) => acc + g.weight, 0);
    return (sum / weights).toFixed(2);
  };

  const totalAverage = useMemo(() => {
    const averages = courses
      .map((c) => {
        const cg = grades.filter((g) => g.courseId === c.id);
        return cg.length > 0 ? parseFloat(calculateAverage(cg)) : null;
      })
      .filter((a) => a !== null) as number[];

    if (averages.length === 0) return "0.00";
    return (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(2);
  }, [courses, grades]);

  const courseGrades = grades.filter((g) => g.courseId === activeCourseId);

  /* Animowane statystyki (count-up) — spójne z Dashboardem. */
  const avgCount     = useCountUp(parseFloat(totalAverage) || 0, 700, 2);
  const coursesCount = useCountUp(courses.length);
  const gradesCount  = useCountUp(grades.length);

  const coursesWithAverages = courses.map((c) => ({
    ...c,
    avg: calculateAverage(grades.filter((g) => g.courseId === c.id)),
  }));

  return (
    <div className="view-section-wrap">
      <SectionHeader
        title={t("grades.title")}
        subtitle={t("grades.subtitle")}
        emoji="📊"
      />

      <div className="grd-wrapper">
        {/* STATYSTYKI GÓRNE */}
        <div className="grd-stats-top">
          <div className="grd-stat-card">
            <span className="grd-stat-label">{t("grades.overallAvg")}</span>
            <div className="grd-stat-value">{avgCount}</div>
          </div>
          <div className="grd-stat-card">
            <span className="grd-stat-label">{t("grades.courseCount")}</span>
            <div className="grd-stat-value">{coursesCount}</div>
          </div>
          <div className="grd-stat-card">
            <span className="grd-stat-label">{t("grades.gradeCount")}</span>
            <div className="grd-stat-value">{gradesCount}</div>
          </div>
        </div>

        {/* GŁÓWNA TREŚĆ OCEN */}
        <div className="grd-three-column-grid">
          {/* 1. KAFELEK: DODAWANIE */}
          <div className="grd-tile">
            <div className="grd-header-inline">
              <h3 className="grd-title">{t("grades.addGrade")}</h3>
            </div>
            <div className="grd-form">
              <div className="grd-form-group">
                <div className="grd-label-row">
                  <label>{t("grades.course")}</label>
                  {activeCourseId && (
                    <button className="grd-course-delete-link" onClick={() => deleteCourse(activeCourseId)}>
                      {t("grades.deleteCourse")}
                    </button>
                  )}
                </div>
                <select
                  className="grd-input"
                  value={activeCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grd-form-group">
                <label>{t("grades.nameLabel")}</label>
                <input
                  className="grd-input"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t("grades.namePlaceholder")}
                />
              </div>

              <div className="grd-row">
                <div className="grd-form-group">
                  <label>{t("grades.grade")}</label>
                  <select className="grd-input" value={value} onChange={(e) => setValue(e.target.value)}>
                    <option value="5.0">5.0</option>
                    <option value="4.5">4.5</option>
                    <option value="4.0">4.0</option>
                    <option value="3.5">3.5</option>
                    <option value="3.0">3.0</option>
                    <option value="2.0">2.0</option>
                  </select>
                </div>
                <div className="grd-form-group">
                  <label>{t("grades.weight")}</label>
                  <input
                    type="number"
                    className="grd-input"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
              </div>

              <button className="grd-btn-add" onClick={addGrade} disabled={!label.trim() || !activeCourseId}>
                {t("grades.addToBook")}
              </button>
            </div>
          </div>

          {/* 2. KAFELEK: DZIENNIK */}
          <div className="grd-tile">
            <div className="grd-header-inline">
              <h3 className="grd-title">{t("grades.book")}</h3>
              <div className="grd-badge-avg">{calculateAverage(courseGrades)}</div>
            </div>
            <div className="grd-list">
              {courseGrades.length > 0 ? (
                courseGrades.map((g) => (
                  <div key={g.id} className="grd-item">
                    <div>
                      <div className="grd-item-label">{g.label}</div>
                      <div className="grd-item-sub" style={{ fontSize: '11px', opacity: 0.6 }}>{t("grades.weightLabel")} {g.weight}</div>
                    </div>
                    <div className="grd-item-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`grd-item-value v-${g.value.toString().replace(".", "-")}`}>{g.value.toFixed(1)}</span>
                      <button className="grd-btn-del" onClick={() => deleteGrade(g.id)}>
                        ×
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="grd-empty">{t("grades.emptyCourse")}</div>
              )}
            </div>
          </div>

          {/* 3. KAFELEK: PRZEDMIOTY */}
          <div className="grd-tile">
            <div className="grd-header-inline">
              <h3 className="grd-title">{t("grades.courses")}</h3>
              <button className="grd-btn-add-small" onClick={addCourse}>+</button>
            </div>
            <div className="grd-course-summary-list">
              {coursesWithAverages.map((c) => (
                <div
                  key={c.id}
                  className={`grd-summary-item ${activeCourseId === c.id ? "is-active" : ""}`}
                  onClick={() => setSelectedCourseId(c.id)}
                >
                  <span className="grd-summary-name">{c.name}</span>
                  <span className="grd-summary-avg">{c.avg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CHART */}
        {coursesWithAverages.length > 0 && (
          <GradeChart courses={coursesWithAverages} totalAverage={totalAverage} />
        )}
      </div>
    </div>
  );
}
/* ===== GRADE CHART COMPONENT ===== */
function GradeChart({ courses, totalAverage }: { courses: Array<{ id: string; name: string; avg: string }>; totalAverage: string }) {
  const { t } = useT();
  const MIN_G = 2.0, MAX_G = 5.0;
  const avgs = courses.map(c => parseFloat(c.avg));
  const overall = parseFloat(totalAverage);

  function barColor(v: number): string {
    if (v >= 4.5) return "#34d399";
    if (v >= 3.6) return "#fbbf24";
    if (v >= 3.0) return "#38bdf8";
    return "#fb7185";
  }

  const chartH = 112;
  const avgLineTop = chartH - Math.round(chartH * (overall - MIN_G) / (MAX_G - MIN_G));

  return (
    <div className="grd-chart-tile">
      <div className="grd-chart-header">
        <h3 className="grd-chart-title"><i className="ti ti-chart-bar" /> {t("grades.avgPerCourse")}</h3>
        <span className="grd-chart-avg-badge">{t("grades.overall")} {totalAverage}</span>
      </div>

      <div className="grd-chart-area" style={{ height: `${chartH + 28}px` }}>
        {/* Average dashed line */}
        <div className="grd-avg-line" style={{ top: `${avgLineTop}px` }}>
          <span className="grd-avg-tag">{t("grades.avgShort")} {totalAverage}</span>
        </div>

        {courses.map((c, idx) => {
          const v = avgs[idx] || 0;
          const barH = Math.max(4, Math.round(chartH * (v - MIN_G) / (MAX_G - MIN_G)));
          const abbr = c.name.length > 8 ? c.name.slice(0, 7) + "." : c.name;
          return (
            <div key={c.id} className="grd-bar-col" title={`${c.name}: ${c.avg}`}>
              <span className="grd-bar-val">{c.avg}</span>
              <div className="grd-bar" style={{ height: `${barH}px`, background: barColor(v) }} />
              <span className="grd-bar-label">{abbr}</span>
            </div>
          );
        })}
      </div>

      <div className="grd-chart-legend">
        <div className="grd-legend-item"><div className="grd-legend-dot" style={{ background: "#34d399" }} />4.5–5.0</div>
        <div className="grd-legend-item"><div className="grd-legend-dot" style={{ background: "#fbbf24" }} />3.6–4.4</div>
        <div className="grd-legend-item"><div className="grd-legend-dot" style={{ background: "#38bdf8" }} />3.0–3.5</div>
        <div className="grd-legend-item"><div className="grd-legend-dot" style={{ background: "#fb7185" }} />{t("grades.legendBelow")}</div>
      </div>
    </div>
  );
}
