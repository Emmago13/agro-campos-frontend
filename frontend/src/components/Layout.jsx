import { useAuth } from '../auth/AuthContext.jsx';
import { NavLink } from '../router.jsx';
import { etiqueta } from '../utils.js';

export function Marca() {
  // Cuatro parcelas de colores de tierra: el mismo lenguaje del plano de lotes.
  return (
    <svg className="marca-icono" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" fill="#a77f4f" />
      <rect x="15" y="2" width="7" height="12" fill="#93a06b" />
      <rect x="2" y="15" width="7" height="7" fill="#cdb07c" />
      <rect x="10" y="15" width="12" height="7" fill="#5d7d77" />
    </svg>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <aside className="riel">
        <a className="marca" href="#/">
          <Marca />
          <span>Agro Campos</span>
        </a>

        <nav aria-label="Secciones">
          <NavLink to="/" end>
            Inicio
          </NavLink>
          <NavLink to="/campos">Campos y lotes</NavLink>
          <NavLink to="/catalogo">Catálogo agronómico</NavLink>
          <NavLink to="/planes">Planes de siembra</NavLink>
        </nav>

        <div className="usuario">
          <strong>{user.nombre}</strong>
          <span>{etiqueta(user.rol)}</span>
          <button type="button" className="btn-riel" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main id="contenido">{children}</main>
    </div>
  );
}
