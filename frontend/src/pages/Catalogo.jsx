import { useEffect, useState } from 'react';
import { agroquimicos, cultivos, plagas, tratamientos } from '../api/agronomia.js';
import { useAuth } from '../auth/AuthContext.jsx';
import FormDialog from '../components/FormDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { Cargando, ChipSuelo, ConfirmDialog, EmptyState, ErrorState, PageHeader } from '../components/ui.jsx';
import { useAsync } from '../hooks.js';
import { NavLink, navegar, useParams } from '../router.jsx';
import { AGROQUIMICO_PARA_PLAGA, SUELOS, etiqueta, fmtNum } from '../utils.js';

const LABORES_SUGERIDAS = ['Arar', 'Rastrillar', 'Sembrar', 'Escardillar', 'Fumigar', 'Rolar', 'Cosechar'];
const opcionesDe = (valores) => valores.map((v) => ({ value: v, label: etiqueta(v) }));

/*
 * Cada sección del catálogo se describe con un objeto y una sola pantalla genérica (Seccion) la dibuja.
 *   cargar():            trae { items, ...datos extra para los formularios }
 *   columnas:            [{ titulo, celda(item) }]
 *   formulario(extra):   descripción de campos para FormDialog
 *   valoresDe(item):     valores iniciales al editar
 *   filtros:             filtros opcionales de la tabla
 */
