-- =====================================================================
-- Espishu: migració 001 — la base de dades inicial
--
-- Enganxa tot el fitxer a l'SQL Editor de Supabase i prem "Run".
-- Es pot tornar a executar sense perdre dades (crea només el que falta
-- i torna a posar les funcions, els triggers i les polítiques).
-- Les migracions següents són 002_..., 003_... (vegeu LLEGEIX.md).
--
-- Cada usuari només veu i toca les seves files: RLS a totes les taules,
-- amb user_id = auth.uid(). La biblioteca d'exercicis és al codi de
-- l'app; aquí només es desa l'id de cada exercici (per exemple
-- 'esquat-cadira').
-- =====================================================================


-- ---------------------------------------------------------------------
-- Taules
-- ---------------------------------------------------------------------

-- Un perfil per usuari. El crea el trigger en registrar-se.
create table if not exists public.perfils (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  -- 3 a 20 caràcters: a-z, 0-9, punt, guió i guió baix; sempre en minúscules.
  usuari            text not null unique
                    check (usuari ~ '^[a-z0-9._-]{3,20}$' and usuari !~ '(^\.|\.$|\.\.)'),
  objectiu_setmanal smallint not null default 2 check (objectiu_setmanal between 1 and 4),
  -- Exercicis marcats amb "Em fa mal".
  dolors            text[] not null default '{}',
  -- Fals fins que l'usuari tria "Importar" o "Començar" el primer cop que entra.
  inicialitzat      boolean not null default false,
  creat             timestamptz not null default now(),
  actualitzat       timestamptz not null default now()
);

-- Les activitats setmanals (les cites del pla).
create table if not exists public.activitats (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipus       text not null check (tipus in ('casa', 'gimnas', 'caminar', 'correr', 'bici', 'natacio')),
  dia         smallint not null check (dia between 1 and 7),          -- 1 = dilluns … 7 = diumenge
  hora        time not null,
  duracio_min smallint check (duracio_min between 1 and 600),         -- activitats soles
  nom         text check (char_length(nom) <= 60),                    -- casa i gimnàs: "Rutina general"
  creat       timestamptz not null default now(),
  actualitzat timestamptz not null default now(),
  unique (id, user_id)
);

-- Els exercicis d'una activitat de casa o de gimnàs, en ordre.
create table if not exists public.exercicis_activitat (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activitat_id uuid not null,
  ordre        smallint not null check (ordre >= 1),
  exercici     text not null check (char_length(exercici) between 1 and 60),  -- id de la biblioteca
  tipus        text not null check (tipus in ('força', 'mobilitat', 'estirament')),
  unitat       text not null check (unitat in ('reps', 'segons')),
  series       smallint[] not null check (cardinality(series) between 1 and 20),  -- objectiu de cada sèrie
  per_costat   boolean not null default false,
  descans      smallint not null default 0 check (descans between 0 and 600),  -- segons després de cada sèrie
  nota         text check (char_length(nota) <= 120),
  pujada_abans smallint,  -- última pujada automàtica ("↑ 11"), si n'hi ha
  pujada_ara   smallint,
  unique (activitat_id, ordre),
  foreign key (activitat_id, user_id) references public.activitats (id, user_id) on delete cascade
);

-- Les sessions fetes.
-- estat: 'feta' = desada sencera, 'no-acabada' = acabada abans d'hora, 'no-feta' = no s'ha fet.
create table if not exists public.sessions (
  id               uuid primary key,  -- el genera l'app, perquè es pugui desar sense connexió
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activitat_id     uuid,              -- null si l'activitat s'ha esborrat del pla
  tipus            text not null check (tipus in ('rutina', 'activitat')),
  activitat        text check (activitat in ('casa', 'gimnas', 'caminar', 'correr', 'bici', 'natacio')),
  nom              text not null check (char_length(nom) <= 60),
  inici            timestamptz not null,
  fi               timestamptz,
  estat            text not null check (estat in ('feta', 'no-acabada', 'no-feta')),
  curta            boolean not null default false,  -- versió curta de la rutina
  minuts_previstos smallint,  -- activitats soles
  minuts_fets      smallint,
  minuts_pausa     smallint,
  pujades          jsonb not null default '[]',     -- pujades de la progressió automàtica, per al resum
  creat            timestamptz not null default now(),
  unique (id, user_id),
  foreign key (activitat_id, user_id) references public.activitats (id, user_id) on delete set null (activitat_id)
);

