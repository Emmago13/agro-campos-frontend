import { useState } from 'react';
import { actualizarCampo, crearCampo, eliminarCampo, listarCampos } from '../api/campos.js';
import { useAuth } from '../auth/AuthContext.jsx';
import FormDialog from '../components/FormDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { Cargando, ConfirmDialog, EmptyState, ErrorState, PageHeader } from '../components/ui.jsx';
import { useAsync } from '../hooks.js';
import { Link } from '../router.jsx';
import { fmtHa } from '../utils.js';

export const FORM_CAMPO = [
  { name: 'nombre', label: 'Nombre', type: 'text', required: true },
  { name: 'superficieTotalHas', label: 'Superficie total (ha)', type: 'number', required: true, min: 0 },
];

export default function Campos() {
  const { can } = useAuth();
  const avisar = useToast();
  const datos = useAsync(listarCampos, []);
  const [dialogo, setDialogo] = useState(null); // { campo? } -> crear o editar
  const [aEliminar, setAEliminar] = useState(null);

  if (datos.loading && !datos.data) return <Cargando />;
  if (datos.error && !datos.data) return <ErrorState error={datos.error} onReintentar={datos.reload} />;

  const campos = datos.data;

  return (
    <>
      <PageHeader titulo="Campos y lotes" descripcion="Catastro de campos con sus lotes, superficies y tipos de suelo.">
        {can.editarCampos && (
          <button type="button" className="btn" onClick={() => setDialogo({})}>
            Nuevo campo
          </button>
        )}
      </PageHeader>

      {campos.length === 0 ? (
        <EmptyState
          titulo="Todavía no hay campos"
          texto={can.editarCampos ? 'Creá el primero con Nuevo campo y después cargale sus lotes.' : 'Un administrador tiene que cargar los campos.'}
        />
      ) : (
        <div className="tabla-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col" className="num">Superficie total</th>
                <th scope="col" className="num">Lotes</th>
                {can.editarCampos && <th scope="col" className="acciones-col"><span className="solo-lectores">Acciones</span></th>}
              </tr>
            </thead>
            <tbody>
              {campos.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/campos/${c.id}`} className="enlace-fila">
                      {c.nombre}
                    </Link>
                  </td>
                  <td className="num">{fmtHa(c.superficieTotalHas)}</td>
                  <td className="num">{c.cantidadLotes}</td>
                  {can.editarCampos && (
                    <td className="acciones">
                      <button type="button" className="btn link" onClick={() => setDialogo({ campo: c })}>
                        Editar
                      </button>
                      <button type="button" className="btn link peligro-texto" onClick={() => setAEliminar(c)}>
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

      {dialogo && (
        <FormDialog
          titulo={dialogo.campo ? `Editar ${dialogo.campo.nombre}` : 'Nuevo campo'}
          campos={FORM_CAMPO}
          inicial={dialogo.campo ?? {}}
          guardar={dialogo.campo ? 'Guardar cambios' : 'Crear campo'}
          onClose={() => setDialogo(null)}
          onSubmit={async (valores) => {
            if (dialogo.campo) await actualizarCampo(dialogo.campo.id, valores);
            else await crearCampo(valores);
            setDialogo(null);
            avisar(dialogo.campo ? 'Cambios guardados' : 'Campo creado');
            datos.reload();
          }}
        />
      )}

      {aEliminar && (
        <ConfirmDialog
          titulo={`Eliminar ${aEliminar.nombre}`}
          texto="El campo y sus lotes se dan de baja. Los planes de siembra anteriores conservan su referencia."
          confirmar="Eliminar campo"
          peligro
          onCancelar={() => setAEliminar(null)}
          onConfirmar={async () => {
            await eliminarCampo(aEliminar.id);
            setAEliminar(null);
            avisar('Campo eliminado');
            datos.reload();
          }}
        />
      )}
    </>
  );
}
