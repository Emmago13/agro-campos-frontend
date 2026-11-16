import { http } from './http.js';

const BASE = '/api/v1/proyectos';

export const listarPlanes = (estado) => http.get(`${BASE}/planes`, { estado });
export const obtenerPlan = (id) => http.get(`${BASE}/planes/${id}`);
export const planesDeLote = (loteId) => http.get(`${BASE}/lotes/${loteId}/planes`);

// { campoId, loteId, cultivoId, fechaSiembraPrevista: 'YYYY-MM-DD' }
export const crearPlan = (datos) => http.post(`${BASE}/planes`, datos);

// Hoy la única transición que acepta la API para un plan es CANCELADO.
export const cancelarPlan = (id) => http.patch(`${BASE}/planes/${id}`, { estado: 'CANCELADO' });

// estado: 'EN_EJECUCION' | 'COMPLETADA'. Para iniciar una fumigación hay que mandar tratamientoId.
export const actualizarLabor = (planId, laborId, datos) =>
  http.patch(`${BASE}/planes/${planId}/labores/${laborId}`, datos);
