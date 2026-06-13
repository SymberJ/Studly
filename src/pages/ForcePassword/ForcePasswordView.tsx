import { useState } from "react";
import { useAuth } from "../../lib/auth/useAuth";
import { supabase, isSupabaseEnabled } from "../../lib/supabase";
import { updateUserDb } from "../../lib/auth/usersDb";
import { useToast } from "../../components/Toast/Toast";
import { useT } from "../../lib/i18n/context";
import "./ForcePasswordView.css";

/** Pełnoekranowa bramka: użytkownik musi ustawić nowe hasło, zanim wejdzie dalej. */
export default function ForcePasswordView() {
  const { user, updateUser, logout } = useAuth();
  const { success, error: toastError } = useToast();
  const { t } = useT();
  const [newPass, setNewPass] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) { toastError(t("force.minChars")); return; }
    if (newPass !== repeat) { toastError(t("force.mismatch")); return; }
    if (!user) return;

    setSaving(true);
    try {
      if (isSupabaseEnabled && supabase) {
        const { error: pErr } = await supabase.auth.updateUser({ password: newPass });
        if (pErr) throw pErr;
        await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
      } else {
        updateUserDb(user.id, { mustChangePassword: false }, newPass);
      }
      await updateUser({ mustChangePassword: false });
      success(t("force.success"));
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("force.fail"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fpv-root">
      <div className="fpv-card">
        <div className="fpv-icon"><i className="ti ti-shield-lock" /></div>
        <h1 className="fpv-title">{t("force.title")}</h1>
        <p className="fpv-desc">
          {t("force.desc")}
        </p>

        <form className="fpv-form" onSubmit={submit}>
          <label className="fpv-field">
            <span>{t("force.newPass")}</span>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder={t("force.minPlaceholder")}
              autoFocus
            />
          </label>
          <label className="fpv-field">
            <span>{t("force.repeat")}</span>
            <input
              type="password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          <button type="submit" className="fpv-submit" disabled={saving}>
            <i className={`ti ${saving ? "ti-loader-2 fpv-spin" : "ti-check"}`} />
            {saving ? t("common.saving") : t("force.submit")}
          </button>
        </form>

        <button className="fpv-logout" onClick={() => void logout()}>
          <i className="ti ti-logout" /> {t("common.logout")}
        </button>
      </div>
    </div>
  );
}
