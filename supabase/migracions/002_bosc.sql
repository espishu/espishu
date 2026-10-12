-- =====================================================================
-- Espishu: migració 002 — el bosc al compte (historial de l'objectiu setmanal,
-- noms de les valls i elements ja vistos), perquè sigui igual a tots els aparells,
-- i objectiu setmanal de 1 a 10.
-- Executar a Supabase ABANS de publicar la versió 5 de l'app.
-- Només afegeix: no esborra ni canvia cap dada existent. Es pot tornar a executar.
-- =====================================================================

-- { "objectius": [ { "des": "2026-10-12", "objectiu": 3 } ], "noms": { "2026": "…" }, "vist": { "2026": ["ocells"] } }
alter table public.perfils add column if not exists bosc jsonb not null default '{}'::jsonb;

-- L'app només pot canviar aquestes columnes del perfil (001: objectiu_setmanal, dolors…; ara també bosc).
grant update (bosc) on public.perfils to authenticated;


-- ---------------------------------------------------------------------
-- Objectiu setmanal: de 1 a 10 (abans de 1 a 4). És fer les cites del pla, i se'n poden tenir més de 4.
-- Només amplia el límit: cap valor que ja hi hagi (1–4) deixa de ser vàlid, i la versió 4 de l'app
-- continua funcionant. Es treu la regla vella (sigui quin sigui el nom que li va posar Postgres) i se'n
-- posa una de nova amb nom fix, perquè es pugui tornar a executar.
-- ---------------------------------------------------------------------

do $$
declare
  regla record;
begin
  for regla in
    select conname from pg_constraint
    where conrelid = 'public.perfils'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%objectiu_setmanal%'
  loop
    execute format('alter table public.perfils drop constraint %I', regla.conname);
  end loop;
end $$;

alter table public.perfils add constraint perfils_objectiu_setmanal_1_10
  check (objectiu_setmanal between 1 and 10);


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
