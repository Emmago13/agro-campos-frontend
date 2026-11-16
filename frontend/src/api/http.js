import { API_BASE } from '../config.js';
import { getSesion, renovar, tokenVigente } from '../auth/session.js';

/**
 * Error de la API ya normalizado.
 *  - status: código HTTP (0 si no hubo conexión)
 *  - message: texto listo para mostrar
 *  - fields: { campo: "mensaje" } cuando es un error de validación
 */
export class ApiError extends Error {
  constructor(status, message, fields = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

const MENSAJES = {
  401: 'Tu sesión venció. Ingresá de nuevo.',
  403: 'Tu rol no permite realizar esta acción.',
  404: 'No se encontró lo que buscabas.',
  502: 'Un servicio no está disponible en este momento.',
  503: 'Un servicio no está disponible en este momento.',
  504: 'Un servicio tardó demasiado en responder.',
};

// campos-service responde { message, errors }; agronomia y proyectos responden { mensaje, errores }.
// bda-commons va a unificarlos; mientras tanto leemos los dos formatos.
function normalizar(status, cuerpo) {
  const fields = cuerpo?.errores ?? cuerpo?.errors ?? null;
  const hayCampos = fields && Object.keys(fields).length > 0;
  let mensaje = cuerpo?.mensaje ?? cuerpo?.message;
  if (!mensaje || mensaje === 'Datos inválidos') {
    mensaje = hayCampos ? 'Revisá los datos del formulario.' : (MENSAJES[status] ?? `Error inesperado (HTTP ${status}).`);
  }
  return new ApiError(status, mensaje, hayCampos ? fields : null);
}

function conParametros(ruta, params) {
  if (!params) return ruta;
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  });
  const texto = q.toString();
  return texto ? `${ruta}?${texto}` : ruta;
}

async function pedir(metodo, ruta, { cuerpo, params, reintentar = true } = {}) {
  let token;
  try {
    token = await tokenVigente();
  } catch {
    throw new ApiError(401, MENSAJES[401]);
  }

  let res;
  try {
    res = await fetch(API_BASE + conParametros(ruta, params), {
      method: metodo,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Verificá que el gateway esté corriendo en el puerto 8080.');
  }

  // El token pudo vencer justo en el viaje: renovamos y reintentamos una sola vez.
  if (res.status === 401 && reintentar && getSesion()) {
    try {
      await renovar();
    } catch {
      throw new ApiError(401, MENSAJES[401]);
    }
    return pedir(metodo, ruta, { cuerpo, params, reintentar: false });
  }

  if (res.status === 204) return null;

  const texto = await res.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    /* cuerpo que no es JSON */
  }

  if (!res.ok) throw normalizar(res.status, datos);
  return datos;
}

export const http = {
  get: (ruta, params) => pedir('GET', ruta, { params }),
  post: (ruta, cuerpo) => pedir('POST', ruta, { cuerpo }),
  put: (ruta, cuerpo) => pedir('PUT', ruta, { cuerpo }),
  patch: (ruta, cuerpo) => pedir('PATCH', ruta, { cuerpo }),
  delete: (ruta) => pedir('DELETE', ruta),
};
