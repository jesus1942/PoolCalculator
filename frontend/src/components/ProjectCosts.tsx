import React, { useMemo, useState } from 'react';
import { Project } from '@/types';
import { calculateProjectFinancials, getAdditionalName } from '@/utils/projectCosting';
import { HdEye, HdEyeOff } from '@/components/ui/HandDrawnIcons';

// Pestaña "Costos": TODOS los valores del proyecto en un solo lugar, en tablas.
// La Vista General queda sin plata; acá manda el número de la instalación y
// el resto se lee ordenado por grupo. Sin chips ni badges.

interface ProjectCostsProps {
  project: Project;
  roles: any[];
  rolesCostSummary: Record<string, { hours: number; cost: number; tasksCount: number }>;
  additionals: any[];
}

const filaBase: React.CSSProperties = { borderTop: '1.2px dashed var(--hair)' };
const celdaMonto: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, whiteSpace: 'nowrap' };

const Grupo: React.FC<{ titulo: string }> = ({ titulo }) => (
  <tr>
    <td
      colSpan={5}
      className="pt-4 pb-1 text-[11px] uppercase tracking-[0.12em]"
      style={{ color: 'var(--ink-soft)' }}
    >
      {titulo}
    </td>
  </tr>
);

const Panel: React.FC<{ titulo?: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <section
    className="rounded-2xl p-4 sm:p-6"
    style={{ backgroundColor: 'var(--card)', border: '1.6px solid var(--hair-strong)' }}
  >
    {titulo && (
      <h3
        className="mb-3 text-base font-semibold"
        style={{ color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace" }}
      >
        {titulo}
      </h3>
    )}
    {children}
  </section>
);

export const ProjectCosts: React.FC<ProjectCostsProps> = ({ project, roles, rolesCostSummary, additionals }) => {
  const [mostrar, setMostrar] = useState(true);

  const financials = useMemo(() => calculateProjectFinancials(project, additionals), [project, additionals]);
  const {
    plumbingCosts,
    electricalCosts,
    additionalsCosts,
    duplicatedAdditionals,
    duplicatedAdditionalsCosts,
    baseMaterialCost,
    baseLaborCost,
    taskBaseLaborCost,
    commercialPricingSource,
    totalMaterialCost,
    totalLaborCost,
    grandTotal,
  } = financials;

  const persistedMaterialCost = Number(project.materialCost || 0);

  const money = (valor: number) => (mostrar ? `$ ${valor.toLocaleString('es-AR')}` : '••••••');

  const filasRoles = useMemo(
    () =>
      Object.entries(rolesCostSummary)
        .map(([roleId, resumen]) => ({
          nombre: roles.find((role: any) => role.id === roleId)?.name || 'Rol sin nombre',
          ...resumen,
        }))
        .sort((a, b) => b.cost - a.cost),
    [rolesCostSummary, roles],
  );

  const filasAdicionales = useMemo(
    () =>
      additionals
        .filter((additional: any) => (additional.newQuantity || 0) > 0)
        .map((additional: any) => {
          const cantidad = additional.newQuantity || 0;
          let material = 0;
          if (typeof additional.customPricePerUnit === 'number' && additional.customPricePerUnit > 0) {
            material = additional.customPricePerUnit * cantidad;
          } else if (additional.accessory) {
            material = additional.accessory.pricePerUnit * cantidad;
          } else if (additional.equipment) {
            material = additional.equipment.pricePerUnit * cantidad;
          } else if (additional.material) {
            material = additional.material.pricePerUnit * cantidad;
          }
          const manoObra =
            typeof additional.customLaborCost === 'number' && additional.customLaborCost > 0
              ? additional.customLaborCost * cantidad
              : 0;
          return {
            id: additional.id,
            nombre: getAdditionalName(additional),
            unidad: additional.customUnit || 'u.',
            cantidad,
            material,
            manoObra,
            total: material + manoObra,
          };
        }),
    [additionals],
  );

  return (
    <div className="space-y-4 sm:space-y-6" style={{ color: 'var(--ink)' }}>
      {/* Número que manda */}
      <Panel>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--ink-soft)' }}>
              Instalación de la pileta
            </p>
            <p
              className="mt-1 break-all text-4xl font-semibold sm:text-5xl"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {money(grandTotal)}
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
              Incluye materiales, mano de obra y adicionales.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMostrar((prev) => !prev)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            style={{ color: 'var(--ink-soft)', border: '1.4px solid var(--hair-strong)' }}
            aria-label={mostrar ? 'Ocultar importes' : 'Mostrar importes'}
            title={mostrar ? 'Ocultar importes' : 'Mostrar importes'}
          >
            {mostrar ? <HdEyeOff size={18} /> : <HdEye size={18} />}
          </button>
        </div>
      </Panel>

      {/* Resumen en tabla */}
      <Panel titulo="Resumen">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <Grupo titulo="Materiales" />
              <tr style={filaBase}>
                <td colSpan={4} className="py-2 pr-3">Construcción base (casco, losetas, cama de arena)</td>
                <td className="py-2" style={celdaMonto}>{money(persistedMaterialCost)}</td>
              </tr>
              {plumbingCosts > 0 && (
                <tr style={filaBase}>
                  <td colSpan={4} className="py-2 pr-3">Plomería</td>
                  <td className="py-2" style={celdaMonto}>{money(plumbingCosts)}</td>
                </tr>
              )}
              {electricalCosts > 0 && (
                <tr style={filaBase}>
                  <td colSpan={4} className="py-2 pr-3">Instalación eléctrica</td>
                  <td className="py-2" style={celdaMonto}>{money(electricalCosts)}</td>
                </tr>
              )}
              {additionalsCosts.materialCost > 0 && (
                <tr style={filaBase}>
                  <td colSpan={4} className="py-2 pr-3">Adicionales (materiales y equipos)</td>
                  <td className="py-2" style={celdaMonto}>{money(additionalsCosts.materialCost)}</td>
                </tr>
              )}
              <tr style={{ borderTop: '1.4px solid var(--hair-strong)' }}>
                <td colSpan={4} className="py-2 pr-3 font-semibold">Subtotal materiales</td>
                <td className="py-2" style={celdaMonto}>{money(totalMaterialCost)}</td>
              </tr>

              <Grupo titulo="Mano de obra" />
              <tr style={filaBase}>
                <td colSpan={4} className="py-2 pr-3">
                  Instalación base
                  <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>
                    {commercialPricingSource === 'model_pricing'
                      ? 'Tarifa comercial del modelo (incluye tareas y roles)'
                      : 'Calculada desde tareas y roles'}
                  </span>
                </td>
                <td className="py-2" style={celdaMonto}>{money(baseLaborCost)}</td>
              </tr>
              {taskBaseLaborCost > 0 && taskBaseLaborCost !== baseLaborCost && (
                <tr style={filaBase}>
                  <td colSpan={4} className="py-2 pr-3">
                    Referencia por tareas
                    <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>Solo comparativa, no se suma</span>
                  </td>
                  <td className="py-2" style={{ ...celdaMonto, color: 'var(--ink-soft)', fontWeight: 500 }}>{money(taskBaseLaborCost)}</td>
                </tr>
              )}
              {additionalsCosts.laborCost > 0 && (
                <tr style={filaBase}>
                  <td colSpan={4} className="py-2 pr-3">Mano de obra de adicionales</td>
                  <td className="py-2" style={celdaMonto}>{money(additionalsCosts.laborCost)}</td>
                </tr>
              )}
              <tr style={{ borderTop: '1.4px solid var(--hair-strong)' }}>
                <td colSpan={4} className="py-2 pr-3 font-semibold">Subtotal mano de obra</td>
                <td className="py-2" style={celdaMonto}>{money(totalLaborCost)}</td>
              </tr>

              <tr style={{ borderTop: '1.6px solid var(--hair-strong)' }}>
                <td colSpan={4} className="py-3 pr-3 text-base font-bold">Instalación total</td>
                <td className="py-3 text-base" style={{ ...celdaMonto, fontWeight: 700 }}>{money(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Roles y tareas */}
      {filasRoles.length > 0 && (
        <Panel titulo="Mano de obra por rol">
          <p className="mb-3 text-xs" style={{ color: 'var(--ink-soft)' }}>
            Detalle informativo: estos valores ya están incluidos en la instalación base.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em]" style={{ color: 'var(--ink-soft)' }}>
                  <td className="py-1 pr-3">Rol</td>
                  <td className="py-1 pr-3" style={{ textAlign: 'right' }}>Tareas</td>
                  <td className="py-1 pr-3" style={{ textAlign: 'right' }}>Horas</td>
                  <td className="py-1" style={{ textAlign: 'right' }}>Costo</td>
                </tr>
              </thead>
              <tbody>
                {filasRoles.map((fila) => (
                  <tr key={fila.nombre} style={filaBase}>
                    <td className="py-2 pr-3">{fila.nombre}</td>
                    <td className="py-2 pr-3" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fila.tasksCount}</td>
                    <td className="py-2 pr-3" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fila.hours.toFixed(0)} hs</td>
                    <td className="py-2" style={celdaMonto}>{money(fila.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Adicionales itemizados */}
      {filasAdicionales.length > 0 && (
        <Panel titulo="Adicionales y equipos">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em]" style={{ color: 'var(--ink-soft)' }}>
                  <td className="py-1 pr-3">Ítem</td>
                  <td className="py-1 pr-3" style={{ textAlign: 'right' }}>Cantidad</td>
                  <td className="py-1 pr-3" style={{ textAlign: 'right' }}>Material</td>
                  <td className="py-1 pr-3" style={{ textAlign: 'right' }}>M. de obra</td>
                  <td className="py-1" style={{ textAlign: 'right' }}>Total</td>
                </tr>
              </thead>
              <tbody>
                {filasAdicionales.map((fila) => (
                  <tr key={fila.id || fila.nombre} style={filaBase}>
                    <td className="py-2 pr-3">{fila.nombre}</td>
                    <td className="py-2 pr-3" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fila.cantidad} {fila.unidad}</td>
                    <td className="py-2 pr-3" style={{ ...celdaMonto, fontWeight: 500 }}>{money(fila.material)}</td>
                    <td className="py-2 pr-3" style={{ ...celdaMonto, fontWeight: 500 }}>{fila.manoObra > 0 ? money(fila.manoObra) : '—'}</td>
                    <td className="py-2" style={celdaMonto}>{money(fila.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Fuera del scroll horizontal: el subtotal se ve siempre, también en el teléfono */}
          <div
            className="mt-1 flex items-center justify-between gap-3 pt-2 text-sm font-semibold"
            style={{ borderTop: '1.4px solid var(--hair-strong)' }}
          >
            <span>Subtotal adicionales</span>
            <span style={celdaMonto}>{money(additionalsCosts.materialCost + additionalsCosts.laborCost)}</span>
          </div>
        </Panel>
      )}

      {/* Auditoría, plegada */}
      <details
        className="rounded-2xl"
        style={{ backgroundColor: 'var(--card)', border: '1.6px solid var(--hair-strong)' }}
      >
        <summary
          className="cursor-pointer list-none px-4 py-4 text-sm font-semibold sm:px-6 [&::-webkit-details-marker]:hidden"
          style={{ color: 'var(--accent)' }}
        >
          Auditoría de costos (control interno)
        </summary>
        <div className="px-4 pb-4 sm:px-6" style={{ borderTop: '1.3px dashed var(--hair)' }}>
          <div className="overflow-x-auto pt-3">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td colSpan={4} className="py-2 pr-3">Base persistida en el proyecto</td>
                  <td className="py-2" style={celdaMonto}>{money(persistedMaterialCost)}</td>
                </tr>
                <tr style={filaBase}>
                  <td colSpan={4} className="py-2 pr-3">Hidráulica + eléctrica</td>
                  <td className="py-2" style={celdaMonto}>{money(plumbingCosts + electricalCosts)}</td>
                </tr>
                <tr style={filaBase}>
                  <td colSpan={4} className="py-2 pr-3">Adicionales activos (sin duplicados)</td>
                  <td className="py-2" style={celdaMonto}>{money(additionalsCosts.materialCost)}</td>
                </tr>
                <tr style={filaBase}>
                  <td colSpan={4} className="py-2 pr-3">
                    Duplicados descartados
                    <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>
                      {duplicatedAdditionals.length} adicional(es) ya representados en hidráulica o eléctrica
                    </span>
                  </td>
                  <td className="py-2" style={{ ...celdaMonto, color: 'var(--ink-soft)', fontWeight: 500 }}>{money(duplicatedAdditionalsCosts.materialCost)}</td>
                </tr>
                <tr style={filaBase}>
                  <td colSpan={4} className="py-2 pr-3">Materiales auditados (antes de adicionales)</td>
                  <td className="py-2" style={celdaMonto}>{money(baseMaterialCost)}</td>
                </tr>
                <tr style={{ borderTop: '1.4px solid var(--hair-strong)' }}>
                  <td colSpan={4} className="py-2 pr-3 font-semibold">Total auditado</td>
                  <td className="py-2" style={celdaMonto}>{money(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {duplicatedAdditionals.length > 0 && (
            <p className="mt-3 text-xs" style={{ color: 'var(--ink-soft)' }}>
              Descartados: {duplicatedAdditionals.map((additional: any) => `${getAdditionalName(additional)} x${additional.newQuantity || 0}`).join(' · ')}
            </p>
          )}
        </div>
      </details>
    </div>
  );
};
