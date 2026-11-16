import { useEffect, useId, useRef, useState } from 'react';
import { ESTADO_LABOR, ESTADO_PLAN, COLOR_SUELO, etiqueta, textoSobre } from '../utils.js';

export function PageHeader({ titulo, descripcion, children }) {
  return (
    <header className="encabezado">
      <div>
        <h1>{titulo}</h1>
        {descripcion && <p className="descripcion">{descripcion}</p>}
      </div>
      {children && <div className="encabezado-acciones">{children}</div>}
    </header>
  );
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <p className="cargando" role="status">
      {texto}
    </p>
  );
}

export function ErrorState({ error, onReintentar }) {
  return (
    <div className="aviso error" role="alert">
      <p>{error?.message ?? 'Ocurrió un error inesperado.'}</p>
      {onReintentar && (
        <button type="button" className="btn sec" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function EmptyState({ titulo, texto, children }) {
  return (
    <div className="vacio">
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}

/** Estado con punto de color: <Estado tipo="plan" valor="EN_CURSO" /> */
export function Estado({ tipo, valor }) {
  const textos = tipo === 'labor' ? ESTADO_LABOR : ESTADO_PLAN;
  return (
    <span className={`estado e-${String(valor).toLowerCase()}`}>
      <i aria-hidden="true" />
      {textos[valor] ?? etiqueta(valor)}
    </span>
  );
}

export function ChipSuelo({ tipo }) {
  const color = COLOR_SUELO[tipo] ?? '#999999';
  return (
    <span className="chip-suelo" style={{ background: color, color: textoSobre(color) }}>
      {etiqueta(tipo)}
    </span>
  );
}

/** Barra con un segmento por labor: ver de un vistazo cuánto del plan está hecho. */
export function Progreso({ labores = [] }) {
  const hechas = labores.filter((l) => l.estado === 'COMPLETADA').length;
  return (
    <div className="progreso" title={`${hechas} de ${labores.length} labores completadas`}>
      <div className="progreso-barra" aria-hidden="true">
        {labores.map((l) => (
          <span key={l.id} className={`seg s-${l.estado.toLowerCase()}`} />
        ))}
      </div>
      <span className="progreso-texto">
        {hechas}/{labores.length}
      </span>
    </div>
  );
}

/** Diálogo modal nativo (<dialog>): maneja foco, Escape y fondo bloqueado por el navegador. */
export function Modal({ titulo, onClose, children, ancho }) {
  const ref = useRef(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (dialogo && !dialogo.open) dialogo.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      style={ancho ? { '--ancho': ancho } : undefined}
      aria-labelledby={idTitulo}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current.close(); // clic en el fondo
      }}
    >
      <div className="modal-cuerpo">
        <header>
          <h2 id={idTitulo}>{titulo}</h2>
          <button type="button" className="icono" aria-label="Cerrar" onClick={() => ref.current.close()}>
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

export function ConfirmDialog({ titulo, texto, confirmar = 'Confirmar', cancelar = 'Cancelar', peligro, onConfirmar, onCancelar }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function aceptar() {
    setEnviando(true);
    setError(null);
    try {
      await onConfirmar();
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={titulo} onClose={onCancelar} ancho="28rem">
      <p>{texto}</p>
      {error && (
        <div className="aviso error" role="alert">
          <p>{error}</p>
        </div>
      )}
      <footer className="modal-pie">
        <button type="button" className="btn sec" onClick={onCancelar} disabled={enviando}>
          {cancelar}
        </button>
        <button type="button" className={`btn ${peligro ? 'peligro' : ''}`} onClick={aceptar} disabled={enviando}>
          {enviando ? 'Procesando…' : confirmar}
        </button>
      </footer>
    </Modal>
  );
}
