import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useData } from "../../lib/DataContext";
import { getSchedule, getGrades } from "../../lib/repo";
import { pluralize, dateLocale } from "../../lib/utils";
import { useCountUp } from "../../lib/useCountUp";
import { useT } from "../../lib/i18n/context";
import AiAgent from "../../components/AiAgent/AiAgent";
import "./DashboardView.css";

/* Wskazówki podzielone na kategorie — karuzela (jak techniki nauki w Strefie nauki). */
const TIP_CATEGORIES: { icon: string; title: { pl: string; en: string }; tips: { pl: string; en: string }[] }[] = [
  {
    icon: "ti-sparkles",
    title: { pl: "Agent AI", en: "AI Agent" },
    tips: [
      { pl: "Wybierz przedmiot, by zawęzić odpowiedzi Asystenta do jego notatek.", en: "Pick a course to narrow the Assistant's answers to its notes." },
      { pl: "Poproś Asystenta o quiz przed kolokwium, żeby sprawdzić wiedzę.", en: "Ask the Assistant for a quiz before a test to check your knowledge." },
      { pl: "Im więcej masz uzupełnionych danych, tym trafniejsze odpowiedzi.", en: "The more data you fill in, the more accurate the answers." },
    ],
  },
  {
    icon: "ti-notebook",
    title: { pl: "Notatki", en: "Notes" },
    tips: [
      { pl: "Notatki z zakładki Notatki możesz od razu streścić Asystentem AI.", en: "Notes from the Notes tab can be summarized by the AI Assistant right away." },
      { pl: "Notatkę wyeksportujesz do PDF, by mieć ją offline.", en: "Export a note to PDF to keep it offline." },
      { pl: "Przypisuj notatki do przedmiotów, by łatwiej je odnaleźć.", en: "Assign notes to courses to find them more easily." },
    ],
  },
  {
    icon: "ti-calendar",
    title: { pl: "Plan i zadania", en: "Schedule & tasks" },
    tips: [
      { pl: "Ustaw terminy zadań — Asystent ułoży realny plan nauki.", en: "Set task deadlines — the Assistant will build a realistic study plan." },
      { pl: "Pilne zadania z terminem podświetlają się na Dashboardzie.", en: "Urgent tasks with deadlines are highlighted on the Dashboard." },
      { pl: "Oznaczaj zadania priorytetem, by widzieć je w dobrej kolejności.", en: "Set task priorities to see them in the right order." },
    ],
  },
  {
    icon: "ti-chart-bar",
    title: { pl: "Oceny", en: "Grades" },
    tips: [
      { pl: "Dodaj oceny, a zobaczysz średnią ważoną dla każdego przedmiotu.", en: "Add grades to see a weighted average for each course." },
      { pl: "Wagi ocen wpływają na średnią — ustaw je przy dodawaniu.", en: "Grade weights affect the average — set them when adding." },
      { pl: "Średnia przelicza się automatycznie po każdej nowej ocenie.", en: "The average is recalculated automatically after each new grade." },
    ],
  },
  {
    icon: "ti-bulb",
    title: { pl: "Strefa nauki", en: "Study Zone" },
    tips: [
      { pl: "W Strefie nauki znajdziesz timer Pomodoro do skupionej pracy.", en: "The Study Zone has a Pomodoro timer for focused work." },
      { pl: "Sprawdź techniki nauki — przełączasz je strzałkami.", en: "Check the study techniques — switch them with the arrows." },
      { pl: "Wbudowany kalkulator przyda się przy zadaniach.", en: "The built-in calculator comes in handy for assignments." },
    ],
  },
  {
    icon: "ti-calendar-event",
    title: { pl: "Kalendarz", en: "Calendar" },
    tips: [
      { pl: "Dodawaj wydarzenia i terminy, by mieć je w jednym miejscu.", en: "Add events and deadlines to keep them in one place." },
      { pl: "Plan zajęć zaimportujesz z pliku CSV w zakładce Plan.", en: "Import your schedule from a CSV file in the Schedule tab." },
      { pl: "Dzisiejszy dzień jest wyróżniony w widoku kalendarza.", en: "Today is highlighted in the calendar view." },
    ],
  },
  {
    icon: "ti-settings",
    title: { pl: "Konto i wygląd", en: "Account & look" },
    tips: [
      { pl: "Motyw i język przełączysz w prawym górnym rogu.", en: "Switch theme and language in the top-right corner." },
      { pl: "Awatar i hasło zmienisz w zakładce Profil.", en: "Change your avatar and password in the Profile tab." },
      { pl: "Aplikacja działa też na telefonie w przeglądarce.", en: "The app also works on your phone in the browser." },
    ],
  },
];

