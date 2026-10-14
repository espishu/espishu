-- =====================================================================
-- Espishu: migració 005 — icona triada per a cada activitat del pla
-- (ioga, pàdel, futbol…; si no n'hi ha, la del tipus d'activitat).
-- Executar a Supabase ABANS de publicar la versió 8 de l'app.
-- Només afegeix: no esborra ni canvia cap dada existent. Es pot tornar a executar.
-- =====================================================================

-- La clau de la icona (src/icones.js), p. ex. 'padel'. Null = la del tipus.
alter table public.activitats add column if not exists icona text
  check (icona is null or char_length(icona) <= 30);


-- ---------------------------------------------------------------------
-- desa_pla(pla): la mateixa funció de la 001 (mateixos paràmetres), que ara també desa la icona
-- de cada activitat ("icona": "padel" o null).
-- Una versió anterior de l'app no envia "icona": llavors la icona que ja hi havia no es toca
-- (si no, en pujar el pla des d'un mòbil sense actualitzar, s'esborrarien les icones triades).
-- ---------------------------------------------------------------------

create or replace function public.desa_pla(pla jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  a   jsonb;
begin
  if uid is null then
    raise exception 'Cal iniciar sessió' using errcode = '42501';
  end if;

  update public.perfils set
    objectiu_setmanal = coalesce((pla ->> 'objectiu_setmanal')::smallint, objectiu_setmanal),
    dolors            = array(select jsonb_array_elements_text(coalesce(pla -> 'dolors', '[]'))),
    inicialitzat      = true,
    actualitzat       = now()
  where user_id = uid;

  delete from public.activitats
  where user_id = uid
    and id not in (select (x ->> 'id')::uuid from jsonb_array_elements(coalesce(pla -> 'activitats', '[]')) x);

  for a in select x from jsonb_array_elements(coalesce(pla -> 'activitats', '[]')) x loop
    insert into public.activitats as t (id, user_id, tipus, dia, hora, duracio_min, nom, icona)
    values ((a ->> 'id')::uuid, uid, a ->> 'tipus', (a ->> 'dia')::smallint, (a ->> 'hora')::time,
            (a ->> 'duracio_min')::smallint, a ->> 'nom', a ->> 'icona')
    on conflict (id) do update set
      tipus = excluded.tipus, dia = excluded.dia, hora = excluded.hora,
      duracio_min = excluded.duracio_min, nom = excluded.nom,
      icona = case when a ? 'icona' then excluded.icona else t.icona end,
      actualitzat = now()
    where t.user_id = uid;

    delete from public.exercicis_activitat
    where user_id = uid and activitat_id = (a ->> 'id')::uuid;

    insert into public.exercicis_activitat
      (user_id, activitat_id, ordre, exercici, tipus, unitat, series, per_costat, descans, nota, pujada_abans, pujada_ara)
    select uid, (a ->> 'id')::uuid, e.ordre, e.x ->> 'exercici', e.x ->> 'tipus', e.x ->> 'unitat',
           array(select v::smallint from jsonb_array_elements_text(e.x -> 'series') v),
           coalesce((e.x ->> 'per_costat')::boolean, false),
           coalesce((e.x ->> 'descans')::smallint, 0),
           e.x ->> 'nota',
           (e.x ->> 'pujada_abans')::smallint,
           (e.x ->> 'pujada_ara')::smallint
    from jsonb_array_elements(coalesce(a -> 'exercicis', '[]')) with ordinality as e(x, ordre);
  end loop;
end;
$$;

revoke all on function public.desa_pla(jsonb) from public, anon;
grant execute on function public.desa_pla(jsonb) to authenticated;

insert into public.migracions (nom) values ('005_icona') on conflict (nom) do nothing;
