// ============================================================
// Supabase Edge Function: admin-users
// ------------------------------------------------------------
// Obsługuje operacje na kontach auth, które wymagają klucza
// service_role (NIE wolno trzymać go we frontendzie):
//   • create          — utworzenie nowego studenta/admina
//   • delete          — usunięcie konta
//   • reset-password  — ustawienie nowego hasła
//
// Bezpieczeństwo: funkcja sprawdza token wywołującego i pozwala
// działać TYLKO użytkownikom z rolą 'admin' (tabela profiles).
//
// Wdrożenie (CLI Supabase):
//   supabase functions deploy admin-users
//   supabase secrets set SERVICE_ROLE_KEY=<twój service_role key>
//
// (URL i ANON są wstrzykiwane automatycznie jako SUPABASE_URL /
//  SUPABASE_ANON_KEY w środowisku funkcji.)
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

    // ── 1. Sprawdź, kto wywołuje (token z nagłówka) ─────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Brak autoryzacji." }, 401);

    // ── 2. Klient z uprawnieniami admina (service_role) ─────
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 3. Czy wywołujący jest adminem? ─────────────────────
    const { data: profile } = await admin
      .from("profiles").select("role").eq("id", caller.id).single();
    if (profile?.role !== "admin") return json({ error: "Brak uprawnień administratora." }, 403);

    const { action, payload } = await req.json();

    // ── 4. Wykonaj operację ─────────────────────────────────
    if (action === "create") {
      const { email, password, name, role, albumNumber, fieldOfStudy, studyYear, studyGroup, phone, status, mustChangePassword } = payload;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name, role,
          album_number: albumNumber, field_of_study: fieldOfStudy,
          study_year: studyYear, study_group: studyGroup, phone,
        },
      });
      if (error) return json({ error: error.message }, 400);
      // dociągnij dane do profilu (trigger ustawia większość; status i flagę osobno)
      await admin.from("profiles")
        .update({ status: status ?? "active", must_change_password: mustChangePassword ?? false })
        .eq("id", data.user.id);
      return json({ ok: true, id: data.user.id });
    }

    if (action === "delete") {
      const { error } = await admin.auth.admin.deleteUser(payload.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "reset-password") {
      const { error } = await admin.auth.admin.updateUserById(payload.id, { password: payload.password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Nieznana akcja." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Błąd serwera." }, 500);
  }
});