-- Els exercicis d'una sessió de rutina (també els saltats, que no tenen sèries).
create table if not exists public.exercicis_sessio (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sessio_id   uuid not null,
  ordre       smallint not null check (ordre >= 1),
  exercici    text not null check (char_length(exercici) between 1 and 60),
  substitueix text check (char_length(substitueix) <= 60),  -- l'exercici original, si s'ha canviat
  saltat      boolean not null default false,
  unitat      text not null check (unitat in ('reps', 'segons')),
  unique (id, user_id),
  foreign key (sessio_id, user_id) references public.sessions (id, user_id) on delete cascade
);

-- Les sèries fetes de cada exercici: l'objectiu i el que s'ha fet.
create table if not exists public.series_fetes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercici_sessio_id uuid not null,
  ordre              smallint not null check (ordre >= 1),
  objectiu           smallint not null check (objectiu >= 0),
  fet                smallint not null check (fet >= 0),
  foreign key (exercici_sessio_id, user_id) references public.exercicis_sessio (id, user_id) on delete cascade
);

create index if not exists activitats_usuari        on public.activitats (user_id);
create index if not exists exercicis_activitat_usuari on public.exercicis_activitat (user_id);
create index if not exists sessions_usuari_inici    on public.sessions (user_id, inici desc);
create index if not exists sessions_activitat       on public.sessions (activitat_id);
create index if not exists exercicis_sessio_sessio  on public.exercicis_sessio (sessio_id);
create index if not exists exercicis_sessio_usuari  on public.exercicis_sessio (user_id);
create index if not exists series_fetes_exercici    on public.series_fetes (exercici_sessio_id);
create index if not exists series_fetes_usuari      on public.series_fetes (user_id);


-- ---------------------------------------------------------------------
-- Row Level Security: cada usuari, només les seves files
-- ---------------------------------------------------------------------

do $$
declare
  taula text;
