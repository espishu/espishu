# Migracions de la base de dades

Cada canvi a la base de dades de Supabase és un fitxer numerat d'aquesta carpeta: `001_inicial.sql`, `002_...sql`, `003_...sql`. S'executen **per ordre**, una sola vegada cadascun, a l'**SQL Editor** de Supabase. Els fitxers ja executats no es canvien mai: si cal arreglar alguna cosa, es fa una migració nova.

Per veure quines s'han executat:

```sql
select * from public.migracions order by nom;
```

## Migracions

| Fitxer | Què fa | Abans de la versió |
|---|---|---|
| `001_inicial.sql` | Taules, seguretat (RLS), `desa_pla` i `desa_sessio` | 4 |
| `002_bosc.sql` | `perfils.bosc`, `desa_bosc`; objectiu de 1 a 10 | 5 |
| `003_altra.sql` | Tipus d'activitat `altra` | 6 |
| `004_extra.sql` | `sessions.extra` i `sessions.recupera`; `desa_sessio` els desa | 6 |
| `005_icona.sql` | `activitats.icona`; `desa_pla` la desa (sense esborrar-la si una versió anterior no l'envia) | 8 |

## Normes

1. **No es perden mai dades d'usuari.** Res de `drop table`, `truncate`, `delete` sense filtre ni recrear taules que tinguin dades.
2. **Afegir sí:** taules noves, columnes noves (amb un valor per defecte o que puguin ser nul·les), índexs, funcions noves.
3. **Si cal canviar una estructura** (per exemple, partir una columna en dues): primer es crea la nova, s'hi **copien** les dades, i la vella es deixa estar. Només s'esborra en una migració posterior, quan ja cap versió de l'app la fa servir.
4. **Compatibles amb la versió anterior de l'app:** mentre s'actualitzen els mòbils, l'app vella i la nova conviuen. Les funcions que fa servir l'app (`desa_pla`, `desa_sessio`…) no canvien de paràmetres de manera incompatible: si cal, se'n crea una de nova (`desa_sessio_2`) i la vella es manté.
5. **Es poden tornar a executar** sense errors ni duplicats: `create table if not exists`, `add column if not exists`, `create or replace function`, `on conflict do nothing`.
6. **Primer la base de dades, després el codi:** la migració s'executa a Supabase **abans** de publicar la versió de l'app que la necessita.
7. Cada migració acaba apuntant-se al registre (a sota).

## Plantilla

```sql
-- =====================================================================
-- Espishu: migració 002 — <què fa, en una frase>
-- Executar a Supabase ABANS de publicar la versió <N> de l'app.
-- Només afegeix: no esborra ni canvia cap dada existent.
-- =====================================================================

alter table public.sessions add column if not exists exemple text;

insert into public.migracions (nom) values ('002_exemple') on conflict (nom) do nothing;
```
