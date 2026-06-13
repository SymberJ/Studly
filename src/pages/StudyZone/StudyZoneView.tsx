import { useCallback, useEffect, useRef, useState } from "react";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
import { useToast } from "../../components/Toast/Toast";
import { useT } from "../../lib/i18n/context";
import "./StudyZoneView.css";

/* ════════════════════════════════════════════════════════
   POMODORO — timer skupienia (cykle nauka / przerwa)
════════════════════════════════════════════════════════ */
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function PomodoroTile() {
  const { success } = useToast();
  const { t } = useT();
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [mode, setMode] = useState<"work" | "break">("work");
  const [secs, setSecs] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const total = (mode === "work" ? workMin : breakMin) * 60;

  // refy, aby interwał czytał aktualne wartości bez restartowania się przy każdym renderze
  const secsRef = useRef(secs);
  const modeRef = useRef(mode);
  const workRef = useRef(workMin);
  const breakRef = useRef(breakMin);
  const successRef = useRef(success);
  const tRef = useRef(t);
  useEffect(() => {
    secsRef.current = secs;
    modeRef.current = mode;
    workRef.current = workMin;
    breakRef.current = breakMin;
    successRef.current = success;
    tRef.current = t;
  });

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (secsRef.current > 1) {
        setSecs((s) => s - 1);
        return;
      }
      // koniec cyklu — przełącz tryb
      if (modeRef.current === "work") {
        setSessions((n) => n + 1);
        setMode("break");
        setSecs(breakRef.current * 60);
        successRef.current(tRef.current("study.sessionDoneToast"));
      } else {
        setMode("work");
        setSecs(workRef.current * 60);
        successRef.current(tRef.current("study.breakDoneToast"));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const changeWork = (d: number) => {
    const v = clamp(workMin + d, 5, 90);
    setWorkMin(v);
    if (mode === "work" && !running) setSecs(v * 60);
  };
  const changeBreak = (d: number) => {
    const v = clamp(breakMin + d, 1, 30);
    setBreakMin(v);
    if (mode === "break" && !running) setSecs(v * 60);
  };
  const reset = () => {
    setRunning(false);
    setMode("work");
    setSecs(workMin * 60);
  };

  const mm = Math.floor(secs / 60);
  const ss = secs % 60;
  const R = 78;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - secs / total);

  return (
    <div className="sz-card sz-pomodoro">
      <div className="sz-card__head">
        <h3 className="sz-card__title"><i className="ti ti-clock-bolt" /> {t("study.pomodoro")}</h3>
        <span className={`sz-mode-pill sz-mode-pill--${mode}`}>
          {mode === "work" ? t("study.work") : t("study.break")}
        </span>
      </div>

      <div className="sz-ring-wrap">
        <svg viewBox="0 0 180 180" className="sz-ring">
          <circle className="sz-ring__track" cx="90" cy="90" r={R} />
          <circle
            className={`sz-ring__progress sz-ring__progress--${mode}`}
            cx="90" cy="90" r={R}
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            transform="rotate(-90 90 90)"
          />
        </svg>
        <div className="sz-ring__time">
          <span className="sz-ring__digits">{mm}:{String(ss).padStart(2, "0")}</span>
          <span className="sz-ring__sub">{sessions} {t("study.sessionsDone")}</span>
        </div>
      </div>

      <div className="sz-pomo-controls">
        <button className="sz-btn-secondary" onClick={reset} title={t("study.reset")}>
          <i className="ti ti-refresh" />
        </button>
        <button className="sz-btn-primary" onClick={() => setRunning((r) => !r)}>
          <i className={`ti ${running ? "ti-player-pause" : "ti-player-play"}`} />
          {running ? t("study.pause") : t("study.start")}
        </button>
      </div>

      <div className="sz-durations">
        <div className="sz-duration">
          <span>{t("study.work")}</span>
          <div className="sz-stepper">
            <button onClick={() => changeWork(-5)} disabled={running}>−</button>
            <strong>{workMin} min</strong>
            <button onClick={() => changeWork(5)} disabled={running}>+</button>
          </div>
        </div>
        <div className="sz-duration">
          <span>{t("study.break")}</span>
          <div className="sz-stepper">
            <button onClick={() => changeBreak(-1)} disabled={running}>−</button>
            <strong>{breakMin} min</strong>
            <button onClick={() => changeBreak(1)} disabled={running}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   KALKULATOR
════════════════════════════════════════════════════════ */
const round = (n: number) => Math.round((n + Number.EPSILON) * 1e10) / 1e10;
const calc = (a: number, b: number, op: string): number => {
  switch (op) {
    case "+": return a + b;
    case "−": return a - b;
    case "×": return a * b;
    case "÷": return b === 0 ? NaN : a / b;
    default: return b;
  }
};

function CalcBtn({ label, onClick, variant = "" }: { label: string; onClick: () => void; variant?: string }) {
  return <button className={`sz-calc-btn ${variant}`} onClick={onClick}>{label}</button>;
}

function CalculatorTile() {
  const { t } = useT();
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState(true);

  const inputDigit = useCallback((d: string) => {
    setDisplay((cur) => (overwrite || cur === "0" ? d : cur + d));
    setOverwrite(false);
  }, [overwrite]);

  const inputDot = useCallback(() => {
    setDisplay((cur) => {
      if (overwrite) return "0.";
      return cur.includes(".") ? cur : cur + ".";
    });
    setOverwrite(false);
  }, [overwrite]);

  const clearAll = useCallback(() => {
    setDisplay("0"); setPrev(null); setOp(null); setOverwrite(true);
  }, []);

  const backspace = useCallback(() => {
    if (overwrite) return;
    setDisplay((cur) => (cur.length > 1 ? cur.slice(0, -1) : "0"));
  }, [overwrite]);

  const chooseOp = useCallback((next: string) => {
    const cur = parseFloat(display);
    if (prev === null) {
      setPrev(cur);
    } else if (op) {
      const r = round(calc(prev, cur, op));
      setPrev(r);
      setDisplay(String(r));
    }
    setOp(next);
    setOverwrite(true);
  }, [display, prev, op]);

  const equals = useCallback(() => {
    if (op === null || prev === null) return;
    const cur = parseFloat(display);
    const r = round(calc(prev, cur, op));
    setDisplay(Number.isFinite(r) ? String(r) : t("study.calcError"));
    setPrev(null); setOp(null); setOverwrite(true);
  }, [op, prev, display, t]);

  const percent = () => { setDisplay((c) => String(round(parseFloat(c) / 100))); };
  const toggleSign = () => { setDisplay((c) => (c === "0" ? c : String(round(parseFloat(c) * -1)))); };

  // obsługa klawiatury
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") inputDigit(e.key);
      else if (e.key === ".") inputDot();
      else if (e.key === "+") chooseOp("+");
      else if (e.key === "-") chooseOp("−");
      else if (e.key === "*") chooseOp("×");
      else if (e.key === "/") { e.preventDefault(); chooseOp("÷"); }
      else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); equals(); }
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Escape") clearAll();
      else if (e.key === "%") percent();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputDigit, inputDot, chooseOp, equals, backspace, clearAll]);

  return (
    <div className="sz-card sz-calculator">
      <div className="sz-card__head">
        <h3 className="sz-card__title"><i className="ti ti-calculator" /> {t("study.calculator")}</h3>
      </div>

      <div className="sz-calc-display">{display}</div>

      <div className="sz-calc-grid">
        <CalcBtn label="C" variant="sz-calc-btn--fn" onClick={clearAll} />
        <CalcBtn label="±" variant="sz-calc-btn--fn" onClick={toggleSign} />
        <CalcBtn label="%" variant="sz-calc-btn--fn" onClick={percent} />
        <CalcBtn label="÷" variant="sz-calc-btn--op" onClick={() => chooseOp("÷")} />

        <CalcBtn label="7" onClick={() => inputDigit("7")} />
        <CalcBtn label="8" onClick={() => inputDigit("8")} />
        <CalcBtn label="9" onClick={() => inputDigit("9")} />
        <CalcBtn label="×" variant="sz-calc-btn--op" onClick={() => chooseOp("×")} />

        <CalcBtn label="4" onClick={() => inputDigit("4")} />
        <CalcBtn label="5" onClick={() => inputDigit("5")} />
        <CalcBtn label="6" onClick={() => inputDigit("6")} />
        <CalcBtn label="−" variant="sz-calc-btn--op" onClick={() => chooseOp("−")} />

        <CalcBtn label="1" onClick={() => inputDigit("1")} />
        <CalcBtn label="2" onClick={() => inputDigit("2")} />
        <CalcBtn label="3" onClick={() => inputDigit("3")} />
        <CalcBtn label="+" variant="sz-calc-btn--op" onClick={() => chooseOp("+")} />

        <CalcBtn label="0" variant="sz-calc-btn--zero" onClick={() => inputDigit("0")} />
        <CalcBtn label="," onClick={inputDot} />
        <CalcBtn label="⌫" variant="sz-calc-btn--fn" onClick={backspace} />
        <CalcBtn label="=" variant="sz-calc-btn--eq" onClick={equals} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TECHNIKI NAUKI — rotująca karta ze sprawdzonymi metodami (dwujęzyczna)
════════════════════════════════════════════════════════ */
type Bi = { pl: string; en: string };
const TECHNIQUES: { icon: string; title: Bi; desc: Bi }[] = [
  { icon: "ti-brain",
    title: { pl: "Aktywne przypominanie", en: "Active recall" },
    desc: { pl: "Zamiast czytać notatki kolejny raz, zamknij je i odtwórz materiał z pamięci. Wysiłek przypominania utrwala wiedzę dużo mocniej niż bierne czytanie.", en: "Instead of re-reading your notes, close them and recall the material from memory. The effort of retrieval cements knowledge far better than passive reading." } },
  { icon: "ti-calendar-repeat",
    title: { pl: "Powtórki rozłożone w czasie", en: "Spaced repetition" },
    desc: { pl: "Powtarzaj materiał w rosnących odstępach (dzień, trzy dni, tydzień) zamiast jednej długiej sesji. Walczysz wtedy z naturalnym zapominaniem.", en: "Review material at increasing intervals (a day, three days, a week) rather than in one long session. This counters natural forgetting." } },
  { icon: "ti-message-2",
    title: { pl: "Metoda Feynmana", en: "Feynman technique" },
    desc: { pl: "Wytłumacz temat najprościej jak się da, tak jakbyś uczył dziecko. Miejsca, w których się zatniesz, pokazują, czego jeszcze nie rozumiesz.", en: "Explain a topic as simply as you can, as if teaching a child. The points where you get stuck reveal what you don't yet understand." } },
  { icon: "ti-arrows-shuffle",
    title: { pl: "Przeplatanie", en: "Interleaving" },
    desc: { pl: "Mieszaj różne typy zadań i przedmiotów w jednej sesji zamiast robić długie bloki jednego tematu. Mózg uczy się lepiej rozróżniać i wybierać metody.", en: "Mix different types of problems and subjects in one session instead of long blocks of a single topic. Your brain learns to distinguish and choose methods better." } },
  { icon: "ti-clock-bolt",
    title: { pl: "Pomodoro", en: "Pomodoro" },
    desc: { pl: "Ucz się w blokach ~25 minut pełnego skupienia, przedzielonych krótkimi przerwami. Krótszy, ostry czas łatwiej zacząć i utrzymać uwagę.", en: "Study in blocks of about 25 minutes of full focus, separated by short breaks. A shorter, sharp interval is easier to start and to stay focused." } },
  { icon: "ti-list-check",
    title: { pl: "Testuj się, nie podkreślaj", en: "Test yourself, don't highlight" },
    desc: { pl: "Rób sobie quizy i rozwiązuj zadania zamiast podkreślać tekst. Sprawdzanie się jest jedną z najskuteczniejszych metod nauki.", en: "Quiz yourself and solve problems instead of highlighting text. Self-testing is one of the most effective study methods." } },
  { icon: "ti-sitemap",
    title: { pl: "Mapy myśli", en: "Mind maps" },
    desc: { pl: "Rysuj powiązania między pojęciami zamiast liniowych notatek. Widzisz wtedy strukturę i zależności, a nie tylko luźne fakty.", en: "Draw connections between concepts instead of linear notes. You then see the structure and relationships, not just loose facts." } },
  { icon: "ti-player-play",
    title: { pl: "Reguła rozpoczęcia", en: "The two-minute rule" },
    desc: { pl: "Umów się ze sobą tylko na 2 minuty nauki. Najtrudniejsze jest zacząć — gdy już ruszysz, zwykle zostajesz przy zadaniu dłużej.", en: "Commit to just two minutes of studying. Starting is the hardest part — once you get going, you usually stick with the task longer." } },
  { icon: "ti-moon",
    title: { pl: "Sen i przerwy", en: "Sleep and breaks" },
    desc: { pl: "Pamięć utrwala się podczas snu i przerw. Nieprzespana noc przed egzaminem szkodzi bardziej, niż pomaga te kilka dodatkowych godzin.", en: "Memory consolidates during sleep and breaks. A sleepless night before an exam hurts more than the few extra hours help." } },
];

function TechniquesTile() {
  const { t, lang } = useT();
  const [i, setI] = useState(() => Math.floor(Math.random() * TECHNIQUES.length));
  const [dir, setDir] = useState<1 | -1>(1);
  const [tick, setTick] = useState(0);
  const tech = TECHNIQUES[i];
  const next = () => { setDir(1); setTick((n) => n + 1); setI((x) => (x + 1) % TECHNIQUES.length); };
  const prev = () => { setDir(-1); setTick((n) => n + 1); setI((x) => (x - 1 + TECHNIQUES.length) % TECHNIQUES.length); };

  return (
    <div className="sz-card sz-tech">
      <div className="sz-card__head">
        <h3 className="sz-card__title"><i className="ti ti-bulb" /> {t("study.techniques")}</h3>
        <span className="sz-tech__count">{i + 1} / {TECHNIQUES.length}</span>
      </div>
      <div className={`sz-tech__body ${dir === 1 ? "sz-anim-next" : "sz-anim-prev"}`} key={tick}>
        <div className="sz-tech__icon"><i className={`ti ${tech.icon}`} /></div>
        <h4 className="sz-tech__title">{lang === "en" ? tech.title.en : tech.title.pl}</h4>
        <p className="sz-tech__desc">{lang === "en" ? tech.desc.en : tech.desc.pl}</p>
      </div>
      <div className="sz-tech__nav">
        <button className="sz-tech__btn" onClick={prev}>
          <i className="ti ti-arrow-left" /> {t("study.prev")}
        </button>
        <button className="sz-tech__btn" onClick={next}>
          {t("study.next")} <i className="ti ti-arrow-right" />
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   STREFA NAUKI — hub narzędzi
════════════════════════════════════════════════════════ */
export default function StudyZoneView() {
  const { t } = useT();
  return (
    <div className="view-section-wrap">
      <SectionHeader
        title={t("study.title")}
        subtitle={t("study.subtitle")}
        emoji="💡"
      />
      <div className="sz-grid">
        <div className="sz-col">
          <PomodoroTile />
          <TechniquesTile />
        </div>
        <CalculatorTile />
      </div>
    </div>
  );
}
