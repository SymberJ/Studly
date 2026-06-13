/**
 * Konfiguracja klienta AI.
 *
 * TRYB DEMO (obecny): klucz API podaje użytkownik i jest trzymany w localStorage
 * tej przeglądarki. To akceptowalne do dema/pracy inżynierskiej (klucz własny użytkownika).
 *
 * TRYB PRODUKCYJNY (docelowo): ustaw `endpoint` na własny serwer/Edge Function
 * (np. Supabase) — wtedy klucz API żyje WYŁĄCZNIE po stronie serwera, a frontend
 * nie potrzebuje żadnego klucza. Wystarczy zmienić `mode` na "backend" i podać URL.
 *
 * Dzięki tej abstrakcji przejście demo → produkcja to zmiana w JEDNYM miejscu.
 */

export type AiMode = "direct" | "backend";

export type AiConfig = {
  mode: AiMode;
  /** Bazowy URL zgodny z API OpenAI (…/v1). W trybie backend: URL Twojego proxy. */
  baseUrl: string;
  model: string;
  /** Klucz API — używany tylko w trybie "direct" (demo). W trybie backend zostaw pusty. */
  apiKey: string;
};

const LS_KEY = "studly-ai-config";

/** Gotowe presety dostawców zgodnych z API OpenAI (działają z przeglądarki przez CORS). */
export const AI_PRESETS: Record<string, { label: string; baseUrl: string; model: string }> = {
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  groq: { label: "Groq (darmowy limit)", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  gemini: { label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash" },
};

const DEFAULT_CONFIG: AiConfig = {
  mode: "direct",
  baseUrl: AI_PRESETS.openai.baseUrl,
  model: AI_PRESETS.openai.model,
  apiKey: "",
};

export function getAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<AiConfig>) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveAiConfig(cfg: AiConfig) {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
}

/** Czy asystent jest gotowy do działania (skonfigurowany)? */
export function isAiConfigured(cfg: AiConfig = getAiConfig()): boolean {
  if (cfg.mode === "backend") return Boolean(cfg.baseUrl);
  return Boolean(cfg.baseUrl && cfg.model && cfg.apiKey);
}
