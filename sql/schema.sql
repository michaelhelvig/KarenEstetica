-- =====================================================================
-- Karen Estética Canina - Esquema Supabase (con RLS + GRANTs explícitos)
-- Ejecutar completo en: Supabase > SQL Editor. Es idempotente (se puede re-ejecutar).
-- =====================================================================

-- ---------- Tablas ----------

-- Configuración general (una sola fila, id = 1)
create table if not exists public.settings (
  id                 int primary key default 1 check (id = 1),
  slot_minutes       int not null default 60   check (slot_minutes between 15 and 480), -- duración de cada turno
  deposit_amount     numeric(10,2) not null default 5000 check (deposit_amount > 0),    -- seña en ARS
  max_days_ahead     int not null default 45   check (max_days_ahead between 1 and 365), -- hasta cuántos días adelante se reserva
  min_notice_minutes int not null default 120  check (min_notice_minutes >= 0)          -- anticipación mínima para turnos del mismo día
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- Servicios que se ofrecen
create table if not exists public.services (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  active     boolean not null default true,
  sort_order int not null default 0
);

-- Horario de atención. Un día puede tener varios rangos (ej: mañana y tarde).
-- weekday: 0 = domingo ... 6 = sábado. Un día sin filas = cerrado.
create table if not exists public.schedule (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time   time not null,
  check (end_time > start_time)
);

-- Días puntuales cerrados (feriados, vacaciones)
create table if not exists public.blocked_days (
  day    date primary key,
  reason text
);

-- Turnos
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  pet_name         text not null,
  owner_name       text not null,
  phone            text not null,
  service          text,
  appt_date        date not null,
  appt_time        time not null,
  status           text not null default 'pending'
                   check (status in ('pending','confirmed','cancelled','expired','refund_pending')),
  deposit_amount   numeric(10,2) not null,
  mp_preference_id text,
  mp_payment_id    text,
  expires_at       timestamptz,        -- vencimiento de la reserva mientras está "pending"
  paid_at          timestamptz,
  created_at       timestamptz not null default now()
);

-- Evita doble reserva del mismo horario (sólo cuenta turnos vivos)
create unique index if not exists appointments_slot_unique
  on public.appointments (appt_date, appt_time) where status in ('pending','confirmed');
create index if not exists appointments_date_idx   on public.appointments (appt_date);
create index if not exists appointments_status_idx on public.appointments (status, expires_at);
create index if not exists appointments_phone_idx  on public.appointments (phone) where status = 'pending';

-- ---------- Datos iniciales (editables desde Table Editor) ----------
insert into public.services (name, sort_order)
select * from (values
  ('Baño', 1), ('Baño y corte', 2), ('Corte higiénico', 3), ('Deslanado', 4), ('Corte de uñas', 5)
) v(name, sort_order)
where not exists (select 1 from public.services);

insert into public.schedule (weekday, start_time, end_time)
select * from (values
  (1::smallint,'09:00'::time,'13:00'::time), (1,'15:00','19:00'),
  (2,'09:00','13:00'), (2,'15:00','19:00'),
  (3,'09:00','13:00'), (3,'15:00','19:00'),
  (4,'09:00','13:00'), (4,'15:00','19:00'),
  (5,'09:00','13:00'), (5,'15:00','19:00'),
  (6,'09:00','13:00')
) v(weekday, start_time, end_time)
where not exists (select 1 from public.schedule);

-- ---------- Row Level Security ----------
alter table public.settings     enable row level security;
alter table public.services     enable row level security;
alter table public.schedule     enable row level security;
alter table public.blocked_days enable row level security;
alter table public.appointments enable row level security;

-- Configuración pública de lectura (no tiene datos sensibles)
drop policy if exists "public read settings"     on public.settings;
drop policy if exists "public read services"     on public.services;
drop policy if exists "public read schedule"     on public.schedule;
drop policy if exists "public read blocked_days" on public.blocked_days;
create policy "public read settings"     on public.settings     for select to anon, authenticated using (true);
create policy "public read services"     on public.services     for select to anon, authenticated using (active);
create policy "public read schedule"     on public.schedule     for select to anon, authenticated using (true);
create policy "public read blocked_days" on public.blocked_days for select to anon, authenticated using (true);

-- appointments: SIN políticas para anon/authenticated => nadie accede desde el navegador.
-- Todo pasa por las rutas API de Next.js con la service_role key.

-- ---------- GRANTs ----------
-- Limpiamos permisos previos sobre estas tablas
revoke all on public.settings, public.services, public.schedule, public.blocked_days, public.appointments
  from anon, authenticated;

-- Lectura pública de la configuración (filtrada por las políticas de arriba)
grant select on public.settings, public.services, public.schedule, public.blocked_days to anon, authenticated;

-- service_role (backend de Next.js): acceso total
grant usage on schema public to service_role;
grant all on public.settings, public.services, public.schedule, public.blocked_days, public.appointments to service_role;
