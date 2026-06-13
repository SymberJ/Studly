import React, { memo, useCallback, useMemo, useState, useRef } from "react";
import type { Task, Course, TaskPriority } from "../../app/types";
import { useData } from "../../lib/DataContext";
import { uid } from "../../lib/utils";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
import { useT } from "../../lib/i18n/context";
import "./TasksView.css";

/* ─── stałe ─────────────────────────────────────────── */
const PRIORITY_BORDER: Record<TaskPriority, string> = {
  high:   "#fb7185",
  medium: "#fbbf24",
  low:    "#34d399",
};

/* ─── TaskCard – POZA głównym komponentem, nie re-tworzy się ── */
interface CardProps {
  task: Task;
  courses: Course[];
  editingId: string | null;
  editValue: string;
  onToggle:    (id: string) => void;
  onDelete:    (id: string) => void;
  onStartEdit: (task: Task) => void;
  onSaveEdit:  (id: string) => void;
  onCancelEdit:() => void;
  onEditChange:(val: string) => void;
}

const TaskCard = memo(({
  task: t, courses, editingId, editValue,
  onToggle, onDelete, onStartEdit, onSaveEdit, onCancelEdit, onEditChange,
}: CardProps) => {
  const { t: tr } = useT();
  const border = PRIORITY_BORDER[t.priority || "low"];
  const course = courses.find(c => c.id === t.courseId);
  const isEditing = editingId === t.id;

  return (
    <div
      className={`tc ${t.done ? "tc--done" : ""}`}
      style={!t.done ? { borderLeftColor: border } : {}}
    >
      <input
        type="checkbox"
        className={`tc__check ${t.done ? "tc__check--done" : ""}`}
        checked={t.done}
        onChange={() => onToggle(t.id)}
      />
      <div className="tc__body">
        {isEditing ? (
          <input
            className="tc__edit-input"
            value={editValue}
            onChange={e => onEditChange(e.target.value)}
            autoFocus
            onKeyDown={e => {
              if (e.key === "Enter")  onSaveEdit(t.id);
              if (e.key === "Escape") onCancelEdit();
            }}
          />
        ) : (
          <p className="tc__title">{t.title}</p>
        )}
        <div className="tc__meta">
          {t.priority && !t.done && (
            <span className={`tc__badge tc__badge--${t.priority}`}>{tr(`tasks.prio.${t.priority}`)}</span>
          )}
          {course && <span className="tc__pill"><i className="ti ti-book-2" />{course.name}</span>}
          {t.dueDate && <span className="tc__pill"><i className="ti ti-calendar" />{t.dueDate}</span>}
        </div>
      </div>
      <div className="tc__actions">
        {!t.done && (
          isEditing
            ? <button className="tc__btn tc__btn--save" onClick={() => onSaveEdit(t.id)}><i className="ti ti-device-floppy" /></button>
            : <button className="tc__btn tc__btn--edit" onClick={() => onStartEdit(t)}><i className="ti ti-pencil" /></button>
        )}
        <button className="tc__btn tc__btn--del" onClick={() => onDelete(t.id)}><i className="ti ti-trash" /></button>
      </div>
    </div>
  );
});

