import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/auth/useAuth";
import { useToast } from "../Toast/Toast";
import { useT } from "../../lib/i18n/context";
import { getAiConfig, saveAiConfig, isAiConfigured, AI_PRESETS, type AiConfig } from "../../lib/ai/aiConfig";
import { chatAI, AiError, type AiMessage } from "../../lib/ai/aiClient";
import { buildOverview, notesText, listCourses, hasNotes } from "../../lib/ai/aiContext";
import "./AiAgent.css";

type ChatMsg = { role: "user" | "assistant"; content: string };

/** Agent AI do osadzenia (np. w Dashboardzie). Sam zarządza stanami:
 *  bramka Premium → konfiguracja modelu → czat z szybkimi akcjami. */
export default function AiAgent() {
  const { user, updateUser } = useAuth();
  const { error: toastErr } = useToast();
  const { t, lang } = useT();

  const [cfg, setCfg] = useState<AiConfig>(() => getAiConfig());
  const [showConfig, setShowConfig] = useState(false);
  const [consent, setConsent] = useState<boolean>(() => localStorage.getItem("studly-ai-consent") === "1");
  const [courseId, setCourseId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const courses = listCourses();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const aiErrMsg = (e: unknown) => {
    if (e instanceof AiError) {
      const map: Record<string, string> = {
        "not-configured": t("assistant.errNotConfigured"),
        auth: t("assistant.errAuth"),
        "rate-limit": t("assistant.errRate"),
        network: t("assistant.errNetwork"),
        empty: t("assistant.errEmpty"),
      };
      return map[e.message] ?? t("assistant.errGeneric");
    }
    return t("assistant.errGeneric");
  };

  const systemPrompt = (): AiMessage => ({
    role: "system",
    content:
      `${t("assistant.systemPrompt")} ${lang === "en" ? "Reply in English." : "Odpowiadaj po polsku."}\n\n` +
      `--- ${t("assistant.dataHeader")} ---\n${buildOverview(user)}`,
  });

  const run = async (userVisible: string, modelContent?: string) => {
    if (busy) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: userVisible }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const convo: AiMessage[] = [
        systemPrompt(),
        ...next.slice(0, -1).map((m) => ({ role: m.role, content: m.content }) as AiMessage),
        { role: "user", content: modelContent ?? userVisible },
      ];
      const reply = await chatAI(convo);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      toastErr(aiErrMsg(e));
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  };

  const quick = (kind: "summary" | "flashcards" | "quiz" | "plan") => {
    if (kind === "plan") {
      run(t("assistant.qa.plan"), `${t("assistant.prompt.plan")}`);
      return;
    }
    if (!hasNotes(courseId || undefined)) {
      toastErr(t("assistant.noNotes"));
      return;
    }
    const notes = notesText(courseId || undefined);
    const label =
      kind === "summary" ? t("assistant.qa.summary") :
      kind === "flashcards" ? t("assistant.qa.flashcards") :
      t("assistant.qa.quiz");
    const instruction =
      kind === "summary" ? t("assistant.prompt.summary") :
      kind === "flashcards" ? t("assistant.prompt.flashcards") :
      t("assistant.prompt.quiz");
    run(label, `${instruction}\n\n--- ${t("assistant.notesHeader")} ---\n${notes}`);
  };

  /* ── Bramka Premium ────────────────────────────── */
  if (!user?.isPremium) {
    const feats = ["materials", "quizzes", "flashcards", "plan", "tasks", "calendar"] as const;
    return (
      <div className="ai-paywall">
        <div className="ai-paywall__badge">{t("assistant.premiumBadge")}</div>
        <h2 className="ai-paywall__headline">{t("assistant.paywallHeadline")}</h2>
        <p className="ai-paywall__lead">{t("assistant.paywallLead")}</p>
        <ul className="ai-paywall__feats">
          {feats.map((f) => (
            <li key={f}><i className="ti ti-circle-check" /> {t(`assistant.feat.${f}`)}</li>
          ))}
        </ul>
        <div className="ai-paywall__price">
          <span className="ai-paywall__amount">14,99 zł</span>
          <span className="ai-paywall__per">{t("assistant.perMonth")}</span>
        </div>
        <button className="ai-paywall__cta" onClick={() => updateUser({ isPremium: true })}>
          <i className="ti ti-sparkles" /> {t("assistant.activateDemo")}
        </button>
        <p className="ai-paywall__note">{t("assistant.demoNote")}</p>
      </div>
    );
  }

  /* ── Konfiguracja modelu ───────────────────────── */
  const configured = isAiConfigured(cfg);
  if (!configured || showConfig) {
    const applyPreset = (key: string) => {
      const p = AI_PRESETS[key];
      if (p) setCfg((c) => ({ ...c, baseUrl: p.baseUrl, model: p.model }));
    };
    const save = () => {
      if (!consent) { toastErr(t("assistant.consentRequired")); return; }
      localStorage.setItem("studly-ai-consent", "1");
      saveAiConfig(cfg);
      setShowConfig(false);
      if (!isAiConfigured(cfg)) toastErr(t("assistant.errNotConfigured"));
    };
    return (
      <div className="ai-config">
        <h3 className="ai-config__title"><i className="ti ti-settings" /> {t("assistant.configTitle")}</h3>
        <p className="ai-config__lead">{t("assistant.configLead")}</p>
        <label className="ai-config__field">
          <span>{t("assistant.provider")}</span>
          <select onChange={(e) => applyPreset(e.target.value)} defaultValue="">
            <option value="" disabled>{t("assistant.providerPick")}</option>
            {Object.entries(AI_PRESETS).map(([k, p]) => (
              <option key={k} value={k}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="ai-config__field">
          <span>{t("assistant.baseUrl")}</span>
          <input value={cfg.baseUrl} onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" />
        </label>
        <label className="ai-config__field">
          <span>{t("assistant.model")}</span>
          <input value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} placeholder="gpt-4o-mini" />
        </label>
        <label className="ai-config__field">
          <span>{t("assistant.apiKey")}</span>
          <input type="password" value={cfg.apiKey} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} placeholder="sk-…" />
        </label>
        <p className="ai-config__hint"><i className="ti ti-info-circle" /> {t("assistant.keyHint")}</p>
        <label className="ai-config__consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{t("assistant.consent")}</span>
        </label>
        <div className="ai-config__actions">
          {showConfig && <button className="ai-btn ai-btn--ghost" onClick={() => setShowConfig(false)}>{t("common.cancel")}</button>}
          <button className="ai-btn ai-btn--primary" onClick={save}>{t("common.save")}</button>
        </div>
      </div>
    );
  }

  /* ── Czat ──────────────────────────────────────── */
  return (
    <div className="ai-shell">
      <div className="ai-toolbar">
        <select className="ai-course-select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">{t("assistant.allCourses")}</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="ai-quick">
          <button onClick={() => quick("summary")} disabled={busy}><i className="ti ti-file-text" /> {t("assistant.qa.summary")}</button>
          <button onClick={() => quick("flashcards")} disabled={busy}><i className="ti ti-cards" /> {t("assistant.qa.flashcards")}</button>
          <button onClick={() => quick("quiz")} disabled={busy}><i className="ti ti-list-check" /> {t("assistant.qa.quiz")}</button>
          <button onClick={() => quick("plan")} disabled={busy}><i className="ti ti-calendar-bolt" /> {t("assistant.qa.plan")}</button>
        </div>
        <button className="ai-settings-btn" title={t("assistant.configTitle")} onClick={() => setShowConfig(true)}>
          <i className="ti ti-settings" />
        </button>
      </div>

      <div className="ai-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="ai-empty">
            <i className="ti ti-sparkles" />
            <p>{t("assistant.emptyState")}</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`ai-msg ai-msg--${m.role}`}>
            {m.role === "assistant" && <div className="ai-msg__avatar"><i className="ti ti-sparkles" /></div>}
            <div className="ai-msg__bubble">{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="ai-msg ai-msg--assistant">
            <div className="ai-msg__avatar"><i className="ti ti-sparkles" /></div>
            <div className="ai-msg__bubble ai-msg__bubble--typing"><span></span><span></span><span></span></div>
          </div>
        )}
      </div>

      <div className="ai-input-bar">
        <input
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) run(input.trim()); }}
          placeholder={t("assistant.inputPlaceholder")}
          disabled={busy}
        />
        <button className="ai-send" onClick={() => input.trim() && run(input.trim())} disabled={busy || !input.trim()}>
          <i className="ti ti-send" />
        </button>
      </div>
    </div>
  );
}
