-- =====================================================================
-- Espishu: migració 004 — sessions extra (fora del pla) i sessions recuperades
-- (una cita dels últims 7 dies feta més tard, que compta el dia que tocava).
-- Executar a Supabase ABANS de publicar la versió 6 de l'app (després de la 003).
-- Només afegeix: no esborra ni canvia cap dada existent. Es pot tornar a executar.
-- =====================================================================

-- Una sessió extra no compta per a l'objectiu setmanal ni per al bosc.
-- Les que ja hi ha són totes del pla (false).
alter table public.sessions add column if not exists extra boolean not null default false;

-- El dia de la cita que es recupera (null si no és una recuperació). La sessió compta aquell dia.
alter table public.sessions add column if not exists recupera date;


-- ---------------------------------------------------------------------
-- desa_sessio(sessio): la mateixa funció de la 001 (mateixos paràmetres), que ara també
-- desa "extra" (true/false) i "recupera" ("2026-10-12" o null). La versió 5 de l'app no els
-- envia: llavors extra = false i recupera = null, com fins ara.
-- ---------------------------------------------------------------------

create or replace function public.desa_sessio(sessio jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  sid uuid := (sessio ->> 'id')::uuid;
  aid uuid := (sessio ->> 'activitat_id')::uuid;
  e   record;
  eid uuid;
begin
  if uid is null then
    raise exception 'Cal iniciar sessió' using errcode = '42501';
  end if;
  if exists (select 1 from public.sessions where id = sid) then
    return;
  end if;
  -- L'activitat pot haver-se esborrat del pla abans de pujar la sessió.
  if aid is not null and not exists (select 1 from public.activitats where id = aid and user_id = uid) then
    aid := null;
  end if;

  insert into public.sessions
    (id, user_id, activitat_id, tipus, activitat, nom, inici, fi, estat, curta,
     minuts_previstos, minuts_fets, minuts_pausa, pujades, extra, recupera)
  values
    (sid, uid, aid, sessio ->> 'tipus', sessio ->> 'activitat', sessio ->> 'nom',
     (sessio ->> 'inici')::timestamptz, (sessio ->> 'fi')::timestamptz, sessio ->> 'estat',
     coalesce((sessio ->> 'curta')::boolean, false),
     (sessio ->> 'minuts_previstos')::smallint, (sessio ->> 'minuts_fets')::smallint,
     (sessio ->> 'minuts_pausa')::smallint, coalesce(sessio -> 'pujades', '[]'),
     coalesce((sessio ->> 'extra')::boolean, false), (sessio ->> 'recupera')::date);

  for e in
    select x, ordre from jsonb_array_elements(coalesce(sessio -> 'exercicis', '[]')) with ordinality as t(x, ordre)
  loop
    insert into public.exercicis_sessio (user_id, sessio_id, ordre, exercici, substitueix, saltat, unitat)
    values (uid, sid, e.ordre, e.x ->> 'exercici', e.x ->> 'substitueix',
            coalesce((e.x ->> 'saltat')::boolean, false), e.x ->> 'unitat')
    returning id into eid;

    insert into public.series_fetes (user_id, exercici_sessio_id, ordre, objectiu, fet)
    select uid, eid, s.ordre, (s.x ->> 'objectiu')::smallint, (s.x ->> 'fet')::smallint
    from jsonb_array_elements(coalesce(e.x -> 'series', '[]')) with ordinality as s(x, ordre);
  end loop;
end;
$$;

revoke all on function public.desa_sessio(jsonb) from public, anon;
grant execute on function public.desa_sessio(jsonb) to authenticated;

insert into public.migracions (nom) values ('004_extra') on conflict (nom) do nothing;
