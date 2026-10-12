/*
 * sincronitza.js — les dades del compte a Supabase (PLA.md, secció 21.4).
 *
 * Local primer: l'app sempre llegeix i escriu la còpia local (store.js), també sense connexió.
 * Cada canvi apunta què cal pujar a `pendents` (la cua), i es desa alhora que el canvi:
 * una sessió feta sense cobertura no es pot perdre. Amb connexió, es puja la cua per ordre
 * i després es baixen les dades del compte (si no hi ha res pendent).
 *
 * Elements de la cua: { n, tipus: 'pla' } (tot el pla: cites, exercicis, objectiu i dolors),
 * { n, tipus: 'sessio', id } i { n, tipus: 'reinicia' } (esborrar l'historial de Supabase).
 * El pla es puja com està en el moment de pujar-lo, no com estava en apuntar-lo.
 *
 * Entre versions de l'app: la cua es desa amb les dades (localStorage) i una versió nova la puja
 * igualment, perquè cada element només diu QUÈ cal pujar (un tipus i un id) i les dades es llegeixen
 * en el moment de pujar. Per això:
 *  - No canviïs mai el significat d'un tipus. Si cal una manera nova de pujar, afegeix un tipus nou
 *    i mantén els antics (o converteix-los a la migració de store.js).
 *  - Un element només surt de la cua quan Supabase ha dit que sí. Si falla (sense connexió, o la base
 *    de dades encara no té la migració), es queda i es torna a provar.
 *  - Pujar-lo dues vegades no fa mal (desa_pla i desa_sessio són idempotents): si l'app es recarrega
 *    a mig pujar (per exemple, per una actualització), es torna a enviar.
 */
import { obte, actualitza, substitueix, enCadaCanvi, dadesInicials, desaAnteriors } from './store.js';
import { obteClient, tancaSessio, ErrorCompte, motiuDe } from './compte.js';
import { icona } from './icones.js';
import { registraObjectiu } from './boscdades.js';

const ESPERA_PUJADA = 1500;
const PAGINA = 1000;

/* ================= Què ha canviat ================= */

/* El que es desa a Supabase del pla, per saber si ha canviat. */
const textPla = d => JSON.stringify([d.pla.objectiuSetmanal, d.ajustos.dolors, d.pla.cites]);

/* El que ja és a la cua o a Supabase: amb això es compara cada canvi. */
let foto = null;

function prenFoto(d) {
  foto = d?.compte ? { pla: textPla(d), sessions: new Set(d.sessions.map(s => s.id)) } : null;
}

const op = (tipus, extra = {}) => ({ n: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, tipus, ...extra });

/* Afegeix el pla a la cua si encara no hi és. */
function encuaPla(d) {
  if (!d.pendents.some(p => p.tipus === 'pla')) d.pendents.push(op('pla'));
}

/* Es crida a cada canvi (store.js), abans de desar-lo. */
function detecta(d) {
  if (!d.compte || d.compte.nou) return;
  d.pendents ??= [];
  if (!foto) prenFoto(d);
  const abans = foto;
  const ids = d.sessions.map(s => s.id);
  const actuals = new Set(ids);
  let canvis = false;

  // Fins que no s'han baixat les dades del compte, no es puja el pla (es trepitjaria el de Supabase).
  if (d.compte.baixat && textPla(d) !== abans.pla) { encuaPla(d); canvis = true; }

  if ([...abans.sessions].some(id => !actuals.has(id))) {
    // S'han esborrat sessions (Reiniciar o restaurar una còpia): Supabase ha de quedar igual que aquí.
    d.pendents = d.pendents.filter(p => p.tipus !== 'sessio');
    d.pendents.push(op('reinicia'), ...ids.map(id => op('sessio', { id })));
    canvis = true;
  } else {
    const noves = ids.filter(id => !abans.sessions.has(id));
    d.pendents.push(...noves.map(id => op('sessio', { id })));
    if (noves.length) canvis = true;
  }
  foto = { pla: d.compte.baixat ? textPla(d) : abans.pla, sessions: actuals };
  if (canvis) programa();
}

/* ================= De local a Supabase i al revés ================= */

