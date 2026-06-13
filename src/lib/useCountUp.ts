import { useEffect, useRef, useState } from "react";

/** Czy system użytkownika prosi o ograniczenie animacji. */
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Płynne doliczanie wartości od 0 do celu (efekt "count-up") oparte o rAF.
 * - easing: easeOutCubic — szybki start, miękkie lądowanie;
 * - respektuje prefers-reduced-motion: animacja się nie uruchamia,
 *   a zwracana wartość to po prostu cel;
 * - zwraca string sformatowany do `decimals` miejsc po przecinku.
 *
 * Uwaga implementacyjna: setState wołamy wyłącznie w callbacku rAF
 * (po commit/render), nigdy synchronicznie w ciele efektu — to unika
 * kaskadowych renderów wskazywanych przez react-hooks.
 */
export function useCountUp(target: number, duration = 700, decimals = 0): string {
  const reduced = prefersReducedMotion();
  // Start od zera dla animacji; przy ograniczonym ruchu — od razu cel.
  const [val, setVal] = useState(() => (reduced ? target : 0));
  const rafRef = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, reduced]);

  return (reduced ? target : val).toFixed(decimals);
}
