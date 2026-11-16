import { useState } from 'react';
import { cultivos as apiCultivos } from '../api/agronomia.js';
import { listarCampos, listarLotes } from '../api/campos.js';
import { crearPlan } from '../api/proyectos.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { Cargando, EmptyState, ErrorState, PageHeader } from '../components/ui.jsx';
import { useAsync } from '../hooks.js';
import { Link, navegar } from '../router.jsx';
import { etiqueta, fmtNum, hoy } from '../utils.js';

export default function NuevoPlan() {
  const { can } = useAuth();
  const avisar = useToast();
  const base = useAsync(() => Promise.all([listarCampos(), apiCultivos.listar()]), []);
  const [campoId, setCampoId] = useState('');
  const [loteId, setLoteId] = useState('');
  const [cultivoId, setCultivoId] = useState('');
  const [fecha, setFecha] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const lotesDatos = useAsync(() => (campoId ? listarLotes(campoId) : Promise.resolve([])), [campoId]);

  if (!can.gestionarPlanes) {
    return (
      <>
        <PageHeader titulo="Nuevo plan de siembra" />
        <EmptyState titulo="Tu rol no puede crear planes" texto="Solo los administradores y los agrónomos crean planes de siembra.">
          <Link to="/planes" className="btn sec">
            Volver a los planes
          </Link>
        </EmptyState>
      </>
    );
  }

  if (base.loading && !base.data) return <Cargando />;
  if (base.error && !base.data) return <ErrorState error={base.error} onReintentar={base.reload} />;

  const [campos, cultivos] = base.data;
  const lotes = campoId ? (lotesDatos.data ?? []) : [];
  const lote = lotes.find((l) => String(l.id) === loteId);
  const cultivo = cultivos.find((c) => String(c.id) === cultivoId);
  const sueloNoApto = lote && cultivo && !cultivo.suelosAptos.includes(lote.tipoSuelo);
  const errores = error?.fields ?? {};

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const plan = await crearPlan({
        campoId: Number(campoId),
        loteId: Number(loteId),
        cultivoId: Number(cultivoId),
        fechaSiembraPrevista: fecha,
      });
      avisar('Plan creado');
      navegar(`/planes/${plan.id}`);
    } catch (err) {
      setError(err);
      setEnviando(false);
    }
  }

  return (
    <>
      <p className="migas">
        <Link to="/planes">Planes de siembra</Link>
      </p>
      <PageHeader titulo="Nuevo plan de siembra" descripcion="Elegí dónde y qué se va a sembrar. Las labores se copian de la secuencia del cultivo." />

      <form className="formulario-pagina" onSubmit={enviar}>
        {error && (
          <div className="aviso error" role="alert">
            <p>{error.message}</p>
          </div>
        )}

        <div className="campo">
          <label htmlFor="plan-campo">Campo</label>
          <select
            id="plan-campo"
            required
            value={campoId}
            onChange={(e) => {
              setCampoId(e.target.value);
              setLoteId('');
            }}
          >
            <option value="">Elegí un campo</option>
            {campos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          {errores.campoId && <p className="error-campo">{errores.campoId}</p>}
        </div>

        <div className="campo">
          <label htmlFor="plan-lote">Lote</label>
          <select id="plan-lote" required disabled={!campoId || lotesDatos.loading} value={loteId} onChange={(e) => setLoteId(e.target.value)}>
            <option value="">{campoId ? 'Elegí un lote' : 'Elegí primero un campo'}</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                Lote {l.nroLote} · {fmtNum(l.hectareas)} ha · {etiqueta(l.tipoSuelo)}
              </option>
            ))}
          </select>
          {campoId && !lotesDatos.loading && lotes.length === 0 && <p className="ayuda">Este campo no tiene lotes. Un administrador puede cargarlos.</p>}
          {errores.loteId && <p className="error-campo">{errores.loteId}</p>}
        </div>

        <div className="campo">
          <label htmlFor="plan-cultivo">Cultivo</label>
          <select id="plan-cultivo" required value={cultivoId} onChange={(e) => setCultivoId(e.target.value)}>
            <option value="">Elegí un cultivo</option>
            {cultivos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          {sueloNoApto && (
            <p className="ayuda atencion-texto">
              {cultivo.nombre} no es apto para suelo {etiqueta(lote.tipoSuelo).toLowerCase()}: el sistema va a rechazar este plan.
            </p>
          )}
          {errores.cultivoId && <p className="error-campo">{errores.cultivoId}</p>}
        </div>

        <div className="campo">
          <label htmlFor="plan-fecha">Fecha de siembra prevista</label>
          <input id="plan-fecha" type="date" required min={hoy()} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          {errores.fechaSiembraPrevista && <p className="error-campo">{errores.fechaSiembraPrevista}</p>}
        </div>

        <div className="formulario-pie">
          <Link to="/planes" className="btn sec">
            Cancelar
          </Link>
          <button type="submit" className="btn" disabled={enviando}>
            {enviando ? 'Creando…' : 'Crear plan'}
          </button>
        </div>
      </form>
    </>
  );
}
