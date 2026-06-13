/**
 * Klient AI — zgodny z API czatu OpenAI (działa z OpenAI, Groq, Gemini-compat,
 * a docelowo z własnym proxy/Edge Function bez zmiany kodu wywołań).
 *
 * BEZPIECZEŃSTWO: w trybie "direct" (demo) klucz idzie prosto z przeglądarki —
 * to klucz użytkownika, akceptowalne do dema. W produkcji ustaw tryb "backend"
 * (patrz aiConfig.ts), wtedy klucz zostaje na serwerze.
 */
import { getAiConfig } from "./aiConfig";

export type AiRole = "system" | "user" | "assistant";
export type AiMessage = { role: AiRole; content: string };

export class AiError extends Error {}

type ChatOpts = { signal?: AbortSignal; temperature?: number; maxTokens?: number };

/**
 * Wysyła rozmowę do modelu i zwraca tekst odpowiedzi.
 * Rzuca AiError z czytelnym komunikatem przy problemach (brak klucza, limit, sieć).
 */
export async function chatAI(messages: AiMessage[], opts: ChatOpts = {}): Promise<string> {
  const cfg = getAiConfig();
  if (cfg.mode === "direct" && !cfg.apiKey) {
    throw new AiError("not-configured");
  }

  const url = `${cfg.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.mode === "direct") headers["Authorization"] = `Bearer ${cfg.apiKey}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      signal: opts.signal,
      body: JSON.stringify({
        model: cfg.model,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 900,
        messages,
      }),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new AiError("network");
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new AiError("auth");
    if (res.status === 429) throw new AiError("rate-limit");
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error?.message ?? "";
    } catch { /* ignore */ }
    throw new AiError(detail || `http-${res.status}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new AiError("empty");
  return text.trim();
}
