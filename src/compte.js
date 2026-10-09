/*
 * compte.js — comptes d'usuari amb Supabase (PLA.md, secció 21.4).
 *
 * L'usuari només veu "Usuari" i "Contrasenya". Internament, el nom d'usuari (sempre en
 * minúscules) es converteix en un correu inventat, <usuari>@usuaris.espishu.app, i no
 * s'envia mai cap correu.
 *
 * La llibreria (src/vendor/supabase.js, supabase-js 2.117.3, llicència MIT) es carrega
 * només quan cal: l'app s'obre amb les dades locals sense esperar-la.
 */
import { SUPABASE_URL, SUPABASE_CLAU } from './config.js';
import { emmagatzematge } from './store.js';

export const DOMINI = 'usuaris.espishu.app';
export const MIN_CONTRASENYA = 8;
const CLAU_SESSIO = 'espishu:sessio';

/* ================= Nom d'usuari ================= */

export const normalitza = text => String(text ?? '').trim().toLowerCase();

/* De 3 a 20 caràcters: a-z, 0-9, punt, guió i guió baix. Sense punt al principi ni al final, ni dos de seguits. */
export function usuariValid(usuari) {
  return /^[a-z0-9._-]{3,20}$/.test(usuari) && !/(^\.|\.$|\.\.)/.test(usuari);
}

export const correuDe = usuari => `${usuari}@${DOMINI}`;

/* ================= Errors en català ================= */

const MISSATGES = {
  credencials: 'Usuari o contrasenya incorrectes',
  existeix: 'Aquest usuari ja existeix',
  connexio: 'Sense connexió',
  intents: 'Massa intents. Espera una mica',
  actual: 'Contrasenya actual incorrecta',
  feble: 'Contrasenya massa feble',
  igual: 'Ha de ser diferent de l\'actual',
  sessio: 'Cal tornar a entrar',
  config: 'Falta configurar Supabase',
  confirmacio: 'Cal desactivar "Confirm email" a Supabase',
  error: 'No ha funcionat. Torna-ho a provar'
};

export class ErrorCompte extends Error {
  constructor(motiu) {
    super(MISSATGES[motiu] ?? MISSATGES.error);
    this.motiu = MISSATGES[motiu] ? motiu : 'error';
  }
}

/* Tradueix un error de Supabase (autenticació o base de dades) a un motiu de MISSATGES. */
export function motiuDe(error) {
  if (error instanceof ErrorCompte) return error.motiu;
  if (!navigator.onLine) return 'connexio';
  const codi = error?.code, estat = error?.status;
  if (error?.name === 'AuthRetryableFetchError' || error?.name === 'TypeError' || /fetch|network/i.test(error?.message ?? '')) return 'connexio';
  if (codi === 'invalid_credentials') return 'credencials';
  if (codi === 'user_already_exists' || codi === 'email_exists') return 'existeix';
  if (codi === 'over_request_rate_limit' || estat === 429) return 'intents';
  if (codi === 'weak_password') return 'feble';
  if (codi === 'same_password') return 'igual';
  if (codi === 'session_not_found' || codi === 'refresh_token_not_found' || codi === 'PGRST301'
    || codi === 'PGRST303' || error?.name === 'AuthSessionMissingError' || estat === 401) return 'sessio';
  return 'error';
}

/* ================= Client de Supabase ================= */

export const configurat = () => !!(SUPABASE_URL && SUPABASE_CLAU);

function carregaLlibreria() {
  if (window.supabase?.createClient) return Promise.resolve(window.supabase);
  return new Promise((resol, rebutja) => {
    const script = document.createElement('script');
    script.src = 'src/vendor/supabase.js';
    script.onload = () => resol(window.supabase);
    script.onerror = () => { script.remove(); rebutja(new ErrorCompte('connexio')); };
    document.head.append(script);
  });
}

let promesaClient = null;

/* El client de Supabase (es crea el primer cop que cal). */
export function obteClient() {
  if (!configurat()) return Promise.reject(new ErrorCompte('config'));
  if (!promesaClient) {
    promesaClient = carregaLlibreria().then(llibreria => llibreria.createClient(SUPABASE_URL, SUPABASE_CLAU, {
      auth: {
        storage: emmagatzematge,
        storageKey: CLAU_SESSIO,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }));
    promesaClient.catch(() => { promesaClient = null; });   // es tornarà a provar
  }
  return promesaClient;
}

/* ================= Entrar, crear compte, contrasenya i sortir ================= */

/* Retorna { id, usuari } o llança un ErrorCompte. */
export async function entra(text, contrasenya) {
  const usuari = normalitza(text);
  if (!usuariValid(usuari) || !contrasenya) throw new ErrorCompte('credencials');
  const sb = await obteClient();
  const { data, error } = await sb.auth.signInWithPassword({ email: correuDe(usuari), password: contrasenya });
  if (error) throw new ErrorCompte(motiuDe(error));
  return { id: data.user.id, usuari };
}

/* Crea el compte i hi entra directament (cal "Confirm email" desactivat). Retorna { id, usuari }. */
export async function creaCompte(text, contrasenya) {
  const usuari = normalitza(text);
  const sb = await obteClient();
  const { data, error } = await sb.auth.signUp({
    email: correuDe(usuari),
    password: contrasenya,
    options: { data: { usuari } }
  });
  if (error) throw new ErrorCompte(motiuDe(error));
  // Amb "Confirm email" activat, Supabase no dona cap sessió (i, si ja existia, cap identitat).
  if (!data.session) throw new ErrorCompte(data.user?.identities?.length === 0 ? 'existeix' : 'confirmacio');
  return { id: data.user.id, usuari };
}

/* Comprova primer la contrasenya actual i després posa la nova. */
export async function canviaContrasenya(usuari, actual, nova) {
  const sb = await obteClient();
  const comprova = await sb.auth.signInWithPassword({ email: correuDe(usuari), password: actual });
  if (comprova.error) {
    const motiu = motiuDe(comprova.error);
    throw new ErrorCompte(motiu === 'credencials' ? 'actual' : motiu);
  }
  const { error } = await sb.auth.updateUser({ password: nova });
  if (error) throw new ErrorCompte(motiuDe(error));
}

/*
 * Tanca la sessió en aquest aparell. Sense connexió, Supabase no esborra la sessió desada:
 * l'esborrem igualment i el client es tornarà a crear.
 */
export async function tancaSessio() {
  if (promesaClient) {
    try {
      const sb = await promesaClient;
      sb.auth.stopAutoRefresh();
      await sb.auth.signOut({ scope: 'local' });
    } catch { /* sense connexió: s'esborra a sota */ }
  }
  promesaClient = null;
  [CLAU_SESSIO, `${CLAU_SESSIO}-code-verifier`, `${CLAU_SESSIO}-user`].forEach(clau => emmagatzematge.removeItem(clau));
}