const SECCIONES = {
  cultivos: {
    titulo: 'Cultivos',
    singular: 'cultivo',
    descripcion: 'Qué se puede sembrar, en qué suelos y con qué secuencia de labores.',
    nuevo: 'Nuevo cultivo',
    vacio: 'Todavía no hay cultivos en el catálogo.',
    api: cultivos,
    cargar: async () => ({ items: await cultivos.listar() }),
    columnas: [
      { titulo: 'Nombre', celda: (c) => c.nombre },
      {
        titulo: 'Suelos aptos',
        celda: (c) => (
          <span className="chips">
            {[...c.suelosAptos].sort().map((s) => (
              <ChipSuelo key={s} tipo={s} />
            ))}
          </span>
        ),
      },
      { titulo: 'Labores, en orden', celda: (c) => (c.labores.length ? c.labores.map(etiqueta).join(', ') : 'Sin labores') },
    ],
    formulario: () => [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'suelosAptos', label: 'Suelos aptos', type: 'multicheck', required: true, opciones: opcionesDe(SUELOS), ayuda: 'Elegí al menos uno. Un plan solo puede sembrarse en un lote con uno de estos suelos.' },
      { name: 'labores', label: 'Labores, en orden', type: 'lista', sugerencias: LABORES_SUGERIDAS, ayuda: 'Cada plan copia esta secuencia al crearse. El sistema reconoce Arar, Rastrillar, Sembrar, Escardillar, Fumigar, Rolar y Cosechar.' },
    ],
    valoresDe: (c) => c,
  },

  plagas: {
    titulo: 'Plagas',
    singular: 'plaga',
    descripcion: 'Insectos, hongos y malezas que se controlan con tratamientos.',
    nuevo: 'Nueva plaga',
    vacio: 'Todavía no hay plagas en el catálogo.',
    api: plagas,
    cargar: async () => ({ items: await plagas.listar() }),
    columnas: [
      { titulo: 'Nombre', celda: (p) => p.nombre },
      { titulo: 'Tipo', celda: (p) => etiqueta(p.tipoPlaga) },
      { titulo: 'Descripción', celda: (p) => p.descripcion || 'Sin descripción' },
    ],
    formulario: () => [
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'tipoPlaga', label: 'Tipo de plaga', type: 'select', required: true, opciones: opcionesDe(Object.keys(AGROQUIMICO_PARA_PLAGA)) },
      { name: 'descripcion', label: 'Descripción', type: 'textarea' },
    ],
    valoresDe: (p) => p,
  },

  agroquimicos: {
    titulo: 'Agroquímicos',
    singular: 'agroquímico',
    descripcion: 'Productos con los límites de viento y lluvia que condicionan la fumigación.',
    nuevo: 'Nuevo agroquímico',
    vacio: 'Todavía no hay agroquímicos en el catálogo.',
    api: agroquimicos,
    cargar: async () => ({ items: await agroquimicos.listar() }),
    columnas: [
      { titulo: 'Nombre comercial', celda: (a) => a.nombreComercial },
      { titulo: 'Principio activo', celda: (a) => a.principioActivo },
      { titulo: 'Tipo', celda: (a) => etiqueta(a.tipo) },
      { titulo: 'Viento máximo', numerica: true, celda: (a) => (a.vientoMaximoPermitidoKmH != null ? `${fmtNum(a.vientoMaximoPermitidoKmH)} km/h` : '—') },
      { titulo: 'Horas sin lluvia', numerica: true, celda: (a) => (a.horasLibresDeLluviaRequeridas != null ? `${a.horasLibresDeLluviaRequeridas} h` : '—') },
    ],
    formulario: () => [
      { name: 'nombreComercial', label: 'Nombre comercial', type: 'text', required: true },
      { name: 'principioActivo', label: 'Principio activo', type: 'text', required: true },
      { name: 'tipo', label: 'Tipo', type: 'select', required: true, opciones: opcionesDe(['HERBICIDA', 'INSECTICIDA', 'FUNGICIDA', 'FERTILIZANTE']) },
      { name: 'vientoMaximoPermitidoKmH', label: 'Viento máximo permitido (km/h)', type: 'number', min: 0, ayuda: 'Se compara con el pronóstico antes de iniciar una fumigación.' },
      { name: 'horasLibresDeLluviaRequeridas', label: 'Horas libres de lluvia requeridas', type: 'number', entero: true, min: 0 },
    ],
    valoresDe: (a) => a,
  },

  tratamientos: {
    titulo: 'Tratamientos',
    singular: 'tratamiento',
    descripcion: 'Qué agroquímico se aplica contra cada plaga en cada cultivo, y en qué dosis.',
    nuevo: 'Nuevo tratamiento',
    vacio: 'Todavía no hay tratamientos en el catálogo.',
    api: tratamientos,
    cargar: async () => {
      const [items, listaPlagas, listaAgroquimicos, listaCultivos] = await Promise.all([
        tratamientos.listar(),
        plagas.listar(),
        agroquimicos.listar(),
        cultivos.listar(),
      ]);
      return { items, plagas: listaPlagas, agroquimicos: listaAgroquimicos, cultivos: listaCultivos };
    },
    filtros: [
      { clave: 'plagaId', label: 'Plaga', opciones: (x) => x.plagas.map((p) => ({ value: p.id, label: p.nombre })), coincide: (t, v) => String(t.plaga.id) === v },
      { clave: 'cultivoId', label: 'Cultivo', opciones: (x) => x.cultivos.map((c) => ({ value: c.id, label: c.nombre })), coincide: (t, v) => String(t.cultivo.id) === v },
    ],
    columnas: [
      { titulo: 'Plaga', celda: (t) => t.plaga.nombre },
      { titulo: 'Agroquímico', celda: (t) => t.agroquimico.nombreComercial },
      { titulo: 'Cultivo', celda: (t) => t.cultivo.nombre },
      { titulo: 'Dosis por hectárea', numerica: true, celda: (t) => `${fmtNum(t.dosisPorHectarea)} ${t.unidadMedida}` },
    ],
    formulario: (x) => [
      {
        name: 'plagaId', label: 'Plaga', type: 'select', required: true, numerico: true, reinicia: ['agroquimicoId'],
        opciones: x.plagas.map((p) => ({ value: p.id, label: `${p.nombre} (${etiqueta(p.tipoPlaga)})` })),
      },
      {
        name: 'agroquimicoId', label: 'Agroquímico', type: 'select', required: true, numerico: true,
        ayuda: 'Un insecto se trata con insecticida, un hongo con fungicida y una maleza con herbicida.',
        opciones: (valores) => {
          const plaga = x.plagas.find((p) => String(p.id) === valores.plagaId);
          const requerido = plaga ? AGROQUIMICO_PARA_PLAGA[plaga.tipoPlaga] : null;
          return x.agroquimicos
            .filter((a) => !requerido || a.tipo === requerido)
            .map((a) => ({ value: a.id, label: `${a.nombreComercial} (${etiqueta(a.tipo)})` }));
        },
      },
      { name: 'cultivoId', label: 'Cultivo', type: 'select', required: true, numerico: true, opciones: x.cultivos.map((c) => ({ value: c.id, label: c.nombre })) },
      { name: 'dosisPorHectarea', label: 'Dosis por hectárea', type: 'number', required: true, min: 0 },
      { name: 'unidadMedida', label: 'Unidad de medida', type: 'text', required: true, sugerencias: ['L', 'kg', 'g', 'cc'] },
    ],
    valoresDe: (t) => ({
      plagaId: t.plaga.id,
      agroquimicoId: t.agroquimico.id,
      cultivoId: t.cultivo.id,
      dosisPorHectarea: t.dosisPorHectarea,
      unidadMedida: t.unidadMedida,
    }),
  },
};