begin
  foreach taula in array array['perfils', 'activitats', 'exercicis_activitat', 'sessions', 'exercicis_sessio', 'series_fetes'] loop
    execute format('alter table public.%I enable row level security', taula);

    execute format('drop policy if exists "llegir les meves files" on public.%I', taula);
    execute format('drop policy if exists "crear les meves files" on public.%I', taula);
    execute format('drop policy if exists "editar les meves files" on public.%I', taula);
    execute format('drop policy if exists "esborrar les meves files" on public.%I', taula);

    execute format('create policy "llegir les meves files" on public.%I for select to authenticated
                    using ((select auth.uid()) = user_id)', taula);
    execute format('create policy "crear les meves files" on public.%I for insert to authenticated
                    with check ((select auth.uid()) = user_id)', taula);
    execute format('create policy "editar les meves files" on public.%I for update to authenticated
                    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', taula);
    execute format('create policy "esborrar les meves files" on public.%I for delete to authenticated
                    using ((select auth.uid()) = user_id)', taula);
  end loop;
end $$;

-- El nom d'usuari no es pot canviar des de l'app (ha de coincidir amb el correu intern).
revoke update on public.perfils from anon, authenticated;
grant update (objectiu_setmanal, dolors, inicialitzat, actualitzat) on public.perfils to authenticated;


-- ---------------------------------------------------------------------
-- Trigger: crea el perfil en registrar-se un usuari nou
-- ---------------------------------------------------------------------

-- El nom d'usuari surt del correu intern (<usuari>@usuaris.espishu.app).
-- Només s'accepten comptes amb aquest domini.
create or replace function public.crea_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or lower(new.email) not like '%@usuaris.espishu.app' then
    raise exception 'Només comptes d''Espishu';
  end if;
  insert into public.perfils (user_id, usuari)
  values (new.id, lower(split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists en_crear_usuari on auth.users;
create trigger en_crear_usuari
  after insert on auth.users
  for each row execute function public.crea_perfil();


-- ---------------------------------------------------------------------
-- ping(): la consulta automàtica perquè el projecte no es pausi
-- No llegeix cap taula. Es pot cridar sense iniciar sessió.
-- ---------------------------------------------------------------------

create or replace function public.ping()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select 'ok'::text;
$$;

revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;


-- ---------------------------------------------------------------------
-- desa_pla(pla): desa tot el pla d'un cop (una sola transacció)
--
-- { "objectiu_setmanal": 2, "dolors": ["esquat-cadira"],
--   "activitats": [ { "id", "tipus", "dia", "hora", "duracio_min", "nom",
--                     "exercicis": [ { "exercici", "tipus", "unitat", "series": [10, 10],
--                                      "per_costat", "descans", "nota", "pujada_abans", "pujada_ara" } ] } ] }
--
-- S'executa amb els permisos de l'usuari (RLS). Les activitats que no hi
-- són s'esborren; les sessions fetes es queden.
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
    insert into public.activitats as t (id, user_id, tipus, dia, hora, duracio_min, nom)
    values ((a ->> 'id')::uuid, uid, a ->> 'tipus', (a ->> 'dia')::smallint, (a ->> 'hora')::time,
            (a ->> 'duracio_min')::smallint, a ->> 'nom')
    on conflict (id) do update set
      tipus = excluded.tipus, dia = excluded.dia, hora = excluded.hora,
      duracio_min = excluded.duracio_min, nom = excluded.nom, actualitzat = now()
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


-- ---------------------------------------------------------------------
-- desa_sessio(sessio): desa una sessió amb els exercicis i les sèries
--
-- { "id", "activitat_id", "tipus", "activitat", "nom", "inici", "fi", "estat", "curta",
--   "minuts_previstos", "minuts_fets", "minuts_pausa", "pujades": [],
--   "exercicis": [ { "exercici", "substitueix", "saltat", "unitat",
--                    "series": [ { "objectiu": 12, "fet": 12 } ] } ] }
--
-- Si la sessió ja hi és, no fa res: es pot tornar a enviar sense duplicar-la
-- (per exemple, si la connexió es va tallar just en desar-la).
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
     minuts_previstos, minuts_fets, minuts_pausa, pujades)
  values
    (sid, uid, aid, sessio ->> 'tipus', sessio ->> 'activitat', sessio ->> 'nom',
     (sessio ->> 'inici')::timestamptz, (sessio ->> 'fi')::timestamptz, sessio ->> 'estat',
     coalesce((sessio ->> 'curta')::boolean, false),
     (sessio ->> 'minuts_previstos')::smallint, (sessio ->> 'minuts_fets')::smallint,
     (sessio ->> 'minuts_pausa')::smallint, coalesce(sessio -> 'pujades', '[]'));

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


-- ---------------------------------------------------------------------
-- Registre de migracions: quines s'han executat i quan.
-- Per consultar-ho: select * from public.migracions order by nom;
-- Amb RLS i sense polítiques: des de l'app no es pot llegir ni tocar
-- (només des del tauler de Supabase). No són dades de cap usuari.
-- ---------------------------------------------------------------------

create table if not exists public.migracions (
  nom      text primary key,
  aplicada timestamptz not null default now()
);
alter table public.migracions enable row level security;
revoke all on public.migracions from anon, authenticated;

insert into public.migracions (nom) values ('001_inicial') on conflict (nom) do nothing;
