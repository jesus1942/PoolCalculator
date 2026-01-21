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
  /**
   * Opcional. URL del logo (ideal: un archivo en /public, ej: "/domotics-logo.png").
   * Se convierte a DataURL para evitar problemas de CORS/"tainted canvas" al exportar.
   */
  brandLogoUrl?: string;
}

type ExportTemplate = 'client' | 'professional' | 'materials' | 'complete' | 'budget' | 'overview';

type ExportTemplateSettings = {
  title?: string;
  subtitle?: string;
  conditions?: string;
  sections?: Record<string, boolean>;
  drawingView?: 'cad' | 'planta';
  values?: {
    materialCost?: number;
    laborCost?: number;
    totalCost?: number;
  };
};

type ExportSettings = {
  templates?: Partial<Record<ExportTemplate, ExportTemplateSettings>>;
};

export const EnhancedExportManager: React.FC<EnhancedExportManagerProps> = ({ project, brandLogoUrl }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate>('client');
  const [roles, setRoles] = useState<any[]>([]);
  const [projectUpdates, setProjectUpdates] = useState<any[]>([]);
  const [exportingToExcel, setExportingToExcel] = useState(false);
  const [showExcelDialog, setShowExcelDialog] = useState(false);
  const [equipmentRecommendation, setEquipmentRecommendation] = useState<any>(null);
  const [calculatedElectricalSpecs, setCalculatedElectricalSpecs] = useState<any>(null);
  const [calculatedSidewalkArea, setCalculatedSidewalkArea] = useState<number>(0);
  const poolCanvasRef = useRef<HTMLCanvasElement>(null);
  const cadCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedSections, setSelectedSections] = useState({
    header: true,
    characteristics: true,
    includes: true,
    additionals: true,
    costs: true,
    conditions: true,
  });
  const [exportSettings, setExportSettings] = useState<ExportSettings>(() => {
    return (project.exportSettings as ExportSettings) || { templates: {} };
  });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draftSettings, setDraftSettings] = useState<ExportSettings>({ templates: {} });
  const [savingSettings, setSavingSettings] = useState(false);
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

  // -------------------------------
  // Branding (logo) para exportación
  // -------------------------------
  const DEFAULT_BRAND_LOGO_DARK_URL = '/domotics-logo-dark.png';
  const DEFAULT_BRAND_LOGO_LIGHT_URL = '/domotics-logo-light.png';
  const [brandLogoDarkDataUrl, setBrandLogoDarkDataUrl] = useState<string | null>(null);
  const [brandLogoLightDataUrl, setBrandLogoLightDataUrl] = useState<string | null>(null);
  const [brandLogoError, setBrandLogoError] = useState<string>('');

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error('No se pudo leer el archivo del logo'));
      fr.readAsDataURL(blob);
    });

  const fetchAsDataUrl = async (url: string) => {
    // Usa fetch + DataURL para evitar CORS/tainted canvas en html2canvas.
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return blobToDataUrl(blob);
  };

  const downscalePngDataUrl = async (dataUrl: string, maxPx = 320) => {
    // Reduce peso del PDF: logo gigante (5000x5000) -> ~320px.
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const ratio = img.width / img.height;
        const w = Math.max(1, Math.round(ratio >= 1 ? maxPx : maxPx * ratio));
        const h = Math.max(1, Math.round(ratio >= 1 ? maxPx / ratio : maxPx));
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const cctx = c.getContext('2d');
        if (!cctx) return resolve(dataUrl);
        cctx.clearRect(0, 0, w, h);
        cctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setBrandLogoError('');

      // 1) Prop explícita
      // 2) Algún campo en el project (por si ya lo guardan en el backend)
      // 3) Fallback a /public
      const urlDark =
        brandLogoUrl ||
        (project as any)?.brandLogoUrl ||
        (project as any)?.companyLogoUrl ||
        DEFAULT_BRAND_LOGO_DARK_URL;
      const urlLight =
        brandLogoUrl ||
        (project as any)?.brandLogoUrlLight ||
        (project as any)?.companyLogoUrlLight ||
        DEFAULT_BRAND_LOGO_LIGHT_URL;

      try {
        const [darkDataUrl, lightDataUrl] = await Promise.all([
          fetchAsDataUrl(urlDark),
          fetchAsDataUrl(urlLight),
        ]);
        const [darkSmall, lightSmall] = await Promise.all([
          downscalePngDataUrl(darkDataUrl, 320),
          downscalePngDataUrl(lightDataUrl, 320),
        ]);
        if (alive) {
          setBrandLogoDarkDataUrl(darkSmall);
          setBrandLogoLightDataUrl(lightSmall);
        }
      } catch (e) {
        console.warn(e);
        if (!alive) return;
        setBrandLogoDarkDataUrl(null);
        setBrandLogoLightDataUrl(null);
        setBrandLogoError(
          'No pude cargar los logos. Sugerencia: poné los archivos en /public como /domotics-logo-dark.png y /domotics-logo-light.png.'
        );
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [brandLogoUrl, project]);

  const getLogoForTemplate = (template: ExportTemplate) => {
    const isDarkHeader = template !== 'overview';
    return isDarkHeader ? brandLogoLightDataUrl : brandLogoDarkDataUrl;
  };

  useEffect(() => {
    loadRoles();
    loadProjectUpdates();
    loadEquipmentRecommendations();
  }, []);

  useEffect(() => {
    setExportSettings((project.exportSettings as ExportSettings) || { templates: {} });
  }, [project]);

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

  const getTasksLaborCost = () => {
    const tasks = project.tasks as any;
    if (!tasks || typeof tasks !== 'object') return 0;
    return Object.values(tasks).reduce((sum: number, categoryTasks: any) => {
      if (!Array.isArray(categoryTasks)) return sum;
      return sum + categoryTasks.reduce((inner: number, task: any) => inner + (task.laborCost || 0), 0);
    }, 0);
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
    const tasksLaborCost = getTasksLaborCost();
    const baseLaborCost = tasksLaborCost > 0 ? tasksLaborCost : (project.laborCost || 0);

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
    const totalLaborCost = baseLaborCost + additionalsCosts.laborCost;
    const grandTotal = totalMaterialCost + totalLaborCost;

    return {
      additionals,
      additionalsCosts,
      plumbingCosts,
      totalMaterialCost,
      totalLaborCost,
      grandTotal,
      baseLaborCost,
    };
  };

  const getTaskMaterials = () => {
    const tasks = project.tasks as any;
    const map = new Map<string, { name: string; quantity: number; unit: string }>();

    if (!tasks) return [];

    Object.values(tasks).forEach((task: any) => {
      if (!task || !Array.isArray(task.materials)) return;
      task.materials.forEach((material: any) => {
        if (!material?.name) return;
        const quantity = Number(material.quantity || 0);
        const unit = material.unit || 'ud';
        if (!map.has(material.name)) {
          map.set(material.name, { name: material.name, quantity, unit });
        } else {
          const existing = map.get(material.name)!;
          existing.quantity += quantity;
        }
      });
    });

    return Array.from(map.values());
  };

  const getTemplateSettings = (template: ExportTemplate, settings: ExportSettings = exportSettings) => {
    return settings.templates?.[template] || {};
  };

  const resolveCostOverrides = (templateSettings: ExportTemplateSettings) => {
    const costs = calculateCosts();
    const overrides = templateSettings.values || {};
    return {
      ...costs,
      totalMaterialCost: overrides.materialCost ?? costs.totalMaterialCost,
      totalLaborCost: overrides.laborCost ?? costs.totalLaborCost,
      grandTotal: overrides.totalCost ?? costs.grandTotal,
    };
  };

  const getConditionsList = (customConditions?: string) => {
    if (customConditions && customConditions.trim()) {
      return customConditions
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [
      'Presupuesto válido por 30 días corridos',
      'Plazo de ejecución: 15-20 días hábiles',
      'Forma de pago: 50% al inicio de obra, 50% a la finalización',
      'Garantía: 1 año en mano de obra, según fabricante en equipos',
      'No incluye: Conexión eléctrica al tablero principal, provisión de agua',
    ];
  };

  const generateClientBudget = (templateSettings: ExportTemplateSettings = getTemplateSettings('client')) => {
    const sections = templateSettings.sections || selectedSections;
    const { additionalsCosts, plumbingCosts, totalMaterialCost, totalLaborCost, grandTotal } = resolveCostOverrides(templateSettings);
    const headerSubtitle = templateSettings.subtitle || 'Presupuesto de Construcción de Piscina';
    const documentTitle = templateSettings.title || `Presupuesto - ${project.name}`;
    const conditions = getConditionsList(templateSettings.conditions);
    const logoDataUrl = getLogoForTemplate('client');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${documentTitle}</title>
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
      <div class="logo">${logoDataUrl ? `<img src="${logoDataUrl}" alt="Domotics IoT Solutions" style="height:34px;width:auto;vertical-align:middle;"/>` : 'POOL CALCULATOR'}</div>
      <p class="subtitle">${headerSubtitle}</p>
      <p class="date">${new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="content">
      ${sections.header ? `
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
      ` : ''}

      ${sections.includes ? `
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
      ` : ''}

      ${sections.costs ? `
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
      ` : ''}

      ${sections.conditions ? `
      <div class="section">
        <h2>Condiciones Comerciales</h2>
        <ul class="conditions-list">
          ${conditions.map((item) => `<li>${item}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

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

  const generateTechnicalSpec = (
    templateSettings: ExportTemplateSettings = getTemplateSettings('professional'),
    drawingImageDataUrl?: string
  ) => {
    const materials = project.materials as any;
    const plumbingConfig = project.plumbingConfig as any;
    const headerSubtitle = templateSettings.subtitle || 'Especificaciones Técnicas del Proyecto';
    const documentTitle = templateSettings.title || `Especificaciones Técnicas - ${project.name}`;
    const logoDataUrl = getLogoForTemplate('professional');
    const drawingLabel = templateSettings.drawingView === 'planta' ? 'Vista Planta' : 'Plano CAD';
    const formatQuantity = (quantity: number | string | undefined, unit?: string) => {
      const qty = Number(quantity || 0);
      if (!qty || Number.isNaN(qty)) return '';
      const normalized = (unit || '').toLowerCase();
      const unitLabel = normalized.includes('bolsa')
        ? qty === 1 ? 'bolsa' : 'bolsas'
        : normalized.includes('malla')
          ? qty === 1 ? 'malla' : 'mallas'
          : normalized || 'unidades';
      return `${qty} ${unitLabel}`;
    };
    const shouldInclude = (quantity: number | string | undefined) => {
      const qty = Number(quantity || 0);
      return !!qty && !Number.isNaN(qty);
    };

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${documentTitle}</title>
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
    .cad-wrap { margin-top: 24px; padding: 16px; border: 1px solid #e5e7eb; background: #f9fafb; text-align: center; }
    .cad-wrap img { max-width: 100%; height: auto; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">${logoDataUrl ? `<img src="${logoDataUrl}" alt="Domotics IoT Solutions" style="height:34px;width:auto;vertical-align:middle;"/>` : 'POOL CALCULATOR'}</div>
      <p class="subtitle">${headerSubtitle}</p>
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
            ${materials?.cement && shouldInclude(materials.cement.quantity) ? `<tr><td>Cemento Portland</td><td>${formatQuantity(materials.cement.quantity, materials.cement.unit)}</td><td>${materials.cement.unit}</td><td>Hormigón base vereda</td></tr>` : ''}
            ${materials?.sand && shouldInclude(materials.sand.quantity) ? `<tr><td>Arena gruesa</td><td>${formatQuantity(materials.sand.quantity, materials.sand.unit)}</td><td>${materials.sand.unit}</td><td>Mezcla hormigón</td></tr>` : ''}
            ${materials?.gravel && shouldInclude(materials.gravel.quantity) ? `<tr><td>Grava/Piedra</td><td>${formatQuantity(materials.gravel.quantity, materials.gravel.unit)}</td><td>${materials.gravel.unit}</td><td>Agregado grueso</td></tr>` : ''}
            ${materials?.adhesive && shouldInclude(materials.adhesive.quantity) ? `<tr><td>Adhesivo para losetas</td><td>${formatQuantity(materials.adhesive.quantity, materials.adhesive.unit)}</td><td>${materials.adhesive.unit}</td><td>Pegado de vereda</td></tr>` : ''}
            ${materials?.wireMesh && shouldInclude(materials.wireMesh.quantity) ? `<tr><td>Malla de alambre</td><td>${formatQuantity(materials.wireMesh.quantity, materials.wireMesh.unit)}</td><td>${materials.wireMesh.unit}</td><td>Refuerzo estructural</td></tr>` : ''}
            ${materials?.waterproofing && shouldInclude(materials.waterproofing.quantity) ? `<tr><td>Impermeabilizante</td><td>${formatQuantity(materials.waterproofing.quantity, materials.waterproofing.unit)}</td><td>${materials.waterproofing.unit}</td><td>Protección vereda</td></tr>` : ''}
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

      ${drawingImageDataUrl ? `
      <div class="section">
        <h2>${drawingLabel}</h2>
        <div class="cad-wrap">
          <img src="${drawingImageDataUrl}" alt="${drawingLabel}" />
        </div>
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

  const generateMaterialsList = (templateSettings: ExportTemplateSettings = getTemplateSettings('materials')) => {
    const materials = project.materials as any;
    const { additionals } = calculateCosts();
    const plumbingConfig = project.plumbingConfig as any;
    const taskMaterials = getTaskMaterials();
    const hasStructuredMaterials = materials && Object.keys(materials).length > 0;
    const formatMeshSheets = (quantity: number, unit: string, sheetAreaM2: number, sheetLabel: string) => {
      if (!quantity || !unit) return '';
      const normalizedUnit = unit.toLowerCase();
      if (!normalizedUnit.includes('m²') && !normalizedUnit.includes('m2')) return '';
      const sheets = Math.ceil(quantity / sheetAreaM2);
      return ` (≈ ${sheets} mallas de ${sheetLabel})`;
    };
    const hasElectroweldedMesh = materials?.electroweldedMesh?.quantity > 0;

    const headerSubtitle = templateSettings.subtitle || 'Lista Completa de Materiales';
    const documentTitle = templateSettings.title || `Lista de Materiales - ${project.name}`;
    const logoDataUrl = getLogoForTemplate('materials');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${documentTitle}</title>
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
      <div class="logo">${logoDataUrl ? `<img src="${logoDataUrl}" alt="Domotics IoT Solutions" style="height:34px;width:auto;vertical-align:middle;"/>` : 'POOL CALCULATOR'}</div>
      <p class="subtitle">${headerSubtitle}</p>
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

          ${!hasStructuredMaterials && taskMaterials.length > 0 ? `
          <div class="category-section">
            <div class="category-title">Materiales del plan de tareas</div>
            ${taskMaterials.map((material) =>
              `<div class="material-item"><span class="material-name">${material.name}</span><span class="material-qty">${material.quantity} ${material.unit}</span></div>`
            ).join('')}
          </div>
          ` : ''}

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
            ${materials?.wireMesh && !hasElectroweldedMesh ? `<div class="material-item"><span class="material-name">Malla de Alambre</span><span class="material-qty">${materials.wireMesh.quantity} ${materials.wireMesh.unit}${formatMeshSheets(materials.wireMesh.quantity, materials.wireMesh.unit, 6, '2x3m')}</span></div>` : ''}
            ${materials?.waterproofing ? `<div class="material-item"><span class="material-name">Impermeabilizante</span><span class="material-qty">${materials.waterproofing.quantity} ${materials.waterproofing.unit}</span></div>` : ''}
          </div>
          ` : ''}

          ${materials?.geomembrane || materials?.electroweldedMesh || materials?.sandForBed || materials?.cementBags || materials?.drainStone ? `
          <div class="category-section">
            <div class="category-title">Cama Interna</div>
            ${materials?.geomembrane ? `<div class="material-item"><span class="material-name">Geomembrana</span><span class="material-qty">${materials.geomembrane.quantity} ${materials.geomembrane.unit}</span></div>` : ''}
            ${materials?.electroweldedMesh ? `<div class="material-item"><span class="material-name">Malla Electrosoldada</span><span class="material-qty">${materials.electroweldedMesh.quantity} ${materials.electroweldedMesh.unit}${formatMeshSheets(materials.electroweldedMesh.quantity, materials.electroweldedMesh.unit, 12, '2x6m')}</span></div>` : ''}
            ${materials?.sandForBed ? `<div class="material-item"><span class="material-name">Arena para Cama</span><span class="material-qty">${materials.sandForBed.quantity} ${materials.sandForBed.unit}</span></div>` : ''}
            ${materials?.cementBags ? `<div class="material-item"><span class="material-name">Cemento para Cama</span><span class="material-qty">${materials.cementBags.quantity} ${materials.cementBags.unit}</span></div>` : ''}
            ${materials?.drainStone ? `<div class="material-item"><span class="material-name">Piedra de Drenaje</span><span class="material-qty">${materials.drainStone.quantity} ${materials.drainStone.unit}</span></div>` : ''}
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

  const generateDetailedBudget = (templateSettings: ExportTemplateSettings = getTemplateSettings('budget')) => {
    const materials = project.materials as any;
    const { additionals, additionalsCosts, plumbingCosts, totalMaterialCost, totalLaborCost, grandTotal } = resolveCostOverrides(templateSettings);
    const plumbingConfig = project.plumbingConfig as any;
    const rolesSummary = getRolesCostSummary();
    const headerSubtitle = templateSettings.subtitle || 'Presupuesto Detallado con Costos Unitarios';
    const documentTitle = templateSettings.title || `Presupuesto Detallado - ${project.name}`;
    const logoDataUrl = getLogoForTemplate('budget');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${documentTitle}</title>
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
      <div class="logo">${logoDataUrl ? `<img src="${logoDataUrl}" alt="Domotics IoT Solutions" style="height:34px;width:auto;vertical-align:middle;"/>` : 'POOL CALCULATOR'}</div>
      <p class="subtitle">${headerSubtitle}</p>
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

  const generateCompleteReport = (templateSettings: ExportTemplateSettings = getTemplateSettings('complete')) => {
    const { grandTotal } = resolveCostOverrides(templateSettings);
    const headerSubtitle = templateSettings.subtitle || 'Reporte Completo del Proyecto';
    const documentTitle = templateSettings.title || `Reporte Completo - ${project.name}`;
    const logoDataUrl = getLogoForTemplate('complete');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${documentTitle}</title>
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
      <div class="logo">${logoDataUrl ? `<img src="${logoDataUrl}" alt="Domotics IoT Solutions" style="height:34px;width:auto;vertical-align:middle;"/>` : 'POOL CALCULATOR'}</div>
      <p class="subtitle">${headerSubtitle}</p>
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

      ${generateClientBudget(getTemplateSettings('client')).match(/<div class="content">([\s\S]*?)<\/div>\s*<\/div>\s*<\/body>/)?.[1] || ''}

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

  const generateOverview = (templateSettings: ExportTemplateSettings = getTemplateSettings('overview')) => {
    const sidewalkAreaM2 = calculatedSidewalkArea || project.sidewalkArea || 0;
    const headerSubtitle = templateSettings.subtitle || 'Vista General del Proyecto';
    const documentTitle = templateSettings.title || `Vista General - ${project.name}`;
    const logoDataUrl = getLogoForTemplate('overview');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${documentTitle}</title>
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
        <div class="company-logo">
          ${
            logoDataUrl
              ? `<img src="${logoDataUrl}" alt="Domotics IoT Solutions" style="height:46px;width:auto;display:block;"/>`
              : 'LOGO AQUÍ'
          }
        </div>
        <div class="doc-title">${headerSubtitle}</div>
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
    const tasksLaborCost = getTasksLaborCost();
    const baseLaborCost = tasksLaborCost > 0 ? tasksLaborCost : (project.laborCost || 0);

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

    const electricalConfig = project.electricalConfig as any;
    const electricalCosts = electricalConfig?.items
      ? electricalConfig.items.reduce((sum: number, item: any) => sum + (item.pricePerUnit ? item.pricePerUnit * item.quantity : 0), 0)
      : 0;

    const totalMaterialCost = project.materialCost + additionalsCosts.materialCost + plumbingCosts + electricalCosts;
    const totalLaborCost = baseLaborCost + additionalsCosts.laborCost;
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

      if (electricalCosts > 0) {
        message += `\n- Electrica: $${electricalCosts.toLocaleString('es-AR')}`;
      }

      if (additionalsCosts.materialCost > 0) {
        message += `\n- Adicionales: $${additionalsCosts.materialCost.toLocaleString('es-AR')}`;
      }

      message += `\n- Total materiales: $${totalMaterialCost.toLocaleString('es-AR')}`;
      message += `\n\n- Mano de obra base: $${baseLaborCost.toLocaleString('es-AR')}`;

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

  const getContentForTemplate = (
    template: ExportTemplate,
    settings: ExportSettings = exportSettings,
    extras: { cadImageDataUrl?: string } = {}
  ): string => {
    const templateSettings = getTemplateSettings(template, settings);
    switch (template) {
      case 'client':
        return generateClientBudget(templateSettings);
      case 'professional':
        return generateTechnicalSpec(templateSettings, extras.cadImageDataUrl);
      case 'materials':
        return generateMaterialsList(templateSettings);
      case 'budget':
        return generateDetailedBudget(templateSettings);
      case 'complete':
        return generateCompleteReport(templateSettings);
      case 'overview':
        return generateOverview(templateSettings);
      default:
        return generateClientBudget(templateSettings);
    }
  };

  const handleExport = async (format: 'html', template: ExportTemplate) => {
    const nextFrame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));
    let cadImageDataUrl = '';
    if (template === 'professional') {
      const templateSettings = getTemplateSettings('professional', exportSettings);
      const canvasRef = templateSettings.drawingView === 'planta' ? poolCanvasRef : cadCanvasRef;
      if (canvasRef.current) {
        await nextFrame();
        try {
          cadImageDataUrl = canvasRef.current.toDataURL('image/png');
        } catch (error) {
          console.warn('No se pudo capturar el plano CAD:', error);
        }
      }
    }
    if (template === 'professional' && cadCanvasRef.current && !cadImageDataUrl) {
      await nextFrame();
      try {
        cadImageDataUrl = cadCanvasRef.current.toDataURL('image/png');
      } catch (error) {
        console.warn('No se pudo capturar el plano CAD:', error);
      }
    }
    const content = getContentForTemplate(template, exportSettings, { cadImageDataUrl });
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

  const handlePrint = async (template: ExportTemplate) => {
    const nextFrame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));
    let cadImageDataUrl = '';
    if (template === 'professional') {
      const templateSettings = getTemplateSettings('professional', exportSettings);
      const canvasRef = templateSettings.drawingView === 'planta' ? poolCanvasRef : cadCanvasRef;
      if (canvasRef.current) {
        await nextFrame();
        try {
          cadImageDataUrl = canvasRef.current.toDataURL('image/png');
        } catch (error) {
          console.warn('No se pudo capturar el plano CAD:', error);
        }
      }
    }
    if (template === 'professional' && cadCanvasRef.current && !cadImageDataUrl) {
      await nextFrame();
      try {
        cadImageDataUrl = cadCanvasRef.current.toDataURL('image/png');
      } catch (error) {
        console.warn('No se pudo capturar el plano CAD:', error);
      }
    }
    const html = getContentForTemplate(template, exportSettings, { cadImageDataUrl });
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

      let cadImageDataUrl = '';
      if (template === 'professional') {
        const templateSettings = getTemplateSettings('professional', exportSettings);
        const canvasRef = templateSettings.drawingView === 'planta' ? poolCanvasRef : cadCanvasRef;
        if (canvasRef.current) {
          await nextFrame();
          await nextFrame();
          try {
            cadImageDataUrl = canvasRef.current.toDataURL('image/png');
          } catch (error) {
            console.warn('No se pudo capturar el plano CAD:', error);
          }
        }
      }
      if (template === 'professional' && cadCanvasRef.current && !cadImageDataUrl) {
        await nextFrame();
        await nextFrame();
        try {
          cadImageDataUrl = cadCanvasRef.current.toDataURL('image/png');
        } catch (error) {
          console.warn('No se pudo capturar el plano CAD:', error);
        }
      }

      const html = getContentForTemplate(template, exportSettings, { cadImageDataUrl });
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

      // 7) Generación PDF SIN “calamidad”:
      // - Renderizamos a canvas una sola vez
      // - Cortamos el canvas por páginas (slices)
      // - Respetamos márgenes + header/footer
      // - Header/Footer no se deforman y no dependen de html2canvas

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      const marginMm = 10;
      const headerMm = 12;
      const footerMm = 12;
      const contentW = pdfW - marginMm * 2;
      const contentH = pdfH - marginMm * 2 - headerMm - footerMm;

      // Relación mm->px para saber cuánto cortar del canvas por página.
      const pxPerMm = canvas.width / contentW;
      const pageSlicePx = Math.floor(contentH * pxPerMm);
      const totalPages = Math.max(1, Math.ceil(canvas.height / pageSlicePx));

      const drawHeaderFooter = (page: number) => {
        // Header
        const yTop = marginMm;
        const lineY = yTop + headerMm;

        const logoDataUrl = getLogoForTemplate(template);
        if (logoDataUrl) {
          try {
            // logo chico, ya pre-rasterizado
            pdf.addImage(logoDataUrl, 'PNG', marginMm, yTop + 1, 18, 18, undefined, 'FAST');
          } catch {
            // si fallara el addImage (data corrupta), no bloqueamos el export
          }
        }

        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        const title = `${project.name || 'Proyecto'} · ${getTemplateName(template)}`;
        pdf.text(title, pdfW / 2, yTop + 8, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.4);
        pdf.line(marginMm, lineY, pdfW - marginMm, lineY);

        // Footer
        const footerY = pdfH - marginMm;
        pdf.setDrawColor(226, 232, 240);
        pdf.line(marginMm, footerY - footerMm, pdfW - marginMm, footerY - footerMm);

        pdf.setFontSize(9);
        pdf.setTextColor(71, 85, 105);
        pdf.text(`Página ${page} de ${totalPages}`, pdfW - marginMm, footerY - 4, { align: 'right' });

        // QR solo en la última página (evita repetir y agrandar el PDF)
        if (qrDataUrl && page === totalPages) {
          try {
            const qrSize = 18;
            pdf.addImage(qrDataUrl, 'PNG', pdfW - marginMm - qrSize, footerY - footerMm + 1, qrSize, qrSize, undefined, 'FAST');
            pdf.setFontSize(8);
            pdf.text('Escaneá para ver el proyecto', pdfW - marginMm - qrSize - 2, footerY - 4, { align: 'right' });
          } catch {
            // noop
          }
        }
      };

      // Cortamos y agregamos cada página como imagen independiente (sin posiciones negativas)
      let yPx = 0;
      for (let page = 1; page <= totalPages; page++) {
        const sliceH = Math.min(pageSlicePx, canvas.height - yPx);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceH;
        const pctx = pageCanvas.getContext('2d');
        if (!pctx) break;
        pctx.fillStyle = '#ffffff';
        pctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pctx.drawImage(canvas, 0, yPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

        // JPEG para slices grandes reduce mucho el peso
        const sliceMega = (pageCanvas.width * pageCanvas.height) / 1_000_000;
        const useJpeg = sliceMega > 10;
        const imgData = useJpeg ? pageCanvas.toDataURL('image/jpeg', 0.92) : pageCanvas.toDataURL('image/png');

        if (page > 1) pdf.addPage();
        drawHeaderFooter(page);

        const drawH = (sliceH / canvas.width) * contentW;
        pdf.addImage(
          imgData,
          useJpeg ? 'JPEG' : 'PNG',
          marginMm,
          marginMm + headerMm,
          contentW,
          drawH,
          undefined,
          'FAST'
        );

        yPx += sliceH;
      }

      const filename = `${template}-${(project.name || 'proyecto').replace(/\s+/g, '-').toLowerCase()}.pdf`;
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

  const updateDraftTemplate = (updates: Partial<ExportTemplateSettings>) => {
    setDraftSettings((prev) => {
      const prevTemplate = prev.templates?.[selectedTemplate] || {};
      return {
        ...prev,
        templates: {
          ...prev.templates,
          [selectedTemplate]: {
            ...prevTemplate,
            ...updates,
          },
        },
      };
    });
  };

  const updateDraftValues = (updates: Partial<NonNullable<ExportTemplateSettings['values']>>) => {
    setDraftSettings((prev) => {
      const prevTemplate = prev.templates?.[selectedTemplate] || {};
      const prevValues = prevTemplate.values || {};
      return {
        ...prev,
        templates: {
          ...prev.templates,
          [selectedTemplate]: {
            ...prevTemplate,
            values: {
              ...prevValues,
              ...updates,
            },
          },
        },
      };
    });
  };

  const updateDraftSection = (sectionKey: string, enabled: boolean) => {
    setDraftSettings((prev) => {
      const prevTemplate = prev.templates?.[selectedTemplate] || {};
      const prevSections = prevTemplate.sections || {};
      return {
        ...prev,
        templates: {
          ...prev.templates,
          [selectedTemplate]: {
            ...prevTemplate,
            sections: {
              ...prevSections,
              [sectionKey]: enabled,
            },
          },
        },
      };
    });
  };

  const handleSaveExportSettings = async () => {
    setSavingSettings(true);
    try {
      await projectService.update(project.id, { exportSettings: draftSettings });
      setExportSettings(draftSettings);
      setIsEditorOpen(false);
    } catch (error) {
      console.error('Error al guardar configuración de exportación:', error);
      alert('No se pudo guardar la configuración del documento');
    } finally {
      setSavingSettings(false);
    }
  };

  const selectedTemplateData = templates.find((template) => template.id === selectedTemplate) || templates[0];
  const activeDraftTemplate = draftSettings.templates?.[selectedTemplate] || {};
  const draftSections = selectedTemplate === 'client'
    ? (activeDraftTemplate.sections || selectedSections)
    : undefined;
  const draftPreviewHtml = getContentForTemplate(selectedTemplate, draftSettings);
  const computedCosts = calculateCosts();
  const defaultConditionsText = getConditionsList().join('\n');
  const templatePreviewHighlights: Record<ExportTemplate, string[]> = {
    client: ['Resumen de costos', 'Datos clave del cliente', 'Condiciones comerciales'],
    professional: ['Especificaciones técnicas', 'Normativas y medidas', 'Secuencia de obra'],
    materials: ['Listado por categorías', 'Unidades y cantidades', 'Notas de obra'],
    budget: ['Costos unitarios', 'Subtotales', 'Materiales vs mano de obra'],
    complete: ['Todo en un solo documento', 'Técnico + presupuesto', 'Anexos y notas'],
    overview: ['Resumen ejecutivo', 'Datos generales', 'Indicadores clave'],
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
        <PoolVisualizationCanvas
          ref={cadCanvasRef}
          project={project}
          tileConfig={project.tileCalculation}
          width={1600}
          height={1000}
          showMeasurements={true}
          viewMode="cad"
        />
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-2xl border border-white/15">
                <FileDown size={30} className="text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">Exportación de Documentos</h2>
                <p className="text-slate-300 mt-1">Genere documentos profesionales para su proyecto.</p>
              </div>
            </div>
            <div className="text-sm text-slate-300">
              Plantilla activa: <span className="font-semibold text-white">{selectedTemplateData.name}</span>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8 bg-slate-50">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Plantillas disponibles</h3>
                <span className="text-xs text-slate-500">Seleccione una plantilla para previsualizar.</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {templates.map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate === template.id;

                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`text-left p-4 rounded-2xl border transition-all shadow-sm ${
                        isSelected
                          ? 'bg-white border-slate-900 text-slate-900 shadow-lg'
                          : 'bg-white/70 border-transparent hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{template.name}</p>
                          <p className="text-xs text-slate-500 mt-1">{template.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-slate-900 text-white">
                    <selectedTemplateData.icon size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-slate-900">{selectedTemplateData.name}</h4>
                    <p className="text-slate-600 mt-2">{selectedTemplateData.description}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">Vista previa real</h4>
                  <button
                    onClick={() => {
                      setDraftSettings(JSON.parse(JSON.stringify(exportSettings || { templates: {} })));
                      setIsEditorOpen(true);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Editar en pantalla completa
                  </button>
                </div>

                <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <iframe
                    title="preview"
                    srcDoc={getContentForTemplate(selectedTemplate)}
                    className="w-full h-64"
                    sandbox=""
                    style={{ pointerEvents: 'none' }}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(templatePreviewHighlights[selectedTemplateData.id] || []).map((item) => (
                    <span
                      key={item}
                      className="text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-3 py-1"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">Acciones rápidas</h4>
                <p className="text-xs text-slate-500">Exportá, imprimí o compartí la plantilla seleccionada.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleExportPDF(selectedTemplate)}
                  className="flex flex-col items-center gap-2 p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors shadow-sm"
                >
                  <FileDown size={20} />
                  <span className="font-semibold text-xs">PDF</span>
                </button>

                <button
                  onClick={() => handleExport('html', selectedTemplate)}
                  className="flex flex-col items-center gap-2 p-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-colors shadow-sm"
                >
                  <Download size={20} />
                  <span className="font-semibold text-xs">HTML</span>
                </button>

                <button
                  onClick={() => handlePrint(selectedTemplate)}
                  className="flex flex-col items-center gap-2 p-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-colors shadow-sm"
                >
                  <Printer size={20} />
                  <span className="font-semibold text-xs">Imprimir</span>
                </button>

                <button
                  onClick={handleWhatsAppShare}
                  className="flex flex-col items-center gap-2 p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-sm"
                >
                  <MessageCircle size={20} />
                  <span className="font-semibold text-xs">WhatsApp</span>
                </button>
              </div>

              <button
                onClick={() => setShowExcelDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm text-sm font-semibold"
              >
                <FileSpreadsheet size={18} />
                Excel Técnico
              </button>
            </div>
          </div>
        </div>
      </Card>

      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm">
          <div className="absolute inset-0 flex flex-col bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Editor de documentos</h3>
                <p className="text-sm text-slate-500">Plantilla activa: {selectedTemplateData.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleSaveExportSettings}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                  disabled={savingSettings}
                >
                  {savingSettings ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="bg-slate-100 p-4 overflow-auto">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[70vh]">
                  <iframe
                    title="preview-editor"
                    srcDoc={draftPreviewHtml}
                    className="w-full h-full min-h-[70vh]"
                    sandbox=""
                  />
                </div>
              </div>

              <div className="border-l border-slate-200 p-5 overflow-auto">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Textos del documento</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Título del documento</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          value={activeDraftTemplate.title || ''}
                          onChange={(event) => updateDraftTemplate({ title: event.target.value })}
                          placeholder={`${selectedTemplateData.name} - ${project.name}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Subtítulo de portada</label>
                        <input
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          value={activeDraftTemplate.subtitle || ''}
                          onChange={(event) => updateDraftTemplate({ subtitle: event.target.value })}
                          placeholder={selectedTemplateData.description}
                        />
                      </div>
                      {selectedTemplate === 'client' && (
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Condiciones comerciales</label>
                          <textarea
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[140px]"
                            value={activeDraftTemplate.conditions || ''}
                            onChange={(event) => updateDraftTemplate({ conditions: event.target.value })}
                            placeholder={defaultConditionsText}
                          />
                          <p className="text-[11px] text-slate-400 mt-1">Una condición por línea.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Valores y costos</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Materiales</label>
                        <input
                          type="number"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          value={activeDraftTemplate.values?.materialCost ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateDraftValues({ materialCost: value === '' ? undefined : Number(value) });
                          }}
                          placeholder={computedCosts.totalMaterialCost.toFixed(2)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Mano de obra</label>
                        <input
                          type="number"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          value={activeDraftTemplate.values?.laborCost ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateDraftValues({ laborCost: value === '' ? undefined : Number(value) });
                          }}
                          placeholder={computedCosts.totalLaborCost.toFixed(2)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Total</label>
                        <input
                          type="number"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          value={activeDraftTemplate.values?.totalCost ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateDraftValues({ totalCost: value === '' ? undefined : Number(value) });
                          }}
                          placeholder={computedCosts.grandTotal.toFixed(2)}
                        />
                      </div>
                    </div>
                  </div>

                  {selectedTemplate === 'client' && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 mb-3">Secciones visibles</h4>
                      <div className="space-y-2 text-sm text-slate-600">
                        {[
                          { key: 'header', label: 'Información del cliente' },
                          { key: 'includes', label: 'Alcance del proyecto' },
                          { key: 'costs', label: 'Detalle de costos' },
                          { key: 'conditions', label: 'Condiciones comerciales' },
                        ].map((item) => (
                          <label key={item.key} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!draftSections?.[item.key]}
                              onChange={(event) => updateDraftSection(item.key, event.target.checked)}
                              className="h-4 w-4"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTemplate === 'professional' && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 mb-3">Plano incluido</h4>
                      <div className="space-y-2 text-sm text-slate-600">
                        <label className="block text-xs text-slate-500 mb-1">Vista del dibujo</label>
                        <select
                          value={activeDraftTemplate.drawingView || 'cad'}
                          onChange={(event) => updateDraftTemplate({ drawingView: event.target.value as 'cad' | 'planta' })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="cad">Plano CAD</option>
                          <option value="planta">Vista Planta</option>
                        </select>
                        <p className="text-[11px] text-slate-400">Se mostrará en la exportación de Especificaciones Técnicas.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
