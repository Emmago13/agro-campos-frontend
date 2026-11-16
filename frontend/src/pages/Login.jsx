import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { Marca } from '../components/Layout.jsx';
import { navegar } from '../router.jsx';

const USUARIOS_DE_PRUEBA = [
  ['admin1', 'ADMIN'],
  ['agronomo1', 'AGRONOMO'],
  ['operario1', 'OPERARIO'],
];

export default function Login() {
  const { login } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await login(usuario.trim(), clave);
      navegar('/', { reemplazar: true });
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <section className="login-panel" aria-hidden="true">
        <svg viewBox="0 0 100 120" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="sin-asignar" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="3" height="3" fill="#1b4a40" />
              <line x1="0" y1="0" x2="0" y2="3" stroke="#2f6e5e" strokeWidth="0.7" />
            </pattern>
          </defs>
          <g stroke="#14352e" strokeWidth="0.9">
            <rect x="0" y="0" width="46" height="58" fill="#7b5a3c" />
            <rect x="46" y="0" width="32" height="34" fill="#a77f4f" />
            <rect x="78" y="0" width="22" height="58" fill="#93a06b" />
            <rect x="46" y="34" width="32" height="24" fill="#cdb07c" />
            <rect x="0" y="58" width="38" height="62" fill="#5d7d77" />
            <rect x="38" y="58" width="62" height="36" fill="#a77f4f" />
            <rect x="38" y="94" width="34" height="26" fill="url(#sin-asignar)" />
            <rect x="72" y="94" width="28" height="26" fill="#7b5a3c" />
          </g>
        </svg>
      </section>

      <main className="login-form">
        <div className="login-contenido">
          <p className="login-marca">
            <Marca />
            Agro Campos
          </p>
          <h1>Ingresá a tu cuenta</h1>
          <p className="descripcion">Campos, lotes y planes de siembra en un solo lugar.</p>

          <form onSubmit={enviar}>
            {error && (
              <div className="aviso error" role="alert">
                <p>{error}</p>
              </div>
            )}
            <div className="campo">
              <label htmlFor="usuario">Usuario</label>
              <input id="usuario" autoComplete="username" autoFocus required value={usuario} onChange={(e) => setUsuario(e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="clave">Contraseña</label>
              <input id="clave" type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
            </div>
            <button type="submit" className="btn grande" disabled={enviando}>
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <details className="usuarios-prueba">
            <summary>Usuarios de desarrollo</summary>
            <p>El realm importado trae tres usuarios. La contraseña es igual al usuario.</p>
            <ul>
              {USUARIOS_DE_PRUEBA.map(([u, rol]) => (
                <li key={u}>
                  <button
                    type="button"
                    className="btn link"
                    onClick={() => {
                      setUsuario(u);
                      setClave(u);
                    }}
                  >
                    {u}
                  </button>
                  <span>{rol}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </main>
    </div>
  );
}
