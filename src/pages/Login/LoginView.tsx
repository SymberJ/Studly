import React, { useState } from "react";
import { useAuth } from "../../lib/auth/useAuth";
import { useT } from "../../lib/i18n/context";
import LanguageToggle from "../../components/LanguageToggle/LanguageToggle";
import ThemeToggle from "../../components/ThemeToggle/ThemeToggle";
import "./LoginView.css";

const LoginView = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const { login, loading } = useAuth();
  const { t } = useT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setBusy(true);
    try {
      const ok = await login(email, password);
      if (!ok) setError(true);
    } finally {
      setBusy(false);
    }
  };

  const disabled = loading || busy;

  return (
    <div className="lv-root">
      <div className="lv-orb lv-orb--1" />
      <div className="lv-orb lv-orb--2" />
      <div className="lv-orb lv-orb--3" />

      <div className="lv-wrap">
        <div className="lv-topbar">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        {/* Lewa kolumna – branding */}
        <div className="lv-brand">
          <h1 className="lv-brand__title">Stud<span>ly</span></h1>
          <p className="lv-brand__sub">{t("login.subtitle")}</p>

          <div className="lv-brand__divider" />

          <ul className="lv-features">
            <li><i className="ti ti-calendar-event" /><span>{t("login.feat.schedule")}</span></li>
            <li><i className="ti ti-checklist" /><span>{t("login.feat.tasks")}</span></li>
            <li><i className="ti ti-chart-bar" /><span>{t("login.feat.grades")}</span></li>
            <li><i className="ti ti-notes" /><span>{t("login.feat.notes")}</span></li>
          </ul>
        </div>

        {/* Prawa kolumna – formularz */}
        <div className="lv-card">
          <div className="lv-card__header">
            <h2 className="lv-card__title">{t("login.welcome")}</h2>
            <p className="lv-card__desc">{t("login.desc")}</p>
          </div>

          <form className="lv-form" onSubmit={handleSubmit}>
            <div className={`lv-field ${error ? "lv-field--err" : ""}`}>
              <label className="lv-label"><i className="ti ti-mail" /> {t("login.email")}</label>
              <input
                type="email"
                className="lv-input"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(false); }}
                placeholder={t("login.emailPlaceholder")}
                autoComplete="username"
              />
            </div>

            <div className={`lv-field ${error ? "lv-field--err" : ""}`}>
              <label className="lv-label"><i className="ti ti-lock" /> {t("login.password")}</label>
              <div className="lv-input-wrap">
                <input
                  type={showPass ? "text" : "password"}
                  className="lv-input lv-input--pass"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(false); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button type="button" className="lv-eye" onClick={() => setShowPass((p) => !p)} tabIndex={-1}>
                  <i className={`ti ${showPass ? "ti-eye-off" : "ti-eye"}`} />
                </button>
              </div>
            </div>

            {error && (
              <div className="lv-error">
                <i className="ti ti-alert-circle" />
                {t("login.error")}
              </div>
            )}

            <button type="submit" className="lv-submit" disabled={disabled}>
              <i className="ti ti-login" />
              {disabled ? t("login.wait") : t("login.submit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
