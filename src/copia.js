/*
 * copia.js — còpia de seguretat (PLA.md, secció 11).
 * Fer còpia: un arxiu espishu-copia-AAAA-MM-DD.json amb totes les dades. A l'iPhone es comparteix
 * (Desa a Fitxers, iCloud, WhatsApp…); si no es pot, es descarrega.
 * Restaurar: es valida l'arxiu, es mostra un resum i, si es confirma, substitueix les dades.
 */
import { obte, actualitza, VERSIO } from './store.js';
import { ratxa } from './ratxa.js';

const dos = n => String(n).padStart(2, '0');
const avuiText = (ara = new Date()) => `${ara.getFullYear()}-${dos(ara.getMonth() + 1)}-${dos(ara.getDate())}`;

/* Fa la còpia. Retorna true si s'ha desat o compartit, false si s'ha cancel·lat. */
export async function ferCopia() {
  const data = avuiText();
  const copia = JSON.parse(JSON.stringify(obte()));
  copia.perfil.ultimaCopia = data;
  // El compte i la cua de canvis són d'aquest aparell, no de la còpia.
  delete copia.compte;
  delete copia.pendents;
  delete copia.anterior;
  const nom = `espishu-copia-${data}.json`;
  const text = JSON.stringify(copia, null, 2);
  const arxiu = new File([text], nom, { type: 'application/json' });

  if (navigator.canShare?.({ files: [arxiu] })) {
    try {
      await navigator.share({ files: [arxiu], title: 'Còpia de seguretat d\'Espishu' });
    } catch (e) {
      if (e.name === 'AbortError') return false;
      descarrega(arxiu);
    }
  } else {
    descarrega(arxiu);
  }
  actualitza(d => { d.perfil.ultimaCopia = data; });
  return true;
}

function descarrega(arxiu) {
  const url = URL.createObjectURL(arxiu);
  const enllac = document.createElement('a');
  enllac.href = url;
  enllac.download = arxiu.name;
  document.body.append(enllac);
  enllac.click();
  enllac.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* Comprova que l'objecte tingui l'estructura de les dades de l'app. Llança un Error amb un text per a l'usuari. */
export function validaCopia(obj) {
  const noEs = 'Aquest arxiu no és una còpia de l\'app.';
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error(noEs);
  if (!Number.isInteger(obj.versio)) throw new Error(noEs);
  if (obj.versio > VERSIO) throw new Error('Aquesta còpia és d\'una versió més nova de l\'app.');
  // Versió 1: rutina compartida (`rutines`). Versió 2: la rutina és dins de cada cita.
  const rutinesBe = obj.versio === 1
    ? Array.isArray(obj.rutines) && obj.rutines.every(r => r && r.id && Array.isArray(r.exercicis))
    : obj.pla?.cites?.every(c => !c?.rutina || Array.isArray(c.rutina.exercicis));
  const ok = obj.perfil && typeof obj.perfil === 'object'
    && obj.pla && Array.isArray(obj.pla.cites) && Number.isInteger(obj.pla.objectiuSetmanal)
    && Array.isArray(obj.sessions) && rutinesBe
    && obj.pla.cites.every(c => c && c.id && c.dia >= 1 && c.dia <= 7 && /^\d{2}:\d{2}$/.test(c.hora) && c.activitat)
    && obj.sessions.every(s => s && s.id && s.inici && s.estat);
  if (!ok) throw new Error('A l\'arxiu hi falten dades. No es pot restaurar.');
  obj.ajustos ??= { dolors: [] };
  obj.sessioEnCurs ??= null;
  delete obj.compte;
  delete obj.pendents;
  delete obj.anterior;
  return obj;
}

/* Llegeix un arxiu triat. Retorna { dades, resum } o llança un Error amb el motiu. */
export async function llegeixCopia(arxiu) {
  let obj;
  try {
    obj = JSON.parse(await arxiu.text());
  } catch {
    throw new Error('No es pot llegir l\'arxiu. Ha de ser una còpia .json de l\'app.');
  }
  const dades = validaCopia(obj);
  const n = dades.sessions.length, r = ratxa(dades);
  const parts = [
    `${n} ${n === 1 ? 'sessió' : 'sessions'}`,
    `ratxa de ${r} ${r === 1 ? 'setmana' : 'setmanes'}`
  ];
  if (dades.perfil.ultimaCopia) {
    const data = new Date(`${dades.perfil.ultimaCopia}T12:00:00`);
    parts.push(`còpia del ${new Intl.DateTimeFormat('ca', { day: 'numeric', month: 'long' }).format(data)}`);
  }
  return { dades, resum: parts.join(', ') };
}
