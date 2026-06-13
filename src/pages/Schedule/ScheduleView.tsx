import { useState, useEffect, useRef } from "react";
import type { Teacher, ScheduleItem, Course } from "../../app/types";
import { useNavigate } from "react-router-dom";
import { useData } from "../../lib/DataContext";
import { getSchedule, saveSchedule } from "../../lib/repo";
import { uid } from "../../lib/utils";
import { useToast } from "../../components/Toast/Toast";
import { parseScheduleFile, CSV_TEMPLATE, type ImportResult } from "../../lib/scheduleImport";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
import { useT } from "../../lib/i18n/context";
import "./ScheduleView.css";

interface ScheduleViewProps {
  teachers: Teacher[];
}

// Polskie nazwy dni to KANONICZNE wartości zapisywane w danych. Tłumaczymy tylko etykiety wyświetlane.
const DAY_EN: Record<string, string> = {
  "Poniedziałek": "Monday", "Wtorek": "Tuesday", "Środa": "Wednesday",
  "Czwartek": "Thursday", "Piątek": "Friday", "Sobota": "Saturday", "Niedziela": "Sunday",
};

export default function ScheduleView({ teachers }: ScheduleViewProps) {
  const { courses, setCourses } = useData();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { t, lang } = useT();
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(() => getSchedule());

  const dayLabel = (day: string) => (lang === "en" ? (DAY_EN[day] ?? day) : day);

  // Import planu (CSV / ICS)
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        const result = parseScheduleFile(file.name, text);
        if (result.rows.length === 0) {
          toastError(t("schedule.errNoClasses"));
        } else {
          setPreview(result);
        }
      } catch {
        toastError(t("schedule.errReadFile"));
      }
    }
    e.target.value = ""; // pozwól wybrać ten sam plik ponownie
  };

  const confirmImport = () => {
    if (!preview) return;
    const newCourses: Course[] = [];
    const findOrCreateCourse = (name: string): string => {
      const found = [...courses, ...newCourses].find(
        (c) => c.name.toLowerCase() === name.toLowerCase()
      );
      if (found) return found.id;
      const c = { id: uid(), name };
      newCourses.push(c);
      return c.id;
    };

    const existingKeys = new Set(scheduleItems.map((i) => `${i.day}|${i.time}|${i.courseId}`));
    const newItems: ScheduleItem[] = [];
    let added = 0;
    let dup = 0;

    for (const r of preview.rows) {
      const courseId = findOrCreateCourse(r.course);
      const key = `${r.day}|${r.time}|${courseId}`;
      if (existingKeys.has(key)) { dup++; continue; }
      existingKeys.add(key);
      newItems.push({ id: uid(), courseId, teacher: r.teacher, room: r.room, time: r.time, day: r.day });
      added++;
    }

    if (newCourses.length) setCourses([...courses, ...newCourses]);
    if (newItems.length) {
      setScheduleItems([...scheduleItems, ...newItems].sort((a, b) => a.time.localeCompare(b.time)));
    }
    setPreview(null);
    const msg = lang === "en"
      ? `Imported ${added} classes` +
        (newCourses.length ? `, added ${newCourses.length} course(s)` : "") +
        (dup ? `, skipped ${dup} duplicate(s)` : "") + "."
      : `Zaimportowano ${added} zajęć` +
        (newCourses.length ? `, dodano ${newCourses.length} przedmiot(y)` : "") +
        (dup ? `, pominięto ${dup} duplikat(ów)` : "") + ".";
    success(msg);
  };

  const downloadTemplate = () => {
    const blob = new Blob(["\uFEFF" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = lang === "en" ? "schedule-template.csv" : "szablon-planu.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Stan dla edytowanego elementu
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newItem, setNewItem] = useState<Omit<ScheduleItem, "id">>({
    courseId: "",
    room: "",
    teacher: "",
    time: "",
    day: "Poniedziałek"
  });

  const effCourseId = newItem.courseId || courses[0]?.id || "";
  const effTeacher = newItem.teacher || teachers[0]?.name || "";

  useEffect(() => {
    saveSchedule(scheduleItems);
  }, [scheduleItems]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9:]/g, "");
    if (val.length === 4 && !val.includes(":")) {
      val = val.slice(0, 2) + ":" + val.slice(2);
    }
    if (val.length > 5) val = val.slice(0, 5);
    setNewItem({ ...newItem, time: val });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effCourseId || !newItem.time.includes(":") || newItem.time.length < 5) return;

    if (editingId) {
      const updated = scheduleItems.map(item =>
        item.id === editingId ? { ...newItem, courseId: effCourseId, teacher: effTeacher, id: editingId } : item
      );
      setScheduleItems(updated.sort((a, b) => a.time.localeCompare(b.time)));
      setEditingId(null);
    } else {
      const item = { ...newItem, courseId: effCourseId, teacher: effTeacher, id: uid() };
      setScheduleItems([...scheduleItems, item].sort((a, b) => a.time.localeCompare(b.time)));
    }

    setNewItem(prev => ({ ...prev, room: "", time: "" }));
  };

  const startEdit = (item: ScheduleItem) => {
    setEditingId(item.id);
    setNewItem({
      courseId: item.courseId,
      room: item.room,
      teacher: item.teacher,
      time: item.time,
      day: item.day
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewItem(prev => ({ ...prev, room: "", time: "" }));
  };

  const deleteItem = (id: string) => {
    if (editingId === id) cancelEdit();
    setScheduleItems(scheduleItems.filter(i => i.id !== id));
  };

  const days = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

  return (
    <div className="view-section-wrap">
      <SectionHeader
        title={t("schedule.title")}
        subtitle={editingId ? t("schedule.subtitleEdit") : t("schedule.subtitle")}
        emoji="🗒️"
      />

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.ics,text/csv,text/calendar"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      <div className={`sv-add-card ${editingId ? "is-editing" : ""}`}>
        <form onSubmit={handleAddItem} className="sv-form">
          <div className="sv-form-row">
            <div className="sv-input-group">
              <label>{t("schedule.course")}</label>
              <select value={effCourseId} onChange={e => setNewItem({...newItem, courseId: e.target.value})}>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="sv-input-group">
              <label>{t("schedule.teacher")}</label>
              <select value={effTeacher} onChange={e => setNewItem({...newItem, teacher: e.target.value})}>
                {teachers.map((tt) => <option key={tt.id} value={tt.name}>{tt.title} {tt.name}</option>)}
              </select>
            </div>
            <div className="sv-input-group">
              <label>{t("schedule.day")}</label>
              <select value={newItem.day} onChange={e => setNewItem({...newItem, day: e.target.value})}>
                {days.map(d => <option key={d} value={d}>{dayLabel(d)}</option>)}
              </select>
            </div>
          </div>

          <div className="sv-form-row">
            <div className="sv-input-group sv-input-group--time">
              <label>{t("schedule.time")}</label>
              <input type="text" placeholder="HH:MM" maxLength={5} value={newItem.time} onChange={handleTimeChange} />
            </div>
            <div className="sv-input-group sv-input-group--room">
              <label>{t("schedule.room")}</label>
              <input placeholder={t("schedule.roomPlaceholder")} value={newItem.room} onChange={e => setNewItem({...newItem, room: e.target.value})} />
            </div>
            <div className="sv-form-actions">
              <button type="button" className="sv-import-btn" onClick={() => fileRef.current?.click()}>
                <i className="ti ti-file-import" /> {t("schedule.import")}
              </button>
              <button type="button" className="sv-template-btn" onClick={downloadTemplate}>
                <i className="ti ti-download" /> {t("schedule.template")}
              </button>
              <button type="submit" className={`sv-add-btn ${editingId ? "save-btn" : ""}`}>
                {editingId ? t("schedule.saveChanges") : t("schedule.addToPlan")}
              </button>
              {editingId && (
                <button type="button" className="sv-cancel-btn" onClick={cancelEdit}>{t("common.cancel")}</button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="sv-plan-card">
        <div className="sv-timeline">
          {days.map(day => {
            const dayItems = scheduleItems.filter(i => i.day === day);
            return (
              <div key={day} className="sv-day-section">
                <h4 className="sv-day-title">{dayLabel(day)}</h4>
                <div className="sv-day-grid">
                  {dayItems.length > 0 ? (
                    dayItems.map(item => {
                      const courseInfo = courses.find((c) => c.id === item.courseId);
                      const teacherInfo = teachers.find((tt) => tt.name === item.teacher);
                      return (
                        <div key={item.id} className={`sv-item-row ${editingId === item.id ? "editing-now" : ""}`}>
                          <div className="sv-item-time">{item.time}</div>
                          <div className="sv-item-main">
                            <div className="sv-item-name">{courseInfo?.name || t("schedule.unknown")}</div>
                            <div className="sv-item-teacher">{teacherInfo?.title} {teacherInfo?.name}</div>
                          </div>
                          <div className="sv-item-room">
                            <span>{t("schedule.roomLabel")}</span>
                            <strong>{item.room}</strong>
                          </div>
                          <div className="sv-item-actions">
                            <button className="sv-btn-action" title={t("schedule.editTitle")} onClick={() => startEdit(item)}>✏️</button>
                            <button className="sv-btn-action" title={t("schedule.notesTitle")} onClick={() => navigate("/notes")}>📝</button>
                            <button className="sv-btn-action" title={t("schedule.gradesTitle")} onClick={() => navigate("/grades")}>🎯</button>
                            <button className="sv-btn-delete" title={t("common.delete")} onClick={() => deleteItem(item.id)}>✕</button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="sv-empty-day">{t("schedule.emptyDay")}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {preview && (
        <div className="sv-modal-backdrop" onClick={() => setPreview(null)}>
          <div className="sv-import-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="sv-import-modal__title">
              <i className="ti ti-calendar-plus" /> {t("schedule.previewTitle")}
            </h3>
            <p className="sv-import-modal__desc">
              {lang === "en" ? (
                <>Format: <strong>{preview.format.toUpperCase()}</strong> · found{" "}
                <strong>{preview.rows.length}</strong> classes
                {preview.skipped ? ` · skipped ${preview.skipped} rows missing data` : ""}.</>
              ) : (
                <>Format: <strong>{preview.format.toUpperCase()}</strong> · znaleziono{" "}
                <strong>{preview.rows.length}</strong> zajęć
                {preview.skipped ? ` · pominięto ${preview.skipped} wierszy bez kompletu danych` : ""}.</>
              )}
            </p>

            <div className="sv-preview-table-wrap">
              <table className="sv-preview-table">
                <thead>
                  <tr><th>{t("schedule.day")}</th><th>{t("schedule.time")}</th><th>{t("schedule.course")}</th><th>{t("schedule.room")}</th></tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 10).map((r, i) => (
                    <tr key={i}>
                      <td>{dayLabel(r.day)}</td>
                      <td>{r.time}</td>
                      <td>{r.course}</td>
                      <td>{r.room || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length > 10 && (
                <p className="sv-preview-more">{lang === "en" ? `…and ${preview.rows.length - 10} more` : `…i ${preview.rows.length - 10} więcej`}</p>
              )}
            </div>

            <div className="sv-import-modal__actions">
              <button className="sv-cancel-btn" onClick={() => setPreview(null)}>{t("common.cancel")}</button>
              <button className="sv-add-btn" onClick={confirmImport}>
                <i className="ti ti-check" /> {t("schedule.importToPlan")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
