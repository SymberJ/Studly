-- ============================================================
-- Student Hub — schemat bazy danych (Supabase / PostgreSQL)
-- Wykonaj ten skrypt w Supabase SQL Editor po założeniu projektu.
-- Skrypt jest idempotentny — można go uruchomić ponownie po zmianach.
-- ============================================================

-- ── Rozszerzenie UUID ──────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILE (rozszerza auth.users Supabase)
--    To jest właściwa "baza studentów".
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  name          text not null default '',
  role          text not null default 'student' check (role in ('student', 'admin')),
  status        text not null default 'active'  check (status in ('active', 'inactive')),
  avatar_url    text,
  album_number  text,                 -- nr albumu / indeksu
  field_of_study text,                -- kierunek
  study_year    integer,              -- rok studiów
  study_group   text,                 -- grupa dziekańska
  phone         text,
  must_change_password boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Dodaj brakujące kolumny, jeśli tabela już istniała (migracja).
alter table public.profiles add column if not exists status         text not null default 'active';
alter table public.profiles add column if not exists album_number   text;
alter table public.profiles add column if not exists field_of_study text;
alter table public.profiles add column if not exists study_year     integer;
alter table public.profiles add column if not exists study_group    text;
alter table public.profiles add column if not exists phone          text;
alter table public.profiles add column if not exists must_change_password boolean not null default false;

alter table public.profiles enable row level security;

-- ── Helper: czy bieżący użytkownik jest adminem? ───────────
-- SECURITY DEFINER + zapytanie po profiles unika rekurencji RLS
-- (polityki na profiles NIE wywołają się ponownie wewnątrz funkcji).
create or replace function public.is_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Polityki RLS na profiles ───────────────────────────────
drop policy if exists "Użytkownik widzi swój profil"      on public.profiles;
drop policy if exists "Użytkownik aktualizuje swój profil" on public.profiles;
drop policy if exists "Admin widzi wszystkich"             on public.profiles;
drop policy if exists "profiles_select_self"  on public.profiles;
drop policy if exists "profiles_update_self"  on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;

create policy "profiles_select_self"  on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_self"  on public.profiles for update using (auth.uid() = id);
create policy "profiles_select_admin" on public.profiles for select using (public.is_admin());
create policy "profiles_update_admin" on public.profiles for update using (public.is_admin());
create policy "profiles_delete_admin" on public.profiles for delete using (public.is_admin());

-- ── Trigger: automatycznie tworzy profil po rejestracji ────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role, album_number, field_of_study, study_year, study_group, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'album_number',
    new.raw_user_meta_data->>'field_of_study',
    (new.raw_user_meta_data->>'study_year')::int,
    new.raw_user_meta_data->>'study_group',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. DANE STUDENTA (każdy widzi tylko swoje wiersze)
-- ============================================================

