import { useEffect, useRef, useState, useMemo } from "react";
import type { Course, NoteEntry, Task, Teacher } from "../../app/types";
import { useT } from "../../lib/i18n/context";
import "./GlobalSearch.css";

type ResultItem = {
  type: "task" | "note" | "teacher" | "course";
  id: string;
  title: string;
  subtitle?: string;
  tab: string;
  badge?: string;
  badgeColor?: string;
};

interface Props {
  tasks: Task[];
  notes: NoteEntry[];
  courses: Course[];
  teachers: Teacher[];
  onClose: () => void;
  onNavigate: (section: string) => void;
}

export default function GlobalSearch({ tasks, notes, courses, teachers, onClose, onNavigate }: Props) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const results: ResultItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: ResultItem[] = [];

    tasks.filter(task => task.title.toLowerCase().includes(q)).slice(0, 4).forEach(task => {
      const priorityColors: Record<string, string> = { high: "#fb7185", medium: "#fbbf24", low: "#34d399" };
      out.push({
        type: "task",
        id: task.id,
        title: task.title,
        subtitle: task.dueDate ? `${t("notif.due")} ${task.dueDate}` : task.done ? t("tasks.completed") : t("notif.noDue"),
        tab: "tasks",
        badge: task.priority ? t(`tasks.prio.${task.priority}`) : undefined,
        badgeColor: task.priority ? priorityColors[task.priority] : undefined,
      });
    });

    notes.filter(n => n.content.toLowerCase().includes(q) || courses.find(c => c.id === n.courseId)?.name.toLowerCase().includes(q)).slice(0, 3).forEach(n => {
      const course = courses.find(c => c.id === n.courseId);
      out.push({
        type: "note",
        id: n.id,
        title: course?.name ? `${t("search.note")} — ${course.name}` : t("search.note"),
        subtitle: n.date + (n.content.length > 50 ? " · " + n.content.slice(0, 50) + "…" : ""),
        tab: "notes",
      });
    });

    courses.filter(c => c.name.toLowerCase().includes(q)).slice(0, 3).forEach(c => {
      out.push({ type: "course", id: c.id, title: c.name, subtitle: t("search.course"), tab: "grades" });
    });

    teachers.filter(tea =>
      tea.name.toLowerCase().includes(q) ||
      (tea.email ?? "").toLowerCase().includes(q)
    ).slice(0, 3).forEach(tea => {
      out.push({ type: "teacher", id: tea.id, title: `${tea.title} ${tea.name}`, subtitle: tea.email, tab: "teachers" });
    });

    return out;
  }, [query, tasks, notes, courses, teachers, t]);

  // Reset selection when results change
  useEffect(() => { setSelectedIdx(0); }, [results]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[selectedIdx]) { onNavigate(results[selectedIdx].tab); }
  };

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(".gs-item.is-selected");
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const TYPE_ICONS: Record<string, string> = {
    task: "ti-checkbox",
    note: "ti-notebook",
    course: "ti-book-2",
    teacher: "ti-user",
  };

  const grouped: Record<string, { label: string; items: ResultItem[] }> = {
    task:    { label: t("nav.tasks"),      items: results.filter(r => r.type === "task") },
    note:    { label: t("nav.notes"),      items: results.filter(r => r.type === "note") },
    course:  { label: t("grades.courses"), items: results.filter(r => r.type === "course") },
    teacher: { label: t("nav.teachers"),   items: results.filter(r => r.type === "teacher") },
  };

  let globalIdx = 0;

  return (
    <div className="gs-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gs-modal">
        {/* INPUT */}
        <div className="gs-input-row">
          <i className="ti ti-search gs-input-icon" />
          <input
            ref={inputRef}
            className="gs-input"
            type="text"
            placeholder={t("header.searchPlaceholder")}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            spellCheck={false}
          />
          <button className="gs-esc-btn" onClick={onClose}>esc</button>
        </div>

        {/* RESULTS */}
        <div className="gs-results" ref={listRef}>
          {query.trim() === "" && (
            <div className="gs-empty">
              <i className="ti ti-command" style={{ fontSize: "28px", opacity: 0.2 }} />
              <p>{t("search.prompt")}</p>
              <div className="gs-shortcuts">
                <span><kbd>↑↓</kbd> {t("search.nav")}</span>
                <span><kbd>↵</kbd> {t("search.go")}</span>
                <span><kbd>esc</kbd> {t("search.close")}</span>
              </div>
            </div>
          )}

          {query.trim() !== "" && results.length === 0 && (
            <div className="gs-empty">
              <i className="ti ti-search-off" style={{ fontSize: "28px", opacity: 0.2 }} />
              <p>{t("search.noResults")} „{query}"</p>
            </div>
          )}

          {Object.entries(grouped).map(([type, group]) => {
            if (group.items.length === 0) return null;
            return (
              <div key={type} className="gs-group">
                <div className="gs-group-label">{group.label}</div>
                {group.items.map(item => {
                  const idx = globalIdx++;
                  return (
                    <div
                      key={item.id}
                      className={`gs-item ${selectedIdx === idx ? "is-selected" : ""}`}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      onClick={() => onNavigate(item.tab)}
                    >
                      <div className="gs-item__icon">
                        <i className={`ti ${TYPE_ICONS[item.type]}`} />
                      </div>
                      <div className="gs-item__text">
                        <span className="gs-item__title">{item.title}</span>
                        {item.subtitle && <span className="gs-item__sub">{item.subtitle}</span>}
                      </div>
                      {item.badge && (
                        <span className="gs-item__badge" style={{ background: `${item.badgeColor}22`, color: item.badgeColor }}>
                          {item.badge}
                        </span>
                      )}
                      <div className="gs-item__arrow"><i className="ti ti-corner-down-left" /></div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        {results.length > 0 && (
          <div className="gs-footer">
            <span><kbd>↑↓</kbd> {t("search.nav")}</span>
            <span><kbd>↵</kbd> {t("search.go")}</span>
            <span><kbd>esc</kbd> {t("search.close")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
