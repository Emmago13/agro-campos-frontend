import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(() => {});

/** const avisar = useToast(); avisar('Campo creado'); avisar('No se pudo guardar', 'error'); */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([]);

  const quitar = useCallback((id) => setAvisos((lista) => lista.filter((a) => a.id !== id)), []);

  const avisar = useCallback(
    (texto, tipo = 'ok') => {
      const id = `${Date.now()}-${Math.random()}`;
      setAvisos((lista) => [...lista, { id, texto, tipo }]);
      setTimeout(() => quitar(id), tipo === 'error' ? 7000 : 4000);
    },
    [quitar],
  );

  return (
    <ToastContext.Provider value={avisar}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso-flotante ${a.tipo}`}>
            <span>{a.texto}</span>
            <button type="button" className="icono" aria-label="Cerrar aviso" onClick={() => quitar(a.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