function plaServidor(d) {
  return {
    objectiu_setmanal: d.pla.objectiuSetmanal,
    dolors: [...new Set(d.ajustos.dolors)],
    activitats: d.pla.cites.map(c => ({
      id: c.id,
      tipus: c.activitat,
      dia: c.dia,
      hora: c.hora,
      duracio_min: c.rutina ? null : c.duracioMin ?? null,
      nom: c.rutina?.nom ?? null,
      exercicis: (c.rutina?.exercicis ?? []).map(ex => ({
        exercici: ex.id,
        tipus: ex.tipus,
        unitat: ex.unitat,
        series: ex.series,
        per_costat: !!ex.perCostat,
        descans: ex.descans ?? 0,
        nota: ex.nota ?? null,
        pujada_abans: ex.pujada?.abans ?? null,
        pujada_ara: ex.pujada?.ara ?? null
      }))
    }))
  };
}

function sessioServidor(s, d) {
  const cita = d.pla.cites.find(c => c.id === s.citaId);
  return {
    id: s.id,
    activitat_id: s.citaId ?? null,
    tipus: s.tipus,
    activitat: s.tipus === 'rutina' ? cita?.activitat ?? 'casa' : s.activitat,
    nom: s.nom,
    inici: s.inici,
    fi: s.fi ?? null,
    estat: s.estat,
    curta: !!s.curta,
    minuts_previstos: s.minutsPrevistos ?? null,
    minuts_fets: s.minutsFets ?? null,
    minuts_pausa: s.minutsPausa ?? null,
    pujades: s.pujades ?? [],
    exercicis: (s.exercicis ?? []).map(e => ({
      exercici: e.id,
      substitueix: e.substitueix ?? null,
      saltat: !!e.saltat,
      unitat: e.unitat,
      series: e.series.map(sr => ({ objectiu: sr.objectiu, fet: sr.fet }))
    }))
  };
}

const perOrdre = (a, b) => a.ordre - b.ordre;

function citaLocal(a) {
  const cita = { id: a.id, dia: a.dia, hora: a.hora.slice(0, 5), activitat: a.tipus };
  const exercicis = [...(a.exercicis_activitat ?? [])].sort(perOrdre).map(e => {
    const ex = { id: e.exercici, tipus: e.tipus, series: e.series, unitat: e.unitat, perCostat: e.per_costat, descans: e.descans };
    if (e.nota) ex.nota = e.nota;
    if (e.pujada_ara !== null && e.pujada_ara !== undefined) ex.pujada = { abans: e.pujada_abans, ara: e.pujada_ara };
    return ex;
  });
  if (a.tipus === 'casa' || a.tipus === 'gimnas' || exercicis.length) cita.rutina = { nom: a.nom ?? 'Rutina', exercicis };
  else cita.duracioMin = a.duracio_min ?? 60;
  return cita;
}

function sessioLocal(s) {
  const sessio = {
    id: s.id,
    inici: new Date(s.inici).toISOString(),
    fi: s.fi ? new Date(s.fi).toISOString() : null,
    citaId: s.activitat_id,
    tipus: s.tipus,
    nom: s.nom,
    estat: s.estat
  };
  if (s.tipus === 'rutina') {
    sessio.curta = s.curta;
    sessio.exercicis = [...(s.exercicis_sessio ?? [])].sort(perOrdre).map(e => {
      const ex = { id: e.exercici, unitat: e.unitat };
      if (e.substitueix) ex.substitueix = e.substitueix;
      if (e.saltat) ex.saltat = true;
      ex.series = [...(e.series_fetes ?? [])].sort(perOrdre).map(sr => ({ objectiu: sr.objectiu, fet: sr.fet }));
      return ex;
    });
    sessio.pujades = s.pujades ?? [];
  } else {
    Object.assign(sessio, {
      activitat: s.activitat,
      minutsPrevistos: s.minuts_previstos,
      minutsFets: s.minuts_fets,
      minutsPausa: s.minuts_pausa
    });
  }
  return sessio;
}

/* ================= Pujar i baixar ================= */

const comprova = ({ data, error }) => {
  if (error) throw new ErrorCompte(motiuDe(error));
  return data;
};

async function executa(sb, element) {
  const d = obte();
  if (element.tipus === 'pla') {
    comprova(await sb.rpc('desa_pla', { pla: plaServidor(d) }));
  } else if (element.tipus === 'sessio') {
    const s = d.sessions.find(x => x.id === element.id);
    if (s) comprova(await sb.rpc('desa_sessio', { sessio: sessioServidor(s, d) }));
  } else if (element.tipus === 'reinicia') {
    comprova(await sb.from('sessions').delete().eq('user_id', d.compte.id));
  } else {
    // Un tipus que aquesta versió no coneix (no hauria de passar): es treu perquè no bloquegi la cua.
    console.warn('Element de la cua desconegut', element);
  }
}

