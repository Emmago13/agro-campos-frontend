// Router mínimo basado en el hash de la URL (#/campos/3). Alcanza para esta app, no necesita
// dependencias y se lee de punta a punta. Si más adelante preferís react-router-dom, solo hay
// que reemplazar este archivo: Router, Link, NavLink, useParams y navegar.
import { createContext, useContext, useEffect, useState } from 'react';

const RutaContext = createContext({ params: {}, path: '/' });

function leerHash() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [path] = hash.split('?');
  const limpio = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return limpio || '/';
}

function coincide(patron, path) {
  const a = patron.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

export function navegar(hacia, { reemplazar = false } = {}) {
  if (reemplazar) window.location.replace(`#${hacia}`);
  else window.location.hash = hacia;
}

export function usePath() {
  const [path, setPath] = useState(leerHash);
  useEffect(() => {
    const alCambiar = () => setPath(leerHash());
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);
  return path;
}

/** rutas: [{ path: '/campos/:id', element: <CampoDetalle /> }] (la primera que coincide gana) */
export function Router({ rutas, noEncontrada }) {
  const path = usePath();
  for (const ruta of rutas) {
    const params = coincide(ruta.path, path);
    if (params) {
      return <RutaContext.Provider value={{ params, path }}>{ruta.element}</RutaContext.Provider>;
    }
  }
  return noEncontrada;
}

export const useParams = () => useContext(RutaContext).params;

export function Link({ to, children, ...resto }) {
  return (
    <a href={`#${to}`} {...resto}>
      {children}
    </a>
  );
}

export function NavLink({ to, end = false, className = '', children, ...resto }) {
  const path = usePath();
  const activo = path === to || (!end && path.startsWith(`${to}/`));
  return (
    <a
      href={`#${to}`}
      className={`${className}${activo ? ' activo' : ''}`}
      aria-current={activo ? 'page' : undefined}
      {...resto}
    >
      {children}
    </a>
  );
}
