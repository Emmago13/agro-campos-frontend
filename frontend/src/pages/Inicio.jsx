import { cultivos as apiCultivos } from '../api/agronomia.js';
import { listarCampos } from '../api/campos.js';
import { listarPlanes } from '../api/proyectos.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Cargando, EmptyState, ErrorState, Estado, PageHeader, Progreso } from '../components/ui.jsx';
import { useAsync } from '../hooks.js';
import { Link } from '../router.jsx';
import { esPlanActivo, etiqueta, fmtFecha, fmtNum, primerNombre } from '../utils.js';

export default function Inicio() {
  const { user, can } = useAuth();
  const datos = useAsync(() => Promise.all([listarCampos(), apiCultivos.listar(), listarPlanes()]), []);

  if (datos.loading && !datos.data) return <Cargando />;
  if (datos.error && !datos.data) return <ErrorState error={datos.error} onReintentar={datos.reload} />;

  const [campos, cultivos, planes] = datos.data;
  const activos = planes.filter(esPlanActivo);
  const superficie = campos.reduce((a, c) => a + (c.superficieTotalHas || 0), 0);
  const nombreCampo = (id) => campos.find((c) => c.id === id)?.nombre ?? `Campo ${id}`;

  return (
    <>
      <PageHeader titulo={`Hola, ${primerNombre(user.nombre)}`} descripcion={user.descripcion} />

      <p className="resumen">
        Hay <strong>{fmtNum(campos.length)}</strong> {campos.length === 1 ? 'campo' : 'campos'} con{' '}
        <strong>{fmtNum(superficie)} ha</strong>, <strong>{fmtNum(cultivos.length)}</strong>{' '}
        {cultivos.length === 1 ? 'cultivo' : 'cultivos'} en el catálogo y{' '}
        <strong>{fmtNum(activos.length)}</strong> {activos.length === 1 ? 'plan activo' : 'planes activos'}.
      </p>

      <section aria-labelledby="titulo-activos">
        <div className="seccion-titulo">
          <h2 id="titulo-activos">Planes activos</h2>
          <Link to="/planes">Ver todos los planes</Link>
        </div>

        {activos.length === 0 ? (
          <EmptyState
            titulo="No hay planes activos"
            texto={
              can.gestionarPlanes
                ? 'Creá un plan de siembra para empezar a registrar labores.'
                : 'Cuando un agrónomo cree un plan de siembra, vas a ver acá las labores para hacer.'
            }
          >
            {can.gestionarPlanes && (
              <Link to="/planes/nuevo" className="btn">
                Nuevo plan
              </Link>
            )}
          </EmptyState>
        ) : (
          <ul className="filas">
            {activos.map((plan) => {
              const siguiente = plan.labores.find((l) => l.estado !== 'COMPLETADA');
              return (
                <li key={plan.id}>
                  <Link to={`/planes/${plan.id}`} className="fila-plan">
                    <div>
                      <strong>{plan.cultivoNombre}</strong>
                      <span className="sub">
                        {nombreCampo(plan.campoId)}, lote {plan.loteId} · siembra {fmtFecha(plan.fechaSiembraPrevista)}
                      </span>
                    </div>
                    <Estado tipo="plan" valor={plan.estado} />
                    <Progreso labores={plan.labores} />
                    <span className="sub">
                      {siguiente
                        ? `${siguiente.estado === 'EN_EJECUCION' ? 'En ejecución' : 'Sigue'}: ${etiqueta(siguiente.nombre)}`
                        : 'Sin labores pendientes'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
