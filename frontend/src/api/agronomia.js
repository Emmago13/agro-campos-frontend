import { http } from './http.js';

const BASE = '/api/v1/agronomia';

function crud(recurso) {
  const ruta = `${BASE}/${recurso}`;
  return {
    listar: (params) => http.get(ruta, params),
    obtener: (id) => http.get(`${ruta}/${id}`),
    crear: (datos) => http.post(ruta, datos),
    actualizar: (id, datos) => http.put(`${ruta}/${id}`, datos),
    eliminar: (id) => http.delete(`${ruta}/${id}`),
  };
}

export const cultivos = crud('cultivos');
export const plagas = crud('plagas');
export const agroquimicos = crud('agroquimicos');
// listar({ plagaId, cultivoId }) admite filtros opcionales
export const tratamientos = crud('tratamientos');
