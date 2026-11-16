import { COLOR_SUELO, etiqueta, fmtHa, textoSobre } from '../utils.js';

/*
 * Plano del campo: cada lote es un rectángulo cuya superficie es proporcional a sus hectáreas,
 * pintado con el color de su tipo de suelo. Lo que no está asignado a ningún lote queda rayado.
 * Así se ve de un vistazo cuánto del campo queda libre (regla RN-CAM-02: los lotes no pueden
 * superar la superficie total).
 */

function suma(fila) {
  return fila.reduce((a, i) => a + i.area, 0);
}

// Peor relación de aspecto de una fila (algoritmo "squarified treemap").
function peor(fila, lado) {
  const s = suma(fila);
  const mayor = Math.max(...fila.map((i) => i.area));
  const menor = Math.min(...fila.map((i) => i.area));
  return Math.max((lado * lado * mayor) / (s * s), (s * s) / (lado * lado * menor));
}

function acomodar(items, x, y, w, h) {
  const salida = [];
  let resto = [...items];
  while (resto.length) {
    const lado = Math.min(w, h);
    const fila = [resto[0]];
    let i = 1;
    while (i < resto.length && peor([...fila, resto[i]], lado) <= peor(fila, lado)) {
      fila.push(resto[i]);
      i++;
    }
    const area = suma(fila);
    if (w >= h) {
      const ancho = area / h;
      let cy = y;
      fila.forEach((it) => {
        const alto = it.area / ancho;
        salida.push({ ...it, x, y: cy, w: ancho, h: alto });
        cy += alto;
      });
      x += ancho;
      w -= ancho;
    } else {
      const alto = area / w;
      let cx = x;
      fila.forEach((it) => {
        const ancho = it.area / alto;
        salida.push({ ...it, x: cx, y, w: ancho, h: alto });
        cx += ancho;
      });
      y += alto;
      h -= alto;
    }
    resto = resto.slice(fila.length);
  }
  return salida;
}

const ANCHO = 160;
const ALTO = 90;

export default function PlanoLotes({ total, lotes }) {
  const usadas = lotes.reduce((a, l) => a + (l.hectareas || 0), 0);
  const base = Math.max(total || 0, usadas) || 1;
  const libre = Math.max(base - usadas, 0);

  const piezas = [
    ...lotes.map((l) => ({ clave: `l${l.id}`, lote: l, ha: l.hectareas || 0 })),
    ...(libre > 0.0001 ? [{ clave: 'libre', lote: null, ha: libre }] : []),
  ]
    .filter((p) => p.ha > 0)
    .sort((a, b) => b.ha - a.ha)
    .map((p) => ({ ...p, area: (p.ha / base) * ANCHO * ALTO }));

  const celdas = acomodar(piezas, 0, 0, ANCHO, ALTO);
  const suelosPresentes = [...new Set(lotes.map((l) => l.tipoSuelo))];

  return (
    <figure className="plano-figura">
      <div
        className="plano"
        role="img"
        aria-label={`Plano del campo: ${lotes.length} lotes, ${fmtHa(usadas)} asignadas de ${fmtHa(total)}`}
      >
        {celdas.map((c) => {
          const estilo = {
            left: `${(c.x / ANCHO) * 100}%`,
            top: `${(c.y / ALTO) * 100}%`,
            width: `${(c.w / ANCHO) * 100}%`,
            height: `${(c.h / ALTO) * 100}%`,
          };
          const chica = c.w * c.h < ANCHO * ALTO * 0.06;
          if (!c.lote) {
            return (
              <div key={c.clave} className="parcela libre" style={estilo} title={`Sin asignar: ${fmtHa(c.ha)}`}>
                {!chica && (
                  <span>
                    Sin asignar
                    <small>{fmtHa(c.ha)}</small>
                  </span>
                )}
              </div>
            );
          }
          const color = COLOR_SUELO[c.lote.tipoSuelo] ?? '#999999';
          return (
            <div
              key={c.clave}
              className="parcela"
              style={{ ...estilo, background: color, color: textoSobre(color) }}
              title={`Lote ${c.lote.nroLote}: ${fmtHa(c.lote.hectareas)}, ${etiqueta(c.lote.tipoSuelo)}`}
            >
              {!chica && (
                <span>
                  Lote {c.lote.nroLote}
                  <small>{fmtHa(c.lote.hectareas)}</small>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <figcaption className="plano-leyenda">
        {suelosPresentes.map((s) => (
          <span key={s}>
            <i style={{ background: COLOR_SUELO[s] }} aria-hidden="true" />
            {etiqueta(s)}
          </span>
        ))}
        {libre > 0.0001 && (
          <span>
            <i className="rayado" aria-hidden="true" />
            Sin asignar
          </span>
        )}
      </figcaption>
    </figure>
  );
}
