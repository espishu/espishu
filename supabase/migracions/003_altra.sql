-- =====================================================================
-- Espishu: migració 003 — activitat "Altra" (una activitat sola amb el nom
-- que vulgui l'usuari, a més de casa, gimnàs, caminar, córrer, bici i natació).
-- Executar a Supabase ABANS de publicar la versió 6 de l'app.
-- Només afegeix: no esborra ni canvia cap dada existent. Es pot tornar a executar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipus d'activitat del pla (activitats.tipus) i de les sessions (sessions.activitat):
-- s'hi afegeix 'altra'. Només amplia la llista: cap valor que ja hi hagi deixa de ser vàlid,
-- i la versió 5 de l'app continua funcionant. Com a la 002: es treu la regla vella (sigui quin
-- sigui el nom que li va posar Postgres) i se'n posa una de nova amb nom fix.
-- El nom propi de cada activitat va a la columna activitats.nom, que ja existeix (001).
-- ---------------------------------------------------------------------

do $$
declare
  regla record;
begin
  for regla in
    select conrelid::regclass as taula, conname from pg_constraint
    where conrelid in ('public.activitats'::regclass, 'public.sessions'::regclass) and contype = 'c'
      and pg_get_constraintdef(oid) like '%caminar%'
  loop
    execute format('alter table %s drop constraint %I', regla.taula, regla.conname);
  end loop;
end $$;

alter table public.activitats add constraint activitats_tipus_amb_altra
  check (tipus in ('casa', 'gimnas', 'caminar', 'correr', 'bici', 'natacio', 'altra'));

alter table public.sessions add constraint sessions_activitat_amb_altra
  check (activitat in ('casa', 'gimnas', 'caminar', 'correr', 'bici', 'natacio', 'altra'));

insert into public.migracions (nom) values ('003_altra') on conflict (nom) do nothing;
