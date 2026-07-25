-- ============================================================
--  Juris Expert MCH — Demandes du Contrôle-minute (Supabase)
--  À exécuter dans : Supabase → SQL Editor → New query → Run
--  Idempotent : peut être relancé sans risque.
-- ============================================================

-- 1) TABLE DES DEMANDES ---------------------------------------
create table if not exists public.cm_leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  societe       text,
  responsable   text,
  siret         text,
  adresse       text,
  tel           text,
  email         text,
  secteur       text,
  secteur_id    text,
  score         int,
  bonnes        text,
  manquements   int,
  sans_reponse  int,
  detail        text,     -- questions + réponses du client + réponse exacte
  source        text default 'controle-minute'
);

-- 2) SÉCURITÉ (RLS) -------------------------------------------
alter table public.cm_leads enable row level security;

-- Le formulaire public (prospects, sans compte) peut UNIQUEMENT insérer.
drop policy if exists cm_leads_insert on public.cm_leads;
create policy cm_leads_insert on public.cm_leads
  for insert to anon, authenticated
  with check (true);

-- Seul l'ADMINISTRATEUR (compte dédié) peut LIRE les demandes.
drop policy if exists cm_leads_select_admin on public.cm_leads;
create policy cm_leads_select_admin on public.cm_leads
  for select to authenticated
  using ( (auth.jwt() ->> 'email') = 'mch-cm-admin@juris-expert.app' );

-- Seul l'administrateur peut SUPPRIMER une demande.
drop policy if exists cm_leads_delete_admin on public.cm_leads;
create policy cm_leads_delete_admin on public.cm_leads
  for delete to authenticated
  using ( (auth.jwt() ->> 'email') = 'mch-cm-admin@juris-expert.app' );
