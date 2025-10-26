import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Project } from '@/types';
import { plumbingCalculationService } from '@/services/plumbingCalculationService';
import { projectService } from '@/services/projectService';
import { FileText, FileSpreadsheet, Download, Printer, Briefcase, User, Wrench, DollarSign, MessageCircle, FileDown } from 'lucide-react';
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

  // Calcular costos por rol basado en tareas asignadas
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
      name: 'Presupuesto para Cliente',
      description: 'Presupuesto simplificado sin detalles técnicos, enfocado en costos',
      icon: User,
      color: 'blue',
    },
    {
      id: 'professional' as ExportTemplate,
      name: 'Especificaciones Técnicas',
      description: 'Detalles completos para profesionales: albaniles, plomeros, electricistas',
      icon: Briefcase,
      color: 'green',
    },
    {
      id: 'materials' as ExportTemplate,
      name: 'Lista de Materiales',
      description: 'Lista detallada de materiales para compra',
      icon: Wrench,
      color: 'orange',
    },
    {
      id: 'budget' as ExportTemplate,
      name: 'Presupuesto Detallado',
      description: 'Presupuesto completo con costos unitarios y totales',
      icon: DollarSign,
      color: 'purple',
    },
    {
      id: 'complete' as ExportTemplate,
      name: 'Reporte Completo',
      description: 'Documentación completa del proyecto con todos los detalles',
      icon: FileText,
      color: 'gray',
    },
    {
      id: 'overview' as ExportTemplate,
      name: 'Vista General Completa',
      description: 'Exportación de la vista general con todos los detalles visibles',
      icon: FileText,
      color: 'indigo',
    },
  ];

  const generateClientBudget = () => {
    const additionals = (project as any).additionals || [];
    const plumbingConfig = project.plumbingConfig as any;

    // Calcular costos actualizados
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

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Presupuesto - ${project.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 40px;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      border-radius: 12px;
      overflow: hidden;
    }
    .header {
      text-align: center;
      background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
      color: white;
      padding: 40px 20px;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -20px;
      left: 0;
      right: 0;
      height: 20px;
      background: white;
      border-radius: 50% 50% 0 0 / 20px 20px 0 0;
    }
    .logo {
      font-size: 36px;
      font-weight: 900;
      letter-spacing: 2px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .subtitle {
      font-size: 18px;
      margin-top: 10px;
      opacity: 0.95;
    }
    .date {
      font-size: 14px;
      margin-top: 10px;
      opacity: 0.8;
    }
    .content {
      padding: 40px;
    }
    .section {
      margin: 40px 0;
      page-break-inside: avoid;
    }
    .section h2 {
      color: #1e40af;
      border-left: 5px solid #2563eb;
      padding-left: 15px;
      margin-bottom: 20px;
      font-size: 24px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 20px;
      border-bottom: 1px solid #e2e8f0;
      transition: background 0.2s;
    }
    .info-row:hover {
      background: #f8fafc;
    }
    .info-row span:first-child {
      color: #64748b;
    }
    .info-row strong {
      color: #1e293b;
    }
    .features-list {
      list-style: none;
      padding: 0;
    }
    .features-list li {
      padding: 12px 20px;
      border-left: 3px solid #10b981;
      margin: 10px 0;
      background: #f0fdf4;
      border-radius: 0 8px 8px 0;
    }
    .cost-box {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      padding: 30px;
      border-radius: 12px;
      margin: 30px 0;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
    }
    .cost-box h2 {
      border: none;
      padding: 0;
      margin-bottom: 20px;
    }
    .cost-item {
      display: flex;
      justify-content: space-between;
      margin: 15px 0;
      font-size: 18px;
      padding: 10px 0;
    }
    .cost-section-title {
      font-size: 14px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid rgba(0,0,0,0.1);
    }
    .total {
      font-size: 36px;
      font-weight: bold;
      color: #1e40af;
      border-top: 3px solid #2563eb;
      padding-top: 20px;
      margin-top: 20px;
    }
    .conditions-list {
      list-style: none;
      padding: 0;
    }
    .conditions-list li {
      padding: 12px 20px;
      margin: 10px 0;
      background: #fef3c7;
      border-left: 3px solid #f59e0b;
      border-radius: 0 8px 8px 0;
    }
    .footer {
      margin-top: 60px;
      text-align: center;
      color: #64748b;
      font-size: 12px;
      border-top: 2px solid #e2e8f0;
      padding: 30px 0 0;
    }
    .footer p {
      margin: 5px 0;
    }
    .badge {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      margin-left: 10px;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">POOL CALCULATOR</div>
      <p class="subtitle">Presupuesto de Construcción de Piscina</p>
      <p class="date">${new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="content">

  <div class="section">
    <h2>Datos del Cliente</h2>
    <div class="info-row"><span>Nombre:</span><strong>${project.clientName}</strong></div>
    ${project.clientEmail ? `<div class="info-row"><span>Email:</span><strong>${project.clientEmail}</strong></div>` : ''}
    ${project.clientPhone ? `<div class="info-row"><span>Teléfono:</span><strong>${project.clientPhone}</strong></div>` : ''}
    ${project.location ? `<div class="info-row"><span>Ubicación:</span><strong>${project.location}</strong></div>` : ''}
  </div>

  <div class="section">
    <h2>Descripción del Proyecto <span class="badge">ID: ${project.id.substring(0, 8).toUpperCase()}</span></h2>
    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #10b981;">
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        <div>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 5px;">PROYECTO</p>
          <p style="font-size: 20px; font-weight: bold; color: #1e40af;">${project.name}</p>
        </div>
        <div>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 5px;">MODELO DE PISCINA</p>
          <p style="font-size: 18px; font-weight: 600; color: #1e293b;">${project.poolPreset?.name}</p>
        </div>
        <div>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 5px;">DIMENSIONES</p>
          <p style="font-weight: 600;">${project.poolPreset?.length}m × ${project.poolPreset?.width}m × ${project.poolPreset?.depth}m</p>
        </div>
        <div>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 5px;">VOLUMEN</p>
          <p style="font-weight: 600;">${project.volume.toFixed(2)} m³ <span style="color: #64748b;">(${(project.volume * 1000).toFixed(0)} litros)</span></p>
        </div>
        <div>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 5px;">FORMA</p>
          <p style="font-weight: 600;">${project.poolPreset?.shape || 'RECTANGULAR'}</p>
        </div>
        <div>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 5px;">ÁREA ESPEJO DE AGUA</p>
          <p style="font-weight: 600;">${project.waterMirrorArea.toFixed(2)} m²</p>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Características Incluidas</h2>
    <ul class="features-list">
      <li>✓ Excavación y preparación del terreno</li>
      <li>✓ Instalación de la piscina de fibra de vidrio</li>
      <li>✓ Sistema de filtración completo</li>
      <li>✓ Instalación hidráulica (${project.poolPreset?.returnsCount} retornos, ${project.poolPreset?.skimmerCount} skimmers)</li>
      ${project.poolPreset?.hasLighting ? `<li>✓ Iluminación LED (${project.poolPreset.lightingCount} unidades)</li>` : ''}
      ${project.poolPreset?.hasBottomDrain ? `<li>✓ Desagüe de fondo</li>` : ''}
      ${project.poolPreset?.hasVacuumIntake ? `<li>✓ Toma de limpiafondos</li>` : ''}
      <li>✓ Vereda perimetral (${(calculatedSidewalkArea || project.sidewalkArea || 0).toFixed(2)} m²)</li>
      <li>✓ Materiales de construcción completos</li>
      ${equipmentRecommendation ? `<li>✓ Bomba de filtrado ${equipmentRecommendation.pump.name}</li>` : ''}
      ${equipmentRecommendation ? `<li>✓ Filtro de arena ${equipmentRecommendation.filter.name}</li>` : ''}
    </ul>
  </div>

  <div class="cost-box">
    <h2 style="margin-top: 0;">Inversión Total</h2>

    <div class="cost-item" style="font-size: 14px; color: #64748b;">
      <span>Materiales Base:</span>
      <strong>$${project.materialCost.toLocaleString('es-AR')}</strong>
    </div>
    ${plumbingCosts > 0 ? `<div class="cost-item" style="font-size: 14px; color: #64748b;">
      <span>+ Plomería:</span>
      <strong>$${plumbingCosts.toLocaleString('es-AR')}</strong>
    </div>` : ''}
    ${additionalsCosts.materialCost > 0 ? `<div class="cost-item" style="font-size: 14px; color: #64748b;">
      <span>+ Adicionales:</span>
      <strong>$${additionalsCosts.materialCost.toLocaleString('es-AR')}</strong>
    </div>` : ''}
    <div class="cost-item">
      <span>Total Materiales y Equipamiento:</span>
      <strong>$${totalMaterialCost.toLocaleString('es-AR')}</strong>
    </div>

    <div class="cost-item" style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
      <span>Mano de Obra:</span>
      <strong>$${totalLaborCost.toLocaleString('es-AR')}</strong>
    </div>

    <div class="cost-item total">
      <span>TOTAL:</span>
      <span>$${grandTotal.toLocaleString('es-AR')}</span>
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

  ${projectUpdates.length > 0 ? `
  <div class="section" style="page-break-before: always;">
    <h2>Historial del Proyecto</h2>
    <p style="color: #64748b; margin-bottom: 20px;">Registro cronológico de actualizaciones y eventos</p>
    ${projectUpdates.map((update: any) => {
      const categoryLabels: Record<string, string> = {
        'PROGRESS': 'Progreso',
        'MILESTONE': 'Hito',
        'ISSUE': 'Problema',
        'NOTE': 'Nota',
        'INSPECTION': 'Inspección',
        'DELIVERY': 'Entrega',
        'OTHER': 'Otro',
      };
      const categoryLabel = categoryLabels[update.category] || 'Actualización';
      const date = new Date(update.createdAt).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #2563eb; background: #f8fafc; border-radius: 0 8px 8px 0;">
          <div style="display: flex; justify-between; align-items: start; margin-bottom: 10px;">
            <div>
              <h3 style="margin: 0 0 5px 0; font-size: 16px; color: #1e293b;">${update.title}</h3>
              <span style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                ${categoryLabel}
              </span>
            </div>
            <span style="font-size: 12px; color: #64748b;">${date}</span>
          </div>
          ${update.description ? `<p style="color: #475569; margin: 10px 0; font-size: 14px;">${update.description}</p>` : ''}
          ${update.images && update.images.length > 0 ? `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-top: 15px;">
              ${update.images.map((img: string, idx: number) => `
                <div style="position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 2px solid #e2e8f0;">
                  <img src="${img}" alt="Imagen ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('')}
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>Pool Calculator</strong> - Sistema Profesional de Cálculo de Materiales para Piscinas</p>
    <p>Generado el ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR')}</p>
    <p style="margin-top: 10px; font-size: 10px;">Jesús Olguín - Domotics & IoT Solutions</p>
  </div>
    </div>
  </div>
</body>
</html>`;
    return html;
  };

  const generateProfessionalSpec = () => {
    const materials = project.materials as any;
    const plumbingConfig = project.plumbingConfig as any;
    const electricalConfig = calculatedElectricalSpecs || (project.electricalConfig as any);

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Especificaciones Técnicas - ${project.name}</title>
  <style>
    body { font-family: 'Courier New', monospace; margin: 20px; font-size: 12px; }
    .header { border: 2px solid #000; padding: 15px; margin-bottom: 20px; }
    h1 { margin: 0; font-size: 20px; }
    h2 { background: #000; color: #fff; padding: 8px; font-size: 14px; margin-top: 20px; }
    h3 { border-bottom: 1px solid #000; padding-bottom: 5px; margin-top: 15px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
    th { background: #e0e0e0; font-weight: bold; }
    .spec { margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #000; }
    .warning { background: #fff3cd; border-left-color: #ff6b00; padding: 10px; margin: 10px 0; }
    .note { font-size: 10px; font-style: italic; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>ESPECIFICACIONES TÉCNICAS DE CONSTRUCCIÓN</h1>
    <p><strong>Proyecto:</strong> ${project.name}</p>
    <p><strong>Cliente:</strong> ${project.clientName}</p>
    <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-AR')}</p>
    <p><strong>Código Proyecto:</strong> ${project.id.substring(0, 8).toUpperCase()}</p>
  </div>

  <h2>1. EXCAVACIÓN Y PREPARACIÓN</h2>
  <div class="spec">
    <strong>Dimensiones de Excavación:</strong><br>
    Largo: ${project.excavationLength.toFixed(2)}m<br>
    Ancho: ${project.excavationWidth.toFixed(2)}m<br>
    Profundidad: ${project.excavationDepth.toFixed(2)}m<br>
    Volumen estimado de tierra: ${(project.excavationLength * project.excavationWidth * project.excavationDepth).toFixed(2)} m³
  </div>
  <div class="warning">
    ⚠️ IMPORTANTE: Verificar presencia de napas freáticas y servicios subterráneos antes de excavar.
  </div>

  ${materials && Object.keys(materials).length > 0 ? `
  <h2>2. CAMA DE APOYO INTERNA</h2>
  <table>
    <tr><th>Material</th><th>Cantidad</th><th>Especificación</th></tr>
    ${materials.geomembrane ? `<tr><td>Geomembrana</td><td>${materials.geomembrane.quantity} ${materials.geomembrane.unit}</td><td>Espesor mínimo 200 micrones</td></tr>` : ''}
    ${materials.electroweldedMesh ? `<tr><td>Malla Electrosoldada</td><td>${materials.electroweldedMesh.quantity} ${materials.electroweldedMesh.unit}</td><td>Q188 o similar, solape 10cm</td></tr>` : ''}
    ${materials.sandForBed ? `<tr><td>Arena Gruesa</td><td>${materials.sandForBed.quantity} ${materials.sandForBed.unit}</td><td>Cernida, sin arcilla</td></tr>` : ''}
    ${materials.cementBags ? `<tr><td>Cemento</td><td>${materials.cementBags.quantity} ${materials.cementBags.unit}</td><td>Portland CPC40</td></tr>` : ''}
  </table>
  <div class="note">Nota: Compactar cama en capas de 5cm, humedad óptima 12-15%</div>

  <h2>3. SOLADO DE VEREDA</h2>
  <div class="spec">
    Área total de vereda: ${(calculatedSidewalkArea || project.sidewalkArea || 0).toFixed(2)} m²<br>
    Espesor de base: ${materials.wireMesh ? '10cm' : '8cm'} de hormigón H17
  </div>
  <table>
    <tr><th>Material</th><th>Cantidad</th><th>Uso</th></tr>
    ${materials.cement ? `<tr><td>Cemento</td><td>${materials.cement.quantity} ${materials.cement.unit}</td><td>Hormigón base</td></tr>` : ''}
    ${materials.sand ? `<tr><td>Arena</td><td>${materials.sand.quantity} ${materials.sand.unit}</td><td>Mezcla</td></tr>` : ''}
    ${materials.gravel ? `<tr><td>Piedra/Canto Rodado</td><td>${materials.gravel.quantity} ${materials.gravel.unit}</td><td>Hormigón</td></tr>` : ''}
    ${materials.wireMesh ? `<tr><td>Malla de Acero</td><td>${materials.wireMesh.quantity} ${materials.wireMesh.unit}</td><td>Armadura</td></tr>` : ''}
    ${materials.adhesive ? `<tr><td>Adhesivo Cerámico</td><td>${materials.adhesive.quantity} ${materials.adhesive.unit}</td><td>Pegado losetas</td></tr>` : ''}
    ${materials.whiteCement ? `<tr><td>Cemento Blanco</td><td>${materials.whiteCement.quantity} ${materials.whiteCement.unit}</td><td>Pastina</td></tr>` : ''}
    ${materials.marmolina ? `<tr><td>Marmolina</td><td>${materials.marmolina.quantity} ${materials.marmolina.unit}</td><td>Pastina</td></tr>` : ''}
  </table>
  ` : ''}

  ${plumbingConfig && plumbingConfig.selectedItems ? `
  <h2>4. INSTALACIÓN HIDRÁULICA</h2>
  <div class="spec">
    <strong>Configuración del Sistema:</strong><br>
    Distancia a cabecera: ${plumbingConfig.distanceToEquipment || 'No especificada'} metros<br>
    Retornos: ${project.poolPreset?.returnsCount || 0}<br>
    Skimmers: ${project.poolPreset?.skimmerCount || 0}<br>
    Desagüe de fondo: ${project.poolPreset?.hasBottomDrain ? 'SÍ' : 'NO'}<br>
    Toma de limpiafondos: ${project.poolPreset?.hasVacuumIntake ? 'SÍ' : 'NO'}
  </div>
  <table>
    <tr><th>Item</th><th>Diámetro</th><th>Cantidad</th><th>Observaciones</th></tr>
    ${plumbingConfig.selectedItems.map((item: any) => `
      <tr>
        <td>${item.itemName}</td>
        <td>${item.diameter || '-'}</td>
        <td>${item.quantity}</td>
        <td>Tipo ${item.type || 'PVC'}</td>
      </tr>
    `).join('')}
  </table>
  <div class="warning">
    ⚠️ PRUEBA DE PRESIÓN: Realizar prueba hidráulica a 1.5 bar por 24hs antes de enterrar cañerías
  </div>
  ` : ''}

  ${electricalConfig ? `
  <h2>5. INSTALACIÓN ELÉCTRICA</h2>
  <div class="spec">
    <strong>Características del Sistema:</strong><br>
    Potencia Total: ${electricalConfig.totalWatts || 0}W (${((electricalConfig.totalWatts || 0) / 220).toFixed(1)}A)<br>
    Distancia al tablero: 15m<br>
    Térmica recomendada: ${electricalConfig.recommendedBreaker || 16}A<br>
    Disyuntor diferencial: ${electricalConfig.recommendedRCD || 16}A 30mA<br>
    Sección de cable: ${electricalConfig.cableSection || '2.5mm²'}
  </div>
  ${equipmentRecommendation ? `
  <h3>Equipos Obligatorios</h3>
  <table>
    <tr><th>Equipo</th><th>Modelo</th><th>Potencia</th><th>Especificación</th></tr>
    <tr>
      <td>Bomba de Filtrado</td>
      <td>${equipmentRecommendation.pump.name}</td>
      <td>${equipmentRecommendation.pump.consumption || 0}W</td>
      <td>${equipmentRecommendation.pump.power || 0} HP - ${equipmentRecommendation.pump.flowRate || 0} m³/h</td>
    </tr>
    <tr>
      <td>Filtro de Arena</td>
      <td>${equipmentRecommendation.filter.name}</td>
      <td>-</td>
      <td>Ø${equipmentRecommendation.filter.filterDiameter || 0}mm - ${equipmentRecommendation.filter.sandRequired || 0}kg arena</td>
    </tr>
  </table>
  ` : ''}
  ${electricalConfig.consumptionBreakdown && electricalConfig.consumptionBreakdown.length > 0 ? `
  <h3>Desglose de Consumo Eléctrico</h3>
  <table>
    <tr><th>Equipo</th><th>Potencia Unit.</th><th>Cantidad</th><th>Total</th></tr>
    ${electricalConfig.consumptionBreakdown.map((item: any) => `
      <tr>
        <td>${item.item}</td>
        <td>${item.watts}W</td>
        <td>${item.quantity}</td>
        <td>${item.totalWatts}W</td>
      </tr>
    `).join('')}
    <tr style="background: #f0f0f0; font-weight: bold;">
      <td colspan="3">TOTAL</td>
      <td>${electricalConfig.totalWatts}W</td>
    </tr>
  </table>
  ` : ''}
  <div class="warning">
    ⚠️ SEGURIDAD: Todas las instalaciones eléctricas deben cumplir con AEA 90364. Instalador matriculado obligatorio.
  </div>
  ` : ''}

  ${(() => {
    const rolesSummary = getRolesCostSummary();
    const hasRoles = Object.keys(rolesSummary).length > 0;

    if (!hasRoles) return '';

    const totalRolesHours = Object.values(rolesSummary).reduce((sum, r) => sum + r.hours, 0);
    const totalRolesCost = Object.values(rolesSummary).reduce((sum, r) => sum + r.cost, 0);

    return `
  <h2>6. MANO DE OBRA REQUERIDA</h2>
  <div class="spec">
    <strong>Resumen General:</strong><br>
    Horas Totales Estimadas: ${totalRolesHours.toFixed(1)} hs<br>
    Costo Total Mano de Obra: $${totalRolesCost.toLocaleString('es-AR')}<br>
    Roles Involucrados: ${Object.keys(rolesSummary).length}
  </div>
  <table>
    <tr><th>Rol/Oficio</th><th>Tareas Asignadas</th><th>Horas Est.</th><th>Costo</th></tr>
    ${Object.entries(rolesSummary).map(([_, summary]: [string, any]) => `
      <tr>
        <td>${summary.roleName}</td>
        <td>${summary.tasksCount}</td>
        <td>${summary.hours.toFixed(1)} hs</td>
        <td>$${summary.cost.toLocaleString('es-AR')}</td>
      </tr>
    `).join('')}
    <tr style="background: #f0f0f0; font-weight: bold;">
      <td>TOTAL</td>
      <td>${Object.values(rolesSummary).reduce((sum: number, r: any) => sum + r.tasksCount, 0)}</td>
      <td>${totalRolesHours.toFixed(1)} hs</td>
      <td>$${totalRolesCost.toLocaleString('es-AR')}</td>
    </tr>
  </table>
  <div class="note">Nota: Las horas son estimadas y pueden variar según condiciones del terreno y experiencia del equipo</div>
    `;
  })()}

  <h2>${(() => {
    const rolesSummary = getRolesCostSummary();
    return Object.keys(rolesSummary).length > 0 ? '7' : '6';
  })()}. SECUENCIA DE TRABAJO RECOMENDADA</h2>
  <ol style="line-height: 1.8;">
    <li>Excavación y nivelación del terreno</li>
    <li>Instalación de cañerías principales (antes de colocar piscina)</li>
    <li>Preparación de cama de apoyo con geomembrana</li>
    <li>Colocación de piscina de fibra</li>
    <li>Relleno perimetral gradual (compactar por capas)</li>
    <li>Conexiones hidráulicas finales</li>
    <li>Ejecución de solado de vereda</li>
    <li>Instalación eléctrica</li>
    <li>Colocación de accesorios (skimmer, retornos, luces)</li>
    <li>Pruebas del sistema</li>
    <li>Llenado y puesta en marcha</li>
  </ol>

  <h2>7. NORMATIVAS APLICABLES</h2>
  <ul>
    <li>Reglamento AEA 90364 (Instalaciones Eléctricas)</li>
    <li>Norma IRAM 2178 (Cables subterráneos)</li>
    <li>Código de Edificación local</li>
    <li>Normas IRAM para cañerías (IRAM 13480)</li>
  </ul>

  <div style="margin-top: 40px; border-top: 2px solid #000; padding-top: 10px; text-align: center;">
    <p class="note">Documento técnico generado por Pool Calculator - ${new Date().toLocaleDateString('es-AR')}</p>
    <p class="note">Este documento debe ser validado por profesional responsable de obra</p>
  </div>
</body>
</html>`;
    return html;
  };

  const generateMaterialsList = () => {
    const materials = project.materials as any;
    let csv = 'Categoría,Material,Cantidad,Unidad,Uso,Observaciones\n';

    if (materials) {
      // Materiales de vereda
      if (materials.cement) csv += `Vereda,Cemento Portland,${materials.cement.quantity},${materials.cement.unit},Hormigón base,CPC40\n`;
      if (materials.sand) csv += `Vereda,Arena gruesa,${materials.sand.quantity},${materials.sand.unit},Mezcla hormigón,Cernida\n`;
      if (materials.gravel) csv += `Vereda,Piedra/Canto rodado,${materials.gravel.quantity},${materials.gravel.unit},Hormigón,6-20mm\n`;
      if (materials.wireMesh) csv += `Vereda,Malla metálica,${materials.wireMesh.quantity},${materials.wireMesh.unit},Armadura,Q188 o similar\n`;
      if (materials.adhesive) csv += `Vereda,Adhesivo cerámico,${materials.adhesive.quantity},${materials.adhesive.unit},Pegado losetas,Exterior\n`;
      if (materials.whiteCement) csv += `Vereda,Cemento blanco,${materials.whiteCement.quantity},${materials.whiteCement.unit},Pastina,\n`;
      if (materials.marmolina) csv += `Vereda,Marmolina,${materials.marmolina.quantity},${materials.marmolina.unit},Pastina,\n`;
      if (materials.waterproofing) csv += `Vereda,Impermeabilizante,${materials.waterproofing.quantity},${materials.waterproofing.unit},Protección,2 manos\n`;

      // Materiales de cama
      if (materials.geomembrane) csv += `Cama,Geomembrana,${materials.geomembrane.quantity},${materials.geomembrane.unit},Base,200 micrones mín\n`;
      if (materials.electroweldedMesh) csv += `Cama,Malla electrosoldada,${materials.electroweldedMesh.quantity},${materials.electroweldedMesh.unit},Refuerzo,Q188\n`;
      if (materials.sandForBed) csv += `Cama,Arena gruesa,${materials.sandForBed.quantity},${materials.sandForBed.unit},Colchón,Sin arcilla\n`;
      if (materials.cementBags) csv += `Cama,Cemento,${materials.cementBags.quantity},${materials.cementBags.unit},Capa final,Bolsas 50kg\n`;
      if (materials.drainStone) csv += `Cama,Piedra para drenaje,${materials.drainStone.quantity},${materials.drainStone.unit},Zanja,\n`;
    }

    // Plomería
    const plumbingConfig = project.plumbingConfig as any;
    if (plumbingConfig && plumbingConfig.selectedItems) {
      plumbingConfig.selectedItems.forEach((item: any) => {
        csv += `Plomería,${item.itemName},${item.quantity},unidades,${item.category || 'Instalación'},Ø${item.diameter || '-'}\n`;
      });
    }

    // Eléctricos
    const electricalConfig = project.electricalConfig as any;
    if (electricalConfig && electricalConfig.items) {
      electricalConfig.items.forEach((item: any) => {
        csv += `Eléctrico,${item.name},${item.quantity},unidades,${item.type},${item.watts}W ${item.voltage}V\n`;
      });
    }

    return csv;
  };

  const generateWhatsAppMessage = (template: ExportTemplate, sections = selectedSections): string => {
    const materials = project.materials as any;
    const plumbingConfig = project.plumbingConfig as any;
    const electricalConfig = project.electricalConfig as any;
    const additionals = (project as any).additionals || [];

    // Calcular costos actualizados
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

    const electricalCosts = electricalConfig?.items
      ? electricalConfig.items.reduce((sum: number, item: any) => sum + (item.pricePerUnit ? item.pricePerUnit * item.quantity : 0), 0)
      : 0;

    const totalMaterialCost = project.materialCost + additionalsCosts.materialCost + plumbingCosts + electricalCosts;
    const totalLaborCost = project.laborCost + additionalsCosts.laborCost;
    const grandTotal = totalMaterialCost + totalLaborCost;

    // Calcular caños automáticamente
    const pipeCalculation = plumbingConfig?.distanceToEquipment
      ? plumbingCalculationService.calculateFromProject(project, plumbingConfig.distanceToEquipment)
      : null;

    if (template === 'client') {
      let message = '';

      // Header
      if (sections.header) {
        message += `*PRESUPUESTO - CONSTRUCCION DE PISCINA*

*Proyecto:* ${project.name}
*Cliente:* ${project.clientName}
*Ubicacion:* ${project.location || 'A definir'}`;
      }

      // Características
      if (sections.characteristics) {
        message += `${message ? '\n\n' : ''}*CARACTERISTICAS DE LA PISCINA*
- Modelo: ${project.poolPreset?.name || 'N/A'}
- Dimensiones: ${project.poolPreset?.length || 0}m x ${project.poolPreset?.width || 0}m x ${project.poolPreset?.depth || 0}m
- Volumen: ${project.volume.toFixed(2)} m³ (${(project.volume * 1000).toFixed(0)} litros)
- Forma: ${project.poolPreset?.shape || 'N/A'}`;
      }

      // Incluye
      if (sections.includes) {
        message += `${message ? '\n\n' : ''}*INCLUYE:*
- Excavacion y preparacion del terreno
- Instalacion de piscina de fibra de vidrio
- Sistema de filtracion completo
${equipmentRecommendation ? `- Bomba ${equipmentRecommendation.pump.name} (${equipmentRecommendation.pump.power}HP)\n` : ''}- Instalacion hidraulica (${project.poolPreset?.returnsCount || 0} retornos, ${project.poolPreset?.skimmerCount || 0} skimmers)
${project.poolPreset?.hasLighting ? `- Iluminacion LED (${project.poolPreset.lightingCount} unidades)\n` : ''}- Vereda perimetral (${(calculatedSidewalkArea || project.sidewalkArea || 0).toFixed(2)} m²)
- Materiales de construccion`;

        // Agregar info de caños si está disponible
        if (pipeCalculation) {
          message += `\n\n*INSTALACION HIDRAULICA CALCULADA:*
- Total de canos requeridos: ${pipeCalculation.summary.totalMeters}m
- Distancia maxima al equipo: ${pipeCalculation.summary.maxDistance}m`;

          pipeCalculation.pipeRequirements.forEach(req => {
            message += `\n- ${req.lineType}: ${req.totalMeters}m (${req.diameter})`;
          });
        }
      }

      // Adicionales
      if (sections.additionals && additionals && additionals.length > 0) {
        message += `${message ? '\n\n' : ''}*ADICIONALES INCLUIDOS:*\n`;
        additionals.forEach((add: any) => {
          const name = add.customName || add.accessory?.name || add.equipment?.name || add.material?.name || 'Item adicional';
          message += `- ${name} (${add.newQuantity} ${add.customUnit || 'unidades'})\n`;
        });
      }

      // Costos
      if (sections.costs) {
        message += `${message ? '\n\n' : ''}*INVERSION TOTAL*`;

        // Desglose detallado
        message += `\n- Materiales base: $${project.materialCost.toLocaleString('es-AR')}`;

        if (plumbingCosts > 0) {
          message += `\n- Plomeria: $${plumbingCosts.toLocaleString('es-AR')}`;
        }

        if (electricalCosts > 0) {
          message += `\n- Instalacion electrica: $${electricalCosts.toLocaleString('es-AR')}`;
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

      // Condiciones
      if (sections.conditions) {
        message += `${message ? '\n\n' : ''}*CONDICIONES:*
- Valido por 30 dias
- Plazo: 15-20 dias habiles
- Pago: 50% inicio, 50% finalizacion
- Garantia: 1 año mano de obra`;
      }

      message += `\n\n_Generado por Pool Calculator - ${new Date().toLocaleDateString('es-AR')}_`;

      return message;
    } else if (template === 'materials') {
      let msg = `*LISTA DE MATERIALES - ${project.name.toUpperCase()}*\n\n`;

      if (materials) {
        msg += `*MATERIALES DE VEREDA*\n`;
        if (materials.cement) msg += `- Cemento: ${materials.cement.quantity} ${materials.cement.unit}\n`;
        if (materials.sand) msg += `- Arena: ${materials.sand.quantity} ${materials.sand.unit}\n`;
        if (materials.gravel) msg += `- Piedra: ${materials.gravel.quantity} ${materials.gravel.unit}\n`;
        if (materials.adhesive) msg += `- Adhesivo: ${materials.adhesive.quantity} ${materials.adhesive.unit}\n`;

        msg += `\n*CAMA INTERNA*\n`;
        if (materials.geomembrane) msg += `- Geomembrana: ${materials.geomembrane.quantity} ${materials.geomembrane.unit}\n`;
        if (materials.electroweldedMesh) msg += `- Malla electrosoldada: ${materials.electroweldedMesh.quantity} ${materials.electroweldedMesh.unit}\n`;
        if (materials.sandForBed) msg += `- Arena: ${materials.sandForBed.quantity} ${materials.sandForBed.unit}\n`;
      }

      if (plumbingConfig && plumbingConfig.selectedItems && plumbingConfig.selectedItems.length > 0) {
        msg += `\n*PLOMERÍA*\n`;
        plumbingConfig.selectedItems.slice(0, 5).forEach((item: any) => {
          msg += `- ${item.itemName}: ${item.quantity} un.\n`;
        });
        if (plumbingConfig.selectedItems.length > 5) {
          msg += `- ... y ${plumbingConfig.selectedItems.length - 5} items más\n`;
        }
      }

      if (calculatedElectricalSpecs || (electricalConfig && electricalConfig.items)) {
        const specs = calculatedElectricalSpecs || electricalConfig;
        msg += `\n*ELÉCTRICOS*\n`;

        if (equipmentRecommendation) {
          msg += `- Bomba ${equipmentRecommendation.pump.name}: ${equipmentRecommendation.pump.consumption}W\n`;
          msg += `- Filtro ${equipmentRecommendation.filter.name}\n`;
        }

        if (specs.consumptionBreakdown) {
          specs.consumptionBreakdown.forEach((item: any) => {
            msg += `- ${item.item}: ${item.quantity} un. (${item.totalWatts}W)\n`;
          });
        } else if (electricalConfig && electricalConfig.items) {
          electricalConfig.items.forEach((item: any) => {
            msg += `- ${item.name}: ${item.quantity} un. (${item.watts}W)\n`;
          });
        }

        msg += `\n*Especificaciones Eléctricas:*\n`;
        msg += `- Potencia Total: ${specs.totalWatts || 0}W (${((specs.totalWatts || 0) / 220).toFixed(1)}A)\n`;
        msg += `- Termica: ${specs.recommendedBreaker || 16}A\n`;
        msg += `- Diferencial: ${specs.recommendedRCD || 16}A 30mA\n`;
        msg += `- Cable: ${specs.cableSection || '2.5mm²'}\n`;
      }

      msg += `\n_Lista completa disponible en formato CSV_`;
      return msg;
    } else if (template === 'budget') {
      return `*PRESUPUESTO DETALLADO*

*${project.name}*
Cliente: ${project.clientName}

*COSTOS*
- Materiales y equipamiento: $${project.materialCost.toLocaleString('es-AR')}
- Mano de obra: $${project.laborCost.toLocaleString('es-AR')}

*TOTAL: $${project.totalCost.toLocaleString('es-AR')}*

_Para más detalles, solicite el documento completo_`;
    }

    // Default para otros templates
    return `*${project.name.toUpperCase()}*\n\nCliente: ${project.clientName}\nTotal: $${project.totalCost.toLocaleString('es-AR')}\n\nPara más información, solicite el documento completo.`;
  };

  const handleWhatsAppShare = () => {
    const message = generateWhatsAppMessage(selectedTemplate);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleExport = (format: 'html' | 'csv', template: ExportTemplate) => {
    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'html') {
      if (template === 'client') {
        content = generateClientBudget();
      } else if (template === 'professional') {
        content = generateProfessionalSpec();
      }
      filename = `${template}-${project.name.replace(/\s+/g, '-').toLowerCase()}.html`;
      mimeType = 'text/html';
    } else if (format === 'csv') {
      content = generateMaterialsList();
      filename = `materiales-${project.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
      mimeType = 'text/csv;charset=utf-8;';
    }

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
    const html = template === 'client' ? generateClientBudget() : generateProfessionalSpec();
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
    try {
      // Generar QR code con link al proyecto (simulado por ahora)
      const projectUrl = `${window.location.origin}/projects/${project.id}`;
      const qrDataUrl = await QRCode.toDataURL(projectUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#1e40af',
          light: '#ffffff'
        }
      });

      // Crear contenedor temporal para renderizar
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '210mm'; // A4 width
      container.style.background = 'white';
      container.style.padding = '20mm';

      const html = template === 'client' ? generateClientBudget() : generateProfessionalSpec();

      // Agregar QR code al final del documento
      const htmlWithQR = html.replace(
        '</body>',
        `
        <div style="position: fixed; bottom: 20mm; right: 20mm; text-align: center;">
          <img src="${qrDataUrl}" style="width: 80px; height: 80px; border: 2px solid #2563eb; border-radius: 8px;" />
          <p style="font-size: 8px; color: #64748b; margin-top: 5px;">Escanea para ver online</p>
        </div>
        </body>
        `
      );

      container.innerHTML = htmlWithQR;
      document.body.appendChild(container);

      // Generar canvas del contenido
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Crear PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

      // Si el contenido es muy largo, agregar páginas adicionales
      let heightLeft = imgHeight * ratio - pdfHeight;
      let position = 0;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight * ratio;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pdfHeight;
      }

      // Guardar PDF
      const filename = `${template}-${project.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      pdf.save(filename);

      // Limpiar
      document.body.removeChild(container);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Hubo un error al generar el PDF. Por favor intenta nuevamente.');
    }
  };

  const handleExportToExcel = async () => {
    setExportingToExcel(true);
    try {
      await projectService.exportToExcel(project.id, excelSections);
      alert('✅ Archivo Excel descargado exitosamente!');
      setShowExcelDialog(false);
    } catch (error: any) {
      console.error('Error al exportar a Excel:', error);
      const errorMessage = error.response?.data?.details || error.message || 'Error desconocido';
      alert('❌ Error al exportar a Excel:\n\n' + errorMessage);
    } finally {
      setExportingToExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold mb-2">Selecciona el tipo de documento</h3>
        <p className="text-sm text-gray-600 mb-6">
          Elegí el formato que mejor se adapte a tus necesidades
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const Icon = template.icon;
            const isSelected = selectedTemplate === template.id;

            return (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected
                    ? `border-${template.color}-500 bg-${template.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`text-${template.color}-600 mt-1`} size={24} />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{template.name}</h4>
                    <p className="text-xs text-gray-600">{template.description}</p>
                  </div>
                  {isSelected && (
                    <div className={`w-3 h-3 rounded-full bg-${template.color}-500`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-4">Acciones de Exportación</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Button
            onClick={() => handleExportPDF(selectedTemplate)}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <FileDown size={20} />
            Descargar PDF
          </Button>

          <Button
            onClick={() => handleExport('html', selectedTemplate)}
            variant="secondary"
            className="flex items-center justify-center gap-2"
          >
            <Download size={20} />
            Descargar HTML
          </Button>

          <Button
            onClick={() => handlePrint(selectedTemplate)}
            variant="secondary"
            className="flex items-center justify-center gap-2"
          >
            <Printer size={20} />
            Imprimir
          </Button>

          <Button
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle size={20} />
            WhatsApp
          </Button>

          <Button
            onClick={() => setShowExcelDialog(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FileSpreadsheet size={20} />
            Excel ACQUAM
          </Button>

          {selectedTemplate === 'materials' && (
            <Button
              onClick={() => handleExport('csv', selectedTemplate)}
              variant="secondary"
              className="flex items-center justify-center gap-2"
            >
              <FileSpreadsheet size={20} />
              CSV
            </Button>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">¿Qué incluye este documento?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {selectedTemplate === 'client' && (
              <>
                <li>✓ Resumen del proyecto y características</li>
                <li>✓ Precio total sin detalles técnicos</li>
                <li>✓ Condiciones de pago y garantía</li>
                <li>✓ Presentación profesional para el cliente</li>
              </>
            )}
            {selectedTemplate === 'professional' && (
              <>
                <li>✓ Planos y medidas de excavación</li>
                <li>✓ Especificaciones técnicas detalladas</li>
                <li>✓ Lista de materiales con cantidades exactas</li>
                <li>✓ Secuencia de trabajo recomendada</li>
                <li>✓ Normativas y regulaciones aplicables</li>
              </>
            )}
            {selectedTemplate === 'materials' && (
              <>
                <li>✓ Lista completa de materiales</li>
                <li>✓ Cantidades exactas y unidades</li>
                <li>✓ Categorización por tipo</li>
                <li>✓ Formato CSV para Excel/Sheets</li>
              </>
            )}
          </ul>
        </div>
      </Card>

      {/* Vista previa interactiva del mensaje de WhatsApp */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Personalizar Mensaje de WhatsApp</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de selección de secciones */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Selecciona las secciones a incluir:</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSections.header}
                  onChange={(e) => setSelectedSections({ ...selectedSections, header: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <p className="font-medium text-sm">Encabezado</p>
                  <p className="text-xs text-gray-500">Título, nombre del proyecto y cliente</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSections.characteristics}
                  onChange={(e) => setSelectedSections({ ...selectedSections, characteristics: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <p className="font-medium text-sm">Características de la Piscina</p>
                  <p className="text-xs text-gray-500">Modelo, dimensiones, volumen y forma</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSections.includes}
                  onChange={(e) => setSelectedSections({ ...selectedSections, includes: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <p className="font-medium text-sm">Incluye</p>
                  <p className="text-xs text-gray-500">Lista de servicios y trabajos incluidos</p>
                </div>
              </label>

              {((project as any).additionals || []).length > 0 && (
                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSections.additionals}
                    onChange={(e) => setSelectedSections({ ...selectedSections, additionals: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <p className="font-medium text-sm">Adicionales</p>
                    <p className="text-xs text-gray-500">Items adicionales agregados al proyecto</p>
                  </div>
                </label>
              )}

              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSections.costs}
                  onChange={(e) => setSelectedSections({ ...selectedSections, costs: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <p className="font-medium text-sm">Inversión Total</p>
                  <p className="text-xs text-gray-500">Desglose de costos y total</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSections.conditions}
                  onChange={(e) => setSelectedSections({ ...selectedSections, conditions: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <p className="font-medium text-sm">Condiciones</p>
                  <p className="text-xs text-gray-500">Validez, plazo, forma de pago y garantía</p>
                </div>
              </label>

              <div className="flex gap-2 pt-3">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedSections({
                    header: true,
                    characteristics: true,
                    includes: true,
                    additionals: true,
                    costs: true,
                    conditions: true,
                  })}
                  className="flex-1"
                >
                  Seleccionar Todo
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedSections({
                    header: false,
                    characteristics: false,
                    includes: false,
                    additionals: false,
                    costs: false,
                    conditions: false,
                  })}
                  className="flex-1"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </div>

          {/* Vista previa */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Vista Previa:</h4>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-[600px] overflow-y-auto">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                  {generateWhatsAppMessage(selectedTemplate, selectedSections)}
                </pre>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Esta es una vista previa del mensaje que se enviará. El formato puede variar según el cliente de WhatsApp.
            </p>
          </div>
        </div>
      </Card>

      {/* Modal de Exportación a Excel */}
      {showExcelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
              <h3 className="text-xl font-semibold text-gray-900">Configurar Exportación a Excel</h3>
              <p className="text-sm text-gray-600 mt-2">
                Seleccioná las secciones que querés incluir en el documento técnico
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-gray-200 hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={excelSections.excavation}
                    onChange={(e) => setExcelSections({ ...excelSections, excavation: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Excavación y Preparación</p>
                    <p className="text-xs text-gray-500 mt-1">Dimensiones, volumen de tierra, advertencias</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-gray-200 hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={excelSections.supportBed}
                    onChange={(e) => setExcelSections({ ...excelSections, supportBed: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Cama de Apoyo Interna</p>
                    <p className="text-xs text-gray-500 mt-1">Geomembrana, malla, arena, cemento</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-gray-200 hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={excelSections.sidewalk}
                    onChange={(e) => setExcelSections({ ...excelSections, sidewalk: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Solado de Vereda</p>
                    <p className="text-xs text-gray-500 mt-1">Materiales, área total, especificaciones</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-gray-200 hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={excelSections.plumbing}
                    onChange={(e) => setExcelSections({ ...excelSections, plumbing: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Instalación Hidráulica</p>
                    <p className="text-xs text-gray-500 mt-1">Cañerías, accesorios, configuración del sistema</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-gray-200 hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={excelSections.electrical}
                    onChange={(e) => setExcelSections({ ...excelSections, electrical: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Instalación Eléctrica</p>
                    <p className="text-xs text-gray-500 mt-1">Bomba, filtro, luces, consumo, especificaciones</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-gray-200 hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={excelSections.labor}
                    onChange={(e) => setExcelSections({ ...excelSections, labor: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Mano de Obra</p>
                    <p className="text-xs text-gray-500 mt-1">Roles, tareas, horas estimadas, costos</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-gray-200 hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={excelSections.sequence}
                    onChange={(e) => setExcelSections({ ...excelSections, sequence: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Secuencia de Trabajo</p>
                    <p className="text-xs text-gray-500 mt-1">Orden recomendado de construcción</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-gray-200 hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={excelSections.standards}
                    onChange={(e) => setExcelSections({ ...excelSections, standards: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Normativas Aplicables</p>
                    <p className="text-xs text-gray-500 mt-1">AEA 90364, IRAM, códigos</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <Button
                  size="sm"
                  variant="secondary"
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
                  className="flex-1"
                >
                  Seleccionar Todo
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
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
                  className="flex-1"
                >
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 rounded-b-xl flex gap-3">
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
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
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
