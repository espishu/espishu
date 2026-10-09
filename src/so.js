/*
 * so.js — un xiulet curt i suau en acabar un descans o un compte enrere.
 * L'iPhone només deixa fer sons si l'àudio s'ha activat amb un toc: crida activaSo() des d'un clic.
 */

let ctx = null;

export function activaSo() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    ctx ??= new Context();
    if (ctx.state === 'suspended') ctx.resume();
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
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  to(880, t, 0.18);
  if (!curt) to(1175, t + 0.2, 0.28);
}
