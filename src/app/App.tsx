import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import "../styles/Global.css";
import "../styles/Navbar.css";

import { DEFAULT_TEACHERS } from "./teachers";
import { AuthProvider } from "../lib/auth/AuthProvider";
import { useAuth }     from "../lib/auth/useAuth";
import { DataProvider } from "../lib/DataContext";
import { ToastProvider } from "../components/Toast/Toast";
import { LanguageProvider } from "../lib/i18n/LanguageProvider";
import { useT } from "../lib/i18n/context";
import { dateLocale } from "../lib/utils";
import LanguageToggle from "../components/LanguageToggle/LanguageToggle";
import { ProtectedRoute } from "../routes/ProtectedRoute";
import { AdminRoute }     from "../routes/AdminRoute";

import LoginView     from "../pages/Login/LoginView";
import ForcePasswordView from "../pages/ForcePassword/ForcePasswordView";
import ThemeToggle   from "../components/ThemeToggle/ThemeToggle";
import NotFoundView  from "../pages/NotFound/NotFoundView";
import GlobalSearch  from "../components/GlobalSearch/GlobalSearch";

/* Widoki ładowane leniwie (code-splitting) — każdy trafia do osobnego chunku,
   więc start aplikacji pobiera tylko powłokę + bieżący widok. */
const DashboardView = lazy(() => import("../pages/Dashboard/DashboardView"));
const TasksView     = lazy(() => import("../pages/Tasks/TasksView"));
const NotesView     = lazy(() => import("../pages/Notes/NotesView"));
const ScheduleView  = lazy(() => import("../pages/Schedule/ScheduleView"));
const TeachersView  = lazy(() => import("../pages/Teachers/TeachersView"));
const DownloadsView = lazy(() => import("../pages/Downloads/DownloadsView"));
const GradesView    = lazy(() => import("../pages/Grades/GradesView"));
const CalendarView  = lazy(() => import("../pages/Calendar/CalendarView"));
const StudyZoneView = lazy(() => import("../pages/StudyZone/StudyZoneView"));
const ProfileView   = lazy(() => import("../pages/Profile/ProfileView"));
const AdminView     = lazy(() => import("../pages/Admin/AdminView"));

/* ── Przekieruj zalogowanych z /login ─────────────────────── */
const LoginGuard = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="full-center"><div className="spinner" /></div>;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginView />;
};

/* ── Nawigacja ────────────────────────────────────────────── */
const NAV_TABS: { path: string; key: string; icon: string; star?: boolean }[] = [
  { path: "/dashboard",  key: "nav.dashboard", icon: "ti-home", star: true },
  { path: "/tasks",      key: "nav.tasks",     icon: "ti-checkbox" },
  { path: "/notes",      key: "nav.notes",     icon: "ti-notebook" },
  { path: "/schedule",   key: "nav.schedule",  icon: "ti-calendar-week" },
  { path: "/calendar",   key: "nav.calendar",  icon: "ti-calendar" },
  { path: "/study",      key: "nav.study",     icon: "ti-bulb" },
  { path: "/grades",     key: "nav.grades",    icon: "ti-chart-bar" },
  { path: "/teachers",   key: "nav.teachers",  icon: "ti-users" },
  { path: "/downloads",  key: "nav.downloads", icon: "ti-download" },
];

