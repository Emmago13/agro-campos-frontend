// Sesión contra Keycloak, fuera de React para que la use también el cliente HTTP.
//
// Flujo: el usuario escribe usuario y contraseña, y le pedimos el token a Keycloak con el
// "password grant" (el cliente agro-campos-client del realm tiene "Direct access grants" activo).
// Guardamos el access token (dura 5 minutos) y el refresh token, y renovamos solo antes de
// que venza. Nunca guardamos la contraseña.
//
// Para producción lo recomendable es Authorization Code + PKCE (keycloak-js), que requiere
// habilitar "Standard flow" y las redirect URIs en el cliente. Ver README del front.
import { CLIENT_ID, LOGOUT_URL, TOKEN_URL } from '../config.js';

const CLAVE = 'agro.sesion';
const MARGEN_MS = 15_000; // renovar el token si le quedan menos de 15 segundos

let sesion = leer();
const oyentes = new Set();

function leer() {
  try {
    const crudo = sessionStorage.getItem(CLAVE);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

function guardar(nueva) {
  sesion = nueva;
  try {
    if (nueva) sessionStorage.setItem(CLAVE, JSON.stringify(nueva));
    else sessionStorage.removeItem(CLAVE);
  } catch {
    /* sin storage: la sesión vive solo en memoria */
  }
  oyentes.forEach((fn) => fn(sesion));
}

export const getSesion = () => sesion;

export function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export function decodificarJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function desdeRespuesta(t) {
  const claims = decodificarJwt(t.access_token);
  const ahora = Date.now();
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiraEn: ahora + t.expires_in * 1000,
    username: claims.preferred_username,
    nombre: claims.name || claims.preferred_username,
    roles: claims.realm_access?.roles ?? [],
  };
}

async function pedirToken(parametros) {
  let res;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, ...parametros }),
    });
  } catch {
    const err = new Error(
      'No se pudo conectar con Keycloak. Verificá que esté corriendo en el puerto 8081 (docker compose up -d).',
    );
    err.codigo = 'red';
    throw err;
  }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      datos.error === 'invalid_grant'
        ? 'Usuario o contraseña incorrectos.'
        : datos.error_description || 'No se pudo iniciar sesión.',
    );
    err.codigo = datos.error;
    throw err;
  }
  return datos;
}

export async function iniciarSesion(usuario, clave) {
  const datos = await pedirToken({ grant_type: 'password', username: usuario, password: clave });
  guardar(desdeRespuesta(datos));
}

let renovando = null;

export function renovar() {
  if (!sesion?.refreshToken) return Promise.reject(new Error('Sesión vencida.'));
  if (!renovando) {
    renovando = pedirToken({ grant_type: 'refresh_token', refresh_token: sesion.refreshToken })
      .then((datos) => guardar(desdeRespuesta(datos)))
      .catch((err) => {
        guardar(null); // el refresh token venció o fue revocado: hay que volver a ingresar
        throw err;
      })
      .finally(() => {
        renovando = null;
      });
  }
  return renovando;
}

/** Devuelve un access token vigente (renovándolo si hace falta) o null si no hay sesión. */
export async function tokenVigente() {
  if (!sesion) return null;
  if (Date.now() > sesion.expiraEn - MARGEN_MS) await renovar();
  return sesion?.accessToken ?? null;
}

export async function cerrarSesion() {
  const anterior = sesion;
  guardar(null);
  if (anterior?.refreshToken) {
    try {
      await fetch(LOGOUT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: CLIENT_ID, refresh_token: anterior.refreshToken }),
      });
    } catch {
      /* si Keycloak no responde, igual cerramos la sesión local */
    }
  }
}
