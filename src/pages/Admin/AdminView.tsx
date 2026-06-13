import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "../../lib/auth/useAuth";
import { useToast } from "../../components/Toast/Toast";
import { useT } from "../../lib/i18n/context";
import { dateLocale } from "../../lib/utils";
import { isSupabaseEnabled } from "../../lib/supabase";
import * as adminApi from "../../lib/admin/adminApi";
import { fetchAuditLog, logEvent } from "../../lib/audit";
import type { AdminStats, AdminUserRow, AuditAction, AuditEntry, StudentInput, UserRole } from "../../app/types";
import type { Lang } from "../../lib/i18n/translations";
import UserFormModal from "./UserFormModal";
import PasswordModal from "./PasswordModal";
import ConfirmDialog from "./ConfirmDialog";
import "./AdminView.css";

const dateFmt = (lang: Lang, iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(dateLocale(lang), { day: "2-digit", month: "short", year: "numeric" }) : "—";

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/* ═══════════════════════════════════════════════════════════
   PRZEGLĄD
═══════════════════════════════════════════════════════════ */
const AdminOverview = () => {
  const { t, lang } = useT();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recent, setRecent] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, users] = await Promise.all([adminApi.fetchStats(), adminApi.fetchUsers()]);
        if (!alive) return;
        setStats(s);
        setRecent(users.slice(0, 5));
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading || !stats) return <div className="admin-loading">{t("admin.loadingStats")}</div>;

  const cards = [
    { key: "admin.card.users", value: stats.users, icon: "ti-users", tint: "indigo" },
    { key: "admin.card.students", value: stats.students, icon: "ti-school", tint: "blue" },
    { key: "admin.card.admins", value: stats.admins, icon: "ti-shield-lock", tint: "violet" },
    { key: "admin.card.active", value: stats.active, icon: "ti-user-check", tint: "green" },
    { key: "admin.card.tasks", value: stats.tasks, icon: "ti-checkbox", tint: "amber" },
    { key: "admin.card.courses", value: stats.courses, icon: "ti-book", tint: "blue" },
    { key: "admin.card.notes", value: stats.notes, icon: "ti-notebook", tint: "violet" },
    { key: "admin.card.inactive", value: stats.inactive, icon: "ti-user-off", tint: "red" },
  ];

  const total = Math.max(stats.students + stats.admins, 1);
  const studentsPct = Math.round((stats.students / total) * 100);

  return (
    <div>
      <h2 className="admin-section-title">{t("admin.overview")}</h2>

      <div className="admin-stats-grid">
        {cards.map((c) => (
          <div key={c.key} className={`admin-stat-card admin-stat-card--${c.tint}`}>
            <i className={`ti ${c.icon} admin-stat-card__icon`} />
            <div className="admin-stat-card__value">{c.value}</div>
            <div className="admin-stat-card__label">{t(c.key)}</div>
          </div>
        ))}
      </div>

      <div className="admin-overview-cols">
        <div className="admin-panel-box">
          <h3 className="admin-box-title">{t("admin.roleSplit")}</h3>
          <div className="admin-bar">
            <div className="admin-bar__seg admin-bar__seg--students" style={{ width: `${studentsPct}%` }} />
            <div className="admin-bar__seg admin-bar__seg--admins" style={{ width: `${100 - studentsPct}%` }} />
          </div>
          <div className="admin-bar-legend">
            <span><i className="admin-dot admin-dot--students" /> {t("admin.studentsLegend")}: {stats.students}</span>
            <span><i className="admin-dot admin-dot--admins" /> {t("admin.adminsLegend")}: {stats.admins}</span>
          </div>
        </div>

        <div className="admin-panel-box">
          <h3 className="admin-box-title">{t("admin.recentAdded")}</h3>
          {recent.length === 0 ? (
            <p className="admin-muted">{t("admin.noUsers")}</p>
          ) : (
            <ul className="admin-recent-list">
              {recent.map((u) => (
                <li key={u.id}>
                  <div className="admin-user-initials admin-user-initials--sm">{initials(u.name)}</div>
                  <div className="admin-recent-meta">
                    <span className="admin-recent-name">{u.name}</span>
                    <span className="admin-muted">{u.email}</span>
                  </div>
                  <span className="admin-muted admin-recent-date">{dateFmt(lang, u.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   UŻYTKOWNICY
═══════════════════════════════════════════════════════════ */
const AdminUsers = () => {
  const { user: me } = useAuth();
  const { success, error: toastErr } = useToast();
  const { t, lang } = useT();

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [toDelete, setToDelete] = useState<AdminUserRow | null>(null);
  const [pwUser, setPwUser] = useState<AdminUserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await adminApi.fetchUsers());
    } catch (e) {
      toastErr(e instanceof Error ? e.message : t("admin.errLoad"));
    } finally {
      setLoading(false);
    }
  }, [toastErr, t]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && (u.status ?? "active") !== statusFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.albumNumber ?? "").toLowerCase().includes(q) ||
        (u.fieldOfStudy ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, query, roleFilter, statusFilter]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (u: AdminUserRow) => { setEditing(u); setModalOpen(true); };

  const handleSubmit = async (data: StudentInput) => {
    const res = editing
      ? await adminApi.updateUser(editing.id, data)
      : await adminApi.createUser(data);
    if (!res.ok) { toastErr(res.error ? t(res.error) : t("admin.errOp")); return; }
    logEvent(editing ? "user.update" : "user.create", { actor: me ?? undefined, target: data.email });
    success(editing ? t("admin.savedChanges") : t("admin.created"));
    setModalOpen(false);
    await load();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const res = await adminApi.deleteUser(toDelete.id);
    const removed = toDelete;
    setToDelete(null);
    if (!res.ok) { toastErr(res.error ? t(res.error) : t("admin.errDelete")); return; }
    logEvent("user.delete", { actor: me ?? undefined, target: removed.email });
    success(t("admin.userDeleted"));
    await load();
  };

  const toggleRole = async (u: AdminUserRow) => {
    const next: UserRole = u.role === "admin" ? "student" : "admin";
    const res = await adminApi.changeRole(u.id, next);
    if (!res.ok) { toastErr(res.error ? t(res.error) : t("admin.err")); return; }
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: next } : x)));
    logEvent("user.role", { actor: me ?? undefined, target: u.email, details: `→ ${next}` });
    success(t("admin.roleChanged"));
  };

  const toggleStatus = async (u: AdminUserRow) => {
    const next = (u.status ?? "active") === "active" ? "inactive" : "active";
    const res = await adminApi.changeStatus(u.id, next);
    if (!res.ok) { toastErr(res.error ? t(res.error) : t("admin.err")); return; }
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
    logEvent("user.status", { actor: me ?? undefined, target: u.email, details: next === "active" ? t("admin.detailUnblocked") : t("admin.detailBlocked") });
    success(next === "active" ? t("admin.statusUnblocked") : t("admin.statusBlockedToast"));
  };

  const handleResetPassword = async (password: string, forceChange: boolean) => {
    if (!pwUser) return;
    const res = await adminApi.resetPassword(pwUser.id, password, forceChange);
    if (!res.ok) { toastErr(res.error ? t(res.error) : t("admin.errResetPass")); return; }
    logEvent("user.password", { actor: me ?? undefined, target: pwUser.email, details: forceChange ? t("admin.detailForced") : undefined });
    setPwUser(null);
    success(t("admin.passReset"));
  };

  const exportCsv = () => {
    const head = [t("admin.csv.name"), t("admin.csv.email"), t("admin.csv.role"), t("admin.csv.status"), t("admin.csv.album"), t("admin.csv.field"), t("admin.csv.year"), t("admin.csv.group"), t("admin.csv.created")];
    const rows = filtered.map((u) => [
      u.name, u.email, u.role, u.status ?? "active",
      u.albumNumber ?? "", u.fieldOfStudy ?? "", u.studyYear ?? "", u.studyGroup ?? "",
      u.createdAt ? new Date(u.createdAt).toLocaleDateString(dateLocale(lang)) : "",
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${lang === "en" ? "users" : "uzytkownicy"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="admin-users-head">
        <h2 className="admin-section-title" style={{ margin: 0 }}>
          {t("admin.nav.users")} <span className="admin-count-pill">{filtered.length}</span>
        </h2>
        <div className="admin-users-actions">
          <button className="admin-btn admin-btn--ghost" onClick={exportCsv} disabled={!filtered.length}>
            <i className="ti ti-download" /> {t("admin.exportCsv")}
          </button>
          <button className="admin-btn admin-btn--primary" onClick={openCreate}>
            <i className="ti ti-user-plus" /> {t("admin.addStudent")}
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <i className="ti ti-search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.searchPlaceholder")}
          />
        </div>
        <select className="admin-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}>
          <option value="all">{t("admin.allRoles")}</option>
          <option value="student">{t("admin.filterStudents")}</option>
          <option value="admin">{t("admin.filterAdmins")}</option>
        </select>
        <select className="admin-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">{t("admin.anyStatus")}</option>
          <option value="active">{t("admin.filterActive")}</option>
          <option value="inactive">{t("admin.filterBlocked")}</option>
        </select>
      </div>

      {loading ? (
        <div className="admin-loading">{t("admin.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <i className="ti ti-mood-empty" />
          <p>{t("admin.noUsersCriteria")}</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.th.user")}</th>
                <th>{t("admin.th.fieldGroup")}</th>
                <th>{t("admin.th.role")}</th>
                <th>{t("admin.th.status")}</th>
                <th>{t("admin.th.activity")}</th>
                <th>{t("admin.th.lastLogin")}</th>
                <th className="admin-th-actions">{t("admin.th.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isMe = u.id === me?.id;
                const status = u.status ?? "active";
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="admin-user-cell">
                        {u.avatarUrl
                          ? <img src={u.avatarUrl} alt="" className="admin-user-avatar" />
                          : <div className="admin-user-initials">{initials(u.name)}</div>}
                        <div className="admin-user-meta">
                          <span className="admin-user-name">{u.name} {isMe && <span className="admin-you">{t("admin.you")}</span>}</span>
                          <span className="admin-muted admin-user-sub">
                            {u.email}{u.albumNumber ? ` · ${t("admin.nrPrefix")} ${u.albumNumber}` : ""}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="admin-muted">
                      {u.fieldOfStudy ?? "—"}{u.studyGroup ? ` · ${u.studyGroup}` : ""}{u.studyYear ? ` · ${u.studyYear} ${t("admin.yearSuffix")}` : ""}
                    </td>
                    <td><span className={`admin-role-badge admin-role-badge--${u.role}`}>{u.role === "admin" ? t("admin.roleAdmin") : t("admin.roleStudent")}</span></td>
                    <td>
                      <span className={`admin-status-badge admin-status-badge--${status}`}>
                        <i className={`ti ${status === "active" ? "ti-circle-check" : "ti-circle-x"}`} />
                        {status === "active" ? t("admin.statusActive") : t("admin.statusBlockedLabel")}
                      </span>
                    </td>
                    <td className="admin-muted">
                      {u.taskCount === null
                        ? <span title={t("admin.countsTitle")}>—</span>
                        : <span>{u.taskCount} {t("admin.tasksShort")} · {u.courseCount} {t("admin.coursesShort")}</span>}
                    </td>
                    <td className="admin-muted">{dateFmt(lang, u.lastSignInAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button className="admin-icon-btn" title={t("admin.act.edit")} onClick={() => openEdit(u)}>
                          <i className="ti ti-edit" />
                        </button>
                        <button className="admin-icon-btn" title={t("admin.act.resetPass")} onClick={() => setPwUser(u)}>
                          <i className="ti ti-key" />
                        </button>
                        <button
                          className="admin-icon-btn"
                          title={status === "active" ? t("admin.act.block") : t("admin.act.unblock")}
                          onClick={() => toggleStatus(u)}
                          disabled={isMe}
                        >
                          <i className={`ti ${status === "active" ? "ti-lock" : "ti-lock-open"}`} />
                        </button>
                        <button
                          className="admin-icon-btn"
                          title={u.role === "admin" ? t("admin.act.revokeAdmin") : t("admin.act.grantAdmin")}
                          onClick={() => toggleRole(u)}
                          disabled={isMe}
                        >
                          <i className={`ti ${u.role === "admin" ? "ti-shield-off" : "ti-shield-plus"}`} />
                        </button>
                        <button
                          className="admin-icon-btn admin-icon-btn--danger"
                          title={t("admin.act.delete")}
                          onClick={() => setToDelete(u)}
                          disabled={isMe}
                        >
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <UserFormModal editing={editing} onClose={() => setModalOpen(false)} onSubmit={handleSubmit} />
      )}
      {pwUser && (
        <PasswordModal user={pwUser} onClose={() => setPwUser(null)} onSubmit={handleResetPassword} />
      )}
      {toDelete && (
        <ConfirmDialog
          title={t("admin.confirmDeleteTitle")}
          message={lang === "en"
            ? `Account "${toDelete.name}" (${toDelete.email}) will be permanently deleted. This action cannot be undone.`
            : `Konto „${toDelete.name}" (${toDelete.email}) zostanie trwale usunięte. Tej operacji nie można cofnąć.`}
          confirmLabel={t("admin.act.delete")}
          danger
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   DZIENNIK AUDYTU
═══════════════════════════════════════════════════════════ */
const ACTION_META: Record<AuditAction, { labelKey: string; icon: string; cls: string }> = {
  "login":        { labelKey: "admin.act.login",       icon: "ti-login",        cls: "login" },
  "logout":       { labelKey: "admin.act.logout",      icon: "ti-logout",       cls: "logout" },
  "user.create":  { labelKey: "admin.act.userCreate",  icon: "ti-user-plus",    cls: "create" },
  "user.update":  { labelKey: "admin.act.userUpdate",  icon: "ti-edit",         cls: "update" },
  "user.delete":  { labelKey: "admin.act.userDelete",  icon: "ti-trash",        cls: "delete" },
  "user.role":    { labelKey: "admin.act.userRole",    icon: "ti-shield",       cls: "role" },
  "user.status":  { labelKey: "admin.act.userStatus",  icon: "ti-toggle-left",  cls: "status" },
  "user.password":{ labelKey: "admin.act.userPassword",icon: "ti-key",          cls: "password" },
};

const AdminLogs = () => {
  const { t, lang } = useT();
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchAuditLog()
      .then((l) => { if (alive) setLog(l); })
      .catch((e) => console.error(e))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(dateLocale(lang), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <h2 className="admin-section-title">
        {t("admin.log.title")} <span className="admin-count-pill">{log.length}</span>
      </h2>
      {!isSupabaseEnabled && (
        <p className="admin-help-text" style={{ marginTop: 0, marginBottom: 18 }}>
          {t("admin.log.demoNote")}
        </p>
      )}
      {loading ? (
        <div className="admin-loading">{t("admin.loading")}</div>
      ) : log.length === 0 ? (
        <div className="admin-empty"><i className="ti ti-history" /><p>{t("admin.log.empty")}</p></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>{t("admin.log.th.date")}</th><th>{t("admin.log.th.action")}</th><th>{t("admin.log.th.actor")}</th><th>{t("admin.log.th.target")}</th><th>{t("admin.log.th.details")}</th></tr>
            </thead>
            <tbody>
              {log.map((e) => {
                const meta = ACTION_META[e.action] ?? { labelKey: e.action, icon: "ti-point", cls: "update" };
                return (
                  <tr key={e.id}>
                    <td className="admin-muted">{fmt(e.at)}</td>
                    <td>
                      <span className={`admin-log-action admin-log-action--${meta.cls}`}>
                        <i className={`ti ${meta.icon}`} /> {t(meta.labelKey)}
                      </span>
                    </td>
                    <td className="admin-muted">{e.actorEmail}</td>
                    <td className="admin-muted">{e.target ?? "—"}</td>
                    <td className="admin-muted">{e.details ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   USTAWIENIA
═══════════════════════════════════════════════════════════ */
const AdminSettings = () => {
  const { success } = useToast();
  const { t } = useT();
  const [confirmReset, setConfirmReset] = useState(false);

  const doReset = () => {
    adminApi.resetDemoData();
    setConfirmReset(false);
    success(t("admin.resetDone"));
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div>
      <h2 className="admin-section-title">{t("admin.settings")}</h2>

      <div className="admin-panel-box">
        <h3 className="admin-box-title">{t("admin.dataMode")}</h3>
        <div className="admin-info-row">
          <span className="admin-muted">{t("admin.dataSource")}</span>
          <span className={`admin-mode-badge admin-mode-badge--${isSupabaseEnabled ? "live" : "demo"}`}>
            <i className={`ti ${isSupabaseEnabled ? "ti-database" : "ti-flask"}`} />
            {isSupabaseEnabled ? t("admin.modeLive") : t("admin.modeDemo")}
          </span>
        </div>
        <p className="admin-help-text">
          {isSupabaseEnabled ? t("admin.modeLiveHelp") : t("admin.modeDemoHelp")}
        </p>
      </div>

      {!isSupabaseEnabled && (
        <div className="admin-panel-box admin-panel-box--danger">
          <h3 className="admin-box-title">{t("admin.dangerZone")}</h3>
          <p className="admin-help-text">
            {t("admin.resetHelp")}
          </p>
          <button className="admin-btn admin-btn--danger" onClick={() => setConfirmReset(true)}>
            <i className="ti ti-refresh" /> {t("admin.resetBtn")}
          </button>
        </div>
      )}

      {confirmReset && (
        <ConfirmDialog
          title={t("admin.resetConfirmTitle")}
          message={t("admin.resetConfirmMsg")}
          confirmLabel={t("admin.resetConfirmLabel")}
          danger
          onConfirm={doReset}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   LAYOUT + ROUTER
═══════════════════════════════════════════════════════════ */
export default function AdminView() {
  const { user } = useAuth();
  const { t, lang } = useT();
  const navLinks = [
    { to: "/admin", key: "admin.nav.overview", icon: "ti-layout-dashboard", end: true },
    { to: "/admin/users", key: "admin.nav.users", icon: "ti-users" },
    { to: "/admin/logs", key: "admin.nav.logs", icon: "ti-history" },
    { to: "/admin/settings", key: "admin.nav.settings", icon: "ti-settings" },
  ];

  return (
    <div className="view-section-wrap">
      <div className="section-header-glass">
        <div className="section-header-glass__left">
          <p className="section-header-glass__date">
            {new Date().toLocaleDateString(dateLocale(lang), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h2 className="section-header-glass__title">{t("admin.title")} 🛡️</h2>
          <p className="section-header-glass__subtitle">
            {t("admin.loggedAs")} {user?.name} · {user?.email}
          </p>
        </div>
      </div>

      <div className="admin-layout">
        <nav className="admin-sidebar">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `admin-nav-link ${isActive ? "is-active" : ""}`}
            >
              <i className={`ti ${l.icon}`} />
              {t(l.key)}
            </NavLink>
          ))}
        </nav>

        <div className="admin-content">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
