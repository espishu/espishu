/*
 * so.js — un xiulet curt i suau en acabar un descans o un compte enrere.
 * L'iPhone només deixa fer sons si l'àudio s'ha activat amb un toc: crida activaSo() des d'un clic.
 * Un sol AudioContext per a tota l'app. Tot falla en silenci als navegadors que no ho suporten.
 */

let ctx = null;

/*
 * 'ambient': els xiulets es barregen amb la música d'altres apps (Spotify, pòdcasts) i no l'aturen
 * (Safari 16.4 o més nou). En mode silenci no sonen.
 */
function posaSessioAudio() {
  try {
    if (navigator.audioSession && navigator.audioSession.type !== 'ambient') navigator.audioSession.type = 'ambient';
  } catch { /* no hi és */ }
}

/* iOS deixa el context "suspended" o "interrupted" (trucada, segon pla, una altra app): el reprèn. */
function repren() {
  try {
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') return ctx.resume().catch(() => {});
  } catch { /* res a fer */ }
  return Promise.resolve();
}

export function activaSo() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    posaSessioAudio();
    ctx ??= new Context();
    repren();
    // Un so buit dins el toc desbloqueja l'àudio a iOS.
    const buit = ctx.createBufferSource();
    buit.buffer = ctx.createBuffer(1, 1, 22050);
    buit.connect(ctx.destination);
    buit.start(0);
  } catch { /* sense so */ }
}

function to(frequencia, inici, durada) {
  const osc = ctx.createOscillator(), volum = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequencia;
  volum.gain.setValueAtTime(0, inici);
  volum.gain.linearRampToValueAtTime(0.18, inici + 0.02);
  volum.gain.exponentialRampToValueAtTime(0.001, inici + durada);
  osc.connect(volum).connect(ctx.destination);
  osc.start(inici);
  osc.stop(inici + durada + 0.05);
}

/* Dues notes curtes. `curt` en fa només una (per avisar de canviar de costat). */
export function xiulet(curt = false) {
  if (!ctx) return;
  const sona = () => {
    try {
      if (ctx.state !== 'running') return;
      const t = ctx.currentTime;
      to(880, t, 0.18);
      if (!curt) to(1175, t + 0.2, 0.28);
    } catch { /* sense so */ }
  };
  if (ctx.state === 'running') sona();
  else repren().then(sona);
}

/* En tornar a l'app, l'àudio es reprèn sol (només si ja s'havia activat amb un toc). */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && ctx) { posaSessioAudio(); repren(); }
});
