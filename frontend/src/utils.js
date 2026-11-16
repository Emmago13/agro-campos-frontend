// Formatos y etiquetas compartidas por todas las pantallas.

export const SUELOS = ['TIPO_1', 'TIPO_2', 'TIPO_3', 'TIPO_4', 'TIPO_5'];

// Un color de tierra por tipo de suelo; se usa en el plano de lotes y en las referencias.
export const COLOR_SUELO = {
  TIPO_1: '#7b5a3c',
  TIPO_2: '#a77f4f',
  TIPO_3: '#cdb07c',
  TIPO_4: '#93a06b',
  TIPO_5: '#5d7d77',
};

export function textoSobre(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1b2b26' : '#ffffff';
}

/** 'TIPO_1' -> 'Tipo 1', 'INSECTO' -> 'Insecto' */
export function etiqueta(valor) {
  if (!valor) return '—';
  const texto = String(valor).toLowerCase().replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export const ESTADO_PLAN = {
  PLANIFICADO: 'Planificado',
  EN_CURSO: 'En curso',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

export const ESTADO_LABOR = {
  PENDIENTE: 'Pendiente',
  EN_EJECUCION: 'En ejecución',
  COMPLETADA: 'Completada',
};

export const esPlanActivo = (plan) => plan.estado === 'PLANIFICADO' || plan.estado === 'EN_CURSO';

// Cada tipo de plaga solo lo combate un tipo de agroquímico (regla RN-TRA-04 del backend).
export const AGROQUIMICO_PARA_PLAGA = {
  INSECTO: 'INSECTICIDA',
  HONGO: 'FUNGICIDA',
  MALEZA: 'HERBICIDA',
};

const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

export const fmtNum = (n) => (n === null || n === undefined ? '—' : numero.format(n));
export const fmtHa = (n) => (n === null || n === undefined ? '—' : `${numero.format(n)} ha`);

// El backend manda LocalDateTime con nanosegundos y sin zona; recortamos a milisegundos.
const aFecha = (iso) => {
  if (!iso) return null;
  if (iso.length === 10) return new Date(`${iso}T00:00:00`);
  return new Date(iso.replace(/(\.\d{3})\d+/, '$1'));
};

export function fmtFecha(iso) {
  const d = aFecha(iso);
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('es-AR') : '—';
}

export function fmtFechaHora(iso) {
  const d = aFecha(iso);
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : '—';
}

/** Fecha de hoy como YYYY-MM-DD (hora local), para el atributo min de <input type="date"> */
export function hoy() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export const primerNombre = (nombre) => (nombre ?? '').split(' ')[0];