export default function DashboardView() {
  const { tasks, courses, notes } = useData();
  const navigate = useNavigate();
  const { t, lang } = useT();
  const [infoOpen, setInfoOpen] = useState(false);
  const [tipCat, setTipCat] = useState(0);
  const [tipDir, setTipDir] = useState<1 | -1>(1);
  const [tipTick, setTipTick] = useState(0);
  const cat = TIP_CATEGORIES[tipCat];
  const tipNext = () => { setTipDir(1); setTipTick((n) => n + 1); setTipCat((x) => (x + 1) % TIP_CATEGORIES.length); };
  const tipPrev = () => { setTipDir(-1); setTipTick((n) => n + 1); setTipCat((x) => (x - 1 + TIP_CATEGORIES.length) % TIP_CATEGORIES.length); };
  const scheduleItems = getSchedule();
  const grades = getGrades();

  const today = new Date();
  // UWAGA: te nazwy są po polsku, bo służą do dopasowania do danych planu (item.day), nie do wyświetlania.
  const dayNames = ["Niedziela","Poniedziałek","Wtorek","Środa","Czwartek","Piątek","Sobota"];
  const todayName = dayNames[today.getDay()];

  const greeting = today.getHours() < 18 ? t("dashboard.greetDay") : t("dashboard.greetEvening");

  const todayClasses = scheduleItems.filter(i => i.day === todayName).sort((a,b) => a.time.localeCompare(b.time));

  const urgentTasks = tasks
    .filter(t => !t.done)
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.split("-").reverse().join("").localeCompare(b.dueDate.split("-").reverse().join(""));
    })
    .slice(0, 5);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.done).length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const avgGrade = useMemo(() => {
    if (grades.length === 0) return null;
    const courseAvgs = courses.map(c => {
      const cg = grades.filter((g) => g.courseId === c.id);
      if (cg.length === 0) return null;
      const sum = cg.reduce((acc, g) => acc + g.value * g.weight, 0);
      const wts = cg.reduce((acc, g) => acc + g.weight, 0);
      return sum / wts;
    }).filter(Boolean) as number[];
    if (courseAvgs.length === 0) return null;
    return (courseAvgs.reduce((a, b) => a + b, 0) / courseAvgs.length).toFixed(2);
  }, [grades, courses]);

  const recentNote = notes.length > 0
    ? [...notes].sort((a,b) => b.date.localeCompare(a.date))[0]
    : null;

  /* Animowane wartości metryk (count-up). Hooki wołane bezwarunkowo —
     respektują prefers-reduced-motion (wtedy pojawiają się od razu). */
  const tasksToDoCount = useCountUp(totalTasks - doneTasks);
  const notesCount     = useCountUp(notes.length);
  const coursesCount   = useCountUp(courses.length);
  const avgGradeCount  = useCountUp(avgGrade ? parseFloat(avgGrade) : 0, 700, 2);

  const COURSE_COLORS = ["#6c5ce7","#1e90ff","#2ed573","#ffa502","#ff4757","#e84393","#a29bfe","#00cec9"];

  const dateDisplayStr = today.toLocaleDateString(dateLocale(lang), {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const QUICK_ACTIONS = [
    { tab: "tasks", icon: "ti-plus", key: "dashboard.newTask" },
    { tab: "notes", icon: "ti-pencil", key: "dashboard.newNote" },
    { tab: "calendar", icon: "ti-calendar-plus", key: "dashboard.addEvent" },
    { tab: "grades", icon: "ti-star", key: "dashboard.addGrade" },
  ];

  return (
    <div className="dash-wrap">
      <div className="dash-layout">
      <div className="dash-main">
      {/* GREETING */}
      <div className="dash-greeting">
        <div className="dash-greeting__glow" />
        <div className="dash-greeting__left">
          <p className="dash-greeting__date">{dateDisplayStr}</p>
          <h2 className="dash-greeting__title">{greeting} <span className="dash-greeting__wave">👋</span></h2>
          <p className="dash-greeting__sub">{t("dashboard.sub")}</p>
        </div>
        <div className="dash-greeting__right">
          {todayClasses.length > 0 && (
            <div className="dash-greeting__pill dash-greeting__pill--blue">
              <i className="ti ti-calendar-week" />
              <span>{todayClasses.length} {lang === "en" ? (todayClasses.length === 1 ? "class today" : "classes today") : "zajęć dziś"}</span>
            </div>
          )}
          {urgentTasks.length > 0 && (
            <div className="dash-greeting__pill dash-greeting__pill--red">
              <i className="ti ti-alert-circle" />
              <span>{urgentTasks.length} {pluralize(urgentTasks.length, lang, ["zadanie", "zadania", "zadań"], ["task", "tasks"])}</span>
            </div>
          )}
          {urgentTasks.length === 0 && todayClasses.length === 0 && (
            <div className="dash-greeting__pill dash-greeting__pill--green">
              <i className="ti ti-circle-check" />
              <span>{t("dashboard.allUnderControl")}</span>
            </div>
          )}
          <div className="dash-greeting__pill dash-greeting__pill--muted">
            <i className="ti ti-book-2" />
            <span>{courses.length} {pluralize(courses.length, lang, ["przedmiot", "przedmioty", "przedmiotów"], ["course", "courses"])}</span>
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="dash-metrics">
        <div className="dash-metric-card" onClick={() => navigate("/tasks")} role="button" tabIndex={0}>
          <div className="dash-metric-card__icon" style={{ background: "rgba(165,180,252,0.15)", color: "var(--primary)" }}>
            <i className="ti ti-checkbox" />
          </div>
          <div className="dash-metric-card__body">
            <span className="dash-metric-card__val">{tasksToDoCount}</span>
            <span className="dash-metric-card__lbl">{t("dashboard.tasksToDo")}</span>
            <div className="dash-metric-mini-bar">
              <div className="dash-metric-mini-fill" style={{ width: `${progressPct}%`, background: "var(--primary)" }} />
            </div>
          </div>
        </div>

        <div className="dash-metric-card" onClick={() => navigate("/grades")} role="button" tabIndex={0}>
          <div className="dash-metric-card__icon" style={{ background: "rgba(56,189,248,0.15)", color: "var(--accent-blue)" }}>
            <i className="ti ti-chart-bar" />
          </div>
          <div className="dash-metric-card__body">
            <span className="dash-metric-card__val">{avgGrade ? avgGradeCount : "—"}</span>
            <span className="dash-metric-card__lbl">{t("dashboard.avgGrade")}</span>
          </div>
        </div>

        <div className="dash-metric-card" onClick={() => navigate("/notes")} role="button" tabIndex={0}>
          <div className="dash-metric-card__icon" style={{ background: "rgba(52,211,153,0.15)", color: "var(--success)" }}>
            <i className="ti ti-notebook" />
          </div>
          <div className="dash-metric-card__body">
            <span className="dash-metric-card__val">{notesCount}</span>
            <span className="dash-metric-card__lbl">{t("dashboard.notes")}</span>
            {recentNote && <span className="dash-metric-card__sub">{t("dashboard.lastNote")} {recentNote.date}</span>}
          </div>
        </div>

        <div className="dash-metric-card" onClick={() => navigate("/schedule")} role="button" tabIndex={0}>
          <div className="dash-metric-card__icon" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
            <i className="ti ti-calendar-week" />
          </div>
          <div className="dash-metric-card__body">
            <span className="dash-metric-card__val">{coursesCount}</span>
            <span className="dash-metric-card__lbl">{t("dashboard.courses")}</span>
            {todayClasses.length > 0 && <span className="dash-metric-card__sub">{todayClasses.length} {t("dashboard.todayCount")}</span>}
          </div>
        </div>
      </div>

      {/* MAIN GRID: schedule + tasks */}
      <div className="dash-main-grid">
        {/* Today's schedule */}
        <div className="dash-tile">
          <div className="dash-tile__header">
            <h3 className="dash-tile__title"><i className="ti ti-calendar-week" /> {t("dashboard.todaySchedule")}</h3>
            <button className="dash-tile__link" onClick={() => navigate("/schedule")}>
              {t("dashboard.fullSchedule")} <i className="ti ti-arrow-right" />
            </button>
          </div>
          {todayClasses.length > 0 ? (
            <div className="dash-schedule-list">
              {todayClasses.map((item, idx) => {
                const course = courses.find(c => c.id === item.courseId);
                const color = COURSE_COLORS[idx % COURSE_COLORS.length];
                return (
                  <div className="dash-schedule-item" key={item.id}>
                    <div className="dash-schedule-item__time">{item.time}</div>
                    <div className="dash-schedule-item__dot" style={{ background: color }} />
                    <div className="dash-schedule-item__info">
                      <span className="dash-schedule-item__name">{course?.name || t("dashboard.unknown")}</span>
                      {item.teacher && <span className="dash-schedule-item__teacher">{item.teacher}</span>}
                    </div>
                    {item.room && <div className="dash-schedule-item__room">{item.room}</div>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="dash-empty">
              <i className="ti ti-coffee" style={{ fontSize: "28px", marginBottom: "8px", opacity: 0.3 }} />
              <p>{t("dashboard.noClasses")}</p>
            </div>
          )}
        </div>

        {/* Urgent tasks */}
        <div className="dash-tile">
          <div className="dash-tile__header">
            <h3 className="dash-tile__title"><i className="ti ti-alert-circle" /> {t("dashboard.urgentTasks")}</h3>
            <button className="dash-tile__link" onClick={() => navigate("/tasks")}>
              {t("dashboard.all")} <i className="ti ti-arrow-right" />
            </button>
          </div>
          {urgentTasks.length > 0 ? (
            <div className="dash-task-list">
              {urgentTasks.map(t => {
                const priorityColor = t.priority === "high" ? "#fb7185" : t.priority === "medium" ? "#fbbf24" : "#34d399";
                const course = courses.find(c => c.id === t.courseId);
                return (
                  <div className="dash-task-item" key={t.id}>
                    <div className="dash-task-item__dot" style={{ background: priorityColor }} />
                    <div className="dash-task-item__info">
                      <span className="dash-task-item__title">{t.title}</span>
                      {(t.dueDate || course) && (
                        <div className="dash-task-item__meta">
                          {t.dueDate && <span><i className="ti ti-calendar" style={{ fontSize: "11px" }} /> {t.dueDate}</span>}
                          {course && <span><i className="ti ti-book-2" style={{ fontSize: "11px" }} /> {course.name}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="dash-empty">
              <i className="ti ti-circle-check" style={{ fontSize: "28px", marginBottom: "8px", opacity: 0.3 }} />
              <p>{t("dashboard.noUrgent")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="dash-quick-actions">
        {QUICK_ACTIONS.map(a => (
          <button key={a.tab} className="dash-quick-btn" onClick={() => navigate(`/${a.tab}`)}>
            <i className={`ti ${a.icon}`} />
            <span>{t(a.key)}</span>
          </button>
        ))}
      </div>

      {/* Wskazówki — karuzela kategorii (jak techniki nauki w Strefie nauki) */}
      <div className="dash-tips">
        <div className="dash-tips__head">
          <span><i className="ti ti-bulb" /> {t("dashboard.tips.title")}</span>
          <span className="dash-tips__count">{tipCat + 1} / {TIP_CATEGORIES.length}</span>
        </div>
        <div className={`dash-tips__body ${tipDir === 1 ? "dash-anim-next" : "dash-anim-prev"}`} key={tipTick}>
          <div className="dash-tips__cat">
            <span className="dash-tips__cat-icon"><i className={`ti ${cat.icon}`} /></span>
            <h4>{lang === "en" ? cat.title.en : cat.title.pl}</h4>
          </div>
          <ul className="dash-tips__list">
            {cat.tips.map((tip, k) => (
              <li key={k}><i className="ti ti-arrow-right" /> {lang === "en" ? tip.en : tip.pl}</li>
            ))}
          </ul>
        </div>
        <div className="dash-tips__nav">
          <button onClick={tipPrev}><i className="ti ti-arrow-left" /> {t("study.prev")}</button>
          <button onClick={tipNext}>{t("study.next")} <i className="ti ti-arrow-right" /></button>
        </div>
      </div>
      </div>{/* /dash-main */}

      <aside className="dash-agent-col">
        <div className="dash-agent__head">
          <div className="dash-agent__title">
            <span className="dash-agent__icon"><i className="ti ti-sparkles" /></span>
            <div>
              <h3>{t("assistant.title")}</h3>
              <p>{t("assistant.subtitle")}</p>
            </div>
          </div>
          <div className="dash-agent__actions">
            <span className="dash-agent__badge">{t("assistant.premiumBadge")}</span>
            <button
              className="dash-agent__info"
              onClick={() => setInfoOpen(true)}
              title={t("assistant.infoTitle")}
              aria-label={t("assistant.infoTitle")}
            >
              <i className="ti ti-info-circle" />
            </button>
          </div>
        </div>
        <AiAgent />
        <div className="dash-agent__disclaimer">
          <i className="ti ti-alert-triangle" /> {t("assistant.disclaimer")}
        </div>
      </aside>
      </div>{/* /dash-layout */}

      {infoOpen && createPortal(
        <div className="dash-modal-overlay" onClick={() => setInfoOpen(false)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dash-modal__close" onClick={() => setInfoOpen(false)} aria-label={t("common.close")}>
              <i className="ti ti-x" />
            </button>
            <div className="dash-modal__hero">
              <span className="dash-modal__icon"><i className="ti ti-sparkles" /></span>
              <div>
                <h3 className="dash-modal__title">{t("assistant.infoTitle")}</h3>
                <p className="dash-modal__lead">{t("assistant.infoLead")}</p>
              </div>
            </div>

            <div className="dash-modal__section">
              <h4 className="dash-modal__h"><i className="ti ti-stars" /> {t("assistant.infoWhat")}</h4>
              <ul className="dash-modal__feats">
                {(["materials", "quizzes", "flashcards", "plan", "tasks", "more"] as const).map((f) => (
                  <li key={f} className={f === "more" ? "is-more" : undefined}>
                    <i className={`ti ${f === "more" ? "ti-dots" : "ti-circle-check"}`} /> {t(`assistant.feat.${f}`)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="dash-modal__section">
              <h4 className="dash-modal__h"><i className="ti ti-pointer" /> {t("assistant.infoUse")}</h4>
              <p className="dash-modal__p">{t("assistant.infoUseDesc")}</p>
            </div>

            <p className="dash-modal__data"><i className="ti ti-shield-lock" /> {t("assistant.dataNotice")}</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
