import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Ejecuta una función asíncrona al montar y cada vez que cambian las dependencias.
 *   const { data, loading, error, reload } = useAsync(() => listarCampos(), []);
 * Mientras recarga conserva los datos anteriores para que la pantalla no parpadee.
 */
export function useAsync(funcion, dependencias) {
  const [estado, setEstado] = useState({ data: null, loading: true, error: null });
  const [version, setVersion] = useState(0);
  const funcionRef = useRef(funcion);
  funcionRef.current = funcion;

  useEffect(() => {
    let vigente = true;
    setEstado((e) => ({ ...e, loading: true, error: null }));
    Promise.resolve()
      .then(() => funcionRef.current())
      .then((data) => vigente && setEstado({ data, loading: false, error: null }))
      .catch((error) => vigente && setEstado((e) => ({ ...e, loading: false, error })));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...estado, reload };
}
