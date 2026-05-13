-- Sub-plan QA Lote 11 — Appointment origin
--
-- Separates "who created" (origin) from "lifecycle state" (status).
-- Agent-created appointments default to status='confirmed' (committed
-- upfront). Future bot-created appointments default to status='requested'
-- (need agent confirmation).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'appointment_origin') then
    create type public.appointment_origin as enum ('agent', 'bot');
  end if;
end$$;

alter table public.appointments
  add column if not exists origin public.appointment_origin not null default 'agent';
