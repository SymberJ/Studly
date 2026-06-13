# Student Hub (Studly)

Panel studenta dla uczelni ATINS — jednostronicowa aplikacja (SPA) z zadaniami, notatkami, planem zajęć, kalendarzem, ocenami, bazą prowadzących i centrum pobierania.

Stack: **React 19 + TypeScript + Vite**, ikony Tabler (CDN), eksport notatek do PDF (jsPDF). Dane trzymane są w `localStorage` przeglądarki — z myślą o łatwej późniejszej podmianie na bazę danych (patrz „Architektura danych").

## Uruchomienie

```bash
npm install
npm run dev      # serwer deweloperski (Vite)
npm run build    # build produkcyjny (tsc -b + vite build) -> dist/
npm run lint     # ESLint
npm run preview  # podgląd builda produkcyjnego
```

## Dostęp i konta

Aplikacja jest **otwarta** — każdy może samodzielnie założyć konto na ekranie logowania („Załóż konto"). Rejestracja wymaga imienia, e-maila i hasła; **uczelnię można wybrać opcjonalnie** (lista w `src/lib/universities.ts`) — służy wyłącznie do statystyk (panel admina → Przegląd → „Najpopularniejsze uczelnie"). Administrator może dodatkowo zakładać i zarządzać kontami z panelu.

### Konta demonstracyjne (tryb DEMO)

W trybie DEMO logowanie i rejestracja działają na lokalnej „bazie" `src/lib/auth/usersDb.ts`. Gotowe konta:

| E-mail | Hasło | Rola |
|---|---|---|
| `admin@atins.pl` | `admin` | administrator |
| `student@atins.pl` | `student` | student |

Konta założone samodzielnie (rejestracja) lub przez administratora od razu działają. Sesja jest trwała, a dane nie zawierają prawdziwych haseł produkcyjnych.

## Struktura projektu

```
src/
  app/            App.tsx (orkiestracja), typy, stałe (klucze localStorage), dane prowadzących
  components/     SectionHeader, GlobalSearch (Ctrl/Cmd+K), DatePicker
  lib/
    storage.ts    niskopoziomowe load/save JSON w localStorage
    repo.ts       warstwa repozytorium — JEDYNE miejsce, które wie skąd biorą się dane
    utils.ts      uid(), formatLongDatePL(), plPlural()
    auth/         context, AuthProvider (sesja + role), useAuth, demoUsers (tymczasowe)
  pages/          widoki kategorii (Dashboard, Tasks, Notes, Schedule, Calendar, Grades, Teachers, Downloads, Login)
  styles/         Global.css (m.in. wspólny baner sekcji), Navbar.css
```

## Baza danych i panel administratora

Aplikacja działa w **dwóch trybach** — bez żadnej zmiany w kodzie:

| | Tryb DEMO (domyślny) | Tryb Supabase (produkcja) |
|---|---|---|
| Włączany przez | brak `.env` | uzupełniony `.env` |
| Źródło danych | `localStorage` | baza PostgreSQL (Supabase) |
| Baza studentów | lokalna „baza" `src/lib/auth/usersDb.ts` (przykładowe konta) | tabela `public.profiles` |
| Panel admina | w pełni działa lokalnie | działa na danych z bazy |

### Baza studentów

Tabela `profiles` rozszerza `auth.users` Supabase i pełni rolę bazy studentów: `name`, `role`, `status` (aktywny/zablokowany), `album_number`, `field_of_study`, `study_year`, `study_group`, `phone`. Pełny schemat (z politykami RLS, triggerem zakładającym profil i widokiem admina) znajduje się w `supabase/schema.sql`.

### Panel administratora (`/admin`)

Dostępny tylko dla roli `admin` (guard `routes/AdminRoute.tsx`). Zawiera:

- **Przegląd** — statystyki systemu (liczba kont, studentów, adminów, kont aktywnych/zablokowanych, zadań, przedmiotów, notatek), podział kont wg roli i listę ostatnio dodanych.
- **Użytkownicy** — pełne zarządzanie studentami: wyszukiwarka, filtry (rola/status), dodawanie i edycja konta, zmiana roli, blokowanie/odblokowanie, usuwanie oraz eksport listy do CSV.
- **Ustawienia** — informacja o trybie pracy i (w DEMO) przywracanie danych przykładowych.

Cała logika danych admina jest w `src/lib/admin/adminApi.ts` — jedno API obsługujące oba tryby.

### Włączenie trybu Supabase

1. Załóż projekt na [supabase.com](https://supabase.com), skopiuj `.env.example` → `.env` i uzupełnij `VITE_SUPABASE_URL` oraz `VITE_SUPABASE_ANON_KEY`.
2. Wykonaj `supabase/schema.sql` w SQL Editor.
3. (Opcjonalnie) wdróż funkcję brzegową, aby admin mógł **zakładać/usuwać konta i resetować hasła** (operacje wymagające `service_role`, którego nie wolno trzymać we froncie):
   ```bash
   supabase functions deploy admin-users
   supabase secrets set SERVICE_ROLE_KEY=<service_role z Settings → API>
   ```
4. Pierwszego administratora ustaw ręcznie w SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where id = '<uuid użytkownika>';
   ```

## Architektura danych

Persystencja danych studenta przechodzi przez `src/lib/repo.ts` (`getTasks/saveTasks`, `getCourses`, `getNotes`, ...). Repo zapisuje w `localStorage` natychmiast, a w trybie Supabase synchronizuje w tle. Uwierzytelnianie (`src/lib/auth`) ma model `User` z polem `role` (`student` | `admin`), `status` oraz danymi studenckimi, trwałą sesję i async `login()`/`updateUser()`.
