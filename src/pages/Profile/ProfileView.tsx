import { useRef, useState } from "react";
import { useAuth } from "../../lib/auth/useAuth";
import { supabase, isSupabaseEnabled } from "../../lib/supabase";
import { useToast } from "../../components/Toast/Toast";
import { gatherUserData, downloadJson } from "../../lib/exportData";
import { useT } from "../../lib/i18n/context";
import { dateLocale } from "../../lib/utils";
import "./ProfileView.css";

export default function ProfileView() {
  const { user, updateUser } = useAuth();
  const { success, error: toastError } = useToast();
  const { t, lang } = useT();

  const [name] = useState(user?.name ?? "");

  const [currentPass, setCurrentPass]   = useState("");
  const [newPass, setNewPass]           = useState("");
  const [repeatPass, setRepeatPass]     = useState("");
  const [savingPass, setSavingPass]     = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Eksport danych (RODO) ──────────────────────────── */
  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const data = await gatherUserData(user);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(lang === "en" ? `my-data-${stamp}.json` : `moje-dane-${stamp}.json`, data);
      success(t("profile.exported"));
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("profile.exportFail"));
    } finally {
      setExporting(false);
    }
  };

  /* ── Avatar ─────────────────────────────────────────── */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toastError(t("profile.fileTooLarge")); return; }

    setUploadingAvatar(true);
    try {
      if (isSupabaseEnabled && supabase && user) {
        // Upload do Supabase Storage
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `avatars/${user.id}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
        await updateUser({ avatarUrl: publicUrl });
        setAvatarPreview(publicUrl);
      } else {
        // Demo: base64 w localStorage
        const reader = new FileReader();
        reader.onload = async () => {
          const b64 = reader.result as string;
          await updateUser({ avatarUrl: b64 });
          setAvatarPreview(b64);
        };
        reader.readAsDataURL(file);
        return;
      }
      success(t("profile.avatarUpdated"));
    } catch (err: unknown) {
      toastError(t("profile.avatarError"));
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  /* ── Zmiana hasła ────────────────────────────────────── */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) { toastError(t("profile.newPassMin")); return; }
    if (newPass !== repeatPass) { toastError(t("profile.passMismatch")); return; }

    setSavingPass(true);
    try {
      if (isSupabaseEnabled && supabase) {
        const { error: passErr } = await supabase.auth.updateUser({ password: newPass });
        if (passErr) throw passErr;
        success(t("profile.passChanged"));
      } else {
        // Demo: brak prawdziwej weryfikacji — informuj
        if (currentPass !== "student" && currentPass !== "admin") {
          toastError(t("profile.wrongCurrentDemo"));
          return;
        }
        success(t("profile.passChangedDemo"));
      }
      setCurrentPass(""); setNewPass(""); setRepeatPass("");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : t("profile.passChangeError"));
    } finally {
      setSavingPass(false);
    }
  };

  const initials = name
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "").join("") || "?";

  return (
    <div className="view-section-wrap">
      <div className="section-header-glass">
        <div className="section-header-glass__left">
          <p className="section-header-glass__date">{new Date().toLocaleDateString(dateLocale(lang), { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</p>
          <h2 className="section-header-glass__title">{t("profile.title")} 👤</h2>
          <p className="section-header-glass__subtitle">{t("profile.subtitle")}</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* ── Avatar ───────────────────────────── */}
        <div className="profile-card">
          <h3 className="profile-card__title">{t("profile.photo")}</h3>
          <div className="profile-avatar-wrap">
            {avatarPreview
              ? <img src={avatarPreview} alt="Avatar" className="profile-avatar__img" />
              : <div className="profile-avatar__initials">{initials}</div>}
            <button
              className="profile-avatar__btn"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
            >
              <i className="ti ti-camera" />
              {uploadingAvatar ? t("profile.uploading") : t("profile.changePhoto")}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <p className="profile-avatar__hint">JPG, PNG, WebP • max 2 MB</p>
          </div>
        </div>

        {/* ── Dane profilu (tylko do odczytu) ──── */}
        <div className="profile-card">
          <h3 className="profile-card__title">{t("profile.accountData")}</h3>
          <div className="profile-form">
            <div className="profile-field">
              <label className="profile-label">{t("profile.fullName")}</label>
              <input className="profile-input profile-input--readonly" value={name} readOnly />
              <p className="profile-field__hint">
                <i className="ti ti-info-circle" /> {t("profile.nameHint")}
              </p>
            </div>
            <div className="profile-field">
              <label className="profile-label">{t("profile.email")}</label>
              <input className="profile-input profile-input--readonly" value={user?.email ?? ""} readOnly />
            </div>
            <div className="profile-field">
              <label className="profile-label">{t("profile.role")}</label>
              <input className="profile-input profile-input--readonly" value={user?.role === "admin" ? t("profile.roleAdmin") : t("profile.roleStudent")} readOnly />
            </div>
          </div>
        </div>

        {/* ── Zmiana hasła ──────────────────── */}
        <div className="profile-card profile-card--wide">
          <h3 className="profile-card__title">{t("profile.changePassword")}</h3>
          <form className="profile-form profile-form--inline" onSubmit={handleChangePassword}>
            {!isSupabaseEnabled && (
              <div className="profile-field">
                <label className="profile-label">{t("profile.currentPass")}</label>
                <input
                  type="password"
                  className="profile-input"
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            )}
            <div className="profile-field">
              <label className="profile-label">{t("profile.newPass")}</label>
              <input
                type="password"
                className="profile-input"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder={t("profile.minChars")}
              />
            </div>
            <div className="profile-field">
              <label className="profile-label">{t("profile.repeatPass")}</label>
              <input
                type="password"
                className="profile-input"
                value={repeatPass}
                onChange={e => setRepeatPass(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="profile-btn" disabled={savingPass}>
              <i className="ti ti-lock" />
              {savingPass ? t("common.saving") : t("profile.changePassBtn")}
            </button>
          </form>
        </div>

        {/* ── Eksport danych (RODO) ──────────── */}
        <div className="profile-card profile-card--wide">
          <h3 className="profile-card__title">{t("profile.gdprTitle")}</h3>
          <p className="profile-export__desc">
            {t("profile.gdprDesc")}
          </p>
          <button className="profile-btn profile-btn--ghost" onClick={handleExport} disabled={exporting}>
            <i className={`ti ${exporting ? "ti-loader-2 profile-spin" : "ti-download"}`} />
            {exporting ? t("profile.preparing") : t("profile.downloadData")}
          </button>
        </div>
      </div>
    </div>
  );
}
