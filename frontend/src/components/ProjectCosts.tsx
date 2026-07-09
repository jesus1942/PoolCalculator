import React, { useEffect, useMemo, useState } from 'react';
import { Project } from '@/types';
import { calculateProjectFinancials, getAdditionalName } from '@/utils/projectCosting';
import { additionalsService } from '@/services/additionalsService';
import api from '@/services/api';
import { HdEye, HdEyeOff, HdSave } from '@/components/ui/HandDrawnIcons';

// Pestaña "Costos": TODOS los valores del proyecto en un solo lugar, en tablas.
// Desde acá también se EDITAN los valores económicos (mano de obra por tarea,
// precios de adicionales/equipos y tarifas por rol): las demás pestañas solo
// agregan o quitan cosas, sin plata. Sin chips ni badges.

interface ProjectCostsProps {
  project: Project;
  roles: any[];
  rolesCostSummary: Record<string, { hours: number; cost: number; tasksCount: number }>;
  additionals: any[];
  canEdit?: boolean;
  onSaveTasks?: (tasks: any) => Promise<void>;
  onReload?: () => void;
}

const filaBase: React.CSSProperties = { borderTop: '1.2px dashed var(--hair)' };
const celdaMonto: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, whiteSpace: 'nowrap' };

const inputMonto: React.CSSProperties = {
  width: '9.5rem',
  maxWidth: '40vw',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  backgroundColor: 'var(--card2)',
  border: '1.4px solid var(--hair-strong)',
  borderRadius: '10px',
  color: 'var(--ink)',
  padding: '6px 10px',
  font: 'inherit',
};

const CATEGORIAS_TAREAS: Record<string, string> = {
  excavation: 'Excavación',
  preparation: 'Preparación',
  installation: 'Instalación',
  plumbing: 'Plomería',
  electrical: 'Eléctrica',
  finishing: 'Terminaciones',
  additionals: 'Adicionales',
};

const etiquetaCategoria = (clave: string) =>
  CATEGORIAS_TAREAS[clave] || clave.charAt(0).toUpperCase() + clave.slice(1);

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

