/*
 * tema.js — peces de la temàtica "L'arbre" (PLA.md, secció 13) que comparteixen les pantalles.
 * L'arbre es dibuixa amb src/arbre.js (no es modifica). Aquí només es decideix què se li passa.
 */
import { renderArbre, etapaArbre, estacio } from './arbre.js';
import { compta, setmana } from './ratxa.js';
import { icona } from './icones.js';

export const NOMS_ESTACIO = { primavera: 'Primavera', estiu: 'Estiu', tardor: 'Tardor', hivern: 'Hivern' };

/* Posa l'estació a <html> perquè el CSS triï --se i --se-soft. */
export function aplicaEstacio(data = new Date()) {
  document.documentElement.dataset.estacio = estacio(data);
}

export function esFosc() {
  const tema = document.documentElement.dataset.theme;
  if (tema) return tema === 'dark';
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

/* L'arbre creix amb les sessions que compten per a la ratxa (fetes i no acabades). */
export function sessionsArbre(estat) {
  return estat.sessions.filter(compta).length;
}

export function etapa(estat) {
  return etapaArbre(sessionsArbre(estat));
}

export function htmlArbre(estat, { data = new Date(), sessions = sessionsArbre(estat) } = {}) {
  return renderArbre({ sessions, data, fosc: esFosc() });
}

/* Etiqueta petita amb l'estació: icona de fulla + "Tardor". */
export function htmlEstacio(data = new Date()) {
  return `<span class="etiqueta-estacio">${icona('fulla')}${NOMS_ESTACIO[estacio(data)]}</span>`;
}

/*
 * Anells del tronc (13.3): un per setmana, de dins (la més antiga) cap a fora (l'actual).
 * Marró si es va complir, clar si no. L'exterior, en color d'estació si la setmana actual ja està complerta.
 * `setmanes` és el resultat de ultimesSetmanes() de ratxa.js.
 */
export function htmlAnells(setmanes) {
  const n = setmanes.length, rMin = 7, rMax = 54, pas = (rMax - rMin) / Math.max(1, n - 1);
  const anells = setmanes.map((s, i) => {
    const color = s.complerta ? (s.actual ? 'var(--se)' : 'var(--anell-ple)') : 'var(--anell-buit)';
    return `<circle class="anell" style="--i:${i}" cx="64" cy="64" r="${(rMin + i * pas).toFixed(1)}" fill="none" stroke="${color}" stroke-width="${(pas * 0.62).toFixed(1)}"/>`;
  }).join('');
  const fetes = setmanes.filter(s => s.complerta).length;
  return `
    <svg class="anells" viewBox="0 0 128 128" role="img" aria-label="Anells del tronc: ${fetes} de ${n} setmanes complertes">
      <circle cx="64" cy="64" r="61" fill="var(--anell-buit)" stroke="var(--line)" stroke-width="2.5"/>
      <circle cx="64" cy="64" r="58.5" fill="none" stroke="var(--anell-ple)" stroke-width="3"/>
      ${anells}
      <circle cx="64" cy="64" r="2.5" fill="var(--anell-ple)"/>
    </svg>`;
}

/* Gotes de la setmana: una per sessió de l'objectiu, plenes les fetes, i "1 de 2". */
export function htmlGotes(estat, ara = new Date()) {
  const { fetes, objectiu, extra } = setmana(estat, ara);
  const gotes = Array.from({ length: objectiu }, (_, i) =>
    `<span class="gota${i < fetes ? ' plena' : ''}">${icona('gota')}</span>`).join('');
  return `
    <p class="gotes">
      <span class="gotes-icones" aria-hidden="true">${gotes}</span>
      <strong>${Math.min(fetes, objectiu)} de ${objectiu}</strong><span class="visually-hidden"> sessions aquesta setmana</span>
      ${extra ? `<span class="extra">+${extra}</span>` : ''}
    </p>`;
}
