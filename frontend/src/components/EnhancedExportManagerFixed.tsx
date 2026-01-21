import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Project } from '@/types';
import { plumbingCalculationService } from '@/services/plumbingCalculationService';
import { projectService } from '@/services/projectService';
import { PoolVisualizationCanvas } from '@/components/PoolVisualizationCanvas';
import { FileText, FileSpreadsheet, Download, Printer, Briefcase, User, Wrench, DollarSign, MessageCircle, FileDown, File } from 'lucide-react';
import api from '@/services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

interface EnhancedExportManagerProps {
  project: Project;
}

type ExportTemplate = 'client' | 'professional' | 'materials' | 'complete' | 'budget' | 'overview';

export const EnhancedExportManager: React.FC<EnhancedExportManagerProps> = ({ project }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate>('client');
  const [roles, setRoles] = useState<any[]>([]);
  const [projectUpdates, setProjectUpdates] = useState<any[]>([]);
  const [exportingToExcel, setExportingToExcel] = useState(false);
  const [showExcelDialog, setShowExcelDialog] = useState(false);
  const [equipmentRecommendation, setEquipmentRecommendation] = useState<any>(null);
  const [calculatedElectricalSpecs, setCalculatedElectricalSpecs] = useState<any>(null);
  const [calculatedSidewalkArea, setCalculatedSidewalkArea] = useState<number>(0);
  const poolCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedSections, setSelectedSections] = useState({
    header: true,
    characteristics: true,
    includes: true,
    additionals: true,
    costs: true,
    conditions: true,
  });
  const [excelSections, setExcelSections] = useState({
    excavation: true,
    supportBed: true,
    sidewalk: true,
    plumbing: true,
    electrical: true,
    labor: true,
    sequence: true,
    standards: true,
  });

  useEffect(() => {
    loadRoles();
    loadProjectUpdates();
    loadEquipmentRecommendations();
  }, []);

  const loadRoles = async () => {
    try {
      const response = await api.get('/profession-roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error al cargar roles:', error);
    }
  };

  const loadProjectUpdates = async () => {
    try {
      const response = await api.get(`/project-updates/project/${project.id}`);
      setProjectUpdates(response.data);
    } catch (error) {
      console.error('Error al cargar actualizaciones:', error);
    }
  };

  const loadEquipmentRecommendations = async () => {
    try {
      const poolPreset = project.poolPreset;
      const params = new URLSearchParams({
        poolVolume: (project.volume * 1000).toString(),
        hasSkimmer: (poolPreset?.hasSkimmer || true).toString(),
        skimmerCount: (poolPreset?.skimmerCount || 1).toString(),
        hasLighting: (poolPreset?.hasLighting || false).toString(),
        lightingCount: (poolPreset?.lightingCount || 0).toString(),
        returnsCount: (poolPreset?.returnsCount || 2).toString(),
        hasVacuumIntake: (poolPreset?.hasVacuumIntake || true).toString(),
        vacuumIntakeCount: (poolPreset?.vacuumIntakeCount || 1).toString(),
        distanceToPanel: '15',
      });

      const response = await api.get(`/equipment/recommendations?${params.toString()}`);
      setEquipmentRecommendation(response.data);
      setCalculatedElectricalSpecs(response.data.electricalSpecs);

      const sidewalkArea = calculateSidewalkArea();
      setCalculatedSidewalkArea(sidewalkArea);
    } catch (error) {
      console.error('Error al cargar recomendaciones de equipos:', error);
    }
  };

  const calculateSidewalkArea = (): number => {
    if (project.sidewalkArea && project.sidewalkArea > 0) {
      return project.sidewalkArea;
    }

    const poolPreset = project.poolPreset;
    if (!poolPreset) return 0;

    const poolLength = poolPreset.length || 0;
    const poolWidth = poolPreset.width || 0;
    const tileWidth = 0.30;

    const firstRingPerimeter = 2 * (poolLength + poolWidth);
    const firstRingArea = firstRingPerimeter * tileWidth;

    return firstRingArea;
  };

  const getRolesCostSummary = () => {
    const summary: Record<string, { hours: number; cost: number; tasksCount: number; roleName: string }> = {};
    const tasks = project.tasks as any;

    if (tasks && Object.keys(tasks).length > 0) {
      Object.values(tasks).forEach((categoryTasks: any) => {
        if (Array.isArray(categoryTasks)) {
          categoryTasks.forEach((task: any) => {
            if (task.assignedRoleId) {
              if (!summary[task.assignedRoleId]) {
                const role = roles.find(r => r.id === task.assignedRoleId);
                summary[task.assignedRoleId] = {
                  hours: 0,
                  cost: 0,
                  tasksCount: 0,
                  roleName: role?.name || task.assignedRole || 'Sin nombre'
                };
              }
              summary[task.assignedRoleId].hours += task.estimatedHours || 0;
              summary[task.assignedRoleId].cost += task.laborCost || 0;
              summary[task.assignedRoleId].tasksCount += 1;
            }
          });
        }
      });
    }

    return summary;
  };

  const templates = [
    {
      id: 'client' as ExportTemplate,
      name: 'Presupuesto Cliente',
      description: 'Documento simplificado con costos e información esencial para presentar al cliente',
      icon: User,
    },
    {
      id: 'professional' as ExportTemplate,
      name: 'Especificaciones Técnicas',
      description: 'Documento técnico detallado para profesionales de construcción',
      icon: Briefcase,
    },
    {
      id: 'materials' as ExportTemplate,
      name: 'Lista de Materiales',
      description: 'Listado completo de materiales necesarios para el proyecto',
      icon: Wrench,
    },
    {
      id: 'budget' as ExportTemplate,
      name: 'Presupuesto Detallado',
      description: 'Presupuesto completo con costos unitarios y subtotales',
      icon: DollarSign,
    },
    {
      id: 'complete' as ExportTemplate,
      name: 'Reporte Completo',
      description: 'Documentación integral del proyecto con todos los detalles',
      icon: FileText,
    },
    {
      id: 'overview' as ExportTemplate,
      name: 'Vista General',
      description: 'Resumen ejecutivo del proyecto',
      icon: File,
    },
  ];

  const calculateCosts = () => {
    const additionals = (project as any).additionals || [];
    const plumbingConfig = project.plumbingConfig as any;

    const additionalsCosts = additionals.reduce((acc: any, additional: any) => {
      const quantity = additional.newQuantity || 0;
      let materialCost = 0;
      let laborCost = 0;

      if (additional.customPricePerUnit) {
        materialCost = additional.customPricePerUnit * quantity;
        laborCost = (additional.customLaborCost || 0) * quantity;
      } else if (additional.accessory) {
        materialCost = additional.accessory.pricePerUnit * quantity;
      } else if (additional.equipment) {
        materialCost = additional.equipment.pricePerUnit * quantity;
      } else if (additional.material) {
        materialCost = additional.material.pricePerUnit * quantity;
      }

      return {
        materialCost: acc.materialCost + materialCost,
        laborCost: acc.laborCost + laborCost,
      };
    }, { materialCost: 0, laborCost: 0 });

    const plumbingCosts = plumbingConfig?.selectedItems
      ? plumbingConfig.selectedItems.reduce((sum: number, item: any) => sum + (item.quantity * item.pricePerUnit), 0)
      : 0;

    const totalMaterialCost = project.materialCost + additionalsCosts.materialCost + plumbingCosts;
    const totalLaborCost = project.laborCost + additionalsCosts.laborCost;
    const grandTotal = totalMaterialCost + totalLaborCost;

    return {
      additionals,
      additionalsCosts,
      plumbingCosts,
      totalMaterialCost,
      totalLaborCost,
      grandTotal,
    };
  };

  const generateClientBudget = () => {
    const { additionalsCosts, plumbingCosts, totalMaterialCost, totalLaborCost, grandTotal } = calculateCosts();

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Presupuesto - ${project.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f9fafb;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      background: #2563eb;
      color: white;
      padding: 30px 40px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .subtitle {
      font-size: 16px;
      opacity: 0.9;
    }
    .date {
      font-size: 13px;
      opacity: 0.7;
      margin-top: 10px;
    }
    .content {
      padding: 40px;
    }
    .section {
      margin: 30px 0;
      page-break-inside: avoid;
    }
    .section h2 {
      color: #1e40af;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 10px;
      margin-bottom: 20px;
      font-size: 20px;
      font-weight: 600;
    }
    .content-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 30px;
      margin: 20px 0;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 20px 0;
    }
    .info-item {
      padding: 15px;
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
    }
    .info-label {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
      font-weight: 500;
    }
    .info-value {
      font-size: 15px;
      font-weight: 600;
      color: #1f2937;
    }
    .features-list {
      list-style: none;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .features-list li {
      padding: 10px 15px;
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
      font-size: 14px;
    }
    .cost-section {
      background: #eff6ff;
      padding: 25px;
      margin: 20px 0;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
    }
    .cost-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #bfdbfe;
    }
    .cost-row:last-child {
      border-bottom: none;
    }
    .cost-label {
      font-weight: 500;
      color: #4b5563;
      font-size: 15px;
    }
    .cost-value {
      font-weight: 600;
      color: #1f2937;
      font-size: 15px;
    }
    .total-row {
      background: #2563eb;
      color: white;
      padding: 20px;
      margin-top: 15px;
      font-size: 22px;
      font-weight: 700;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .conditions-list {
      list-style: none;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .conditions-list li {
      padding: 10px 15px;
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
      font-size: 14px;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">POOL CALCULATOR</div>
      <p class="subtitle">Presupuesto de Construcción de Piscina</p>
      <p class="date">${new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="content">
      <div class="section">
        <h2>Información del Cliente</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Cliente</div>
            <div class="info-value">${project.clientName}</div>
          </div>
          ${project.clientEmail ? `<div class="info-item"><div class="info-label">Email</div><div class="info-value">${project.clientEmail}</div></div>` : ''}
          ${project.clientPhone ? `<div class="info-item"><div class="info-label">Teléfono</div><div class="info-value">${project.clientPhone}</div></div>` : ''}
          ${project.location ? `<div class="info-item"><div class="info-label">Ubicación</div><div class="info-value">${project.location}</div></div>` : ''}
        </div>
      </div>

      <div class="section">
        <h2>Descripción del Proyecto</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Nombre del Proyecto</div>
            <div class="info-value">${project.name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Modelo de Piscina</div>
            <div class="info-value">${project.poolPreset?.name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Dimensiones</div>
            <div class="info-value">${project.poolPreset?.length}m x ${project.poolPreset?.width}m x ${project.poolPreset?.depth}m</div>
          </div>
          <div class="info-item">
            <div class="info-label">Volumen</div>
            <div class="info-value">${project.volume.toFixed(2)} m³</div>
          </div>
          <div class="info-item">
            <div class="info-label">Forma</div>
            <div class="info-value">${project.poolPreset?.shape || 'RECTANGULAR'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Área de Espejo de Agua</div>
            <div class="info-value">${project.waterMirrorArea.toFixed(2)} m²</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Alcance del Proyecto</h2>
        <ul class="features-list">
          <li>Excavación y preparación del terreno</li>
          <li>Instalación de la piscina de fibra de vidrio</li>
          <li>Sistema de filtración completo</li>
          <li>Instalación hidráulica (${project.poolPreset?.returnsCount} retornos, ${project.poolPreset?.skimmerCount} skimmers)</li>
          ${project.poolPreset?.hasLighting ? `<li>Iluminación LED (${project.poolPreset.lightingCount} unidades)</li>` : ''}
          ${project.poolPreset?.hasBottomDrain ? `<li>Desagüe de fondo</li>` : ''}
          ${project.poolPreset?.hasVacuumIntake ? `<li>Toma de limpiafondos</li>` : ''}
          <li>Vereda perimetral (${(calculatedSidewalkArea || project.sidewalkArea || 0).toFixed(2)} m²)</li>
          <li>Materiales de construcción completos</li>
          ${equipmentRecommendation ? `<li>Bomba de filtrado ${equipmentRecommendation.pump.name}</li>` : ''}
          ${equipmentRecommendation ? `<li>Filtro de arena ${equipmentRecommendation.filter.name}</li>` : ''}
        </ul>
      </div>

      <div class="section">
        <h2>Detalle de Costos</h2>
        <div class="cost-section">
          <div class="cost-row">
            <span class="cost-label">Materiales Base</span>
            <span class="cost-value">$ ${project.materialCost.toLocaleString('es-AR')}</span>
          </div>
          ${plumbingCosts > 0 ? `<div class="cost-row"><span class="cost-label">Plomería</span><span class="cost-value">$ ${plumbingCosts.toLocaleString('es-AR')}</span></div>` : ''}
          ${additionalsCosts.materialCost > 0 ? `<div class="cost-row"><span class="cost-label">Adicionales</span><span class="cost-value">$ ${additionalsCosts.materialCost.toLocaleString('es-AR')}</span></div>` : ''}
          <div class="cost-row" style="font-weight: 600;">
            <span class="cost-label">Total Materiales</span>
            <span class="cost-value">$ ${totalMaterialCost.toLocaleString('es-AR')}</span>
          </div>
          <div class="cost-row" style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e0e0e0;">
            <span class="cost-label">Mano de Obra</span>
            <span class="cost-value">$ ${totalLaborCost.toLocaleString('es-AR')}</span>
          </div>
          <div class="total-row">
            <span>INVERSIÓN TOTAL</span>
            <span>$ ${grandTotal.toLocaleString('es-AR')}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Condiciones Comerciales</h2>
        <ul class="conditions-list">
          <li>Presupuesto válido por 30 días corridos</li>
          <li>Plazo de ejecución: 15-20 días hábiles</li>
          <li>Forma de pago: 50% al inicio de obra, 50% a la finalización</li>
          <li>Garantía: 1 año en mano de obra, según fabricante en equipos</li>
          <li>No incluye: Conexión eléctrica al tablero principal, provisión de agua</li>
        </ul>
      </div>

      <div class="footer">
        <p><strong>Pool Installer</strong> | Sistema Profesional de Cálculo de Materiales para Piscinas</p>
        <p>Documento generado el ${new Date().toLocaleDateString('es-AR')} | Código: ${project.id.substring(0, 8).toUpperCase()}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
    return html;
  };

  const generateTechnicalSpec = () => {
    const materials = project.materials as any;
    const plumbingConfig = project.plumbingConfig as any;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Especificaciones Técnicas - ${project.name}</title>
  <style>
    ${getCommonStyles()}
    .spec-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    .spec-item { padding: 15px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; }
    .spec-label { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 500; }
    .spec-value { font-size: 16px; font-weight: 600; color: #1f2937; margin-top: 5px; }
    .materials-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .materials-table th { background: #2563eb; color: white; padding: 12px; text-align: left; font-size: 13px; }
    .materials-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .materials-table tr:hover { background: #f9fafb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">POOL CALCULATOR</div>
      <p class="subtitle">Especificaciones Técnicas del Proyecto</p>
      <p class="date">${new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="content">
      <div class="section">
        <h2>Datos Técnicos de la Piscina</h2>
        <div class="spec-grid">
          <div class="spec-item"><div class="spec-label">Largo</div><div class="spec-value">${project.poolPreset?.length || 0} m</div></div>
          <div class="spec-item"><div class="spec-label">Ancho</div><div class="spec-value">${project.poolPreset?.width || 0} m</div></div>
          <div class="spec-item"><div class="spec-label">Profundidad</div><div class="spec-value">${project.poolPreset?.depth || 0} m</div></div>
          <div class="spec-item"><div class="spec-label">Volumen</div><div class="spec-value">${project.volume.toFixed(2)} m³</div></div>
          <div class="spec-item"><div class="spec-label">Capacidad</div><div class="spec-value">${(project.volume * 1000).toFixed(0)} litros</div></div>
          <div class="spec-item"><div class="spec-label">Área Espejo</div><div class="spec-value">${project.waterMirrorArea.toFixed(2)} m²</div></div>
          <div class="spec-item"><div class="spec-label">Forma</div><div class="spec-value">${project.poolPreset?.shape || 'RECTANGULAR'}</div></div>
          <div class="spec-item"><div class="spec-label">Skimmers</div><div class="spec-value">${project.poolPreset?.skimmerCount || 0}</div></div>
          <div class="spec-item"><div class="spec-label">Retornos</div><div class="spec-value">${project.poolPreset?.returnsCount || 0}</div></div>
        </div>
      </div>

      <div class="section">
        <h2>Especificaciones de Materiales</h2>
        <table class="materials-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Aplicación</th>
            </tr>
          </thead>
          <tbody>
            ${materials?.cement ? `<tr><td>Cemento Portland</td><td>${materials.cement.quantity}</td><td>${materials.cement.unit}</td><td>Hormigón base vereda</td></tr>` : ''}
            ${materials?.sand ? `<tr><td>Arena gruesa</td><td>${materials.sand.quantity}</td><td>${materials.sand.unit}</td><td>Mezcla hormigón</td></tr>` : ''}
            ${materials?.gravel ? `<tr><td>Grava/Piedra</td><td>${materials.gravel.quantity}</td><td>${materials.gravel.unit}</td><td>Agregado grueso</td></tr>` : ''}
            ${materials?.adhesive ? `<tr><td>Adhesivo para losetas</td><td>${materials.adhesive.quantity}</td><td>${materials.adhesive.unit}</td><td>Pegado de vereda</td></tr>` : ''}
            ${materials?.wireMesh ? `<tr><td>Malla de alambre</td><td>${materials.wireMesh.quantity}</td><td>${materials.wireMesh.unit}</td><td>Refuerzo estructural</td></tr>` : ''}
            ${materials?.waterproofing ? `<tr><td>Impermeabilizante</td><td>${materials.waterproofing.quantity}</td><td>${materials.waterproofing.unit}</td><td>Protección vereda</td></tr>` : ''}
          </tbody>
        </table>
      </div>

      ${equipmentRecommendation ? `
      <div class="section">
        <h2>Equipamiento Recomendado</h2>
        <div class="spec-grid">
          <div class="spec-item">
            <div class="spec-label">Bomba</div>
            <div class="spec-value">${equipmentRecommendation.pump.name}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">${equipmentRecommendation.pump.power} HP - ${equipmentRecommendation.pump.flowRate} m³/h</div>
          </div>
          <div class="spec-item">
            <div class="spec-label">Filtro</div>
            <div class="spec-value">${equipmentRecommendation.filter.name}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">${equipmentRecommendation.filter.capacity} m³/h</div>
          </div>
          ${equipmentRecommendation.heater ? `
          <div class="spec-item">
            <div class="spec-label">Calefacción</div>
            <div class="spec-value">${equipmentRecommendation.heater.name}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">${equipmentRecommendation.heater.power} kW</div>
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      ${plumbingConfig?.selectedItems?.length > 0 ? `
      <div class="section">
        <h2>Instalación Hidráulica</h2>
        <table class="materials-table">
          <thead>
            <tr><th>Item</th><th>Cantidad</th><th>Especificación</th></tr>
          </thead>
          <tbody>
            ${plumbingConfig.selectedItems.map((item: any) =>
              `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.diameter || item.specification || '-'}</td></tr>`
            ).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="footer">
        <p><strong>Pool Installer</strong> | Especificaciones Técnicas</p>
        <p>Generado: ${new Date().toLocaleDateString('es-AR')} | ID: ${project.id.substring(0, 8).toUpperCase()}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const generateMaterialsList = () => {
    const materials = project.materials as any;
    const { additionals } = calculateCosts();
    const plumbingConfig = project.plumbingConfig as any;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Lista de Materiales - ${project.name}</title>
  <style>
    ${getCommonStyles()}
    .category-section { margin: 30px 0; }
    .category-title { background: #2563eb; color: white; padding: 12px 20px; font-size: 18px; font-weight: 600; margin-bottom: 15px; border-radius: 6px; }
    .material-item { display: flex; justify-content: space-between; padding: 12px 20px; background: #f9fafb; border-left: 4px solid #3b82f6; margin-bottom: 8px; align-items: center; }
    .material-name { font-weight: 600; color: #1f2937; flex: 1; }
    .material-qty { font-size: 18px; font-weight: 700; color: #2563eb; min-width: 120px; text-align: right; }
    .content-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 25px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">POOL CALCULATOR</div>
      <p class="subtitle">Lista Completa de Materiales</p>
      <p class="date">${new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="content">
      <div class="content-grid">
        <div>
          <div class="category-section">
            <div class="category-title">Materiales de Vereda</div>
            ${materials?.cement ? `<div class="material-item"><span class="material-name">Cemento Portland</span><span class="material-qty">${materials.cement.quantity} ${materials.cement.unit}</span></div>` : ''}
            ${materials?.sand ? `<div class="material-item"><span class="material-name">Arena Gruesa</span><span class="material-qty">${materials.sand.quantity} ${materials.sand.unit}</span></div>` : ''}
            ${materials?.gravel ? `<div class="material-item"><span class="material-name">Piedra/Grava</span><span class="material-qty">${materials.gravel.quantity} ${materials.gravel.unit}</span></div>` : ''}
            ${materials?.adhesive ? `<div class="material-item"><span class="material-name">Adhesivo para Losetas</span><span class="material-qty">${materials.adhesive.quantity} ${materials.adhesive.unit}</span></div>` : ''}
            ${materials?.whiteCement ? `<div class="material-item"><span class="material-name">Cemento Blanco</span><span class="material-qty">${materials.whiteCement.quantity} ${materials.whiteCement.unit}</span></div>` : ''}
            ${materials?.marmolina ? `<div class="material-item"><span class="material-name">Marmolina</span><span class="material-qty">${materials.marmolina.quantity} ${materials.marmolina.unit}</span></div>` : ''}
          </div>

          ${(project.tileQuantities as any)?.length > 0 ? `
          <div class="category-section">
            <div class="category-title">Losetas y Revestimientos</div>
            ${(project.tileQuantities as any[]).map(tile =>
              `<div class="material-item"><span class="material-name">${tile.tileName}</span><span class="material-qty">${tile.quantity} ${tile.unit}</span></div>`
            ).join('')}
          </div>
          ` : ''}
        </div>

        <div>
          ${plumbingConfig?.selectedItems?.length > 0 ? `
          <div class="category-section">
            <div class="category-title">Instalación Hidráulica</div>
            ${plumbingConfig.selectedItems.map((item: any) =>
              `<div class="material-item"><span class="material-name">${item.name}</span><span class="material-qty">${item.quantity} ${item.unit || 'ud'}</span></div>`
            ).join('')}
          </div>
          ` : ''}

          ${materials?.wireMesh || materials?.waterproofing ? `
          <div class="category-section">
            <div class="category-title">Materiales Complementarios</div>
            ${materials?.wireMesh ? `<div class="material-item"><span class="material-name">Malla de Alambre</span><span class="material-qty">${materials.wireMesh.quantity} ${materials.wireMesh.unit}</span></div>` : ''}
            ${materials?.waterproofing ? `<div class="material-item"><span class="material-name">Impermeabilizante</span><span class="material-qty">${materials.waterproofing.quantity} ${materials.waterproofing.unit}</span></div>` : ''}
          </div>
          ` : ''}

          ${additionals?.length > 0 ? `
          <div class="category-section">
            <div class="category-title">Adicionales</div>
            ${additionals.map((add: any) => {
              const name = add.customName || add.accessory?.name || add.equipment?.name || add.material?.name || 'Item adicional';
              return `<div class="material-item"><span class="material-name">${name}</span><span class="material-qty">${add.newQuantity} ${add.customUnit || 'ud'}</span></div>`;
            }).join('')}
          </div>
          ` : ''}
        </div>
      </div>

      <div class="footer">
        <p><strong>Pool Installer</strong> | Lista de Materiales</p>
        <p>Generado: ${new Date().toLocaleDateString('es-AR')} | ID: ${project.id.substring(0, 8).toUpperCase()}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const generateDetailedBudget = () => {
    const materials = project.materials as any;
    const { additionals, additionalsCosts, plumbingCosts, totalMaterialCost, totalLaborCost, grandTotal } = calculateCosts();
    const plumbingConfig = project.plumbingConfig as any;
    const rolesSummary = getRolesCostSummary();

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Presupuesto Detallado - ${project.name}</title>
  <style>
    ${getCommonStyles()}
    .budget-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .budget-table th { background: #2563eb; color: white; padding: 12px; text-align: left; font-size: 13px; }
    .budget-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .budget-table tr:hover { background: #f9fafb; }
    .budget-table .subtotal-row { background: #eff6ff; font-weight: 600; }
    .budget-table .total-row { background: #2563eb; color: white; font-weight: 700; font-size: 16px; }
    .text-right { text-align: right; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">POOL CALCULATOR</div>
      <p class="subtitle">Presupuesto Detallado con Costos Unitarios</p>
      <p class="date">${new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="content">
      <div class="section">
        <h2>Materiales Base - Vereda y Estructurales</h2>
        <table class="budget-table">
          <thead>
            <tr><th>Item</th><th>Cantidad</th><th>Unidad</th><th class="text-right">Precio Unit.</th><th class="text-right">Subtotal</th></tr>
          </thead>
          <tbody>
            ${materials?.cement ? `<tr><td>Cemento Portland</td><td>${materials.cement.quantity}</td><td>${materials.cement.unit}</td><td class="text-right">$ ${(materials.cement.cost / materials.cement.quantity).toFixed(2)}</td><td class="text-right">$ ${materials.cement.cost.toLocaleString('es-AR')}</td></tr>` : ''}
            ${materials?.sand ? `<tr><td>Arena Gruesa</td><td>${materials.sand.quantity}</td><td>${materials.sand.unit}</td><td class="text-right">$ ${(parseFloat(materials.sand.cost) / parseFloat(materials.sand.quantity)).toFixed(2)}</td><td class="text-right">$ ${parseFloat(materials.sand.cost).toLocaleString('es-AR')}</td></tr>` : ''}
            ${materials?.gravel ? `<tr><td>Piedra/Grava</td><td>${materials.gravel.quantity}</td><td>${materials.gravel.unit}</td><td class="text-right">$ ${(parseFloat(materials.gravel.cost) / parseFloat(materials.gravel.quantity)).toFixed(2)}</td><td class="text-right">$ ${parseFloat(materials.gravel.cost).toLocaleString('es-AR')}</td></tr>` : ''}
            ${materials?.adhesive ? `<tr><td>Adhesivo</td><td>${materials.adhesive.quantity}</td><td>${materials.adhesive.unit}</td><td class="text-right">$ ${(materials.adhesive.cost / materials.adhesive.quantity).toFixed(2)}</td><td class="text-right">$ ${materials.adhesive.cost.toLocaleString('es-AR')}</td></tr>` : ''}
            <tr class="subtotal-row"><td colspan="4">Subtotal Materiales Base</td><td class="text-right">$ ${project.materialCost.toLocaleString('es-AR')}</td></tr>
          </tbody>
        </table>
      </div>

      ${plumbingConfig?.selectedItems?.length > 0 ? `
      <div class="section">
        <h2>Instalación Hidráulica</h2>
        <table class="budget-table">
          <thead>
            <tr><th>Item</th><th>Cantidad</th><th class="text-right">Precio Unit.</th><th class="text-right">Subtotal</th></tr>
          </thead>
          <tbody>
            ${plumbingConfig.selectedItems.map((item: any) =>
              `<tr><td>${item.name}</td><td>${item.quantity}</td><td class="text-right">$ ${item.pricePerUnit.toLocaleString('es-AR')}</td><td class="text-right">$ ${(item.quantity * item.pricePerUnit).toLocaleString('es-AR')}</td></tr>`
            ).join('')}
            <tr class="subtotal-row"><td colspan="3">Subtotal Plomería</td><td class="text-right">$ ${plumbingCosts.toLocaleString('es-AR')}</td></tr>
          </tbody>
        </table>
      </div>
      ` : ''}

      ${additionals?.length > 0 ? `
      <div class="section">
        <h2>Items Adicionales</h2>
        <table class="budget-table">
          <thead>
            <tr><th>Item</th><th>Cantidad</th><th class="text-right">Precio Unit.</th><th class="text-right">Subtotal</th></tr>
          </thead>
          <tbody>
            ${additionals.map((add: any) => {
              const name = add.customName || add.accessory?.name || add.equipment?.name || add.material?.name;
              const price = add.customPricePerUnit || add.accessory?.pricePerUnit || add.equipment?.pricePerUnit || add.material?.pricePerUnit || 0;
              return `<tr><td>${name}</td><td>${add.newQuantity}</td><td class="text-right">$ ${price.toLocaleString('es-AR')}</td><td class="text-right">$ ${(add.newQuantity * price).toLocaleString('es-AR')}</td></tr>`;
            }).join('')}
            <tr class="subtotal-row"><td colspan="3">Subtotal Adicionales</td><td class="text-right">$ ${additionalsCosts.materialCost.toLocaleString('es-AR')}</td></tr>
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="section">
        <h2>Mano de Obra</h2>
        <table class="budget-table">
          <thead>
            <tr><th>Rol</th><th>Tareas</th><th>Horas</th><th class="text-right">Costo</th></tr>
          </thead>
          <tbody>
            ${Object.values(rolesSummary).map((role: any) =>
              `<tr><td>${role.roleName}</td><td>${role.tasksCount}</td><td>${role.hours.toFixed(1)} hs</td><td class="text-right">$ ${role.cost.toLocaleString('es-AR')}</td></tr>`
            ).join('')}
            <tr class="subtotal-row"><td colspan="3">Total Mano de Obra</td><td class="text-right">$ ${totalLaborCost.toLocaleString('es-AR')}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <table class="budget-table">
          <tbody>
            <tr class="subtotal-row"><td colspan="4">TOTAL MATERIALES</td><td class="text-right">$ ${totalMaterialCost.toLocaleString('es-AR')}</td></tr>
            <tr class="subtotal-row"><td colspan="4">TOTAL MANO DE OBRA</td><td class="text-right">$ ${totalLaborCost.toLocaleString('es-AR')}</td></tr>
            <tr class="total-row"><td colspan="4">INVERSIÓN TOTAL DEL PROYECTO</td><td class="text-right">$ ${grandTotal.toLocaleString('es-AR')}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p><strong>Pool Installer</strong> | Presupuesto Detallado</p>
        <p>Generado: ${new Date().toLocaleDateString('es-AR')} | ID: ${project.id.substring(0, 8).toUpperCase()}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const generateCompleteReport = () => {
    const { grandTotal } = calculateCosts();

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Completo - ${project.name}</title>
  <style>
    ${getCommonStyles()}
    .timeline-item { padding: 15px 20px; background: #eff6ff; border-left: 4px solid #3b82f6; margin: 10px 0; }
    .timeline-date { font-size: 12px; color: #6b7280; font-weight: 500; }
    .timeline-content { font-size: 14px; color: #1f2937; margin-top: 5px; }
    .highlight-box { background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">POOL CALCULATOR</div>
      <p class="subtitle">Reporte Completo del Proyecto</p>
      <p class="date">${new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="content">
      <div class="highlight-box">
        <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 18px;">Resumen Ejecutivo</h3>
        <p style="font-size: 14px; line-height: 1.6; margin: 0;">
          Proyecto <strong>${project.name}</strong> para <strong>${project.clientName}</strong>.
          Piscina de ${project.poolPreset?.length}m x ${project.poolPreset?.width}m x ${project.poolPreset?.depth}m
          con capacidad de ${(project.volume * 1000).toFixed(0)} litros.
          Inversión total: <strong style="color: #2563eb; font-size: 18px;">$${grandTotal.toLocaleString('es-AR')}</strong>
        </p>
      </div>

      ${generateClientBudget().match(/<div class="content">([\s\S]*?)<\/div>\s*<\/div>\s*<\/body>/)?.[1] || ''}

      ${projectUpdates.length > 0 ? `
      <div class="section">
        <h2>Historial del Proyecto</h2>
        ${projectUpdates.slice(0, 10).map(update => `
          <div class="timeline-item">
            <div class="timeline-date">${new Date(update.createdAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            <div class="timeline-content"><strong>${update.title}</strong> - ${update.description}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div class="footer">
        <p><strong>Pool Installer</strong> | Reporte Completo</p>
        <p>Generado: ${new Date().toLocaleDateString('es-AR')} | ID: ${project.id.substring(0, 8).toUpperCase()}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const generateOverview = () => {
    const sidewalkAreaM2 = calculatedSidewalkArea || project.sidewalkArea || 0;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Vista General - ${project.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #fafafa; }

    .page {
      width: 210mm;
      height: 297mm;
      margin: 0 auto;
      background: white;
      padding: 15mm;
      display: flex;
      flex-direction: column;
    }

    /* HEADER */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 15px;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 20px;
    }
    .logo-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .company-logo {
      width: 120px;
      height: 50px;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #9ca3af;
    }
    .doc-title {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin-top: 5px;
    }
    .header-info {
      text-align: right;
    }
    .project-id {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .doc-date {
      font-size: 10px;
      color: #9ca3af;
    }

    /* PROJECT TITLE */
    .project-header {
      background: #f9fafb;
      padding: 20px 25px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      margin-bottom: 20px;
    }
    .project-name {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 6px;
    }
    .project-meta {
      font-size: 13px;
      color: #6b7280;
    }

    /* MAIN GRID */
    .content-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    /* METRICS */
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .metric-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 18px;
      text-align: center;
    }
    .metric-value {
      font-size: 28px;
      font-weight: 600;
      color: #60a5fa;
      margin-bottom: 6px;
      line-height: 1;
    }
    .metric-label {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* CONTENT GRID */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      flex: 1;
    }

    .info-panel {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 20px;
      display: flex;
      flex-direction: column;
    }
    .panel-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-list {
      flex: 1;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-item:last-child { border-bottom: none; }
    .info-label {
      font-size: 12px;
      color: #6b7280;
    }
    .info-value {
      font-size: 12px;
      color: #111827;
      font-weight: 500;
    }

    /* EQUIPMENT */
    .equipment-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .equipment-item {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 12px;
    }
    .equipment-label {
      font-size: 10px;
      color: #9ca3af;
      text-transform: uppercase;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    .equipment-name {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 2px;
    }
    .equipment-spec {
      font-size: 11px;
      color: #6b7280;
    }

    /* ACCESSORIES */
    .accessories-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
    }
    .accessory-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 12px;
      text-align: center;
    }
    .accessory-count {
      font-size: 24px;
      font-weight: 600;
      color: #60a5fa;
      margin-bottom: 4px;
    }
    .accessory-label {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* FOOTER */
    .footer {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
    .footer-text {
      font-size: 10px;
      color: #9ca3af;
    }

    @media print {
      body { background: white; }
      .page { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- HEADER -->
    <div class="header">
      <div class="logo-section">
        <div class="company-logo">LOGO AQUÍ</div>
        <div class="doc-title">Vista General del Proyecto</div>
      </div>
      <div class="header-info">
        <div class="project-id">Proyecto: ${project.id.substring(0, 8).toUpperCase()}</div>
        <div class="doc-date">${new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
    </div>

    <!-- PROJECT INFO -->
    <div class="project-header">
      <div class="project-name">${project.name}</div>
      <div class="project-meta">
        <strong>Cliente:</strong> ${project.clientName}
        ${project.location ? ` | <strong>Ubicación:</strong> ${project.location}` : ''}
      </div>
    </div>

    <!-- CONTENT -->
    <div class="content-wrapper">

      <!-- METRICS -->
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-value">${project.poolPreset?.length || 0} × ${project.poolPreset?.width || 0}</div>
          <div class="metric-label">Dimensiones (m)</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${project.poolPreset?.depth || 0}</div>
          <div class="metric-label">Profundidad (m)</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${(project.volume * 1000).toFixed(0)}</div>
          <div class="metric-label">Capacidad (L)</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${sidewalkAreaM2.toFixed(1)}</div>
          <div class="metric-label">Vereda (m²)</div>
        </div>
      </div>

      <!-- TWO COLUMN GRID -->
      <div class="content-grid">

        <!-- LEFT: SPECS -->
        <div class="info-panel">
          <div class="panel-title">Especificaciones Técnicas</div>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">Modelo</span>
              <span class="info-value">${project.poolPreset?.name || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Forma</span>
              <span class="info-value">${project.poolPreset?.shape || 'RECTANGULAR'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Volumen</span>
              <span class="info-value">${project.volume.toFixed(2)} m³</span>
            </div>
            <div class="info-item">
              <span class="info-label">Espejo de Agua</span>
              <span class="info-value">${project.waterMirrorArea.toFixed(2)} m²</span>
            </div>
            <div class="info-item">
              <span class="info-label">Estado</span>
              <span class="info-value">${project.status || 'EN PLANIFICACIÓN'}</span>
            </div>
          </div>
        </div>

        <!-- RIGHT: EQUIPMENT -->
        <div class="info-panel">
          <div class="panel-title">Equipamiento del Sistema</div>
          ${equipmentRecommendation ? `
          <div class="equipment-grid">
            <div class="equipment-item">
              <div class="equipment-label">Bomba</div>
              <div class="equipment-name">${equipmentRecommendation.pump.name}</div>
              <div class="equipment-spec">${equipmentRecommendation.pump.power} HP | ${equipmentRecommendation.pump.flowRate} m³/h</div>
            </div>
            <div class="equipment-item">
              <div class="equipment-label">Filtro</div>
              <div class="equipment-name">${equipmentRecommendation.filter.name}</div>
              <div class="equipment-spec">${equipmentRecommendation.filter.capacity} m³/h</div>
            </div>
            ${equipmentRecommendation.heater ? `
            <div class="equipment-item">
              <div class="equipment-label">Calefacción</div>
              <div class="equipment-name">${equipmentRecommendation.heater.name}</div>
              <div class="equipment-spec">${equipmentRecommendation.heater.power} kW</div>
            </div>
            ` : ''}
          </div>
          ` : '<div class="equipment-spec" style="color: #9ca3af; text-align: center; padding: 20px;">No hay equipamiento seleccionado</div>'}
        </div>

      </div>

      <!-- ACCESSORIES -->
      <div class="info-panel">
        <div class="panel-title">Accesorios e Instalaciones</div>
        <div class="accessories-grid">
          <div class="accessory-box">
            <div class="accessory-count">${project.poolPreset?.returnsCount || 0}</div>
            <div class="accessory-label">Retornos</div>
          </div>
          <div class="accessory-box">
            <div class="accessory-count">${project.poolPreset?.skimmerCount || 0}</div>
            <div class="accessory-label">Skimmers</div>
          </div>
          ${project.poolPreset?.hasLighting ? `
          <div class="accessory-box">
            <div class="accessory-count">${project.poolPreset.lightingCount}</div>
            <div class="accessory-label">Luces LED</div>
          </div>
          ` : ''}
          ${project.poolPreset?.hasBottomDrain ? `
          <div class="accessory-box">
            <div class="accessory-count">1</div>
            <div class="accessory-label">Desagüe Fondo</div>
          </div>
          ` : ''}
          ${project.poolPreset?.hasVacuumIntake ? `
          <div class="accessory-box">
            <div class="accessory-count">1</div>
            <div class="accessory-label">Limpiafondos</div>
          </div>
          ` : ''}
        </div>
      </div>

    </div>

    <!-- FOOTER -->
    <div class="footer">
      <div class="footer-text">Pool Installer | Sistema de Gestión de Proyectos</div>
    </div>

  </div>
</body>
</html>`;
  };

  // Helper function to get common styles
  const getCommonStyles = () => `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #2563eb; color: white; padding: 30px 40px; text-align: center; }
    .logo { font-size: 28px; font-weight: 700; letter-spacing: 1px; margin-bottom: 10px; }
    .subtitle { font-size: 16px; opacity: 0.9; }
    .date { font-size: 13px; opacity: 0.7; margin-top: 10px; }
    .content { padding: 30px 40px; }
    .section { margin: 30px 0; page-break-inside: avoid; }
    .section h2 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; font-size: 20px; font-weight: 600; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .info-item { padding: 15px; background: #eff6ff; border-left: 3px solid #3b82f6; }
    .info-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; font-weight: 500; }
    .info-value { font-size: 15px; font-weight: 600; color: #1f2937; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; }
    @media print { body { background: white; padding: 0; } .container { box-shadow: none; } }
  `;

  const generateWhatsAppMessage = (template: ExportTemplate, sections = selectedSections): string => {
    const materials = project.materials as any;
    const plumbingConfig = project.plumbingConfig as any;
    const additionals = (project as any).additionals || [];

    const additionalsCosts = additionals.reduce((acc: any, additional: any) => {
      const quantity = additional.newQuantity || 0;
      let materialCost = 0;
      let laborCost = 0;

      if (additional.customPricePerUnit) {
        materialCost = additional.customPricePerUnit * quantity;
        laborCost = (additional.customLaborCost || 0) * quantity;
      } else if (additional.accessory) {
        materialCost = additional.accessory.pricePerUnit * quantity;
      } else if (additional.equipment) {
        materialCost = additional.equipment.pricePerUnit * quantity;
      } else if (additional.material) {
        materialCost = additional.material.pricePerUnit * quantity;
      }

      return {
        materialCost: acc.materialCost + materialCost,
        laborCost: acc.laborCost + laborCost,
      };
    }, { materialCost: 0, laborCost: 0 });

    const plumbingCosts = plumbingConfig?.selectedItems
      ? plumbingConfig.selectedItems.reduce((sum: number, item: any) => sum + (item.quantity * item.pricePerUnit), 0)
      : 0;

    const totalMaterialCost = project.materialCost + additionalsCosts.materialCost + plumbingCosts;
    const totalLaborCost = project.laborCost + additionalsCosts.laborCost;
    const grandTotal = totalMaterialCost + totalLaborCost;

    let message = '';

    if (sections.header) {
      message += `*PRESUPUESTO - CONSTRUCCION DE PISCINA*\n\n*Proyecto:* ${project.name}\n*Cliente:* ${project.clientName}\n*Ubicacion:* ${project.location || 'A definir'}`;
    }

    if (sections.characteristics) {
      message += `${message ? '\n\n' : ''}*CARACTERISTICAS DE LA PISCINA*\n- Modelo: ${project.poolPreset?.name || 'N/A'}\n- Dimensiones: ${project.poolPreset?.length || 0}m x ${project.poolPreset?.width || 0}m x ${project.poolPreset?.depth || 0}m\n- Volumen: ${project.volume.toFixed(2)} m³ (${(project.volume * 1000).toFixed(0)} litros)\n- Forma: ${project.poolPreset?.shape || 'N/A'}`;
    }

    if (sections.includes) {
      message += `${message ? '\n\n' : ''}*INCLUYE:*\n- Excavacion y preparacion del terreno\n- Instalacion de piscina de fibra de vidrio\n- Sistema de filtracion completo\n${equipmentRecommendation ? `- Bomba ${equipmentRecommendation.pump.name} (${equipmentRecommendation.pump.power}HP)\n` : ''}- Instalacion hidraulica (${project.poolPreset?.returnsCount || 0} retornos, ${project.poolPreset?.skimmerCount || 0} skimmers)\n${project.poolPreset?.hasLighting ? `- Iluminacion LED (${project.poolPreset.lightingCount} unidades)\n` : ''}- Vereda perimetral (${(calculatedSidewalkArea || project.sidewalkArea || 0).toFixed(2)} m²)\n- Materiales de construccion`;
    }

    if (sections.additionals && additionals && additionals.length > 0) {
      message += `${message ? '\n\n' : ''}*ADICIONALES INCLUIDOS:*\n`;
      additionals.forEach((add: any) => {
        const name = add.customName || add.accessory?.name || add.equipment?.name || add.material?.name || 'Item adicional';
        message += `- ${name} (${add.newQuantity} ${add.customUnit || 'unidades'})\n`;
      });
    }

    if (sections.costs) {
      message += `${message ? '\n\n' : ''}*INVERSION TOTAL*\n- Materiales base: $${project.materialCost.toLocaleString('es-AR')}`;

      if (plumbingCosts > 0) {
        message += `\n- Plomeria: $${plumbingCosts.toLocaleString('es-AR')}`;
      }

      if (additionalsCosts.materialCost > 0) {
        message += `\n- Adicionales: $${additionalsCosts.materialCost.toLocaleString('es-AR')}`;
      }

      message += `\n- Total materiales: $${totalMaterialCost.toLocaleString('es-AR')}`;
      message += `\n\n- Mano de obra base: $${project.laborCost.toLocaleString('es-AR')}`;

      if (additionalsCosts.laborCost > 0) {
        message += `\n- M.O. adicionales: $${additionalsCosts.laborCost.toLocaleString('es-AR')}`;
      }

      message += `\n- Total mano de obra: $${totalLaborCost.toLocaleString('es-AR')}`;
      message += `\n\n*TOTAL PROYECTO: $${grandTotal.toLocaleString('es-AR')}*`;
    }

    if (sections.conditions) {
      message += `${message ? '\n\n' : ''}*CONDICIONES:*\n- Valido por 30 dias\n- Plazo: 15-20 dias habiles\n- Pago: 50% inicio, 50% finalizacion\n- Garantia: 1 año mano de obra`;
    }

    message += `\n\n_Generado por Pool Installer - ${new Date().toLocaleDateString('es-AR')}_`;

    return message;
  };

  const handleWhatsAppShare = () => {
    const message = generateWhatsAppMessage(selectedTemplate);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const getContentForTemplate = (template: ExportTemplate): string => {
    switch (template) {
      case 'client':
        return generateClientBudget();
      case 'professional':
        return generateTechnicalSpec();
      case 'materials':
        return generateMaterialsList();
      case 'budget':
        return generateDetailedBudget();
      case 'complete':
        return generateCompleteReport();
      case 'overview':
        return generateOverview();
      default:
        return generateClientBudget();
    }
  };

  const handleExport = (format: 'html', template: ExportTemplate) => {
    const content = getContentForTemplate(template);
    const filename = `${template}-${project.name.replace(/\s+/g, '-').toLowerCase()}.html`;
    const mimeType = 'text/html';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = (template: ExportTemplate) => {
    const html = getContentForTemplate(template);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleExportPDF = async (template: ExportTemplate) => {
    // Export PDF robusto (A4) con paginado correcto y mejor calidad
    const mmToPx = (mm: number, dpi = 96) => Math.round((mm / 25.4) * dpi);
    const nextFrame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));

    const waitForImages = async (root: HTMLElement) => {
      const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
      await Promise.all(
        imgs.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          });
        })
      );
    };

    const extractBodyAndStyles = (fullHtml: string) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(fullHtml, 'text/html');
      const styleText = Array.from(doc.querySelectorAll('style'))
        .map((s) => s.textContent || '')
        .join('\n');

      // Importante: evitamos traer <html>/<body> porque html2canvas se comporta mejor con un wrapper.
      const bodyHtml = doc.body ? doc.body.innerHTML : fullHtml;
      return { styleText, bodyHtml, title: doc.title || '' };
    };

    let wrapper: HTMLDivElement | null = null;

    try {
      // 1) QR
      const projectUrl = `${window.location.origin}/projects/${project.id}`;
      const qrDataUrl = await QRCode.toDataURL(projectUrl, {
        width: 220,
        margin: 1,
        color: { dark: '#2563eb', light: '#ffffff' },
      });

      // 2) Captura de visualización (alta resolución)
      let poolImageDataUrl = '';
      if ((template === 'complete' || template === 'overview') && poolCanvasRef.current) {
        // dar un par de frames por si el canvas se está pintando
        await nextFrame();
        await nextFrame();
        try {
          poolImageDataUrl = poolCanvasRef.current.toDataURL('image/png');
        } catch (e) {
          console.warn('No se pudo capturar el canvas de pileta para el PDF:', e);
        }
      }

      // 3) Construimos wrapper A4 en px (evita “mm” inconsistentes en html2canvas)
      const A4_W = mmToPx(210);
      const A4_PADDING = 48;

      const html = getContentForTemplate(template);
      const { styleText, bodyHtml } = extractBodyAndStyles(html);

      wrapper = document.createElement('div');
      wrapper.setAttribute('data-export-root', '1');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '0';
      wrapper.style.top = '0';
      wrapper.style.transform = 'translateX(-250vw)';
      wrapper.style.width = `${A4_W}px`;
      wrapper.style.padding = `${A4_PADDING}px`;
      wrapper.style.background = '#ffffff';
      wrapper.style.color = '#111827';
      wrapper.style.zIndex = '2147483647';
      wrapper.style.pointerEvents = 'none';

      // Estilos “print-friendly”
      const fixCss = `
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { background: #ffffff !important; padding: 0 !important; }
        .container { max-width: none !important; width: 100% !important; box-shadow: none !important; margin: 0 !important; }
        img { max-width: 100% !important; height: auto !important; }
        a { color: inherit !important; text-decoration: none !important; }
      `;

      // 4) Body + extras (en flujo, no fixed; fija “footer” de forma estable)
      wrapper.innerHTML = `
        <style>${styleText}\n${fixCss}</style>
        ${bodyHtml}
        ${poolImageDataUrl ? `
          <div style="margin-top: 28px; page-break-before: always;">
            <h2 style="color:#1e40af; border-bottom: 2px solid #93c5fd; padding-bottom: 10px; margin-bottom: 16px;">
              Visualización del Proyecto
            </h2>
            <div style="text-align:center; padding:16px; background:#eff6ff; border:1px solid #bfdbfe;">
              <img src="${poolImageDataUrl}" style="max-width:100%; height:auto; display:inline-block;" />
            </div>
          </div>
        ` : ''}
        <div style="margin-top: 26px; display:flex; justify-content:flex-end;">
          <div style="text-align:center; border:1px solid #bfdbfe; padding:10px; background:#ffffff;">
            <img src="${qrDataUrl}" style="width:88px; height:88px; display:block;" />
            <div style="font-size:10px; color:#6b7280; margin-top:6px;">QR del proyecto</div>
          </div>
        </div>
      `;

      document.body.appendChild(wrapper);

      // 5) Esperar recursos (fonts + imágenes) para que no salgan “cortados” o sin cargar
      // fonts
      // @ts-ignore
      if (document.fonts?.ready) {
        // @ts-ignore
        await document.fonts.ready;
      }
      await waitForImages(wrapper);
      await nextFrame();

      // 6) Render a canvas (más nítido)
      const scale = Math.min(3, Math.max(2, (window.devicePixelRatio || 1)));
      const canvas = await html2canvas(wrapper, {
        scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        // evita crop raro cuando hay scroll
        scrollX: 0,
        scrollY: 0,
        windowWidth: wrapper.scrollWidth,
        windowHeight: wrapper.scrollHeight,
      });

      // 7) Generación PDF (paginado correcto)
      // Si el canvas es gigante, JPEG reduce muchísimo el peso del PDF.
      const megaPixels = (canvas.width * canvas.height) / 1_000_000;
      const useJpeg = megaPixels > 18;
      const imgData = useJpeg ? canvas.toDataURL('image/jpeg', 0.92) : canvas.toDataURL('image/png');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth; // ajustamos al ancho de página
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, useJpeg ? 'JPEG' : 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0.5) {
        position = heightLeft - imgHeight; // negativo => “sube” la imagen
        pdf.addPage();
        pdf.addImage(imgData, useJpeg ? 'JPEG' : 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const filename = `${template}-${project.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Hubo un error al generar el PDF. Por favor intenta nuevamente.');
    } finally {
      if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    }
  };


  const handleExportToExcel = async () => {
    setExportingToExcel(true);
    try {
      await projectService.exportToExcel(project.id, excelSections);
      alert('Archivo Excel descargado exitosamente');
      setShowExcelDialog(false);
    } catch (error: any) {
      console.error('Error al exportar a Excel:', error);
      const errorMessage = error.response?.data?.details || error.message || 'Error desconocido';
      alert('Error al exportar a Excel: ' + errorMessage);
    } finally {
      setExportingToExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <PoolVisualizationCanvas
          ref={poolCanvasRef}
          project={project}
          tileConfig={project.tileCalculation}
          width={1600}
          height={1000}
          showMeasurements={true}
        />
      </div>

      <Card className="border-0 shadow-sm">
        <div className="bg-blue-600 text-white p-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <FileDown size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Exportación de Documentos</h2>
              <p className="text-blue-100 mt-1">Genere documentos profesionales para su proyecto</p>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            {templates.map((template) => {
              const Icon = template.icon;
              const isSelected = selectedTemplate === template.id;

              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
                    isSelected
                      ? 'border-blue-600 bg-white text-blue-600 font-semibold'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm">{template.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-8 bg-gray-50">
          {templates.map((template) => {
            if (selectedTemplate !== template.id) return null;
            const Icon = template.icon;

            return (
              <div key={template.id} className="space-y-6">
                <div className="flex items-start gap-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <Icon size={40} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{template.name}</h3>
                    <p className="text-gray-600 leading-relaxed">{template.description}</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-6">Formatos Disponibles</h4>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => handleExportPDF(selectedTemplate)}
                      className="flex flex-col items-center gap-3 p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
                    >
                      <FileDown size={28} />
                      <span className="font-semibold text-sm">Exportar PDF</span>
                    </button>

                    <button
                      onClick={() => handleExport('html', selectedTemplate)}
                      className="flex flex-col items-center gap-3 p-6 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 rounded-lg transition-colors shadow-sm"
                    >
                      <Download size={28} />
                      <span className="font-semibold text-sm">Descargar HTML</span>
                    </button>

                    <button
                      onClick={() => handlePrint(selectedTemplate)}
                      className="flex flex-col items-center gap-3 p-6 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 rounded-lg transition-colors shadow-sm"
                    >
                      <Printer size={28} />
                      <span className="font-semibold text-sm">Imprimir</span>
                    </button>

                    <button
                      onClick={handleWhatsAppShare}
                      className="flex flex-col items-center gap-3 p-6 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm"
                    >
                      <MessageCircle size={28} />
                      <span className="font-semibold text-sm">WhatsApp</span>
                    </button>

                    <button
                      onClick={() => setShowExcelDialog(true)}
                      className="flex flex-col items-center gap-3 p-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                    >
                      <FileSpreadsheet size={28} />
                      <span className="font-semibold text-sm">Excel Técnico</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {showExcelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-emerald-600 text-white p-6 rounded-t-lg">
              <h3 className="text-xl font-bold">Configurar Exportación a Excel</h3>
              <p className="text-sm text-emerald-100 mt-2">
                Seleccione las secciones que desea incluir en el documento técnico
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer border-gray-200">
                  <input
                    type="checkbox"
                    checked={excelSections.excavation}
                    onChange={(e) => setExcelSections({ ...excelSections, excavation: e.target.checked })}
                    className="w-5 h-5 text-gray-900 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Excavación y Preparación</p>
                    <p className="text-xs text-gray-600 mt-1">Dimensiones, volumen de tierra, advertencias</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer border-gray-200">
                  <input
                    type="checkbox"
                    checked={excelSections.supportBed}
                    onChange={(e) => setExcelSections({ ...excelSections, supportBed: e.target.checked })}
                    className="w-5 h-5 text-gray-900 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Cama de Apoyo Interna</p>
                    <p className="text-xs text-gray-600 mt-1">Geomembrana, malla, arena, cemento</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer border-gray-200">
                  <input
                    type="checkbox"
                    checked={excelSections.sidewalk}
                    onChange={(e) => setExcelSections({ ...excelSections, sidewalk: e.target.checked })}
                    className="w-5 h-5 text-gray-900 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Solado de Vereda</p>
                    <p className="text-xs text-gray-600 mt-1">Materiales, área total, especificaciones</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer border-gray-200">
                  <input
                    type="checkbox"
                    checked={excelSections.plumbing}
                    onChange={(e) => setExcelSections({ ...excelSections, plumbing: e.target.checked })}
                    className="w-5 h-5 text-gray-900 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Instalación Hidráulica</p>
                    <p className="text-xs text-gray-600 mt-1">Cañerías, accesorios, configuración del sistema</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer border-gray-200">
                  <input
                    type="checkbox"
                    checked={excelSections.electrical}
                    onChange={(e) => setExcelSections({ ...excelSections, electrical: e.target.checked })}
                    className="w-5 h-5 text-gray-900 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Instalación Eléctrica</p>
                    <p className="text-xs text-gray-600 mt-1">Bomba, filtro, luces, consumo, especificaciones</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer border-gray-200">
                  <input
                    type="checkbox"
                    checked={excelSections.labor}
                    onChange={(e) => setExcelSections({ ...excelSections, labor: e.target.checked })}
                    className="w-5 h-5 text-gray-900 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Mano de Obra</p>
                    <p className="text-xs text-gray-600 mt-1">Roles, tareas, horas estimadas, costos</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer border-gray-200">
                  <input
                    type="checkbox"
                    checked={excelSections.sequence}
                    onChange={(e) => setExcelSections({ ...excelSections, sequence: e.target.checked })}
                    className="w-5 h-5 text-gray-900 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Secuencia de Trabajo</p>
                    <p className="text-xs text-gray-600 mt-1">Orden recomendado de construcción</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer border-gray-200">
                  <input
                    type="checkbox"
                    checked={excelSections.standards}
                    onChange={(e) => setExcelSections({ ...excelSections, standards: e.target.checked })}
                    className="w-5 h-5 text-gray-900 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Normativas Aplicables</p>
                    <p className="text-xs text-gray-600 mt-1">AEA 90364, IRAM, códigos</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => setExcelSections({
                    excavation: true,
                    supportBed: true,
                    sidewalk: true,
                    plumbing: true,
                    electrical: true,
                    labor: true,
                    sequence: true,
                    standards: true,
                  })}
                  variant="secondary"
                  className="flex-1"
                >
                  Seleccionar Todo
                </Button>
                <Button
                  onClick={() => setExcelSections({
                    excavation: false,
                    supportBed: false,
                    sidewalk: false,
                    plumbing: false,
                    electrical: false,
                    labor: false,
                    sequence: false,
                    standards: false,
                  })}
                  variant="secondary"
                  className="flex-1"
                >
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3">
              <Button
                onClick={() => setShowExcelDialog(false)}
                variant="secondary"
                className="flex-1"
                disabled={exportingToExcel}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExportToExcel}
                disabled={exportingToExcel}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {exportingToExcel ? 'Exportando...' : 'Exportar a Excel'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