const ORDEN = ['cultivos', 'plagas', 'agroquimicos', 'tratamientos'];

export default function Catalogo() {
  const { seccion } = useParams();
  const clave = SECCIONES[seccion] ? seccion : 'cultivos';

  // /catalogo a secas abre la primera pestaña
  useEffect(() => {
    if (!SECCIONES[seccion]) navegar('/catalogo/cultivos', { reemplazar: true });
  }, [seccion]);

  return (
    <>
      <PageHeader titulo="Catálogo agronómico" descripcion={SECCIONES[clave].descripcion} />
      <nav className="pestanias" aria-label="Catálogo">
        {ORDEN.map((k) => (
          <NavLink key={k} to={`/catalogo/${k}`} className="pestania" end>
            {SECCIONES[k].titulo}
          </NavLink>
        ))}
      </nav>
      <Seccion key={clave} cfg={SECCIONES[clave]} />
    </>
  );
}

function Seccion({ cfg }) {
  const { can } = useAuth();
  const avisar = useToast();
  const datos = useAsync(cfg.cargar, []);
  const [dialogo, setDialogo] = useState(null); // { item? }
  const [aEliminar, setAEliminar] = useState(null);
  const [filtros, setFiltros] = useState({});

  if (datos.loading && !datos.data) return <Cargando />;
  if (datos.error && !datos.data) return <ErrorState error={datos.error} onReintentar={datos.reload} />;

  const extra = datos.data;
  const items = extra.items.filter((it) => (cfg.filtros ?? []).every((f) => !filtros[f.clave] || f.coincide(it, filtros[f.clave])));
  const editable = can.editarCatalogo;

  return (
    <>
      <div className="barra-herramientas">
        <div className="filtros">
          {(cfg.filtros ?? []).map((f) => (
            <label key={f.clave}>
              {f.label}
              <select value={filtros[f.clave] ?? ''} onChange={(e) => setFiltros({ ...filtros, [f.clave]: e.target.value })}>
                <option value="">Todos</option>
                {f.opciones(extra).map((o) => (
                  <option key={o.value} value={String(o.value)}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {editable ? (
          <button type="button" className="btn" onClick={() => setDialogo({})}>
            {cfg.nuevo}
          </button>
        ) : (
          <p className="sub">Con tu rol podés consultar el catálogo, pero no modificarlo.</p>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          titulo={extra.items.length === 0 ? cfg.vacio : 'Ningún resultado con esos filtros'}
          texto={extra.items.length === 0 && editable ? `Creá el primero con “${cfg.nuevo}”.` : undefined}
        />
      ) : (
        <div className="tabla-wrap">
          <table>
            <thead>
              <tr>
                {cfg.columnas.map((c) => (
                  <th key={c.titulo} scope="col" className={c.numerica ? 'num' : undefined}>
                    {c.titulo}
                  </th>
                ))}
                {editable && <th scope="col" className="acciones-col"><span className="solo-lectores">Acciones</span></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  {cfg.columnas.map((c) => (
                    <td key={c.titulo} className={c.numerica ? 'num' : undefined}>
                      {c.celda(it)}
                    </td>
                  ))}
                  {editable && (
                    <td className="acciones">
                      <button type="button" className="btn link" onClick={() => setDialogo({ item: it })}>
                        Editar
                      </button>
                      <button type="button" className="btn link peligro-texto" onClick={() => setAEliminar(it)}>
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
          titulo={dialogo.item ? `Editar ${cfg.singular}` : cfg.nuevo}
          campos={cfg.formulario(extra)}
          inicial={dialogo.item ? cfg.valoresDe(dialogo.item) : {}}
          guardar={dialogo.item ? 'Guardar cambios' : 'Crear'}
          onClose={() => setDialogo(null)}
          onSubmit={async (valores) => {
            if (dialogo.item) await cfg.api.actualizar(dialogo.item.id, valores);
            else await cfg.api.crear(valores);
            setDialogo(null);
            avisar(dialogo.item ? 'Cambios guardados' : 'Creado');
            datos.reload();
          }}
        />
      )}

      {aEliminar && (
        <ConfirmDialog
          titulo={`Eliminar ${cfg.singular}`}
          texto={`Se dará de baja el ${cfg.singular} y dejará de aparecer en el catálogo.`}
          confirmar="Eliminar"
          peligro
          onCancelar={() => setAEliminar(null)}
          onConfirmar={async () => {
            await cfg.api.eliminar(aEliminar.id);
            setAEliminar(null);
            avisar('Eliminado');
            datos.reload();
          }}
        />
      )}
    </>
  );
}
