import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * `supabase` — klient Supabase.
 * Jest `null` gdy zmienne VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY nie są ustawione.
 * W takim przypadku aplikacja działa w trybie DEMO (localStorage).
 *
 * Aby przejść na produkcję:
 * 1. Utwórz projekt na https://supabase.com
 * 2. Skopiuj .env.example jako .env i uzupełnij wartości
 * 3. Wykonaj supabase/schema.sql w SQL Editor projektu
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isSupabaseEnabled = supabase !== null;