-- ── Kursy / przedmioty ────────────────────────────────────
create table if not exists public.courses (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
alter table public.courses enable row level security;
drop policy if exists "Użytkownik zarządza swoimi kursami" on public.courses;
create policy "courses_owner" on public.courses
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Zadania ───────────────────────────────────────────────
create table if not exists public.tasks (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users on delete cascade,
  course_id  uuid references public.courses on delete set null,
  title      text not null,
  done       boolean not null default false,
  priority   text not null default 'low' check (priority in ('low', 'medium', 'high')),
  due_date   text,                       -- format DD-MM-YYYY (zgodny z frontendem)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
drop policy if exists "Użytkownik zarządza swoimi zadaniami" on public.tasks;
create policy "tasks_owner" on public.tasks
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Notatki ───────────────────────────────────────────────
create table if not exists public.notes (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users on delete cascade,
  course_id  uuid references public.courses on delete cascade,
  content    text not null default '',
  date       text not null,              -- format YYYY-MM-DD
  created_at timestamptz not null default now()
);
alter table public.notes enable row level security;
drop policy if exists "Użytkownik zarządza swoimi notatkami" on public.notes;
create policy "notes_owner" on public.notes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Plan zajęć ────────────────────────────────────────────
create table if not exists public.schedule_items (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users on delete cascade,
  course_id  uuid references public.courses on delete set null,
  teacher    text not null default '',
  room       text not null default '',
  time       text not null,              -- format HH:MM
  day        text not null,              -- np. "Poniedziałek"
  created_at timestamptz not null default now()
);
alter table public.schedule_items enable row level security;
drop policy if exists "Użytkownik zarządza swoim planem" on public.schedule_items;
create policy "schedule_owner" on public.schedule_items
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Oceny ─────────────────────────────────────────────────
create table if not exists public.grades (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users on delete cascade,
  course_id  uuid references public.courses on delete cascade,
  label      text not null,
  value      numeric(4,2) not null,
  weight     numeric(4,2) not null default 1,
  created_at timestamptz not null default now()
);
alter table public.grades enable row level security;
drop policy if exists "Użytkownik zarządza swoimi ocenami" on public.grades;
create policy "grades_owner" on public.grades
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Zdarzenia kalendarza ──────────────────────────────────
create table if not exists public.calendar_events (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users on delete cascade,
  course_id   uuid references public.courses on delete set null,
  title       text not null,
  date        text not null,             -- format YYYY-MM-DD
  time        text not null default '',
  color       text not null default '#6c5ce7',
  description text not null default '',
  created_at  timestamptz not null default now()
);
alter table public.calendar_events enable row level security;
drop policy if exists "Użytkownik zarządza swoimi zdarzeniami" on public.calendar_events;
create policy "calendar_owner" on public.calendar_events
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Indeksy dla wydajności ────────────────────────────────
create index if not exists idx_tasks_user    on public.tasks(user_id);
create index if not exists idx_tasks_done     on public.tasks(done);
create index if not exists idx_notes_user     on public.notes(user_id);
create index if not exists idx_courses_user   on public.courses(user_id);
create index if not exists idx_schedule_user  on public.schedule_items(user_id);
create index if not exists idx_grades_user    on public.grades(user_id);
create index if not exists idx_calendar_user  on public.calendar_events(user_id);
create index if not exists idx_profiles_role  on public.profiles(role);

-- ============================================================
-- 3. DZIENNIK AUDYTU — historia akcji administracyjnych i logowań
--    Wpisy tworzą wyłącznie administratorzy; każdy admin widzi całość.
-- ============================================================
create table if not exists public.audit_log (
  id           uuid primary key default uuid_generate_v4(),
  actor_id     uuid references auth.users on delete set null,
  actor_email  text,
  action       text not null,
  target_email text,
  details      text,
  created_at   timestamptz not null default now()
);
alter table public.audit_log enable row level security;
drop policy if exists "audit_select_admin" on public.audit_log;
drop policy if exists "audit_insert_admin" on public.audit_log;
create policy "audit_select_admin" on public.audit_log for select using (public.is_admin());
create policy "audit_insert_admin" on public.audit_log for insert with check (public.is_admin());
create index if not exists idx_audit_created on public.audit_log(created_at desc);

-- ============================================================
-- 4. WIDOK ADMINA — wszyscy użytkownicy + liczniki
--    Widok jest SECURITY DEFINER (domyślnie, właściciel = postgres),
--    więc może czytać auth.users. Klauzula `where public.is_admin()`
--    sprawia, że NIE-admin zobaczy zero wierszy.
-- ============================================================
drop view if exists public.admin_users;
create view public.admin_users as
  select
    p.id,
    p.name,
    p.role,
    p.status,
    p.avatar_url,
    p.album_number,
    p.field_of_study,
    p.study_year,
    p.study_group,
    p.phone,
    p.created_at,
    u.email,
    u.last_sign_in_at,
    (select count(*) from public.tasks   t where t.user_id = p.id) as task_count,
    (select count(*) from public.courses c where c.user_id = p.id) as course_count
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_admin();

grant select on public.admin_users to authenticated;

-- ============================================================
-- GOTOWE.
-- Tworzenie/usuwanie kont auth oraz reset hasła z poziomu panelu
-- wymaga klucza service_role — realizuje to funkcja brzegowa
-- w katalogu supabase/functions/admin-users (patrz README).
-- ============================================================
