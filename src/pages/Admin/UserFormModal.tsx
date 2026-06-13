import { useEffect, useState } from "react";
import type { AdminUserRow, StudentInput, UserRole, UserStatus } from "../../app/types";
import { useT } from "../../lib/i18n/context";

type Props = {
  /** Edytowany użytkownik (null = tryb tworzenia). */
  editing: AdminUserRow | null;
  onClose: () => void;
  onSubmit: (data: StudentInput) => Promise<void>;
};

const empty: StudentInput = {
  name: "", email: "", password: "", role: "student",
  albumNumber: "", fieldOfStudy: "", studyYear: undefined,
  studyGroup: "", phone: "", status: "active", mustChangePassword: true,
};

export default function UserFormModal({ editing, onClose, onSubmit }: Props) {
  const { t } = useT();
  const isEdit = !!editing;
  const [form, setForm] = useState<StudentInput>(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        email: editing.email,
        password: "",
        role: editing.role,
        albumNumber: editing.albumNumber ?? "",
        fieldOfStudy: editing.fieldOfStudy ?? "",
        studyYear: editing.studyYear,
        studyGroup: editing.studyGroup ?? "",
        phone: editing.phone ?? "",
        status: editing.status ?? "active",
        mustChangePassword: false,
      });
    } else {
      setForm(empty);
    }
    setErr("");
  }, [editing]);

  const set = <K extends keyof StudentInput>(k: K, v: StudentInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setErr("");
    if (!form.name.trim()) return setErr(t("admin.user.errName"));
    if (!form.email.trim()) return setErr(t("admin.user.errEmail"));
    if (!isEdit && !form.password) return setErr(t("admin.user.errPass"));
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__header">
          <h3 className="admin-modal__title">
            <i className={`ti ${isEdit ? "ti-edit" : "ti-user-plus"}`} />
            {isEdit ? t("admin.user.editTitle") : t("admin.user.newTitle")}
          </h3>
          <button className="admin-modal__close" onClick={onClose} aria-label={t("common.close")}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div className="admin-modal__body">
          <div className="admin-form-grid">
            <label className="admin-field admin-field--wide">
              <span>{t("admin.user.name")}</span>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Jan Kowalski" />
            </label>

            <label className="admin-field admin-field--wide">
              <span>{t("admin.user.email")}</span>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jan.kowalski@email.com" />
            </label>

            <label className="admin-field admin-field--wide">
              <span>{isEdit ? t("admin.user.newPassEdit") : t("admin.user.passNew")}</span>
              <input type="text" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••" autoComplete="new-password" />
            </label>

            <label className="admin-field">
              <span>{t("admin.user.role")}</span>
              <select value={form.role} onChange={(e) => set("role", e.target.value as UserRole)}>
                <option value="student">{t("admin.user.roleStudent")}</option>
                <option value="admin">{t("admin.user.roleAdmin")}</option>
              </select>
            </label>

            <label className="admin-field">
              <span>{t("admin.user.status")}</span>
              <select value={form.status} onChange={(e) => set("status", e.target.value as UserStatus)}>
                <option value="active">{t("admin.user.statusActive")}</option>
                <option value="inactive">{t("admin.user.statusBlocked")}</option>
              </select>
            </label>

            <label className="admin-field">
              <span>{t("admin.user.album")}</span>
              <input value={form.albumNumber} onChange={(e) => set("albumNumber", e.target.value)} placeholder="12345" />
            </label>

            <label className="admin-field">
              <span>{t("admin.user.field")}</span>
              <input value={form.fieldOfStudy} onChange={(e) => set("fieldOfStudy", e.target.value)} placeholder="Informatyka" />
            </label>

            <label className="admin-field">
              <span>{t("admin.user.year")}</span>
              <input
                type="number" min={1} max={6}
                value={form.studyYear ?? ""}
                onChange={(e) => set("studyYear", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="2"
              />
            </label>

            <label className="admin-field">
              <span>{t("admin.user.group")}</span>
              <input value={form.studyGroup} onChange={(e) => set("studyGroup", e.target.value)} placeholder="INF-2A" />
            </label>

            <label className="admin-field admin-field--wide">
              <span>{t("admin.user.phone")}</span>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+48 600 100 200" />
            </label>
          </div>

          {!isEdit && (
            <label className="admin-check">
              <input
                type="checkbox"
                checked={form.mustChangePassword ?? false}
                onChange={(e) => set("mustChangePassword", e.target.checked)}
              />
              <span>{t("admin.user.forceFirst")}</span>
            </label>
          )}

          {err && <div className="admin-form-error"><i className="ti ti-alert-circle" /> {err}</div>}
        </div>

        <div className="admin-modal__footer">
          <button className="admin-btn admin-btn--ghost" onClick={onClose} disabled={saving}>{t("common.cancel")}</button>
          <button className="admin-btn admin-btn--primary" onClick={handleSubmit} disabled={saving}>
            <i className={`ti ${saving ? "ti-loader-2 admin-spin" : "ti-device-floppy"}`} />
            {saving ? t("common.saving") : isEdit ? t("admin.user.saveChanges") : t("admin.user.create")}
          </button>
        </div>
      </div>
    </div>
  );
}