async function puja(sb) {
  for (;;) {
    const element = obte().pendents?.[0];
    if (!element) return;
    await executa(sb, element);
    actualitza(d => { d.pendents = d.pendents.filter(p => p.n !== element.n); }, { remot: true });
    avisa();
  }
}

async function llegeixCompte(sb, uid) {
  const perfil = comprova(await sb.from('perfils')
    .select('objectiu_setmanal, dolors, inicialitzat')
    .eq('user_id', uid).maybeSingle());
  return perfil;
}

async function baixa(sb) {
  const uid = obte().compte.id;
  const [perfil, activitats] = await Promise.all([
    llegeixCompte(sb, uid),
    sb.from('activitats')
      .select('id, tipus, dia, hora, duracio_min, nom, exercicis_activitat(ordre, exercici, tipus, unitat, series, per_costat, descans, nota, pujada_abans, pujada_ara)')
      .eq('user_id', uid).then(comprova)
  ]);
  const sessions = [];
  for (let des = 0; ; des += PAGINA) {
    const pagina = comprova(await sb.from('sessions')
      .select('id, activitat_id, tipus, activitat, nom, inici, fi, estat, curta, minuts_previstos, minuts_fets, minuts_pausa, pujades, exercicis_sessio(ordre, exercici, substitueix, saltat, unitat, series_fetes(ordre, objectiu, fet))')
      .eq('user_id', uid).order('inici').order('id').range(des, des + PAGINA - 1));
    sessions.push(...pagina);
    if (pagina.length < PAGINA) break;
  }
  // Si mentrestant hi ha hagut canvis (o s'ha sortit del compte), ja es baixarà la propera vegada.
  const d = obte();
  if (d.pendents.length || d.compte?.id !== uid || !perfil) return false;
  // Les cites que ja hi eren mantenen l'ordre d'aquí; les noves, al final.
  const ordre = new Map(d.pla.cites.map((c, i) => [c.id, i]));
  const posicio = c => ordre.get(c.id) ?? Infinity;
  const cites = activitats.map(citaLocal)
    .sort((a, b) => posicio(a) - posicio(b) || a.dia - b.dia || a.hora.localeCompare(b.hora) || a.id.localeCompare(b.id));
  const abans = canonic([d.pla, d.ajustos.dolors, d.sessions]);
  actualitza(x => {
    // Si l'objectiu s'ha canviat en un altre aparell, les setmanes passades es queden amb el d'abans
    // (boscdades.js). La primera baixada no és un canvi: només porta el que ja hi havia.
    if (x.compte.baixat && x.pla.objectiuSetmanal !== perfil.objectiu_setmanal) registraObjectiu(x, perfil.objectiu_setmanal);
    x.pla.objectiuSetmanal = perfil.objectiu_setmanal;
    x.ajustos.dolors = perfil.dolors ?? [];
    x.pla.cites = cites;
    x.sessions = sessions.map(sessioLocal);
    x.compte.baixat = true;
  }, { remot: true });
  prenFoto(obte());
  return canonic([obte().pla, obte().ajustos.dolors, obte().sessions]) !== abans;
}

/* JSON amb les claus ordenades, per comparar sense que importi l'ordre de les claus. */
const canonic = valor => JSON.stringify(valor, (_, x) => x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  : x);

/* ================= Quan es sincronitza ================= */

let enMarxa = null, unaAltra = false, temporitzador = 0;
let calEntrar = false;
const oients = new Set();

/* Crida `fn({ pendents, calEntrar, canviat })` quan canvia l'estat de la sincronització. */
export function escoltaSincronitzacio(fn) {
  oients.add(fn);
  return () => oients.delete(fn);
}

function avisa(canviat = false) {
  const estat = { pendents: obte().pendents?.length ?? 0, calEntrar, canviat };
  oients.forEach(fn => fn(estat));
}

function programa() {
  clearTimeout(temporitzador);
  temporitzador = setTimeout(() => { sincronitza().catch(() => {}); }, ESPERA_PUJADA);
  queueMicrotask(() => avisa());
}

async function cicle() {
  const d = obte();
  if (!d.compte || d.compte.nou) return;
  const sb = await obteClient();
  try {
    await puja(sb);
    const canviat = await baixa(sb);
    calEntrar = false;
    avisa(canviat);
  } catch (e) {
    if (e.motiu === 'sessio') calEntrar = true;
    avisa();
    throw e;
  }
}

