import { useState } from 'react';
import { ApiError } from '../api/http.js';
import { Modal } from './ui.jsx';

/*
 * Formulario en un diálogo, armado a partir de una descripción de campos:
 *
 *   { name, label, type, required, ayuda, opciones, ... }
 *
 * type:
 *   'text' | 'number' | 'date' | 'textarea'
 *   'select'      -> opciones: [{ value, label }]  (o una función (valores) => [...] si dependen de otro campo)
 *   'multicheck'  -> opciones: [{ value, label }], el valor es un array
 *   'lista'       -> lista ordenada de textos (por ejemplo las labores de un cultivo)
 * Opciones extra: step, min, entero (number sin decimales), numerico (el select devuelve Number), sugerencias, placeholder.
 *
 * onSubmit recibe el objeto listo para mandar a la API. Si lanza un ApiError, los mensajes por campo
 * que devuelve el backend se muestran debajo de cada campo.
 */

function valorInicial(campo, inicial) {
  const v = inicial[campo.name];
  if (campo.type === 'multicheck' || campo.type === 'lista') return Array.isArray(v) ? [...v] : [];
  return v === null || v === undefined ? '' : String(v);
}

function armarPayload(campos, valores) {
  const payload = {};
  for (const c of campos) {
    const v = valores[c.name];
    if (c.type === 'number') {
      payload[c.name] = v === '' ? null : Number(v);
    } else if (c.type === 'select') {
      payload[c.name] = v === '' ? null : c.numerico ? Number(v) : v;
    } else if (c.type === 'lista') {
      payload[c.name] = v.map((x) => x.trim()).filter(Boolean);
    } else if (c.type === 'multicheck') {
      payload[c.name] = v;
    } else {
      const texto = v.trim();
      payload[c.name] = texto === '' ? null : texto;
    }
  }
  return payload;
}

export default function FormDialog({ titulo, campos, inicial = {}, onSubmit, onClose, guardar = 'Guardar', ancho = '32rem' }) {
  const [valores, setValores] = useState(() =>
    Object.fromEntries(campos.map((c) => [c.name, valorInicial(c, inicial)])),
  );
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // `reinicia: ['otroCampo']` en la descripción de un campo vacía esos campos cuando este cambia
  // (por ejemplo, al cambiar la plaga se vuelve a elegir el agroquímico).
  const poner = (name, valor) =>
    setValores((actual) => {
      const siguiente = { ...actual, [name]: valor };
      campos.find((c) => c.name === name)?.reinicia?.forEach((otro) => {
        siguiente[otro] = '';
      });
      return siguiente;
    });

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    setMensaje(null);
    try {
      await onSubmit(armarPayload(campos, valores));
    } catch (err) {
      if (err instanceof ApiError) {
        setErrores(err.fields ?? {});
        setMensaje(err.message);
      } else {
        setMensaje('Ocurrió un error inesperado.');
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={titulo} onClose={onClose} ancho={ancho}>
      <form onSubmit={enviar} noValidate={false}>
        {mensaje && (
          <div className="aviso error" role="alert">
            <p>{mensaje}</p>
          </div>
        )}
        {campos.map((c) => (
          <Campo key={c.name} campo={c} valores={valores} poner={poner} error={errores[c.name]} />
        ))}
        <footer className="modal-pie">
          <button type="button" className="btn sec" onClick={onClose} disabled={enviando}>
            Cancelar
          </button>
          <button type="submit" className="btn" disabled={enviando}>
            {enviando ? 'Guardando…' : guardar}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function Campo({ campo, valores, poner, error }) {
  const { name, label, type = 'text', required, ayuda } = campo;
  const valor = valores[name];
  const id = `campo-${name}`;
  const comun = { id, name, required, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : undefined };

  let control;
  if (type === 'textarea') {
    control = <textarea {...comun} rows={3} value={valor} onChange={(e) => poner(name, e.target.value)} placeholder={campo.placeholder} />;
  } else if (type === 'select') {
    const opciones = typeof campo.opciones === 'function' ? campo.opciones(valores) : campo.opciones;
    control = (
      <select {...comun} value={valor} onChange={(e) => poner(name, e.target.value)}>
        <option value="">Elegí una opción</option>
        {opciones.map((o) => (
          <option key={o.value} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (type === 'multicheck') {
    return (
      <fieldset className="campo">
        <legend>
          {label}
          {required && <span className="req"> *</span>}
        </legend>
        <div className="checks">
          {campo.opciones.map((o) => (
            <label key={o.value} className="check">
              <input
                type="checkbox"
                checked={valor.includes(o.value)}
                onChange={(e) =>
                  poner(name, e.target.checked ? [...valor, o.value] : valor.filter((x) => x !== o.value))
                }
              />
              {o.label}
            </label>
          ))}
        </div>
        {ayuda && <p className="ayuda">{ayuda}</p>}
        {error && (
          <p className="error-campo" id={`${id}-error`}>
            {error}
          </p>
        )}
      </fieldset>
    );
  } else if (type === 'lista') {
    return (
      <div className="campo">
        <label htmlFor={`${id}-nueva`}>{label}</label>
        <ListaEditable valor={valor} onChange={(v) => poner(name, v)} sugerencias={campo.sugerencias} id={`${id}-nueva`} />
        {ayuda && <p className="ayuda">{ayuda}</p>}
        {error && (
          <p className="error-campo" id={`${id}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  } else {
    control = (
      <input
        {...comun}
        type={type}
        value={valor}
        step={type === 'number' ? (campo.entero ? 1 : (campo.step ?? 'any')) : undefined}
        min={campo.min}
        placeholder={campo.placeholder}
        list={campo.sugerencias ? `${id}-sugerencias` : undefined}
        onChange={(e) => poner(name, e.target.value)}
      />
    );
  }

  return (
    <div className="campo">
      <label htmlFor={id}>
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {control}
      {campo.sugerencias && (
        <datalist id={`${id}-sugerencias`}>
          {campo.sugerencias.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      {ayuda && <p className="ayuda">{ayuda}</p>}
      {error && (
        <p className="error-campo" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Lista ordenada de textos con alta, baja y reordenamiento. */
function ListaEditable({ valor, onChange, sugerencias = [], id }) {
  const [nuevo, setNuevo] = useState('');

  function agregar() {
    const texto = nuevo.trim();
    if (!texto) return;
    onChange([...valor, texto]);
    setNuevo('');
  }

  function mover(i, delta) {
    const j = i + delta;
    if (j < 0 || j >= valor.length) return;
    const copia = [...valor];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onChange(copia);
  }

  return (
    <div className="lista-editable">
      {valor.length > 0 && (
        <ol>
          {valor.map((item, i) => (
            <li key={`${item}-${i}`}>
              <span>{item}</span>
              <span className="lista-acciones">
                <button type="button" className="icono" aria-label={`Subir ${item}`} onClick={() => mover(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button type="button" className="icono" aria-label={`Bajar ${item}`} onClick={() => mover(i, 1)} disabled={i === valor.length - 1}>
                  ↓
                </button>
                <button type="button" className="icono" aria-label={`Quitar ${item}`} onClick={() => onChange(valor.filter((_, k) => k !== i))}>
                  ×
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="lista-nueva">
        <input
          id={id}
          type="text"
          value={nuevo}
          list={`${id}-datos`}
          placeholder="Escribí una labor y presioná Enter"
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregar();
            }
          }}
        />
        <datalist id={`${id}-datos`}>
          {sugerencias.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button type="button" className="btn sec" onClick={agregar}>
          Agregar labor
        </button>
      </div>
    </div>
  );
}
