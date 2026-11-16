import { http } from './http.js';

const BASE = '/api/v1/campos';

export const listarCampos = () => http.get(BASE);
export const obtenerCampo = (id) => http.get(`${BASE}/${id}`);
export const crearCampo = (datos) => http.post(BASE, datos);
export const actualizarCampo = (id, datos) => http.put(`${BASE}/${id}`, datos);
export const eliminarCampo = (id) => http.delete(`${BASE}/${id}`);

export const listarLotes = (campoId) => http.get(`${BASE}/${campoId}/lotes`);
export const crearLote = (campoId, datos) => http.post(`${BASE}/${campoId}/lotes`, datos);
export const actualizarLote = (campoId, loteId, datos) => http.put(`${BASE}/${campoId}/lotes/${loteId}`, datos);
export const eliminarLote = (campoId, loteId) => http.delete(`${BASE}/${campoId}/lotes/${loteId}`);
