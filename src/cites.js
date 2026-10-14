/*
 * cites.js — càlculs sobre les cites del pla: quina és la propera,
 * quant dura cadascuna i com s'anomena.
 */

export const DIES = ['', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];

export const ACTIVITATS = {
  casa: 'Exercici a casa',
  gimnas: 'Gimnàs',
  caminar: 'Caminar',
  correr: 'Córrer',
  bici: 'Bici',
  natacio: 'Natació',
  altra: 'Altra' // activitat sola amb el nom que hi posi l'usuari (sense animació ni icona pròpia)
};

/* Les que es poden triar en crear o editar una cita, en aquest ordre ("Gimnàs", més endavant). */
export const OPCIONS_ACTIVITAT = ['casa', 'natacio', 'caminar', 'bici', 'correr', 'altra'];

/* Temps de treball d'una repetició: per calcular la duració d'una rutina i les sèries automàtiques. */
export const SEGONS_PER_REP = 3;

/* 1 = dilluns … 7 = diumenge */
export function diaSetmana(data) {
  return ((data.getDay() + 6) % 7) + 1;
}

export function mateixDia(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* La rutina d'una cita de casa (o de gimnàs) és dins la mateixa cita (versió 2 de les dades). */
export function rutinaDe(estat, cita) {
  return cita.rutina ?? null;
}

/* Descans entre l'última sèrie d'un exercici i la primera del següent. */
export function descansEntreExercicis(seguent) {
  return seguent.tipus === 'estirament' ? 15 : 60;
}

/* Duració estimada d'una rutina, en minuts arrodonits a 5. */
export function duracioRutina(rutina) {
  let segons = 0;
  rutina.exercicis.forEach((ex, i) => {
    const costats = ex.perCostat ? 2 : 1;
    const treball = ex.series.reduce((total, objectiu) =>
      total + (ex.unitat === 'segons' ? objectiu : objectiu * SEGONS_PER_REP) * costats, 0);
    const seguent = rutina.exercicis[i + 1];
    const descansos = ex.descans * (ex.series.length - 1) + (seguent ? descansEntreExercicis(seguent) : 0);
    segons += treball + descansos;
  });
  return Math.max(5, Math.round(segons / 300) * 5);
}

/* Una rutina sense cap exercici: no es pot començar (Avui porta a afegir-ne). */
export const rutinaBuida = rutina => !!rutina && !rutina.exercicis.length;

/* Duració d'una cita en minuts, o null si no se sap. */
export function duracioCita(estat, cita) {
  const rutina = rutinaDe(estat, cita);
  if (rutina) return rutinaBuida(rutina) ? null : duracioRutina(rutina);
  return cita.duracioMin ?? null;
}

/*
 * El nom que l'usuari ha posat a la cita (Editar): el de la rutina o, a les activitats soles, `cita.nom`
 * (opcional). Si no n'hi ha, el de l'activitat ("Natació").
 */
export const MAX_NOM_CITA = 30;
export const RUTINA_PER_DEFECTE = 'Rutina';

export function nomPropi(cita) {
  return (cita.rutina ? cita.rutina.nom : cita.nom) || '';
}

export function nomCita(estat, cita) {
  return nomPropi(cita) || (cita.rutina ? RUTINA_PER_DEFECTE : ACTIVITATS[cita.activitat] ?? cita.activitat);
}

/* Desa el nom de la cita; buit = el per defecte. */
export function posaNom(cita, text) {
  const nom = text.trim().slice(0, MAX_NOM_CITA);
  if (cita.rutina) cita.rutina.nom = nom || RUTINA_PER_DEFECTE;
  else if (nom) cita.nom = nom;
  else delete cita.nom;
}

/* "25 min", "1 h 30 min", "2 h" */
export function formatDuracio(minuts) {
  const h = Math.floor(minuts / 60), m = minuts % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/* Format curt de les targetes (DISSENY.md): "25′", "1 h 30", "2 h" */
export function formatMinuts(minuts) {
  const h = Math.floor(minuts / 60), m = minuts % 60;
  if (!h) return `${m}′`;
  return m ? `${h} h ${m}` : `${h} h`;
}

/* "09:00" → "9:00" */
export function formatHora(hora) {
  return hora.replace(/^0(\d)/, '$1');
}

/*
 * El dia en què compta una sessió (setmana, bosc, cita feta): el de l'inici o, si és una cita
 * recuperada, el dia que tocava (`recupera`, "2026-10-12"; a les 12:00 per no dependre de l'hora).
 */
export function diaQueCompta(s) {
  if (s.recupera) {
    const [a, m, d] = s.recupera.split('-').map(Number);
    return new Date(a, m - 1, d, 12);
  }
  return new Date(s.inici);
}

export const dataISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function citaFetaAvui(estat, cita, ara) {
  return estat.sessions.some(s => s.citaId === cita.id && mateixDia(diaQueCompta(s), ara));
}

/*
 * Cites del pla que s'han passat els últims 7 dies sense fer-les (el dilluns, fins a les del dilluns
 * passat; avui no, que encara és la propera). Una cita és feta si té una sessió que compta (feta o
 * no acabada) aquella setmana, encara que fos un altre dia. Les rutines sense exercicis no hi surten.
 * Retorna [{ cita, data }], de la més antiga a la més nova.
 */
export function perRecuperar(estat, ara = new Date()) {
  const avui = diaSetmana(ara);
  const dl = d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - (diaSetmana(d) - 1)).getTime();
  return estat.pla.cites
    .filter(cita => !cita.rutina || cita.rutina.exercicis.length)
    .map(cita => {
      const enrere = (avui - cita.dia + 7) % 7 || 7;
      const [h, m] = cita.hora.split(':').map(Number);
      return { cita, data: new Date(ara.getFullYear(), ara.getMonth(), ara.getDate() - enrere, h, m) };
    })
    .filter(({ cita, data }) => !estat.sessions.some(s => s.citaId === cita.id
      && (s.estat === 'feta' || s.estat === 'no-acabada') && dl(diaQueCompta(s)) === dl(data)))
    .sort((a, b) => a.data - b.data);
}

/*
 * La propera cita a partir d'ara. Una cita d'avui encara compta com a propera
 * (encara que l'hora ja hagi passat) fins que hi ha una sessió registrada.
 * Retorna { cita, data } o null si el pla no té cites.
 */
export function properaCita(estat, ara = new Date()) {
  const avui = diaSetmana(ara);
  const opcions = estat.pla.cites.map(cita => {
    let dies = (cita.dia - avui + 7) % 7;
    if (dies === 0 && citaFetaAvui(estat, cita, ara)) dies = 7;
    const [h, m] = cita.hora.split(':').map(Number);
    const data = new Date(ara.getFullYear(), ara.getMonth(), ara.getDate() + dies, h, m);
    return { cita, data };
  });
  opcions.sort((a, b) => a.data - b.data);
  return opcions[0] ?? null;
}

/* "Avui", "Demà" o el nom del dia. */
export function nomDia(data, ara = new Date()) {
  if (mateixDia(data, ara)) return 'Avui';
  const dema = new Date(ara.getFullYear(), ara.getMonth(), ara.getDate() + 1);
  if (mateixDia(data, dema)) return 'Demà';
  return DIES[diaSetmana(data)];
}