/* ─── Główny komponent ──────────────────────────────── */
export default function TasksView() {
  const { tasks, setTasks, courses } = useData();
  const { t } = useT();
  const nativeDateRef = useRef<HTMLInputElement>(null);

  /* Formularz */
  const [title,       setTitle]       = useState("");
  const [dueDate,     setDueDate]     = useState("");
  const [hasDeadline, setHasDeadline] = useState(false);
  const [dateError,   setDateError]   = useState("");
  const [priority,    setPriority]    = useState<TaskPriority | null>(null);
  const [courseId,    setCourseId]    = useState("");

  /* Listy */
  const [sortOrder, setSortOrder] = useState<"newest"|"oldest"|"deadline"|"priority">("newest");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  /* ── callbacki stabilizowane przez useCallback ── */
  const handleToggle = useCallback((id: string) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t)), [setTasks]);

  const handleDelete = useCallback((id: string) =>
    setTasks(prev => prev.filter(t => t.id !== id)), [setTasks]);

  const handleStartEdit = useCallback((task: Task) => {
    setEditingId(task.id);
    setEditValue(task.title);
  }, []);

  const handleSaveEdit = useCallback((id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, title: editValue } : t));
    setEditingId(null);
  }, [editValue, setTasks]);

  const handleCancelEdit = useCallback(() => setEditingId(null), []);
  const handleEditChange = useCallback((val: string) => setEditValue(val), []);

  /* ── walidacja daty ── */
  const validateDate = (dateStr: string, showIncomplete: boolean) => {
    if (!dateStr) { setDateError(""); return; }
    if (dateStr.length < 10) { setDateError(showIncomplete ? t("tasks.errIncompleteDate") : ""); return; }
    const [d, m, y] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const valid = dt.getFullYear()===y && dt.getMonth()===m-1 && dt.getDate()===d;
    if (!valid) setDateError(t("tasks.errInvalidDate"));
    else if (dt < now) setDateError(t("tasks.errPastDate"));
    else setDateError("");
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 8);
    let f = v.slice(0,2);
    if (v.length > 2) f += "-" + v.slice(2,4);
    if (v.length > 4) f += "-" + v.slice(4,8);
    setDueDate(f);
    if (f.length === 10) validateDate(f, false);
    else setDateError("");
  };

  /* Zmiana przez kalendarz graficzny */
  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM-DD
    if (!val) return;
    const [y, m, d] = val.split("-");
    const formatted = `${d}-${m}-${y}`;
    setDueDate(formatted);
    validateDate(formatted, false);
  };

  const addTask = () => {
    if (!title.trim() || (hasDeadline && (dueDate.length !== 10 || !!dateError))) return;
    setTasks(prev => [{
      id: uid(),
      title: title.trim(),
      done: false,
      createdAt: Date.now(),
      priority: priority ?? undefined,
      courseId: courseId || undefined,
      dueDate: hasDeadline ? dueDate : undefined,
    }, ...prev]);
    setTitle(""); setDueDate(""); setDateError("");
    setHasDeadline(false); setPriority(null); setCourseId("");
  };

  /* ── sortowanie ── */
  const sortedTasks = useMemo(() => {
    const base = [...tasks];
    if (sortOrder === "newest")   return base.sort((a,b) => b.createdAt - a.createdAt);
    if (sortOrder === "oldest")   return base.sort((a,b) => a.createdAt - b.createdAt);
    if (sortOrder === "deadline") return base.sort((a,b) => {
      if (!a.dueDate) return 1; if (!b.dueDate) return -1;
      return a.dueDate.split("-").reverse().join("").localeCompare(b.dueDate.split("-").reverse().join(""));
    });
    if (sortOrder === "priority") {
      const o: Record<string,number> = { high:0, medium:1, low:2 };
      return base.sort((a,b) => (o[a.priority||"low"]??2) - (o[b.priority||"low"]??2));
    }
    return base;
  }, [tasks, sortOrder]);

  const todo      = useMemo(() => sortedTasks.filter(t => !t.done), [sortedTasks]);
  const done      = useMemo(() => sortedTasks.filter(t =>  t.done), [sortedTasks]);
  const highCount = useMemo(() => todo.filter(t => t.priority === "high").length, [todo]);
  const pct       = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0;

  /* Formatowanie wartości dla natywnego inputa (YYYY-MM-DD) */
  const nativeValue = useMemo(() => {
    if (!dueDate || dueDate.length !== 10) return "";
    const parts = dueDate.split("-");
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return "";
  }, [dueDate]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  /* ── wspólne props do TaskCard ── */
  const cardProps = {
    courses,
    editingId,
    editValue,
    onToggle:     handleToggle,
    onDelete:     handleDelete,
    onStartEdit:  handleStartEdit,
    onSaveEdit:   handleSaveEdit,
    onCancelEdit: handleCancelEdit,
    onEditChange: handleEditChange,
  };

  return (
    <div className="view-section-wrap">
      <SectionHeader
        title={t("tasks.title")}
        subtitle={t("tasks.subtitle")}
        emoji="✅"
      />

      <div className="section-content-glass">

        {/* STATS */}
        <div className="tv-stats">
          <div className="tv-stat">
            <span className="tv-stat__val" style={{color:"var(--danger)"}}>{highCount}</span>
            <span className="tv-stat__lbl">{t("tasks.urgent")}</span>
          </div>
          <div className="tv-stat">
            <span className="tv-stat__val">{todo.length}</span>
            <span className="tv-stat__lbl">{t("tasks.todo")}</span>
          </div>
          <div className="tv-stat">
            <span className="tv-stat__val" style={{color:"var(--success)"}}>{done.length}</span>
            <span className="tv-stat__lbl">{t("tasks.completed")}</span>
          </div>
          <div className="tv-stat tv-stat--bar">
            <div className="tv-stat__track"><div className="tv-stat__fill" style={{width:`${pct}%`}}/></div>
            <span className="tv-stat__lbl">{pct}% {t("tasks.progress")}</span>
          </div>
        </div>

        {/* LAYOUT */}
        <div className="tv-layout">

          {/* LEWA */}
          <div className="tv-col tv-col--left">

            {/* Formularz */}
            <div className="tv-panel tv-panel--form">
              <h3 className="tv-panel__title"><span className="tv-dot tv-dot--form" />{t("tasks.newTask")}</h3>
              <textarea
                className="tv-textarea"
                placeholder={t("tasks.whatToDo")}
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <div className="tv-priority">
                {(["low","medium","high"] as TaskPriority[]).map(p => (
                  <button
                    key={p}
                    className={`tv-prio-btn tv-prio-btn--${p} ${priority===p?"is-active":""}`}
                    onClick={() => setPriority(prev => prev === p ? null : p)}
                    type="button"
                  >{t(`tasks.prio.${p}`)}</button>
                ))}
              </div>
              {courses.length > 0 && (
                <select className="tv-select" value={courseId} onChange={e => setCourseId(e.target.value)}>
                  <option value="">{t("tasks.noCourse")}</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <div className="tv-date-row">
                <label className="tv-date-label">
                  <input type="checkbox" checked={hasDeadline}
                    onChange={e => { setHasDeadline(e.target.checked); if(!e.target.checked) setDateError(""); }} />
                  {t("tasks.deadline")}
                </label>
                {hasDeadline && (
                  <div className={`tv-date-wrap ${dateError?"is-err":""}`} style={{ position: "relative" }}>
                    <input type="text" placeholder="DD-MM-YYYY" className="tv-date-input"
                      value={dueDate} onChange={handleDateChange}
                      onBlur={() => validateDate(dueDate, true)} maxLength={10} />

                    <input
                      type="date"
                      ref={nativeDateRef}
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: "315px",
                        height: "100%",
                        opacity: 0,
                        pointerEvents: "none"
                      }}
                      value={nativeValue}
                      onChange={handleNativeDateChange}
                      min={todayStr}
                    />

                    <i
                      className="ti ti-calendar"
                      style={{fontSize:"16px", color:"var(--primary)", flexShrink:0, cursor:"pointer", position: "relative", zIndex: 1}}
                      onClick={() => nativeDateRef.current?.showPicker()}
                    />
                  </div>
                )}
              </div>
              {hasDeadline && dateError && <span className="tv-err">{dateError}</span>}
              <button
                className="tv-submit"
                onClick={addTask}
                disabled={!title.trim()||(hasDeadline&&(dueDate.length!==10||!!dateError))}
              >
                <i className="ti ti-plus" /> {t("tasks.addTask")}
              </button>
            </div>

            {/* Ukończone */}
            <div className="tv-panel tv-panel--done">
              <div className="tv-panel__header">
                <h3 className="tv-panel__title">
                  <span className="tv-dot tv-dot--done" />{t("tasks.completed")}
                  <span className="tv-count">{done.length}</span>
                </h3>
                {done.length > 0 && (
                  <button
                    className="tv-clear-btn"
                    onClick={() => setTasks(prev => prev.filter(t => !t.done))}
                    title={t("tasks.clearAllTitle")}
                  >
                    <i className="ti ti-trash" /> {t("tasks.clearAll")}
                  </button>
                )}
              </div>
              <div className="tv-scroll">
                {done.length === 0
                  ? <p className="tv-empty" style={{opacity:.3}}>{t("tasks.noCompleted")}</p>
                  : done.map(t => <TaskCard key={t.id} task={t} {...cardProps} />)
                }
              </div>
            </div>

          </div>

          {/* PRAWA */}
          <div className="tv-col tv-col--right">
            <div className="tv-panel tv-panel--todo">
              <div className="tv-panel__header">
                <h3 className="tv-panel__title">
                  <span className="tv-dot tv-dot--todo" />{t("tasks.todo")}
                  <span className="tv-count">{todo.length}</span>
                </h3>
                <select className="tv-sort" value={sortOrder} onChange={e => setSortOrder(e.target.value as typeof sortOrder)}>
                  <option value="newest">{t("tasks.sortNewest")}</option>
                  <option value="oldest">{t("tasks.sortOldest")}</option>
                  <option value="deadline">{t("tasks.sortDeadline")}</option>
                  <option value="priority">{t("tasks.sortPriority")}</option>
                </select>
              </div>
              <div className="tv-scroll">
                {todo.length === 0
                  ? <p className="tv-empty">{t("tasks.noTodo")}</p>
                  : todo.map(t => <TaskCard key={t.id} task={t} {...cardProps} />)
                }
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
