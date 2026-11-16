import { useState } from 'react';
import { actualizarCampo, actualizarLote, crearLote, eliminarLote, listarLotes, obtenerCampo } from '../api/campos.js';
import { useAuth } from '../auth/AuthContext.jsx';
import FormDialog from '../components/FormDialog.jsx';
import PlanoLotes from '../components/PlanoLotes.jsx';
import { useToast } from '../components/Toast.jsx';
import { Cargando, ChipSuelo, ConfirmDialog, EmptyState, ErrorState, PageHeader } from '../components/ui.jsx';
import { useAsync } from '../hooks.js';
import { Link, useParams } from '../router.jsx';
import { SUELOS, etiqueta, fmtHa, fmtNum } from '../utils.js';
import { FORM_CAMPO } from './Campos.jsx';

const FORM_LOTE = [
  { name: 'nroLote', label: 'Número de lote', type: 'number', entero: true, required: true, min: 1 },
  { name: 'hectareas', label: 'Hectáreas', type: 'number', required: true, min: 0 },
  { name: 'tipoSuelo', label: 'Tipo de suelo', type: 'select', required: true, opciones: SUELOS.map((s) => ({ value: s, label: etiqueta(s) })) },
  { name: 'latitud', label: 'Latitud', type: 'number', ayuda: 'Opcional. Se usa para consultar el pronóstico antes de fumigar.' },
  { name: 'longitud', label: 'Longitud', type: 'number' },
];

export default function CampoDetalle() {
  const { id } = useParams();
  const { can } = useAuth();
  const avisar = useToast();
  const datos = useAsync(() => Promise.all([obtenerCampo(id), listarLotes(id)]), [id]);
  const [dialogo, setDialogo] = useState(null); // { tipo: 'campo' | 'lote', lote? }
  const [aEliminar, setAEliminar] = useState(null);

  if (datos.loading && !datos.data) return <Cargando />;
  if (datos.error && !datos.data) return <ErrorState error={datos.error} onReintentar={datos.reload} />;

  const [campo, lotes] = datos.data;
  const asignadas = lotes.reduce((a, l) => a + (l.hectareas || 0), 0);
  const libres = Math.max(campo.superficieTotalHas - asignadas, 0);

  return (
    <>
      <p className="migas">
        <Link to="/campos">Campos y lotes</Link>
      </p>
      <PageHeader
        titulo={campo.nombre}
        descripcion={`${fmtHa(asignadas)} asignadas de ${fmtHa(campo.superficieTotalHas)}. ${libres > 0 ? `Quedan ${fmtHa(libres)} para nuevos lotes.` : 'No queda superficie libre.'}`}
      >
        {can.editarCampos && (
          <>
            <button type="button" className="btn sec" onClick={() => setDialogo({ tipo: 'campo' })}>
              Editar campo
            </button>
            <button type="button" className="btn" onClick={() => setDialogo({ tipo: 'lote' })}>
              Agregar lote
            </button>
          </>
        )}
      </PageHeader>

      <PlanoLotes total={campo.superficieTotalHas} lotes={lotes} />

      <section aria-labelledby="titulo-lotes">
        <div className="seccion-titulo">
          <h2 id="titulo-lotes">Lotes</h2>
        </div>
        {lotes.length === 0 ? (
          <EmptyState
            titulo="Este campo todavía no tiene lotes"
            texto={can.editarCampos ? 'Agregá el primer lote para poder planificar una siembra.' : 'Un administrador tiene que cargar los lotes.'}
          />
        ) : (
          <div className="tabla-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Lote</th>
                  <th scope="col" className="num">Hectáreas</th>
                  <th scope="col">Suelo</th>
                  <th scope="col">Coordenadas</th>
                  {can.editarCampos && <th scope="col" className="acciones-col"><span className="solo-lectores">Acciones</span></th>}
                </tr>
              </thead>
              <tbody>
                {lotes.map((l) => (
                  <tr key={l.id}>
                    <td className="nowrap">Lote {l.nroLote}</td>
                    <td className="num">{fmtNum(l.hectareas)}</td>
                    <td>
                      <ChipSuelo tipo={l.tipoSuelo} />
                    </td>
                    <td>{l.latitud != null && l.longitud != null ? `${l.latitud}, ${l.longitud}` : 'Sin cargar'}</td>
                    {can.editarCampos && (
                      <td className="acciones">
                        <button type="button" className="btn link" onClick={() => setDialogo({ tipo: 'lote', lote: l })}>
                          Editar
                        </button>
                        <button type="button" className="btn link peligro-texto" onClick={() => setAEliminar(l)}>
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dialogo?.tipo === 'campo' && (
        <FormDialog
          titulo={`Editar ${campo.nombre}`}
          campos={FORM_CAMPO}
          inicial={campo}
          guardar="Guardar cambios"
          onClose={() => setDialogo(null)}
          onSubmit={async (valores) => {
            await actualizarCampo(campo.id, valores);
            setDialogo(null);
            avisar('Cambios guardados');
            datos.reload();
          }}
        />
      )}

      {dialogo?.tipo === 'lote' && (
        <FormDialog
          titulo={dialogo.lote ? `Editar lote ${dialogo.lote.nroLote}` : 'Agregar lote'}
          campos={FORM_LOTE}
          inicial={dialogo.lote ?? {}}
          guardar={dialogo.lote ? 'Guardar cambios' : 'Agregar lote'}
          onClose={() => setDialogo(null)}
          onSubmit={async (valores) => {
            if (dialogo.lote) await actualizarLote(campo.id, dialogo.lote.id, valores);
            else await crearLote(campo.id, valores);
            setDialogo(null);
            avisar(dialogo.lote ? 'Cambios guardados' : 'Lote agregado');
            datos.reload();
          }}
        />
      )}

      {aEliminar && (
        <ConfirmDialog
          titulo={`Eliminar lote ${aEliminar.nroLote}`}
          texto="El lote se da de baja y ya no admite nuevos planes de siembra. Los planes anteriores se conservan."
          confirmar="Eliminar lote"
          peligro
          onCancelar={() => setAEliminar(null)}
          onConfirmar={async () => {
            await eliminarLote(campo.id, aEliminar.id);
            setAEliminar(null);
            avisar('Lote eliminado');
            datos.reload();
          }}
        />
      )}
    </>
  );
}
