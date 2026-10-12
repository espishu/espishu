/* icones.js — icones de línia (traç de 2 px, extrems arrodonits). Hereten el color del text. */

const TRACATS = {
  /* activitats */
  casa: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
  gimnas: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  caminar: '<circle cx="13" cy="4.5" r="1.8"/><path d="M12.5 8 10.5 14l3 3v4.5M10.5 14 8 21M12 9l-3.5 3M12.5 9.5l2.5 3 3 .5"/>',
  correr: '<circle cx="15" cy="4.5" r="1.8"/><path d="M14 8.5 11 13l3.5 2.5-1.5 5.5M11 13l-3.5 6.5M13.5 8.5 9 9.5 7 12.5M14 9l2.5 3.5 3.5-.5"/>',
  bici: '<circle cx="6" cy="16.5" r="3.5"/><circle cx="18" cy="16.5" r="3.5"/><path d="m6 16.5 4-7.5h5.5L18 16.5M10 9l2.5 7.5H6M14.5 5.5H17l-1.5 3.5"/>',
  natacio: '<circle cx="16.5" cy="6" r="1.8"/><path d="m5 12.5 4.5-3.5 3 2.5 2.5-1.5"/><path d="M2.5 16.5c1.6 0 1.6-1.2 3.2-1.2s1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3 1.2M2.5 20.5c1.6 0 1.6-1.2 3.2-1.2s1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3.2 1.2 1.6-1.2 3.2-1.2 1.6 1.2 3 1.2"/>',
  /* interfície */
  llista: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.5" cy="6.5" r=".6"/><circle cx="4.5" cy="12" r=".6"/><circle cx="4.5" cy="17.5" r=".6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  mes: '<path d="M12 5v14M5 12h14"/>',
  menys: '<path d="M5 12h14"/>',
  tancar: '<path d="M6 6l12 12M18 6 6 18"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  pausa: '<path d="M9 5.5v13M15 5.5v13"/>',
  saltar: '<path d="M5 6v12l9-6zM18 6v12"/>',
  dolor: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  rellotge: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
  enrere: '<path d="M15 5 8 12l7 7"/>',
  endavant: '<path d="m9 5 7 7-7 7"/>',
  amunt: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  avall: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  canvia: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
  paperera: '<path d="M4 7h16M10 7V4.5h4V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>',
  cerca: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  compartir: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M8.5 10.5H6.5a1.5 1.5 0 0 0-1.5 1.5v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5h-2"/>',
  afegir: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>',
  mobil: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  salut: '<path d="M12 20.5s-8-4.6-8-10.4A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 8 2.5c0 5.8-8 10.4-8 10.4z"/>',
  campana: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  calendari: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  desa: '<path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5"/><path d="M4.5 16v2.5A2 2 0 0 0 6.5 20.5h11a2 2 0 0 0 2-2V16"/>',
  restaura: '<path d="M12 14.5v-11M7.5 8 12 3.5 16.5 8"/><path d="M4.5 16v2.5A2 2 0 0 0 6.5 20.5h11a2 2 0 0 0 2-2V16"/>',
  /* temàtica del bosc */
  brot: '<path d="M12 21v-8.5"/><path d="M12 12.5C12 9 9.4 6.5 5.5 6.5c0 3.6 2.7 6 6.5 6z"/><path d="M12 10.5c0-3.3 2.4-5.5 6.5-5.5 0 3.4-2.5 5.5-6.5 5.5z"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.75v.01"/>',
  llapis: '<path d="M4.5 19.5 5.5 15 15.5 5a2.1 2.1 0 0 1 3 3l-10 10z"/><path d="m13.5 7 3 3"/>',
  ajustos: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  /* comptes */
  ull: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  'ull-tancat': '<path d="M4 4l16 16M9.9 6A10 10 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.5 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  usuari: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  clau: '<circle cx="8" cy="15" r="4.5"/><path d="m11.2 11.8 8.8-8.8M16 7l2.5 2.5M18.5 4.5 21 7"/>',
  nuvol: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.6a4 4 0 0 1-.5 9.9"/><path d="M12 20.5v-7M9.2 16 12 13.2l2.8 2.8"/>',
  sortir: '<path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14M10 16.5 5.5 12 10 7.5M5.5 12h10"/>',
  flama: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.6 3.9-8.3.4 1.9 1.4 3.1 2.6 3.7.3-2.6 1.5-5 3.4-6.7-.3 2.9.9 4.6 2.2 6.4 1 1.4 1.9 3 1.9 4.9 0 3.6-3 6.2-7.5 6.2z"/>'
};

/* Retorna l'SVG d'una icona. `classe` permet canviar-ne la mida amb CSS. */
export function icona(nom, classe = 'icona') {
  return `<svg class="${classe}" viewBox="0 0 24 24" aria-hidden="true">${TRACATS[nom] ?? ''}</svg>`;
}