/* Puja la cua i baixa les dades. Si ja s'està fent, es torna a fer en acabar. Llança ErrorCompte si falla. */
export function sincronitza() {
  if (enMarxa) {
    unaAltra = true;
    return enMarxa;
  }
  enMarxa = (async () => {
    do {
      unaAltra = false;
      await cicle();
    } while (unaAltra);
  })().finally(() => { enMarxa = null; });
  return enMarxa;
}

export const hiHaPendents = () => (obte().pendents?.length ?? 0) > 0;
export const calTornarAEntrar = () => calEntrar;

/* En obrir l'app: vigila els canvis i, amb connexió, sincronitza. */
export function iniciaSincronitzacio() {
  prenFoto(obte());
  enCadaCanvi(detecta);
  const prova = () => { if (obte().compte && !obte().compte.nou) sincronitza().catch(() => {}); };
  window.addEventListener('online', prova);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') prova(); });
  prova();
}

/* ================= Entrar i sortir del compte ================= */

/* L'aparell s'ha fet servir amb la versió sense comptes (store.js, migració 1 → 2). */
const teDadesAnteriors = d => d.anterior && !d.compte && (d.sessions.length > 0 || d.perfil.avisSalutVist);

/* Dades buides per a un compte, amb el que és de l'aparell (avisos vistos, instal·lada). */
function dadesNoves(d, compte) {
  const noves = dadesInicials();
  noves.perfil = { ...d.perfil };
  noves.compte = compte;
  return noves;
}

/*
 * Després d'entrar o de crear el compte. Si les dades locals no són d'aquest compte, es comença
 * de nou (les de la versió anterior s'aparten per poder-les importar). Si el compte és buit,
 * l'app porta a #importar; si no, es baixen les seves dades. Retorna la ruta on s'ha d'anar.
 */
export async function iniciaCompte({ id, usuari }) {
  // Primer es mira el compte: si falla, les dades locals no s'han tocat.
  const sb = await obteClient();
  const perfil = await llegeixCompte(sb, id);
  const d = obte();
  if (d.compte?.id !== id) {
    if (teDadesAnteriors(d)) desaAnteriors(d);
    substitueix(dadesNoves(d, { id, usuari }), { remot: true });
  }
  if (!perfil?.inicialitzat) {
    actualitza(x => { x.compte = { id, usuari, nou: true }; }, { remot: true });
    prenFoto(null);
    return '#importar';
  }
  actualitza(x => { x.compte = { ...x.compte, usuari }; delete x.compte.nou; }, { remot: true });
  prenFoto(obte());
  try { await sincronitza(); } catch { /* ja es tornarà a provar */ }
  return '#avui';
}

/*
 * Compte buit: es comença amb `dades` (les importades) o amb el pla inicial, i es puja tot.
 * Les sessions entren a la cua; el pla, també (i això marca el compte com a inicialitzat).
 */
export function comencaCompte(dades = null) {
  const compte = { id: obte().compte.id, usuari: obte().compte.usuari, baixat: true };
  const base = dades ?? dadesNoves(obte(), compte);
  const noves = {
    ...base,
    perfil: { ...obte().perfil },
    sessioEnCurs: null,
    compte,
    pendents: []
  };
  delete noves.anterior;
  substitueix(noves, { remot: true });
  actualitza(d => {
    d.pendents = [op('pla'), ...d.sessions.map(s => op('sessio', { id: s.id }))];
  }, { remot: true });
  prenFoto(obte());
  programa();
}

/* Tanca la sessió. Si hi ha canvis sense pujar i no es poden pujar, no la tanca i retorna false. */
export async function tancaCompte() {
  if (hiHaPendents()) {
    try { await sincronitza(); } catch { /* es mira a sota */ }
    if (hiHaPendents()) return false;
  }
  await tancaSessio();
  calEntrar = false;
  const d = obte();
  substitueix({ ...dadesNoves(d, null), pendents: [] }, { remot: true });
  prenFoto(null);
  avisa();
  return true;
}

/* ================= Indicador de canvis pendents ================= */

/* Botó petit de la capçalera (Avui, Bosc i Pla). Només es veu si hi ha canvis per pujar. */
export function htmlPendents(classe = '') {
  const visible = hiHaPendents() || calEntrar;
  return `<button type="button" class="boto-icona pendents${classe ? ` ${classe}` : ''}" data-pendents aria-label="Canvis pendents"${visible ? '' : ' hidden'}>${icona('nuvol')}</button>`;
}