/* ── AppShell: header + nav + treść ──────────────────────── */
const AppShell = () => {
  const { logout, user } = useAuth();
  const { t, lang } = useT();
  const navigate = useNavigate();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotif, setShowNotif]       = useState(false);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [now, setNow]                   = useState(new Date());

  const avatarRef = useRef<HTMLDivElement>(null);
  const notifRef  = useRef<HTMLDivElement>(null);

  /* pending tasks — potrzebujemy ich w nagłówku (powiadomienia) */
  const [pendingCount, setPendingCount] = useState(0);
  const [notifications, setNotifications] = useState<Array<{id:string;title:string;dueDate?:string;priority?:string}>>([]);

  /* pobierz liczbę zadań przy montowaniu i przy nawigacji */
  useEffect(() => {
    const refresh = () => {
      try {
        const raw = localStorage.getItem("student_panel_tasks");
        const tasks: Array<{done:boolean;dueDate?:string;id:string;title:string;priority?:string}> =
          raw ? JSON.parse(raw) : [];
        const pending = tasks.filter(t => !t.done);
        setPendingCount(pending.length);
        setNotifications(
          [...pending]
            .sort((a, b) => {
              if (!a.dueDate) return 1; if (!b.dueDate) return -1;
              return a.dueDate.split("-").reverse().join("").localeCompare(b.dueDate.split("-").reverse().join(""));
            })
            .slice(0, 5)
        );
      } catch { /* ignore */ }
    };
    refresh();
    window.addEventListener("storage", refresh);
    const id = setInterval(refresh, 3000); // odświeżaj co 3 s
    return () => { window.removeEventListener("storage", refresh); clearInterval(id); };
  }, []);

  /* zegar */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  /* Ctrl/Cmd + K */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* klik poza dropdownami */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setShowDropdown(false);
      if (notifRef.current  && !notifRef.current.contains(e.target as Node))  setShowNotif(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const dateStr = now.toLocaleDateString(dateLocale(lang), { weekday: "long", day: "numeric", month: "long" });
  const timeStr = now.toLocaleTimeString(dateLocale(lang), { hour: "2-digit", minute: "2-digit" });

  const userName    = user?.name ?? t("common.userFallback");
  const userEmail   = user?.email ?? "";
  const userInitials = userName.split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "").join("") || "?";

  return (
    <div className="main-wrapper">
      {searchOpen && (
        <GlobalSearch
          tasks={[]} notes={[]} courses={[]}
          teachers={DEFAULT_TEACHERS}
          onClose={() => setSearchOpen(false)}
          onNavigate={(section) => { navigate(`/${section}`); setSearchOpen(false); }}
        />
      )}

      <div className="main-panel">
        <div className="main-panel__top">
          <div className="main-header__brand">
            <div className="main-header__brand-logo">
              <img src="/logo-light.png" alt="Studly" className="main-header__logo-img main-header__logo--on-dark" />
              <img src="/logo-dark.png" alt="Studly" className="main-header__logo-img main-header__logo--on-light" />
            </div>
            <div className="main-header__brand-divider" />
            <div className="main-header__brand-text">
              <div className="main-header__clock-time">{timeStr}</div>
              <div className="main-header__clock-date">{dateStr}</div>
            </div>
          </div>

          <button className="header-search-bar" onClick={() => setSearchOpen(true)} title={t("header.searchTitle")}>
            <i className="ti ti-search header-search-bar__icon" />
            <span className="header-search-bar__placeholder">{t("header.searchPlaceholder")}</span>
          </button>

          <div className="main-header__right">
            <LanguageToggle />
            <ThemeToggle />
            {/* Powiadomienia */}
            <div className="notif-wrapper" ref={notifRef}>
              <button
                className={`header-icon-btn ${showNotif ? "is-active" : ""}`}
                title={t("header.notifications")}
                onClick={() => { setShowNotif(v => !v); setShowDropdown(false); }}
              >
                <i className="ti ti-bell" />
                {pendingCount > 0 && <span className="notif-dot" />}
              </button>
              {showNotif && (
                <div className="notif-dropdown">
                  <div className="notif-dropdown__header">
                    <span className="notif-dropdown__title">{t("header.notifications")}</span>
                    {pendingCount > 0 && <span className="notif-dropdown__badge">{pendingCount}</span>}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="notif-dropdown__empty"><i className="ti ti-checks" /><p>{t("notif.empty")}</p></div>
                  ) : (
                    <div className="notif-dropdown__list">
                      {notifications.map(n => {
                        const [d, m] = (n.dueDate || "").split("-");
                        return (
                          <div key={n.id} className="notif-item" onClick={() => { navigate("/tasks"); setShowNotif(false); }}>
                            <div className={`notif-item__icon ${n.priority === "high" ? "is-high" : n.priority === "medium" ? "is-med" : "is-low"}`}>
                              <i className="ti ti-checkbox" />
                            </div>
                            <div className="notif-item__text">
                              <span className="notif-item__title">{n.title}</span>
                              {n.dueDate
                                ? <span className="notif-item__sub"><i className="ti ti-calendar" /> {t("notif.due")} {d}/{m}</span>
                                : <span className="notif-item__sub">{t("notif.noDue")}</span>}
                            </div>
                            {n.priority === "high" && <span className="notif-item__pill">{t("notif.urgent")}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button className="notif-dropdown__footer" onClick={() => { navigate("/tasks"); setShowNotif(false); }}>
                    {t("notif.viewAll")} <i className="ti ti-arrow-right" />
                  </button>
                </div>
              )}
            </div>

            {/* Avatar */}
            <div className="header-avatar" ref={avatarRef} onClick={() => setShowDropdown(v => !v)} title={t("avatar.profileTitle")}>
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt={userName} className="header-avatar__img" />
                : userInitials}
              {showDropdown && (
                <div className="avatar-dropdown">
                  <div className="avatar-dropdown__header">
                    <div className="avatar-dropdown__name">{userName}</div>
                    <div className="avatar-dropdown__email">{userEmail}</div>
                  </div>
                  <button className="avatar-dropdown__item" onClick={() => { navigate("/profil"); setShowDropdown(false); }}>
                    <i className="ti ti-user" /> {t("avatar.myProfile")}
                  </button>
                  {user?.role === "admin" && (
                    <button className="avatar-dropdown__item" onClick={() => { navigate("/admin"); setShowDropdown(false); }}>
                      <i className="ti ti-shield" /> {t("avatar.adminPanel")}
                    </button>
                  )}
                  <button className="avatar-dropdown__item danger" onClick={() => void logout()}>
                    <i className="ti ti-logout" /> {t("common.logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="main-panel__divider" />

        <nav className="main-nav">
          {NAV_TABS.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) => `main-nav__btn ${isActive ? "is-active" : ""}`}
              title={t(tab.key)}
            >
              <i className={`ti ${tab.icon}`} aria-hidden="true" />
              <span className="nav-label">{t(tab.key)}</span>
              {tab.star && <span className="nav-star" aria-hidden="true">★</span>}
            </NavLink>
          ))}
          {user?.role === "admin" && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `main-nav__btn ${isActive ? "is-active" : ""}`}
              title={t("nav.admin")}
            >
              <i className="ti ti-shield" aria-hidden="true" />
              <span className="nav-label">{t("nav.admin")}</span>
            </NavLink>
          )}
        </nav>
      </div>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

/* ── Layout wrapper: DataProvider + AppShell ──────────────── */
const AppLayout = () => {
  const { user } = useAuth();
  // Bramka: jeśli konto ma wymuszoną zmianę hasła — blokuj dostęp do aplikacji.
  if (user?.mustChangePassword) return <ForcePasswordView />;
  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
};

/* ── Root ─────────────────────────────────────────────────── */
function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<div className="full-center"><div className="spinner" /></div>}>
        <Routes>
          <Route path="/login"  element={<LoginGuard />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"  element={<DashboardView />} />
              <Route path="/tasks"      element={<TasksView />} />
              <Route path="/notes"      element={<NotesView />} />
              <Route path="/schedule"   element={<ScheduleView teachers={DEFAULT_TEACHERS} />} />
              <Route path="/calendar"   element={<CalendarView />} />
              <Route path="/study"      element={<StudyZoneView />} />
              <Route path="/grades"     element={<GradesView />} />
              <Route path="/teachers"   element={<TeachersView />} />
              <Route path="/downloads"  element={<DownloadsView />} />
              <Route path="/profil"     element={<ProfileView />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin/*" element={<AdminView />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFoundView />} />
        </Routes>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