const Panel: React.FC<{ titulo?: string; nota?: string; children: React.ReactNode }> = ({ titulo, nota, children }) => (
  <section
    className="rounded-2xl p-4 sm:p-6"
    style={{ backgroundColor: 'var(--card)', border: '1.6px solid var(--hair-strong)' }}
  >
    {titulo && (
      <h3
        className="mb-1 text-base font-semibold"
        style={{ color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace" }}
      >
        {titulo}
      </h3>
    )}
    {nota && (
      <p className="mb-3 text-xs" style={{ color: 'var(--ink-soft)' }}>{nota}</p>
    )}
    {!nota && titulo && <div className="mb-3" />}
    {children}
  </section>
);

const BotonGuardar: React.FC<{ onClick: () => void; guardando: boolean; children: React.ReactNode }> = ({ onClick, guardando, children }) => (
  <div className="mt-3 flex justify-end">
    <button
      type="button"
      onClick={onClick}
      disabled={guardando}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
      style={{ backgroundColor: 'var(--accent)', color: 'var(--paper)' }}
    >
      <HdSave size={16} />
      <span>{guardando ? 'Guardando...' : children}</span>
    </button>
  </div>
);

export const ProjectCosts: React.FC<ProjectCostsProps> = ({
  project,
  roles,
  rolesCostSummary,
  additionals,
  canEdit = false,
  onSaveTasks,
  onReload,
}) => {
  const [mostrar, setMostrar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

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
    tileLaborCost,
    grandTotal,
  } = financials;

  const persistedMaterialCost = Number(project.materialCost || 0);

  // Redondeado a pesos: los centavos solo ensucian la lectura.
  const money = (valor: number) => (mostrar ? `$ ${Math.round(valor).toLocaleString('es-AR')}` : '••••••');

  const avisar = (mensaje: string) => {
    setAviso(mensaje);
    setError(null);
    window.setTimeout(() => setAviso(null), 4000);
  };

  // ── Mano de obra por tarea (editable) ─────────────────────────────────────
  const tareasProyecto = (project.tasks as any) || {};
  const categoriasTareas = Object.entries(tareasProyecto).filter(
    ([, lista]) => Array.isArray(lista) && (lista as any[]).length > 0,
  ) as Array<[string, any[]]>;

  const [borradorTareas, setBorradorTareas] = useState<Record<string, string>>({});
  const [guardandoTareas, setGuardandoTareas] = useState(false);

  useEffect(() => {
    setBorradorTareas({});
  }, [project.tasks]);

  const claveTarea = (categoria: string, index: number) => `${categoria}::${index}`;

  const valorTarea = (categoria: string, index: number, tarea: any) => {
    const clave = claveTarea(categoria, index);
    return borradorTareas[clave] !== undefined ? borradorTareas[clave] : String(tarea.laborCost || 0);
  };

  const guardarTareas = async () => {
    if (!onSaveTasks) return;
    setGuardandoTareas(true);
    setError(null);
    try {
      const nuevasTareas: Record<string, any[]> = {};
      for (const [categoria, lista] of Object.entries(tareasProyecto)) {
        if (!Array.isArray(lista)) {
          nuevasTareas[categoria] = lista as any;
          continue;
        }
        nuevasTareas[categoria] = (lista as any[]).map((tarea, index) => {
          const clave = claveTarea(categoria, index);
          if (borradorTareas[clave] === undefined) return tarea;
          const parseado = Number(borradorTareas[clave]);
          return { ...tarea, laborCost: Number.isFinite(parseado) && parseado >= 0 ? parseado : tarea.laborCost || 0 };
        });
      }
      await onSaveTasks(nuevasTareas);
      setBorradorTareas({});
      avisar('Mano de obra guardada.');
    } catch (err) {
      setError('No se pudo guardar la mano de obra.');
    } finally {
      setGuardandoTareas(false);
    }
  };

  // ── Adicionales (precios editables por unidad) ────────────────────────────
  const [borradorAdicionales, setBorradorAdicionales] = useState<Record<string, { material?: string; manoObra?: string }>>({});
  const [guardandoAdicionales, setGuardandoAdicionales] = useState(false);

  useEffect(() => {
    setBorradorAdicionales({});
  }, [additionals]);

  const filasAdicionales = useMemo(
    () =>
      additionals
        .filter((additional: any) => (additional.newQuantity || 0) > 0)
        .map((additional: any) => {
          const cantidad = additional.newQuantity || 0;
          const unitCatalogo =
            additional.accessory?.pricePerUnit ??
            additional.equipment?.pricePerUnit ??
            additional.material?.pricePerUnit ??
            0;
          const unitMaterial =
            typeof additional.customPricePerUnit === 'number' && additional.customPricePerUnit > 0
              ? additional.customPricePerUnit
              : unitCatalogo;
          const unitManoObra =
            typeof additional.customLaborCost === 'number' && additional.customLaborCost > 0
              ? additional.customLaborCost
              : 0;
          return {
            id: additional.id as string,
            nombre: getAdditionalName(additional),
            unidad: additional.customUnit || 'u.',
            cantidad,
            unitMaterial,
            unitManoObra,
          };
        }),
    [additionals],
  );

  const valorAdicional = (fila: { id: string; unitMaterial: number; unitManoObra: number }, campo: 'material' | 'manoObra') => {
    const borrador = borradorAdicionales[fila.id]?.[campo];
    if (borrador !== undefined) return borrador;
    return String(campo === 'material' ? fila.unitMaterial : fila.unitManoObra);
  };

  const totalFilaAdicional = (fila: { id: string; cantidad: number; unitMaterial: number; unitManoObra: number }) => {
    const material = Number(valorAdicional(fila, 'material'));
    const manoObra = Number(valorAdicional(fila, 'manoObra'));
    const unitMaterial = Number.isFinite(material) ? material : fila.unitMaterial;
    const unitManoObra = Number.isFinite(manoObra) ? manoObra : fila.unitManoObra;
    return fila.cantidad * (unitMaterial + unitManoObra);
  };

  const guardarAdicionales = async () => {
    setGuardandoAdicionales(true);
    setError(null);
    try {
      const cambios = Object.entries(borradorAdicionales);
      for (const [idAdicional, campos] of cambios) {
        const payload: Record<string, number> = {};
        if (campos.material !== undefined) {
          const parseado = Number(campos.material);
          if (Number.isFinite(parseado) && parseado >= 0) payload.customPricePerUnit = parseado;
        }
        if (campos.manoObra !== undefined) {
          const parseado = Number(campos.manoObra);
          if (Number.isFinite(parseado) && parseado >= 0) payload.customLaborCost = parseado;
        }
        if (Object.keys(payload).length > 0) {
          await additionalsService.updateAdditional(idAdicional, payload);
        }
      }
      setBorradorAdicionales({});
      onReload?.();
      avisar('Precios de adicionales guardados.');
    } catch (err) {
      setError('No se pudieron guardar los precios de adicionales.');
    } finally {
      setGuardandoAdicionales(false);
    }
  };

  // ── Tarifas por rol (editable, configuración global del usuario) ─────────
  const [borradorRoles, setBorradorRoles] = useState<Record<string, string>>({});
  const [guardandoRoles, setGuardandoRoles] = useState(false);

  useEffect(() => {
    setBorradorRoles({});
  }, [roles]);

  const tarifaDeRol = (role: any): { etiqueta: string; valor: number; campo: string } => {
    const tipo = role.billingType || 'HOUR';
    if (tipo === 'DAY') return { etiqueta: '$ por día', valor: Number(role.dailyRate || 0), campo: 'dailyRate' };
    if (tipo === 'M2') return { etiqueta: '$ por m²', valor: Number(role.ratePerUnit || 0), campo: 'ratePerUnit' };
    if (tipo === 'ML') return { etiqueta: '$ por ml', valor: Number(role.ratePerUnit || 0), campo: 'ratePerUnit' };
    if (tipo === 'BOCA') return { etiqueta: '$ por boca', valor: Number(role.bocaRates?.[0]?.price || 0), campo: 'boca' };
    return { etiqueta: '$ por hora', valor: Number(role.hourlyRate || 0), campo: 'hourlyRate' };
  };

  const guardarRoles = async () => {
    setGuardandoRoles(true);
    setError(null);
    try {
      // Agrupar borradores por rol: claves "roleId" (tarifa simple) y
      // "roleId::boca::<índice>" (tarifas por boca).
      const cambiosPorRol = new Map<string, { simple?: string; bocas: Record<number, string> }>();
      for (const [clave, valor] of Object.entries(borradorRoles)) {
        const [roleId, tipo, indice] = clave.split('::');
        const actual = cambiosPorRol.get(roleId) || { bocas: {} };
        if (tipo === 'boca') {
          actual.bocas[Number(indice)] = valor;
        } else {
          actual.simple = valor;
        }
        cambiosPorRol.set(roleId, actual);
      }

      for (const [roleId, cambios] of cambiosPorRol.entries()) {
        const role = roles.find((item: any) => item.id === roleId);
        if (!role) continue;

        const payload: Record<string, any> = {
          name: role.name,
          description: role.description || '',
          billingType: role.billingType || 'HOUR',
          hourlyRate: role.hourlyRate ?? null,
          dailyRate: role.dailyRate ?? null,
          ratePerUnit: role.ratePerUnit ?? null,
        };

        if (cambios.simple !== undefined) {
          const parseado = Number(cambios.simple);
          if (Number.isFinite(parseado) && parseado >= 0) {
            const tarifa = tarifaDeRol(role);
            if (tarifa.campo !== 'boca') {
              payload[tarifa.campo] = parseado;
              if (tarifa.campo === 'hourlyRate') payload.dailyRate = parseado * 8;
            }
          }
        }

        if (Object.keys(cambios.bocas).length > 0 && Array.isArray(role.bocaRates)) {
          payload.bocaRates = role.bocaRates.map((rate: any, indice: number) => {
            const nuevo = cambios.bocas[indice];
            if (nuevo === undefined) return rate;
            const parseado = Number(nuevo);
            return Number.isFinite(parseado) && parseado >= 0 ? { ...rate, price: parseado } : rate;
          });
        }

        await api.put(`/profession-roles/${roleId}`, payload);
      }
      setBorradorRoles({});
      onReload?.();
      avisar('Tarifas por rol guardadas. Aplican a las próximas tareas que se generen.');
    } catch (err) {
      setError('No se pudieron guardar las tarifas por rol.');
    } finally {
      setGuardandoRoles(false);
    }
  };

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

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ border: '1.4px solid var(--bad)', color: 'var(--bad)' }}>
          {error}
        </div>
      )}
      {aviso && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ border: '1.4px solid var(--accent)', color: 'var(--accent)' }}>
          {aviso}
        </div>
      )}

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
              {tileLaborCost > 0 && (
                <tr style={filaBase}>
                  <td colSpan={4} className="py-2 pr-3">
                    Colocación de losetas (vereda)
                    <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>Calculada desde la pestaña Losetas</span>
                  </td>
                  <td className="py-2" style={celdaMonto}>{money(tileLaborCost)}</td>
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

      {/* Mano de obra por tarea (edición) */}
      {canEdit && categoriasTareas.length > 0 && (
        <Panel
          titulo="Mano de obra por tarea"
          nota="Acá se cargan los valores de cada tarea. En la pestaña Tareas se agregan, quitan y asignan, sin plata."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <tbody>
                {categoriasTareas.map(([categoria, lista]) => (
                  <React.Fragment key={categoria}>
                    <Grupo titulo={etiquetaCategoria(categoria)} />
                    {lista.map((tarea: any, index: number) => (
                      <tr key={tarea.id || `${categoria}-${index}`} style={filaBase}>
                        <td colSpan={3} className="py-2 pr-3">
                          {tarea.name}
                          {tarea.estimatedHours ? (
                            <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>{tarea.estimatedHours} hs estimadas</span>
                          ) : null}
                        </td>
                        <td colSpan={2} className="py-2" style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={valorTarea(categoria, index, tarea)}
                            onChange={(event) =>
                              setBorradorTareas((prev) => ({ ...prev, [claveTarea(categoria, index)]: event.target.value }))
                            }
                            style={inputMonto}
                            aria-label={`Mano de obra de ${tarea.name}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {Object.keys(borradorTareas).length > 0 && (
            <BotonGuardar onClick={guardarTareas} guardando={guardandoTareas}>Guardar mano de obra</BotonGuardar>
          )}
        </Panel>
      )}

      {/* Roles: resumen del proyecto + tarifas editables */}
      {(filasRoles.length > 0 || (canEdit && roles.length > 0)) && (
        <Panel
          titulo="Roles"
          nota={canEdit
            ? 'El costo por rol de este proyecto ya está incluido en la instalación base. Las tarifas son tu configuración general y alimentan las tareas nuevas.'
            : 'Detalle informativo: estos valores ya están incluidos en la instalación base.'}
        >
          {filasRoles.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.1em]" style={{ color: 'var(--ink-soft)' }}>
                    <td className="py-1 pr-3">Rol en este proyecto</td>
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
          )}

          {canEdit && roles.length > 0 && (
            <>
              <p className="mt-5 mb-2 text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--ink-soft)' }}>
                Tarifas por rol
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <tbody>
                    {roles.map((role: any) => {
                      const tarifa = tarifaDeRol(role);
                      if (tarifa.campo === 'boca') {
                        const bocaRates = Array.isArray(role.bocaRates) ? role.bocaRates : [];
                        return (
                          <React.Fragment key={role.id}>
                            {bocaRates.map((rate: any, indice: number) => {
                              const claveBoca = `${role.id}::boca::${indice}`;
                              return (
                                <tr key={claveBoca} style={filaBase}>
                                  <td colSpan={3} className="py-2 pr-3">
                                    {role.name}
                                    <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>$ por boca · {rate.label}</span>
                                  </td>
                                  <td colSpan={2} className="py-2" style={{ textAlign: 'right' }}>
                                    <input
                                      type="number"
                                      min={0}
                                      inputMode="numeric"
                                      value={borradorRoles[claveBoca] !== undefined ? borradorRoles[claveBoca] : String(Number(rate.price || 0))}
                                      onChange={(event) => setBorradorRoles((prev) => ({ ...prev, [claveBoca]: event.target.value }))}
                                      style={inputMonto}
                                      aria-label={`Tarifa de ${role.name} por ${rate.label}`}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      }
                      return (
                        <tr key={role.id} style={filaBase}>
                          <td colSpan={3} className="py-2 pr-3">
                            {role.name}
                            <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>{tarifa.etiqueta}</span>
                          </td>
                          <td colSpan={2} className="py-2" style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              value={borradorRoles[role.id] !== undefined ? borradorRoles[role.id] : String(tarifa.valor)}
                              onChange={(event) => setBorradorRoles((prev) => ({ ...prev, [role.id]: event.target.value }))}
                              style={inputMonto}
                              aria-label={`Tarifa de ${role.name}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {Object.keys(borradorRoles).length > 0 && (
                <BotonGuardar onClick={guardarRoles} guardando={guardandoRoles}>Guardar tarifas</BotonGuardar>
              )}
            </>
          )}
        </Panel>
      )}

      {/* Adicionales itemizados (precios editables) */}
      {filasAdicionales.length > 0 && (
        <Panel
          titulo="Adicionales y equipos"
          nota={canEdit ? 'Precios por unidad. Las cantidades se manejan desde la pestaña Adicionales.' : undefined}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em]" style={{ color: 'var(--ink-soft)' }}>
                  <td className="py-1 pr-3">Ítem</td>
                  <td className="py-1 pr-3" style={{ textAlign: 'right' }}>Cantidad</td>
                  <td className="py-1 pr-3" style={{ textAlign: 'right' }}>Material ($/u.)</td>
                  <td className="py-1 pr-3" style={{ textAlign: 'right' }}>M. de obra ($/u.)</td>
                  <td className="py-1" style={{ textAlign: 'right' }}>Total</td>
                </tr>
              </thead>
              <tbody>
                {filasAdicionales.map((fila) => (
                  <tr key={fila.id || fila.nombre} style={filaBase}>
                    <td className="py-2 pr-3">{fila.nombre}</td>
                    <td className="py-2 pr-3" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fila.cantidad} {fila.unidad}</td>
                    {canEdit ? (
                      <>
                        <td className="py-2 pr-3" style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={valorAdicional(fila, 'material')}
                            onChange={(event) =>
                              setBorradorAdicionales((prev) => ({
                                ...prev,
                                [fila.id]: { ...prev[fila.id], material: event.target.value },
                              }))
                            }
                            style={{ ...inputMonto, width: '7.5rem' }}
                            aria-label={`Precio de material de ${fila.nombre}`}
                          />
                        </td>
                        <td className="py-2 pr-3" style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={valorAdicional(fila, 'manoObra')}
                            onChange={(event) =>
                              setBorradorAdicionales((prev) => ({
                                ...prev,
                                [fila.id]: { ...prev[fila.id], manoObra: event.target.value },
                              }))
                            }
                            style={{ ...inputMonto, width: '7.5rem' }}
                            aria-label={`Mano de obra de ${fila.nombre}`}
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 pr-3" style={{ ...celdaMonto, fontWeight: 500 }}>{money(fila.unitMaterial)}</td>
                        <td className="py-2 pr-3" style={{ ...celdaMonto, fontWeight: 500 }}>{fila.unitManoObra > 0 ? money(fila.unitManoObra) : '—'}</td>
                      </>
                    )}
                    <td className="py-2" style={celdaMonto}>{money(totalFilaAdicional(fila))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className="mt-1 flex items-center justify-between gap-3 pt-2 text-sm font-semibold"
            style={{ borderTop: '1.4px solid var(--hair-strong)' }}
          >
            <span>Subtotal adicionales</span>
            <span style={celdaMonto}>{money(additionalsCosts.materialCost + additionalsCosts.laborCost)}</span>
          </div>
          {canEdit && Object.keys(borradorAdicionales).length > 0 && (
            <BotonGuardar onClick={guardarAdicionales} guardando={guardandoAdicionales}>Guardar precios</BotonGuardar>
          )}
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
