-- =====================================================================
-- Espishu: migració 002 — el bosc al compte (historial de l'objectiu setmanal,
-- noms de les valls i elements ja vistos), perquè sigui igual a tots els aparells.
-- Executar a Supabase ABANS de publicar la versió 5 de l'app.
-- Només afegeix: no esborra ni canvia cap dada existent. Es pot tornar a executar.
-- =====================================================================

-- { "objectius": [ { "des": "2026-10-12", "objectiu": 3 } ], "noms": { "2026": "…" }, "vist": { "2026": ["ocells"] } }
alter table public.perfils add column if not exists bosc jsonb not null default '{}'::jsonb;

-- L'app només pot canviar aquestes columnes del perfil (001: objectiu_setmanal, dolors…; ara també bosc).
grant update (bosc) on public.perfils to authenticated;


-- ---------------------------------------------------------------------
-- desa_bosc(dades): desa tot el bosc d'un cop (substitueix el que hi havia).
-- Idempotent: es pot tornar a enviar. S'executa amb els permisos de l'usuari (RLS).
-- ---------------------------------------------------------------------

create or replace function public.desa_bosc(dades jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Cal iniciar sessió' using errcode = '42501';
  end if;
  if dades is null or jsonb_typeof(dades) <> 'object' then
    raise exception 'El bosc ha de ser un objecte' using errcode = '22023';
  end if;

  update public.perfils set
    bosc        = dades,
    actualitzat = now()
  where user_id = uid;
end;
$$;

revoke all on function public.desa_bosc(jsonb) from public, anon;
grant execute on function public.desa_bosc(jsonb) to authenticated;

insert into public.migracions (nom) values ('002_bosc') on conflict (nom) do nothing;
