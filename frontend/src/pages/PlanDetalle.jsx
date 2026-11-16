import { useEffect, useState } from 'react';
import { tratamientos } from '../api/agronomia.js';
import { listarCampos } from '../api/campos.js';
import { actualizarLabor, cancelarPlan, obtenerPlan } from '../api/proyectos.js';
import { useAuth } from '../auth/AuthContext.jsx';
import FormDialog from '../components/FormDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { Cargando, ConfirmDialog, EmptyState, ErrorState, Estado, Modal, PageHeader, Progreso } from '../components/ui.jsx';
import { useAsync } from '../hooks.js';
import { Link, useParams } from '../router.jsx';
import { esPlanActivo, etiqueta, fmtFecha, fmtFechaHora, fmtNum } from '../utils.js';

export default function PlanDetalle() {
  const { id } = useParams();
  const { can } = useAuth();
  const avisar = useToast();
  const datos = useAsync(() => Promise.all([obtenerPlan(id), listarCampos()]), [id]);

  const [plan, setPlan] = useState(null);
  const [problema, setProblema] = useState(null); // mensaje de la última acción que falló
  const [advertencias, setAdvertencias] = useState([]); // avisos que no impidieron la acción
  const [dialogo, setDialogo] = useState(null); // { tipo: 'fumigar', labor } | { tipo: 'cancelar' }
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (datos.data) {
      setPlan(datos.data[0]);
      setProblema(null);
      setAdvertencias([]);
    }
  }, [datos.data]);

  if (datos.loading && !plan) return <Cargando />;
  if (datos.error && !plan) return <ErrorState error={datos.error} onReintentar={datos.reload} />;
  if (!plan) return <Cargando />;

  const campos = datos.data?.[1] ?? [];
  const nombreCampo = campos.find((c) => c.id === plan.campoId)?.nombre ?? `Campo ${plan.campoId}`;
  const activo = esPlanActivo(plan);
  const siguiente = plan.labores.find((l) => l.estado !== 'COMPLETADA');

  // Lanza el error para que lo muestre quien llama (un diálogo o el aviso de la página).
  async function cambiarLabor(labor, estado, tratamientoId) {
    const nuevo = await actualizarLabor(plan.id, labor.id, { estado, ...(tratamientoId ? { tratamientoId } : {}) });
    setPlan(nuevo);
    setAdvertencias(nuevo.advertencias ?? []);
    setProblema(null);
    avisar(estado === 'COMPLETADA' ? `${etiqueta(labor.nombre)} completada` : `${etiqueta(labor.nombre)} iniciada`);
  }

  async function accionDirecta(labor, estado) {
    setOcupado(true);
    setProblema(null);
    try {
      await cambiarLabor(labor, estado);
    } catch (e) {
      setProblema(e.message);
    } finally {
      setOcupado(false);
    }
  }

  function iniciar(labor) {
    if (labor.tipo === 'FUMIGAR') setDialogo({ tipo: 'fumigar', labor });
    else accionDirecta(labor, 'EN_EJECUCION');
  }

  return (
    <>
      <p className="migas">
        <Link to="/planes">Planes de siembra</Link>
      </p>
      <PageHeader titulo={plan.cultivoNombre} descripcion={`${nombreCampo}, lote ${plan.loteId}`}>
        {can.gestionarPlanes && activo && (
          <button type="button" className="btn sec peligro-texto" onClick={() => setDialogo({ tipo: 'cancelar' })}>
            Cancelar plan
          </button>
        )}
      </PageHeader>

      <dl className="datos">
        <div>
          <dt>Estado</dt>
          <dd>
            <Estado tipo="plan" valor={plan.estado} />
          </dd>
        </div>
        <div>
          <dt>Siembra prevista</dt>
          <dd>{fmtFecha(plan.fechaSiembraPrevista)}</dd>
        </div>
        <div>
          <dt>Creado</dt>
          <dd>{fmtFechaHora(plan.fechaCreacion)}</dd>
        </div>
        <div>
          <dt>Avance</dt>
          <dd>
            <Progreso labores={plan.labores} />
          </dd>
        </div>
      </dl>

      {problema && (
        <div className="aviso error" role="alert">
          <p>{problema}</p>
        </div>
      )}
      {advertencias.map((texto) => (
        <div key={texto} className="aviso atencion" role="status">
          <p>{texto}</p>
        </div>
      ))}

      <section aria-labelledby="titulo-labores">
        <div className="seccion-titulo">
          <h2 id="titulo-labores">Labores</h2>
          <span className="sub">Se hacen en orden: una labor se inicia cuando la anterior está completada.</span>
        </div>

        <ol className="labores">
          {plan.labores.map((l) => {
            const esSiguiente = siguiente?.id === l.id;
            const puedeOperar = can.operarLabores && activo && esSiguiente;
            return (
              <li key={l.id} className={`labor l-${l.estado.toLowerCase()}`}>
                <span className="labor-num" aria-hidden="true">
                  {l.orden}
                </span>
                <div className="labor-cuerpo">
                  <div className="labor-titulo">
                    <strong>{etiqueta(l.nombre)}</strong>
                    <Estado tipo="labor" valor={l.estado} />
                  </div>
                  {(l.fechaInicio || l.fechaFin || l.tratamientoId) && (
                    <p className="sub">
                      {[
                        l.fechaInicio && `Inició el ${fmtFechaHora(l.fechaInicio)}`,
                        l.fechaFin && `terminó el ${fmtFechaHora(l.fechaFin)}`,
                        l.tratamientoId && `tratamiento ${l.tratamientoId}`,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                  {puedeOperar && l.estado === 'PENDIENTE' && (
                    <button type="button" className="btn" disabled={ocupado} onClick={() => iniciar(l)}>
                      {l.tipo === 'FUMIGAR' ? 'Iniciar fumigación' : 'Iniciar labor'}
                    </button>
                  )}
                  {puedeOperar && l.estado === 'EN_EJECUCION' && (
                    <button type="button" className="btn" disabled={ocupado} onClick={() => accionDirecta(l, 'COMPLETADA')}>
                      Marcar como completada
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {!activo && <p className="sub">Este plan está {plan.estado === 'FINALIZADO' ? 'finalizado' : 'cancelado'}: ya no admite cambios en las labores.</p>}
      </section>

      {dialogo?.tipo === 'fumigar' && (
        <DialogoFumigacion
          plan={plan}
          labor={dialogo.labor}
          onClose={() => setDialogo(null)}
          onConfirmar={async (tratamientoId) => {
            await cambiarLabor(dialogo.labor, 'EN_EJECUCION', tratamientoId);
            setDialogo(null);
          }}
        />
      )}

      {dialogo?.tipo === 'cancelar' && (
        <ConfirmDialog
          titulo="Cancelar el plan"
          texto="El lote queda libre para una nueva siembra. Esta acción no se puede deshacer."
          confirmar="Cancelar plan"
          cancelar="Volver"
          peligro
          onCancelar={() => setDialogo(null)}
          onConfirmar={async () => {
            const nuevo = await cancelarPlan(plan.id);
            setPlan(nuevo);
            setDialogo(null);
            avisar('Plan cancelado');
          }}
        />
      )}
    </>
  );
}

// Para fumigar hay que elegir el tratamiento: de él salen los límites de viento y lluvia
// que el backend compara con el pronóstico del lote antes de dejar iniciar la labor.
function DialogoFumigacion({ plan, labor, onClose, onConfirmar }) {
  const datos = useAsync(() => tratamientos.listar({ cultivoId: plan.cultivoId }), [plan.cultivoId]);

  if (datos.loading && !datos.data) {
    return (
      <Modal titulo="Iniciar fumigación" onClose={onClose}>
        <Cargando />
      </Modal>
    );
  }
  if (datos.error) {
    return (
      <Modal titulo="Iniciar fumigación" onClose={onClose}>
        <ErrorState error={datos.error} onReintentar={datos.reload} />
      </Modal>
    );
  }

  const lista = datos.data;
  if (lista.length === 0) {
    return (
      <Modal titulo="Iniciar fumigación" onClose={onClose}>
        <EmptyState titulo={`No hay tratamientos para ${plan.cultivoNombre}`} texto="Cargá uno en el catálogo agronómico para poder fumigar." />
      </Modal>
    );
  }

  const campos = [
    {
      name: 'tratamientoId',
      label: 'Tratamiento',
      type: 'select',
      required: true,
      numerico: true,
      opciones: lista.map((t) => {
        const a = t.agroquimico;
        const limites = [
          a.vientoMaximoPermitidoKmH != null && `viento máx. ${fmtNum(a.vientoMaximoPermitidoKmH)} km/h`,
          a.horasLibresDeLluviaRequeridas != null && `${a.horasLibresDeLluviaRequeridas} h sin lluvia`,
        ].filter(Boolean);
        return { value: t.id, label: `${t.plaga.nombre} con ${a.nombreComercial}${limites.length ? ` (${limites.join(', ')})` : ''}` };
      }),
      ayuda: 'Antes de iniciar se consulta el pronóstico de viento y lluvia del lote.',
    },
  ];

  return (
    <FormDialog
      titulo="Iniciar fumigación"
      campos={campos}
      guardar="Iniciar fumigación"
      onClose={onClose}
      onSubmit={(valores) => onConfirmar(valores.tratamientoId)}
    />
  );
}
