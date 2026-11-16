import { useState } from 'react';
import { listarCampos } from '../api/campos.js';
import { listarPlanes } from '../api/proyectos.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Cargando, EmptyState, ErrorState, Estado, PageHeader, Progreso } from '../components/ui.jsx';
import { useAsync } from '../hooks.js';
import { Link } from '../router.jsx';
import { ESTADO_PLAN, fmtFecha } from '../utils.js';

export default function Planes() {
  const { can } = useAuth();
  const datos = useAsync(() => Promise.all([listarPlanes(), listarCampos()]), []);
  const [estado, setEstado] = useState('');

  if (datos.loading && !datos.data) return <Cargando />;
  if (datos.error && !datos.data) return <ErrorState error={datos.error} onReintentar={datos.reload} />;

  const [planes, campos] = datos.data;
  const nombreCampo = (id) => campos.find((c) => c.id === id)?.nombre ?? `Campo ${id}`;
  const visibles = planes.filter((p) => !estado || p.estado === estado).sort((a, b) => b.id - a.id);

  return (
    <>
      <PageHeader titulo="Planes de siembra" descripcion="Cada plan siembra un cultivo en un lote y sigue sus labores hasta la cosecha.">
        {can.gestionarPlanes && (
          <Link to="/planes/nuevo" className="btn">
            Nuevo plan
          </Link>
        )}
      </PageHeader>

      <div className="barra-herramientas">
        <div className="filtros">
          <label>
            Estado
            <select value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(ESTADO_PLAN).map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          titulo={planes.length === 0 ? 'Todavía no hay planes de siembra' : 'Ningún plan con ese estado'}
          texto={planes.length === 0 && can.gestionarPlanes ? 'Creá el primero con Nuevo plan.' : undefined}
        />
      ) : (
        <div className="tabla-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Cultivo</th>
                <th scope="col">Campo y lote</th>
                <th scope="col">Siembra prevista</th>
                <th scope="col">Estado</th>
                <th scope="col">Labores</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/planes/${p.id}`} className="enlace-fila">
                      {p.cultivoNombre}
                    </Link>
                  </td>
                  <td>
                    {nombreCampo(p.campoId)}, lote {p.loteId}
                  </td>
                  <td>{fmtFecha(p.fechaSiembraPrevista)}</td>
                  <td>
                    <Estado tipo="plan" valor={p.estado} />
                  </td>
                  <td>
                    <Progreso labores={p.labores} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
