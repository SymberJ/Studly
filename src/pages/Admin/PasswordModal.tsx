import { useState } from "react";
import type { AdminUserRow } from "../../app/types";
import { useT } from "../../lib/i18n/context";

type Props = {
  user: AdminUserRow;
  onClose: () => void;
  onSubmit: (password: string, forceChange: boolean) => Promise<void>;
};

/** Generuje czytelne hasło tymczasowe. */
const genPassword = () => {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export default function PasswordModal({ user, onClose, onSubmit }: Props) {
  const { t } = useT();
  const [password, setPassword] = useState("");
  const [force, setForce] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (password.length < 6) { setErr(t("admin.pwd.minErr")); return; }
    setSaving(true);
    try {
      await onSubmit(password, force);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal admin-modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__header">
          <h3 className="admin-modal__title"><i className="ti ti-key" /> {t("admin.pwd.title")}</h3>
          <button className="admin-modal__close" onClick={onClose} aria-label={t("common.close")}><i className="ti ti-x" /></button>
        </div>

        <div className="admin-modal__body">
          <p className="admin-confirm-text" style={{ marginBottom: 16 }}>
            {t("admin.pwd.newFor")} <strong>{user.name}</strong> ({user.email}).
          </p>

          <div className="admin-field admin-field--wide">
            <span>{t("admin.pwd.newPass")}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("admin.pwd.minPlaceholder")}
                style={{ flex: 1 }}
              />
              <button className="admin-btn admin-btn--ghost" type="button" onClick={() => setPassword(genPassword())}>
                <i className="ti ti-dice-3" /> {t("admin.pwd.generate")}
              </button>
            </div>
          </div>

          <label className="admin-check">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
            <span>{t("admin.pwd.forceChange")}</span>
          </label>

          {err && <div className="admin-form-error"><i className="ti ti-alert-circle" /> {err}</div>}
        </div>

        <div className="admin-modal__footer">
          <button className="admin-btn admin-btn--ghost" onClick={onClose} disabled={saving}>{t("common.cancel")}</button>
          <button className="admin-btn admin-btn--primary" onClick={submit} disabled={saving}>
            <i className={`ti ${saving ? "ti-loader-2 admin-spin" : "ti-key"}`} />
            {saving ? t("common.saving") : t("admin.pwd.setPass")}
          </button>
        </div>
      </div>
    </div>
  );
}
