import React, { useState, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Project } from '@/types';
import { plumbingCalculationService } from '@/services/plumbingCalculationService';
import { projectService } from '@/services/projectService';
import { PoolVisualizationCanvas } from '@/components/PoolVisualizationCanvas';
import { EquipmentWorkspacePreviewShared } from '@/components/hydraulic/EquipmentWorkspacePreview.shared';
import { HdFileText, HdDownload, HdPrinter, HdDollarSign, HdMessageBubble, HdFileSpreadsheet, HdBriefcase, HdUser, HdSettings } from '@/components/ui/HandDrawnIcons';
import api from '@/services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { publicAssetUrl } from '@/utils/publicAssetUrl';
import { calculateProjectFinancials, getAdditionalName, getProjectAdditionals, isBaseModelAdditional, summarizeHydraulicSystem } from '@/utils/projectCosting';
import { getCommercialInstallationProfile, getInstallationConditionHighlights, getProjectPipeSystemLabel } from '@/utils/commercialInstallationPricing';

interface EnhancedExportManagerProps {
  project: Project;
  /**
   * Opcional. URL del logo (ideal: un archivo en /public, ej: "/domotics-logo.png").
   * Se convierte a DataURL para evitar problemas de CORS/"tainted canvas" al exportar.
   */
  brandLogoUrl?: string;
}

type ExportTemplate = 'client' | 'professional' | 'materials' | 'complete' | 'budget' | 'overview' | 'hydraulic';

type ClientDocumentBlockType = 'heading' | 'paragraph' | 'bullet_list' | 'divider' | 'data_field';

type ClientDocumentBlock = {
  id: string;
  type: ClientDocumentBlockType;
  content?: string;
  fieldKey?: string;
  label?: string;
  comments?: string;
  fontFamily?: string;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
};

type ExportTemplateSettings = {
  title?: string;
  subtitle?: string;
  conditions?: string;
  scopeSummary?: string;
  pricingPosition?: 'top' | 'bottom';
  sections?: Record<string, boolean>;
  drawingView?: 'cad' | 'planta';
  installationMode?: 'basic' | 'with_extras';
  clientPricingMode?: 'full' | 'labor_only';
  showRecommendedInstallationBox?: boolean;
  includeAdditionalsPricing?: boolean;
  includeVeredaMaterials?: boolean;
  useCustomClientBody?: boolean;
  documentBlocks?: ClientDocumentBlock[];
  customBodyHtml?: string;
  values?: {
    materialCost?: number;
    laborCost?: number;
    totalCost?: number;
  };
};

type ExportSettings = {
  templates?: Partial<Record<ExportTemplate, ExportTemplateSettings>>;
};

type ExcelSectionKey = 'excavation' | 'supportBed' | 'sidewalk' | 'plumbing' | 'electrical' | 'labor' | 'sequence' | 'standards';

type ExportAuditItem = {
  id: string;
  label: string;
  detail: string;
  value: string;
  ready: boolean;
};

type MaterialExportSectionKey =
  | 'sidewalkBase'
  | 'taskMaterials'
  | 'taskSequence'
  | 'tiles'
  | 'plumbing'
  | 'electrical'
  | 'complementary'
  | 'supportBed'
  | 'additionals';

const getProjectCode = (project: Project) =>
  project.projectCode || `PC-${project.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

const CLIENT_DYNAMIC_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'clientName', label: 'Cliente' },
  { key: 'projectName', label: 'Proyecto' },
  { key: 'location', label: 'Ubicación' },
  { key: 'poolModel', label: 'Modelo de piscina' },
  { key: 'dimensions', label: 'Dimensiones' },
  { key: 'volume', label: 'Volumen' },
  { key: 'waterMirrorArea', label: 'Espejo de agua' },
  { key: 'installationTier', label: 'Alcance recomendado' },
  { key: 'laborCost', label: 'Mano de obra' },
  { key: 'materialCost', label: 'Materiales' },
  { key: 'grandTotal', label: 'Total' },
  { key: 'projectCode', label: 'Código de proyecto' },
];

const COMMERCIAL_EXCLUSION_GROUPS = [
  {
    key: 'logistics_exclusions',
    terms: ['no incluye', 'transporte', 'materiales', 'grua'],
  },
];
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
  const clientDocumentEditorRef = useRef<HTMLDivElement>(null);
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
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [draftSettings, setDraftSettings] = useState<ExportSettings>(() =>
    JSON.parse(JSON.stringify((project.exportSettings as ExportSettings) || { templates: {} }))
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [generatingPackage, setGeneratingPackage] = useState(false);
  const [downloadingPackage, setDownloadingPackage] = useState(false);
  const [clientDocumentEditorHtml, setClientDocumentEditorHtml] = useState('');
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
  const DEFAULT_BRAND_LOGO_DARK_URL = publicAssetUrl('domotics-logo-dark.png');
  const DEFAULT_BRAND_LOGO_LIGHT_URL = publicAssetUrl('domotics-logo-light.png');
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

  const clientPwaPath = publicAssetUrl('sistemas-pwa/index.html');

  const getClientPwaUrl = () => {
    if (typeof window === 'undefined') return clientPwaPath;
    return new URL(clientPwaPath, window.location.origin).toString();
  };

  const handleOpenClientPwa = () => {
    if (typeof window === 'undefined') return;
    window.open(getClientPwaUrl(), '_blank', 'noopener,noreferrer');
  };

  const handleCopyClientPwaLink = async () => {
    const url = getClientPwaUrl();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopiedPwaLink(true);
        window.setTimeout(() => setCopiedPwaLink(false), 2200);
        return;
      }
    } catch (_error) {}

    window.prompt('Copiá este link para el cliente', url);
  };

  const handleShareClientPwaWhatsApp = () => {
    if (typeof window === 'undefined') return;
    const message = `Manual del sistema de piscina para ${project.clientName || project.name}:\n${getClientPwaUrl()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    loadRoles();
    loadProjectUpdates();
    loadEquipmentRecommendations();
  }, []);

  useEffect(() => {
    setExportSettings((project.exportSettings as ExportSettings) || { templates: {} });
  }, [project]);

  useEffect(() => {
    if (selectedTemplate !== 'client') return;
    const clientTemplate = (draftSettings.templates?.client || {}) as ExportTemplateSettings;
    if (clientDocumentEditorHtml) return;
    const nextHtml = resolveClientBodyHtml(clientTemplate);
    setClientDocumentEditorHtml(nextHtml);
  }, [selectedTemplate]);

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

  const getTasksLaborCost = () => calculateProjectFinancials(project).baseLaborCost;

  const templates = [
    {
      id: 'client' as ExportTemplate,
      name: 'Propuesta Comercial',
      description: 'Documento comercial para presentar la instalación recomendada al cliente',
      icon: HdUser,
    },
    {
      id: 'professional' as ExportTemplate,
      name: 'Especificaciones Técnicas',
      description: 'Ficha técnica de obra con criterios de instalación y equipamiento',
      icon: HdBriefcase,
    },
    {
      id: 'materials' as ExportTemplate,
      name: 'Lista de Materiales',
      description: 'Listado completo de materiales necesarios para el proyecto',
      icon: HdSettings,
    },
    {
      id: 'budget' as ExportTemplate,
      name: 'Presupuesto Detallado',
      description: 'Presupuesto completo con costos unitarios y subtotales',
      icon: HdDollarSign,
    },
    {
      id: 'complete' as ExportTemplate,
      name: 'Dossier del Proyecto',
      description: 'Documento integral con resumen, alcance comercial y respaldo técnico',
      icon: HdFileText,
    },
    {
      id: 'overview' as ExportTemplate,
      name: 'Vista General',
      description: 'Resumen visual del proyecto, el cliente y el alcance de instalación',
      icon: HdFileText,
    },
    {
      id: 'hydraulic' as ExportTemplate,
      name: 'Hidráulica',
      description: 'Esquema técnico hidráulico sin controles para exportar o imprimir',
      icon: HdSettings,
    },
  ];

  const visibleTemplates = templates.filter((template) => !['materials', 'budget'].includes(template.id));
  const internalTemplates = templates.filter((template) => ['materials', 'budget'].includes(template.id));

  const getTemplateName = (template: ExportTemplate) =>
    templates.find((item) => item.id === template)?.name || 'Exportación';

  const calculateCosts = () => {
    return calculateProjectFinancials(project);
  };

  const normalizeExportText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const isHydraulicOrEquipmentExtra = (additional: any) => {
    const name = normalizeExportText(getAdditionalName(additional));
    const category = normalizeExportText(
      additional.customCategory ||
      additional.accessory?.type ||
      additional.equipment?.type ||
      additional.material?.type ||
      ''
    );

    return [
      'bomba',
      'pump',
      'hidrojet',
      'hidromas',
      'retorno',
      'skimmer',
      'barrefondo',
      'aspir',
      'desague',
      'dren',
      'filtro',
      'filter',
      'calef',
      'caldaia',
      'heater',
    ].some((token) => name.includes(token) || category.includes(token));
  };

  const isAccessoryExtra = (additional: any) => {
    const name = normalizeExportText(getAdditionalName(additional));
    return name.includes('pasamanos') || name.includes('cascada');
  };

  const getHydraulicExtraAdditionals = () => {
    const additionals = getProjectAdditionals(project);
    return additionals.filter((additional) =>
      (additional.newQuantity || 0) > 0 &&
      !isBaseModelAdditional(project, additional) &&
      isHydraulicOrEquipmentExtra(additional)
    );
  };

  const getOtherAdditionals = () => {
    const additionals = getProjectAdditionals(project);
    return additionals.filter((additional) =>
      (additional.newQuantity || 0) > 0 &&
      !isBaseModelAdditional(project, additional) &&
      !isHydraulicOrEquipmentExtra(additional) &&
      !isAccessoryExtra(additional)
    );
  };

  const getAccessoryAdditionals = () => {
    const additionals = getProjectAdditionals(project);
    return additionals.filter((additional) =>
      (additional.newQuantity || 0) > 0 &&
      !isBaseModelAdditional(project, additional) &&
      isAccessoryExtra(additional)
    );
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

  const getTaskMaterialsByStage = () => {
    const tasks = (project.tasks as any) || {};
    const stageLabels: Record<string, string> = {
      excavation: 'Excavación',
      hydraulic: 'Instalación Hidráulica',
      floor: 'Piso y Base',
      electrical: 'Instalación Eléctrica',
      tiles: 'Colocación de Losetas',
      finishes: 'Terminaciones',
    };

    return Object.entries(tasks)
      .map(([stageKey, task]: [string, any]) => {
        if (!task || !Array.isArray(task.materials) || task.materials.length === 0) return null;

        const stageMap = new Map<string, { name: string; quantity: number; unit: string }>();
        task.materials.forEach((material: any) => {
          if (!material?.name) return;
          const quantity = Number(material.quantity || 0);
          if (!quantity) return;
          const unit = material.unit || 'ud';
          const existing = stageMap.get(material.name);
          if (existing) {
            existing.quantity += quantity;
          } else {
            stageMap.set(material.name, { name: material.name, quantity, unit });
          }
        });

        const items = Array.from(stageMap.values());
        if (items.length === 0) return null;

        return {
          key: stageKey,
          label: stageLabels[stageKey] || stageKey,
          items,
        };
      })
      .filter(Boolean) as Array<{ key: string; label: string; items: Array<{ name: string; quantity: number; unit: string }> }>;
  };

  const getPlumbingItemSpec = (item: any) => {
    const parts = [
      item.diameter ? `Ø ${item.diameter}` : '',
      item.category || '',
      item.length ? `${item.length}m` : '',
      item.specification || '',
    ].filter(Boolean);

    return parts.join(' · ');
  };

  const getPlumbingMaterialLabel = (item: any) => {
    const baseLabel = item.itemName || item.name || item.label || item.description || 'Ítem hidráulico';
    const spec = getPlumbingItemSpec(item);
    return spec ? `${baseLabel} (${spec})` : baseLabel;
  };

  const getPlumbingItemName = (item: any) =>
    item.itemName || item.name || item.label || item.description || 'Ítem hidráulico';

  const normalizeExportName = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const dedupeLabeledItems = <T extends { name: string; quantity: number }>(items: T[]) => {
    const map = new Map<string, T>();
    items.forEach((item) => {
      const key = `${normalizeExportName(item.name)}::${Number(item.quantity || 0)}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  };

  const isExtraPlumbingItem = (item: any) => {
    const name = normalizeExportName(getPlumbingItemName(item));

    return (
      name.includes('hidromas') ||
      name.includes('hidrojet') ||
      name.includes('hidromasajeador') ||
      name.includes('cascada') ||
      name.includes('pasamanos')
    );
  };

  const getInstallationTier = (extraItems: any[], additionalsList: any[]) => {
    const names = [
      ...extraItems.map((item: any) => normalizeExportName(getPlumbingItemName(item))),
      ...additionalsList.map((additional: any) => normalizeExportName(getAdditionalName(additional))),
    ];

    const hasPlatinumFeature = names.some((name) =>
      name.includes('caldera') ||
      name.includes('caldaia') ||
      name.includes('heater') ||
      name.includes('heat pump')
    );

    const hasPremiumFeature = names.some((name) =>
      name.includes('cascada') ||
      name.includes('pasamanos')
    );

    const hasPersonalizedFeature = names.some((name) =>
      name.includes('retorno') ||
      name.includes('aspir') ||
      name.includes('toma') ||
      name.includes('hidro') ||
      name.includes('jet') ||
      name.includes('bomba')
    );

    if (hasPlatinumFeature) return 'Instalación platinum';
    if (hasPremiumFeature) return 'Instalación premium';
    if (hasPersonalizedFeature || extraItems.length > 0 || additionalsList.length > 0) return 'Instalación personalizada';
    return 'Instalación básica';
  };

  const getTemplateSettings = (template: ExportTemplate, settings: ExportSettings = exportSettings) => {
    const templateSettings = settings.templates?.[template] || {};

    if (template === 'client') {
      return {
        installationMode: 'with_extras' as const,
        clientPricingMode: 'labor_only' as const,
        showRecommendedInstallationBox: true,
        includeAdditionalsPricing: true,
        pricingPosition: 'bottom' as const,
        useCustomClientBody: false,
        ...templateSettings,
      };
    }

    if (template === 'budget') {
      return {
        installationMode: 'with_extras' as const,
        clientPricingMode: 'labor_only' as const,
        ...templateSettings,
      };
    }

    return templateSettings;
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString('es-AR')}`;

  const normalizeCommercialText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

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
      'El presupuesto contempla viáticos, consumibles y extras de ejecución propios de la instalación',
      'Garantía: 3 meses en mano de obra, según fabricante en equipos',
      'No incluye transporte, materiales ni grúa de ser necesaria',
      'No incluye: Conexión eléctrica al tablero principal, provisión de agua y provisión de gas',
    ];
  };

  const getConditionCoverageGroup = (condition: string) =>
    COMMERCIAL_EXCLUSION_GROUPS.find((group) => {
      const normalizedCondition = normalizeCommercialText(condition);
      return group.terms.every((term) => normalizedCondition.includes(term));
    })?.key;

  const getExclusionCoverageGroup = (exclusion: string) =>
    COMMERCIAL_EXCLUSION_GROUPS.find((group) => {
      const normalizedExclusion = normalizeCommercialText(exclusion);
      return group.terms.some((term) => normalizedExclusion.includes(term));
    })?.key;

  const hasConditionCoveringExclusion = (conditions: string[], exclusion: string) => {
    const normalizedExclusion = normalizeCommercialText(exclusion);
    const matchingGroupKey = getExclusionCoverageGroup(exclusion);

    if (!matchingGroupKey) {
      return conditions.some((condition) => normalizeCommercialText(condition) === normalizedExclusion);
    }

    return conditions.some((condition) => getConditionCoverageGroup(condition) === matchingGroupKey);
  };

  const getVisibleInstallationExclusions = (conditions: string[]) =>
    exportInstallationProfile.exclusions.filter((exclusion) => !hasConditionCoveringExclusion(conditions, exclusion));

  const materials = project.materials as any;
  const plumbingConfig = project.plumbingConfig as any;
  const selectedPlumbingItems = Array.isArray(plumbingConfig?.selectedItems) ? plumbingConfig.selectedItems : [];
  const basePlumbingItems = selectedPlumbingItems.filter((item: any) => !isExtraPlumbingItem(item));
  const extraPlumbingItems = selectedPlumbingItems.filter((item: any) => isExtraPlumbingItem(item));
  const basePlumbingCosts = basePlumbingItems.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.pricePerUnit || 0)), 0);
  const extraPlumbingCosts = extraPlumbingItems.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.pricePerUnit || 0)), 0);
  const electricalConfig = project.electricalConfig as any;
  const additionals = getProjectAdditionals(project);
  const commercialAdditionals = additionals.filter((additional: any) =>
    (additional.newQuantity || 0) > 0 && !isBaseModelAdditional(project, additional)
  );
  const hydraulicSummary = summarizeHydraulicSystem(project, commercialAdditionals);
  const summarizedAdditionalItems = dedupeLabeledItems(hydraulicSummary.added.items);
  const installationTier = getInstallationTier(extraPlumbingItems, commercialAdditionals);
  const exportInstallationProfile = getCommercialInstallationProfile(project);
  const rolesSummary = getRolesCostSummary();
  const taskMaterials = getTaskMaterials();
  const taskMaterialsByStage = getTaskMaterialsByStage();
  const computedTaskCount = (Object.values((project.tasks as any) || {}) as any[]).reduce((sum: number, categoryTasks: any) => {
    if (!Array.isArray(categoryTasks)) return sum;
    return sum + categoryTasks.length;
  }, 0);
  const structuredMaterialCount = materials && typeof materials === 'object'
    ? Object.values(materials).filter((item: any) => item && Number(item.quantity || 0) > 0).length
    : 0;
  const plumbingItemsCount = Array.isArray(plumbingConfig?.selectedItems) ? plumbingConfig.selectedItems.length : 0;
  const electricalItemsCount = Array.isArray(electricalConfig?.items) ? electricalConfig.items.length : 0;
  const rolesCount = Object.keys(rolesSummary).length;
  const computedCosts = calculateProjectFinancials(project, commercialAdditionals);
  const poolDepthLabel = project.poolPreset?.depthEnd && project.poolPreset.depthEnd !== project.poolPreset.depth
    ? `${project.poolPreset.depth}m a ${project.poolPreset.depthEnd}m`
    : `${project.poolPreset?.depth || 0}m`;
  const conditionsCount = getConditionsList(getTemplateSettings('client').conditions).length;

  const effectiveProjectSpec = (() => {
    const poolPreset = project.poolPreset || {};
    const shape = String(poolPreset.shape || '').toUpperCase();
    const tileConfig = (project.tileCalculation as any) || {};
    const returnsCount = Number(hydraulicSummary.total.returns || poolPreset.returnsCount || 0);
    const skimmersCount = Number(hydraulicSummary.total.skimmers || poolPreset.skimmerCount || 0);
    const hydrojetsCount = Number(hydraulicSummary.total.hydrojets || poolPreset.hydroJetsCount || 0);
    const lightingCount = Number(poolPreset.lightingCount || 0);
    const hasBottomDrain = Boolean(poolPreset.hasBottomDrain);
    const hasVacuumIntake = Boolean(poolPreset.hasVacuumIntake);
    const shallowDepth = Number(poolPreset.depth || 0);
    const deepDepth = Number(poolPreset.depthEnd || poolPreset.depth || 0);
    return {
      modelName: poolPreset.name || project.name || 'Piscina',
      shape,
      shapeLabel: shape === 'OVAL' ? 'Oval' : shape === 'CIRCULAR' ? 'Circular' : shape === 'JACUZZI' ? 'Jacuzzi' : shape === 'ROMAN' ? 'Arco romano' : shape || 'Rectangular',
      length: Number(poolPreset.length || 0),
      width: Number(poolPreset.width || 0),
      shallowDepth,
      deepDepth,
      depthLabel: deepDepth && deepDepth !== shallowDepth ? `${shallowDepth}m a ${deepDepth}m` : `${shallowDepth}m`,
      volume: Number(project.volume || 0),
      waterMirrorArea: Number(project.waterMirrorArea || 0),
      tileCalculation: tileConfig,
      returnsCount,
      skimmersCount,
      hydrojetsCount,
      lightingCount,
      hasBottomDrain,
      hasVacuumIntake,
    };
  })();

  const clientPricingMode = getTemplateSettings('client').clientPricingMode || 'labor_only';
  const projectDynamicValues = {
    clientName: project.clientName || '',
    projectName: project.name || '',
    location: project.location || 'Ubicación a definir',
    poolModel: project.poolPreset?.name || 'Modelo sin definir',
    dimensions: `${project.poolPreset?.length || 0}m x ${project.poolPreset?.width || 0}m x ${effectiveProjectSpec.depthLabel}`,
    volume: `${effectiveProjectSpec.volume.toFixed(2)} m³`,
    waterMirrorArea: `${effectiveProjectSpec.waterMirrorArea.toFixed(2)} m²`,
    installationTier,
    pipeSystem: getProjectPipeSystemLabel(project),
    laborCost: formatCurrency(exportInstallationProfile.totalLaborCost),
    materialCost: formatCurrency(computedCosts.totalMaterialCost),
    grandTotal: formatCurrency(computedCosts.grandTotal),
    projectCode: getProjectCode(project),
  };

  const automaticAccessorySummary = [
    hydraulicSummary.base.skimmers > 0 ? `${hydraulicSummary.base.skimmers} skimmer${hydraulicSummary.base.skimmers > 1 ? 's' : ''}` : '',
    hydraulicSummary.base.returns > 0 ? `${hydraulicSummary.base.returns} retorno${hydraulicSummary.base.returns > 1 ? 's' : ''}` : '',
    hydraulicSummary.base.bottomDrains > 0 ? `${hydraulicSummary.base.bottomDrains} toma${hydraulicSummary.base.bottomDrains > 1 ? 's' : ''} de fondo` : '',
    hydraulicSummary.base.vacuumIntakes > 0 ? `${hydraulicSummary.base.vacuumIntakes} toma${hydraulicSummary.base.vacuumIntakes > 1 ? 's' : ''} de aspiración` : '',
    hydraulicSummary.base.lights > 0 ? `${hydraulicSummary.base.lights} luz${hydraulicSummary.base.lights > 1 ? 'ces' : ''}` : '',
  ].filter(Boolean).join(', ');

  const projectStageNames = Object.entries((project.tasks as any) || {})
    .filter(([, categoryTasks]) => Array.isArray(categoryTasks) && categoryTasks.length > 0)
    .map(([category]) => {
      const labels: Record<string, string | null> = {
        excavation: 'Excavación',
        hydraulic: 'Instalación hidráulica',
        electrical: 'Instalación eléctrica',
        floor: 'Solado y cama',
        tiles: 'Colocación de losetas',
        finishes: 'Terminaciones',
        additionals: 'Adicionales',
        other: null,
      };
      return labels[category] ?? null;
    })
    .filter((item): item is string => Boolean(item));

  const automaticScopeLines = [
    `Cañería hidráulica: ${getProjectPipeSystemLabel(project)}.`,
    automaticAccessorySummary ? `Accesorios base: ${automaticAccessorySummary}.` : '',
    projectStageNames.length > 0 ? `Etapas incluidas: ${projectStageNames.join(', ')}.` : '',
    ...getInstallationConditionHighlights(project).map((line) => `${line}.`),
  ].filter(Boolean);

  const interpolateProjectText = (value: string) =>
    value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      const normalizedKey = String(key);
      return escapeHtml(String(projectDynamicValues[normalizedKey as keyof typeof projectDynamicValues] || ''));
    });

  const interpolateProjectHtml = (value: string) =>
    value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      const normalizedKey = String(key);
      return escapeHtml(String(projectDynamicValues[normalizedKey as keyof typeof projectDynamicValues] || ''));
    });

  const commercialExtraSummaryItems = dedupeLabeledItems([
    ...extraPlumbingItems.map((item: any) => ({
      name: getPlumbingItemName(item),
      quantity: Number(item.quantity || 0),
    })),
    ...commercialAdditionals
      .filter((additional: any) => Number(additional.newQuantity || 0) > 0)
      .map((additional: any) => ({
        name: getAdditionalName(additional),
        quantity: Number(additional.newQuantity || 0),
      })),
  ]).filter((item) => item.quantity > 0);

  const renderClientDocumentBlocks = (blocks: ClientDocumentBlock[] = []) => {
    if (!Array.isArray(blocks) || blocks.length === 0) return '';

    return `
      <div class="section">
        <div class="custom-blocks">
          ${blocks.map((block) => {
            const fontFamily = block.fontFamily || 'Segoe UI, Arial, sans-serif';
            const fontSize = block.fontSize || (block.type === 'heading' ? 20 : 14);
            const align = block.align || 'left';
            const style = `style="font-family:${fontFamily};font-size:${fontSize}px;text-align:${align};"`;

            if (block.type === 'divider') {
              return `<div class="custom-divider"></div>`;
            }

            if (block.type === 'data_field') {
              const fieldValue = projectDynamicValues[block.fieldKey as keyof typeof projectDynamicValues] || '';
              return `
                <div class="custom-block">
                  <div class="custom-data-field" ${style}>
                    ${block.label ? `<span class="custom-data-label">${escapeHtml(block.label)}:</span> ` : ''}
                    <span>${escapeHtml(String(fieldValue))}</span>
                  </div>
                  ${block.comments ? `<div class="custom-comment">${escapeHtml(block.comments)}</div>` : ''}
                </div>
              `;
            }

            if (block.type === 'bullet_list') {
              const lines = (block.content || '')
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean);
              if (lines.length === 0) return '';
              return `
                <div class="custom-block">
                  <ul class="custom-bullets" ${style}>
                    ${lines.map((line) => `<li>${interpolateProjectText(escapeHtml(line))}</li>`).join('')}
                  </ul>
                  ${block.comments ? `<div class="custom-comment">${escapeHtml(block.comments)}</div>` : ''}
                </div>
              `;
            }

            if (block.type === 'heading') {
              return `
                <div class="custom-block">
                  <h3 class="custom-heading" ${style}>${interpolateProjectText(escapeHtml(block.content || ''))}</h3>
                  ${block.comments ? `<div class="custom-comment">${escapeHtml(block.comments)}</div>` : ''}
                </div>
              `;
            }

            return `
              <div class="custom-block">
                <p class="custom-paragraph" ${style}>${interpolateProjectText(escapeHtml(block.content || '')).replace(/\n/g, '<br/>')}</p>
                ${block.comments ? `<div class="custom-comment">${escapeHtml(block.comments)}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  const isLegacyAutoClientHtml = (html?: string) => {
    const normalizedHtml = normalizeCommercialText(html || '');
    if (!normalizedHtml) return false;

    const legacySignals = [
      'version estandar de instalacion',
      'm.o. base',
      '2 retornos en escalera',
      '2 retornos bajo skimmer para retorno de agua caliente',
      'otros adicionales',
      'otros agregados cargados en el proyecto',
    ];

    const matchedSignals = legacySignals.filter((signal) => normalizedHtml.includes(signal)).length;
    const currentAutomaticSignals = [
      'resumen del proyecto',
      'adicionales incluidos',
      'condiciones comerciales',
    ];
    const matchesCurrentAutomaticShape = currentAutomaticSignals.every((signal) => normalizedHtml.includes(signal));

    return matchedSignals >= 2 || (matchedSignals >= 1 && !matchesCurrentAutomaticShape);
  };

  const resolveClientBodyHtml = (templateSettings: ExportTemplateSettings = getTemplateSettings('client')) => {
    const customBodyHtml = templateSettings.customBodyHtml?.trim();
    const shouldUseCustomBody =
      templateSettings.useCustomClientBody === true &&
      !!customBodyHtml &&
      !isLegacyAutoClientHtml(customBodyHtml);

    if (shouldUseCustomBody) {
      return interpolateProjectHtml(customBodyHtml);
    }

    return buildClientBudgetBody(templateSettings);
  };

  const buildClientBudgetBody = (templateSettings: ExportTemplateSettings = getTemplateSettings('client')) => {
    const sections = {
      ...selectedSections,
      ...(templateSettings.sections || {}),
    };
    const { additionalsCosts, baseMaterialCost, grandTotal, totalMaterialCost } = resolveCostOverrides(templateSettings);
    const clientPricingMode = templateSettings.clientPricingMode || 'labor_only';
    const installationMode = templateSettings.installationMode || 'with_extras';
    const includeExtras = installationMode === 'with_extras';
    const includeAdditionalsPricing = templateSettings.includeAdditionalsPricing !== false;
    const showMaterialsToClient = clientPricingMode === 'full';
    const clientBaseLaborCost = exportInstallationProfile.baseLaborCost;
    const clientHeatingLaborCost = includeExtras ? exportInstallationProfile.heatingLaborCost : 0;
    const visibleAdditionalsLaborCost = includeExtras && includeAdditionalsPricing ? additionalsCosts.laborCost : 0;
    const visibleAdditionalsMaterialCost = includeExtras && includeAdditionalsPricing ? additionalsCosts.materialCost : 0;
    const visibleLaborCost = clientBaseLaborCost + clientHeatingLaborCost + visibleAdditionalsLaborCost;
    const visibleExtraPlumbingItems = includeExtras ? extraPlumbingItems : [];
    const visibleHydraulicAdditionals = includeExtras ? commercialExtraSummaryItems : [];
    const conditions = getConditionsList(templateSettings.conditions);
    const visibleInstallationExclusions = getVisibleInstallationExclusions(conditions);
    const visibleAdditionalsSummary = dedupeLabeledItems([
      ...visibleExtraPlumbingItems.map((item: any) => ({
        name: getPlumbingItemName(item),
        quantity: Number(item.quantity || 0),
      })),
      ...visibleHydraulicAdditionals.map((item) => ({
        name: item.name,
        quantity: Number(item.quantity || 0),
      })),
    ]).filter((item) => item.name && item.quantity > 0);
    const showAdditionalSummary = templateSettings.showRecommendedInstallationBox !== false && visibleAdditionalsSummary.length > 0;
    const pricingPosition = templateSettings.pricingPosition || 'bottom';
    const scopeLines = (templateSettings.scopeSummary || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const visibleScopeLines = scopeLines.length > 0
      ? scopeLines
      : [
          `${includeExtras ? installationTier : 'Instalación base'}.`,
          ...automaticScopeLines,
        ];
    const visibleTotal = showMaterialsToClient
      ? grandTotal
      : visibleLaborCost;
    const visibleMaterialsTotal = showMaterialsToClient
      ? Math.max(baseMaterialCost + visibleAdditionalsMaterialCost, totalMaterialCost)
      : 0;
    const tilesMaterialCost = Number(project.materialCost || 0);
    const tilesLaborCost = Number((project.materials as any)?.laborBreakdown?.tileInstaller?.cost || 0);
    const includeVeredaMaterials = templateSettings.includeVeredaMaterials !== false;
    const hasTilesMaterialCost = tilesMaterialCost > 0 && !showMaterialsToClient && includeVeredaMaterials;
    const hasTilesLaborCost = tilesLaborCost > 0 && !showMaterialsToClient;
    const hasHeatingCost = clientHeatingLaborCost > 0;
    const hasAdditionalsCost = visibleAdditionalsLaborCost > 0;
    const hasMultipleCostLines = hasHeatingCost || hasAdditionalsCost || hasTilesMaterialCost || hasTilesLaborCost || (showMaterialsToClient && visibleMaterialsTotal > 0);
    const fullVisibleTotal = visibleLaborCost
      + (hasTilesMaterialCost ? tilesMaterialCost : showMaterialsToClient ? visibleMaterialsTotal : 0)
      + (hasTilesLaborCost ? tilesLaborCost : 0);

    const pricingSectionHtml = sections.costs ? `
      <div class="section">
        <h2>Inversión</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Instalación</div>
            <div class="info-value">${formatCurrency(clientBaseLaborCost)}</div>
          </div>
          ${hasHeatingCost ? `
          <div class="info-item">
            <div class="info-label">Calefacción</div>
            <div class="info-value">${formatCurrency(clientHeatingLaborCost)}</div>
          </div>` : ''}
          ${hasAdditionalsCost ? `
          <div class="info-item">
            <div class="info-label">Adicionales</div>
            <div class="info-value">${formatCurrency(visibleAdditionalsLaborCost)}</div>
          </div>` : ''}
          ${hasTilesMaterialCost ? `
          <div class="info-item">
            <div class="info-label">Materiales vereda</div>
            <div class="info-value">${formatCurrency(tilesMaterialCost)}</div>
          </div>` : ''}
          ${hasTilesLaborCost ? `
          <div class="info-item">
            <div class="info-label">MO colocación losetas</div>
            <div class="info-value">${formatCurrency(tilesLaborCost)}</div>
          </div>` : ''}
          ${showMaterialsToClient && visibleMaterialsTotal > 0 ? `
          <div class="info-item">
            <div class="info-label">Materiales</div>
            <div class="info-value">${formatCurrency(visibleMaterialsTotal)}</div>
          </div>` : ''}
          ${hasMultipleCostLines ? `
          <div class="info-item">
            <div class="info-label">Total</div>
            <div class="info-value">${formatCurrency(fullVisibleTotal)}</div>
          </div>` : ''}
        </div>
      </div>
      ` : '';

    return `
      ${sections.header ? `
      <div class="section">
        <h2>Resumen del Proyecto</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Cliente</div>
            <div class="info-value">${project.clientName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Proyecto</div>
            <div class="info-value">${project.name}</div>
          </div>
          ${project.location ? `<div class="info-item"><div class="info-label">Ubicación</div><div class="info-value">${project.location}</div></div>` : ''}
          <div class="info-item">
            <div class="info-label">Modelo</div>
            <div class="info-value">${project.poolPreset?.name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Dimensiones</div>
            <div class="info-value">${project.poolPreset?.length}m x ${project.poolPreset?.width}m x ${effectiveProjectSpec.depthLabel}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Volumen</div>
            <div class="info-value">${effectiveProjectSpec.volume.toFixed(2)} m³</div>
          </div>
          <div class="info-item">
            <div class="info-label">Área de Espejo de Agua</div>
            <div class="info-value">${effectiveProjectSpec.waterMirrorArea.toFixed(2)} m²</div>
          </div>
          ${project.clientPhone ? `<div class="info-item"><div class="info-label">Teléfono</div><div class="info-value">${project.clientPhone}</div></div>` : ''}
          ${project.clientEmail ? `<div class="info-item"><div class="info-label">Email</div><div class="info-value">${project.clientEmail}</div></div>` : ''}
        </div>
      </div>
      ` : ''}

      ${sections.includes ? `
      <div class="section">
        <h2>Alcance</h2>
        ${visibleScopeLines.map((item) => `<p>${escapeHtml(item)}</p>`).join('')}

        ${showAdditionalSummary ? `
        <div class="comparison-grid">
          <div class="comparison-card recommended">
            <div class="comparison-title">Adicionales incluidos</div>
            <ul class="comparison-list">
              ${visibleAdditionalsSummary.map((item) => `<li>${item.name} x${item.quantity}</li>`).join('')}
            </ul>
          </div>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${pricingPosition === 'top' ? pricingSectionHtml : ''}

      ${renderClientDocumentBlocks(templateSettings.documentBlocks)}

      ${sections.conditions ? `
      <div class="section">
        <h2>Condiciones Comerciales</h2>
        <ul class="conditions-list">
          ${conditions.map((item) => `<li>${item}</li>`).join('')}
          ${visibleInstallationExclusions.map((item) => `<li>${item}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${pricingPosition === 'bottom' ? pricingSectionHtml : ''}
    `;
  };

  const templateAuditItems: Record<ExportTemplate, ExportAuditItem[]> = {
    client: [
      {
        id: 'client-info',
        label: 'Cliente y obra',
        detail: 'Nombre, contacto, ubicación y datos generales.',
        value: `${project.clientName}${project.location ? ` · ${project.location}` : ''}`,
        ready: !!project.clientName,
      },
      {
        id: 'client-pool',
        label: 'Piscina y alcance',
        detail: 'Modelo, dimensiones, volumen y alcance comercial.',
        value: `${project.poolPreset?.name || 'Sin modelo'} · ${effectiveProjectSpec.volume.toFixed(2)} m³`,
        ready: !!project.poolPreset,
      },
      {
        id: 'client-costs',
        label: 'Costos presupuestados',
        detail: clientPricingMode === 'labor_only' ? 'Solo mano de obra visible para cliente.' : 'Materiales, mano de obra y total.',
        value: clientPricingMode === 'labor_only'
          ? formatCurrency(exportInstallationProfile.totalLaborCost)
          : `${formatCurrency(computedCosts.totalMaterialCost)} + ${formatCurrency(exportInstallationProfile.totalLaborCost)}`,
        ready: computedCosts.grandTotal > 0,
      },
      {
        id: 'client-conditions',
        label: 'Condiciones comerciales',
        detail: 'Texto final del presupuesto al cliente.',
        value: `${conditionsCount} condiciones`,
        ready: conditionsCount > 0,
      },
    ],
    professional: [
      {
        id: 'prof-tech',
        label: 'Datos técnicos',
        detail: 'Medidas, volumen, forma y capacidad.',
        value: `${project.poolPreset?.length || 0} x ${project.poolPreset?.width || 0} m`,
        ready: !!project.poolPreset,
      },
      {
        id: 'prof-materials',
        label: 'Materiales estructurales',
        detail: 'Materiales base y cantidades visibles en ficha técnica.',
        value: `${structuredMaterialCount} materiales con cantidad`,
        ready: structuredMaterialCount > 0,
      },
      {
        id: 'prof-plumbing',
        label: 'Instalación hidráulica',
        detail: 'Ítems y especificaciones de cañerías y accesorios.',
        value: `${plumbingItemsCount} ítems`,
        ready: plumbingItemsCount > 0,
      },
      {
        id: 'prof-plan',
        label: 'Plano exportado',
        detail: 'Plano CAD o vista planta según configuración.',
        value: getTemplateSettings('professional').drawingView === 'planta' ? 'Vista planta' : 'Plano CAD',
        ready: true,
      },
    ],
    materials: [
      {
        id: 'mat-base',
        label: 'Materiales base',
        detail: 'Materiales calculados del proyecto.',
        value: `${structuredMaterialCount} materiales`,
        ready: structuredMaterialCount > 0,
      },
      {
        id: 'mat-tasks',
        label: 'Materiales por tareas',
        detail: 'Suma de materiales cargados dentro de tareas.',
        value: `${taskMaterials.length} registros`,
        ready: taskMaterials.length > 0,
      },
      {
        id: 'mat-additionals',
        label: 'Adicionales',
        detail: 'Accesorios, equipos o materiales extra.',
        value: `${additionals.length} adicionales`,
        ready: additionals.length > 0,
      },
      {
        id: 'mat-plumbing',
        label: 'Plomería',
        detail: 'Ítems seleccionados para instalación hidráulica.',
        value: `${plumbingItemsCount} ítems`,
        ready: plumbingItemsCount > 0,
      },
    ],
    budget: [
      {
        id: 'budget-materials',
        label: 'Costo de materiales',
        detail: 'Base, plomería y adicionales.',
        value: formatCurrency(computedCosts.totalMaterialCost),
        ready: computedCosts.totalMaterialCost > 0,
      },
      {
        id: 'budget-labor',
        label: 'Costo de mano de obra',
        detail: 'Tareas y adicionales con mano de obra.',
        value: formatCurrency(exportInstallationProfile.totalLaborCost),
        ready: exportInstallationProfile.totalLaborCost > 0,
      },
      {
        id: 'budget-total',
        label: 'Total general',
        detail: 'Inversión total del proyecto.',
        value: formatCurrency(computedCosts.totalMaterialCost + exportInstallationProfile.totalLaborCost),
        ready: computedCosts.grandTotal > 0,
      },
      {
        id: 'budget-roles',
        label: 'Soporte por roles',
        detail: 'Resumen por tareas, horas y costo.',
        value: `${rolesCount} roles · ${computedTaskCount} tareas`,
        ready: rolesCount > 0,
      },
    ],
    complete: [
      {
        id: 'complete-summary',
        label: 'Resumen ejecutivo',
        detail: 'Cliente, obra y KPIs del proyecto.',
        value: `${project.name} · ${project.clientName}`,
        ready: !!project.name && !!project.clientName,
      },
      {
        id: 'complete-costs',
        label: 'Costos completos',
        detail: 'Materiales, mano de obra y total.',
        value: formatCurrency(computedCosts.grandTotal),
        ready: computedCosts.grandTotal > 0,
      },
      {
        id: 'complete-tech',
        label: 'Bloque técnico',
        detail: 'Materiales, hidráulica y equipos.',
        value: `${structuredMaterialCount} materiales · ${plumbingItemsCount} ítems hidráulicos`,
        ready: structuredMaterialCount > 0 || plumbingItemsCount > 0,
      },
      {
        id: 'complete-work',
        label: 'Tareas y mano de obra',
        detail: 'Horas, roles y secuencia de obra.',
        value: `${computedTaskCount} tareas · ${rolesCount} roles`,
        ready: computedTaskCount > 0,
      },
    ],
    overview: [
      {
        id: 'overview-client',
        label: 'Datos generales',
        detail: 'Proyecto, cliente y ubicación.',
        value: `${project.name} · ${project.clientName}`,
        ready: !!project.name && !!project.clientName,
      },
      {
        id: 'overview-pool',
        label: 'Indicadores de piscina',
        detail: 'Modelo, volumen y espejo de agua.',
        value: `${project.poolPreset?.name || 'Sin modelo'} · ${effectiveProjectSpec.waterMirrorArea.toFixed(2)} m²`,
        ready: !!project.poolPreset,
      },
      {
        id: 'overview-costs',
        label: 'Costos resumidos',
        detail: 'Materiales, mano de obra y total.',
        value: formatCurrency(computedCosts.grandTotal),
        ready: computedCosts.grandTotal > 0,
      },
      {
        id: 'overview-progress',
        label: 'Carga técnica',
        detail: 'Tareas, roles y sistemas ya configurados.',
        value: `${computedTaskCount} tareas · ${rolesCount} roles · ${plumbingItemsCount} ítems hidráulicos`,
        ready: computedTaskCount > 0 || plumbingItemsCount > 0,
      },
    ],
    hydraulic: [
      {
        id: 'hyd-project',
        label: 'Proyecto hidráulico',
        detail: 'Referencia, cabecera y distancia a equipo.',
        value: `${(plumbingConfig?.hydraulicLayout?.referenceSide || 'north').toUpperCase()} · ${Number(plumbingConfig?.distanceToEquipment || 0).toFixed(2)} m`,
        ready: !!plumbingConfig?.hydraulicLayout,
      },
      {
        id: 'hyd-points',
        label: 'Puntos hidráulicos',
        detail: 'Bocas configuradas en el layout del proyecto.',
        value: `${Array.isArray(plumbingConfig?.hydraulicLayout?.points) ? plumbingConfig.hydraulicLayout.points.length : 0} puntos`,
        ready: Array.isArray(plumbingConfig?.hydraulicLayout?.points) && plumbingConfig.hydraulicLayout.points.length > 0,
      },
      {
        id: 'hyd-circuits',
        label: 'Circuitos',
        detail: 'Skimmers, retornos e hidrojets detectados.',
        value: `${hydraulicSummary.total.skimmers} / ${hydraulicSummary.total.returns} / ${hydraulicSummary.total.hydrojets}`,
        ready: hydraulicSummary.total.skimmers + hydraulicSummary.total.returns + hydraulicSummary.total.hydrojets > 0,
      },
      {
        id: 'hyd-equipment',
        label: 'Sala técnica',
        detail: 'Workspace del equipo sin controles de edición.',
        value: 'SVG estático listo para exportación',
        ready: true,
      },
    ],
  };

  const excelSectionDefinitions: Array<{
    key: ExcelSectionKey;
    label: string;
    description: string;
    preview: string;
    ready: boolean;
  }> = [
    {
      key: 'excavation',
      label: 'Excavación y Preparación',
      description: 'Dimensiones, volumen de tierra y parámetros base.',
      preview: `${project.excavationLength} x ${project.excavationWidth} x ${project.excavationDepth} m · ${(project.excavationLength * project.excavationWidth * project.excavationDepth).toFixed(2)} m³`,
      ready: project.excavationLength > 0 && project.excavationWidth > 0 && project.excavationDepth > 0,
    },
    {
      key: 'supportBed',
      label: 'Relleno y Fondo',
      description: 'Geomembrana, malla, arena terciada y cemento para relleno/cama.',
      preview: `${Number(materials?.geomembrane?.quantity || 0)} geomembrana · ${Number(materials?.electroweldedMesh?.quantity || 0)} malla · ${Number(materials?.sandForBed?.quantity || 0)} m³ arena`,
      ready: Number(materials?.geomembrane?.quantity || 0) > 0 || Number(materials?.sandForBed?.quantity || 0) > 0 || Number(materials?.cementBags?.quantity || 0) > 0,
    },
    {
      key: 'sidewalk',
      label: 'Solado de Vereda',
      description: 'Área y materiales de terminación exterior.',
      preview: `${(calculatedSidewalkArea || project.sidewalkArea || 0).toFixed(2)} m² · ${Number(materials?.cement?.quantity || 0)} cemento`,
      ready: (calculatedSidewalkArea || project.sidewalkArea || 0) > 0,
    },
    {
      key: 'plumbing',
      label: 'Instalación Hidráulica',
      description: 'Cañerías, accesorios y configuración del circuito.',
      preview: `${plumbingItemsCount} ítems · Distancia equipo ${Number(plumbingConfig?.distanceToEquipment || 0)} m`,
      ready: plumbingItemsCount > 0,
    },
    {
      key: 'electrical',
      label: 'Instalación Eléctrica',
      description: 'Equipos, consumo y protecciones.',
      preview: `${electricalItemsCount} ítems · ${Number(electricalConfig?.totalWatts ?? electricalConfig?.totalPower ?? 0)} W`,
      ready: electricalItemsCount > 0 || Number(electricalConfig?.totalWatts ?? electricalConfig?.totalPower ?? 0) > 0 || !!equipmentRecommendation,
    },
    {
      key: 'labor',
      label: 'Mano de Obra',
      description: 'Roles, tareas, horas y costos.',
      preview: `${rolesCount} roles · ${computedTaskCount} tareas · ${formatCurrency(exportInstallationProfile.totalLaborCost)}`,
      ready: rolesCount > 0 || computedTaskCount > 0 || exportInstallationProfile.totalLaborCost > 0,
    },
    {
      key: 'sequence',
      label: 'Secuencia de Trabajo',
      description: 'Orden sugerido de ejecución.',
      preview: '9 pasos estándar de obra',
      ready: true,
    },
    {
      key: 'standards',
      label: 'Normativas Aplicables',
      description: 'IRAM, seguridad eléctrica y observaciones.',
      preview: 'Normas y observaciones generales',
      ready: true,
    },
  ];

  const selectedTemplateAuditItems = templateAuditItems[selectedTemplate];
  const selectedExcelItems = excelSectionDefinitions.filter((section) => excelSections[section.key]);
  const readyExcelItems = excelSectionDefinitions.filter((section) => section.ready).length;
  const hydraulicExtraAdditionals = getHydraulicExtraAdditionals();
  const otherAdditionals = getOtherAdditionals();
  const materialSectionDefinitions: Array<{
    key: MaterialExportSectionKey;
    label: string;
    description: string;
    preview: string;
    ready: boolean;
  }> = [
    {
      key: 'sidewalkBase',
      label: 'Materiales de Vereda',
      description: 'Base calculada para vereda, adhesivo y terminaciones.',
      preview: `${Number(materials?.cement?.quantity || 0)} cemento · ${Number(materials?.sand?.quantity || 0)} arena · ${Number(materials?.gravel?.quantity || 0)} grava`,
      ready: !!(materials?.cement || materials?.sand || materials?.gravel || materials?.adhesive || materials?.whiteCement || materials?.marmolina),
    },
    {
      key: 'taskMaterials',
      label: 'Materiales del Plan de Tareas',
      description: 'Listado consolidado de materiales cargados manualmente en tareas.',
      preview: `${taskMaterials.length} materiales consolidados`,
      ready: taskMaterials.length > 0,
    },
    {
      key: 'taskSequence',
      label: 'Por Orden de Avance',
      description: 'Materiales agrupados por etapa de obra.',
      preview: `${taskMaterialsByStage.length} etapas con materiales`,
      ready: taskMaterialsByStage.length > 0,
    },
    {
      key: 'tiles',
      label: 'Losetas y Revestimientos',
      description: 'Cantidad calculada de losetas guardada en el proyecto.',
      preview: `${Array.isArray(materials?.tiles) ? materials.tiles.length : 0} ítems`,
      ready: Array.isArray(materials?.tiles) && materials.tiles.length > 0,
    },
    {
      key: 'plumbing',
      label: 'Instalación Hidráulica',
      description: 'Base hidráulica del proyecto según la configuración guardada.',
      preview: `${plumbingItemsCount} ítems base`,
      ready: plumbingItemsCount > 0,
    },
    {
      key: 'electrical',
      label: 'Instalación Eléctrica',
      description: 'Equipos, cableado y protecciones guardadas en la configuración eléctrica.',
      preview: `${electricalItemsCount} ítems eléctricos`,
      ready: electricalItemsCount > 0,
    },
    {
      key: 'complementary',
      label: 'Materiales Complementarios',
      description: 'Mallas e impermeabilización asociadas al cálculo.',
      preview: `${Number(materials?.wireMesh?.quantity || 0)} malla`,
      ready: !!materials?.wireMesh,
    },
    {
      key: 'supportBed',
      label: 'Relleno y Fondo',
      description: 'Malla, arena terciada y cemento para cama/relleno.',
      preview: `${Number(materials?.sandForBed?.quantity || 0)} arena · ${Number(materials?.cementBags?.quantity || 0)} cemento`,
      ready: !!(materials?.electroweldedMesh || materials?.sandForBed || materials?.cementBags),
    },
    {
      key: 'additionals',
      label: 'Adicionales',
      description: 'Extras hidráulicos, equipos agregados y otros accesorios fuera de la instalación base.',
      preview: `${hydraulicExtraAdditionals.length} extras hidráulicos · ${otherAdditionals.length} otros`,
      ready: hydraulicExtraAdditionals.length > 0 || otherAdditionals.length > 0,
    },
  ];

  const generateClientBudget = (templateSettings: ExportTemplateSettings = getTemplateSettings('client')) => {
    const headerSubtitle = templateSettings.subtitle || 'Propuesta Comercial de Instalación';
    const documentTitle = templateSettings.title || `Propuesta Comercial - ${project.name}`;
    const logoDataUrl = getLogoForTemplate('client');
    const bodyHtml = resolveClientBodyHtml(templateSettings);

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${documentTitle}</title>
  <style>
    :root {
      --bg: #f5f5f4;
      --paper: #ffffff;
      --ink: #18181b;
      --muted: #71717a;
      --line: #e7e5e4;
      --soft: #fafaf9;
      --accent: #0f172a;
    }
    @page {
      size: A4;
      margin: 9mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.45;
      color: var(--ink);
      background: var(--bg);
      padding: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .container {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      background: var(--paper);
      border: 1px solid var(--line);
    }
    .header {
      padding: 24px 28px 18px;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, #ffffff 0%, #fafaf9 100%);
    }
    .logo {
      min-height: 28px;
      margin-bottom: 16px;
    }
    .header-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
    }
    .title-block {
      max-width: 620px;
    }
    .eyebrow {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
      margin-bottom: 8px;
      font-weight: 700;
    }
    .title {
      font-size: 26px;
      line-height: 1.05;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 14px;
      color: #3f3f46;
      max-width: 520px;
    }
    .date-box {
      min-width: 142px;
      border-left: 1px solid var(--line);
      padding-left: 14px;
      text-align: right;
      flex-shrink: 0;
    }
    .date-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
      margin-bottom: 4px;
      font-weight: 700;
    }
    .date {
      font-size: 13px;
      color: var(--ink);
      font-weight: 600;
    }
    .content {
      padding: 18px 28px 26px;
    }
    .custom-document {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .section {
      margin: 0;
      page-break-inside: avoid;
      break-inside: avoid;
      padding: 18px 20px;
      border: 1px solid var(--line);
      background: #fff;
      box-shadow: inset 0 0 0 1px #fafaf9;
    }
    .section h2 {
      color: var(--accent);
      padding-bottom: 7px;
      margin-bottom: 14px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      border-bottom: 1px solid var(--line);
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 18px;
    }
    .info-item {
      padding: 12px 0;
      border-bottom: 1px solid var(--line);
      min-width: 0;
    }
    .info-label {
      font-size: 9px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-bottom: 5px;
      font-weight: 700;
    }
    .info-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--ink);
      overflow-wrap: anywhere;
    }
    .section p {
      font-size: 14px;
      color: #27272a;
      margin: 0 0 10px;
      overflow-wrap: anywhere;
    }
    .section p:last-child {
      margin-bottom: 0;
    }
    .section p + p {
      padding-top: 8px;
      border-top: 1px dashed #e7e5e4;
    }
    .comparison-grid {
      margin-top: 16px;
    }
    .comparison-card {
      border: 1px solid var(--line);
      padding: 16px 18px;
      background: var(--soft);
      break-inside: avoid;
    }
    .comparison-card.recommended {
      background: var(--soft);
      color: var(--ink);
      border-color: var(--line);
    }
    .comparison-title {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
    }
    .comparison-list {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 13px;
      color: #27272a;
    }
    .conditions-list {
      list-style: none;
      padding: 0;
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .conditions-list li {
      padding: 0 0 10px;
      border-bottom: 1px solid var(--line);
      font-size: 13px;
      color: #27272a;
      overflow-wrap: anywhere;
    }
    .custom-blocks {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .custom-block {
      padding: 0;
      background: transparent;
      border: 0;
    }
    .custom-heading {
      color: var(--accent);
      margin: 0;
      line-height: 1.2;
    }
    .custom-paragraph {
      color: #27272a;
      margin: 0;
      line-height: 1.65;
    }
    .custom-bullets {
      margin: 0;
      padding-left: 18px;
      color: #27272a;
      line-height: 1.65;
    }
    .custom-divider {
      border-top: 1px solid var(--line);
      margin: 2px 0;
    }
    .custom-data-field {
      color: var(--ink);
      font-weight: 600;
    }
    .custom-data-label {
      color: var(--muted);
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.12em;
      font-weight: 700;
    }
    .custom-comment {
      margin-top: 5px;
      color: var(--muted);
      font-size: 11px;
      font-style: italic;
    }
    .custom-document table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      table-layout: fixed;
    }
    .custom-document th,
    .custom-document td {
      border: 1px solid var(--line);
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
      font-size: 12px;
      word-break: break-word;
    }
    .custom-document th {
      background: var(--soft);
      color: var(--accent);
      font-weight: 700;
    }
    .custom-document .doc-columns {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .custom-document .doc-comment {
      border-left: 2px solid #d6d3d1;
      padding: 8px 12px;
      background: var(--soft);
      color: #52525b;
      font-size: 12px;
      font-style: italic;
      margin: 10px 0;
    }
    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 10px;
      color: var(--muted);
    }
    .footer strong {
      color: var(--ink);
    }
    @media (max-width: 900px) {
      body {
        padding: 0;
        background: #fff;
      }
      .container {
        max-width: 100%;
        border: 0;
      }
      .header,
      .content {
        padding-left: 16px;
        padding-right: 16px;
      }
      .header-top,
      .footer {
        display: block;
      }
      .date-box {
        border-left: 0;
        padding-left: 0;
        margin-top: 14px;
        text-align: left;
      }
      .info-grid,
      .custom-document .doc-columns {
        grid-template-columns: 1fr;
      }
      .section {
        padding: 14px;
      }
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        max-width: 100%;
        border: 0;
      }
      .section,
      .comparison-card,
      .custom-block,
      .custom-document table {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">${logoDataUrl ? `<img src="${logoDataUrl}" alt="Domotics IoT Solutions" style="height:30px;width:auto;vertical-align:middle;"/>` : 'POOL CALCULATOR'}</div>
      <div class="header-top">
        <div class="title-block">
          <div class="eyebrow">Propuesta</div>
          <h1 class="title">${project.name}</h1>
          <p class="subtitle">${headerSubtitle}</p>
        </div>
        <div class="date-box">
          <div class="date-label">Fecha</div>
          <div class="date">${new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="custom-document">
        ${bodyHtml}
      </div>

      <div class="footer">
        <p><strong>Pool Installer</strong></p>
        <p>Código ${getProjectCode(project)} · ${new Date().toLocaleDateString('es-AR')}</p>
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
    const projectEquipmentAdditionals = commercialAdditionals
      .filter((additional) => additional?.equipment)
      .map((additional) => ({
        quantity: additional.newQuantity || additional.baseQuantity || 1,
        equipment: additional.equipment,
      }));
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
    const formatNumeric = (value: number | string | undefined, decimals = 1) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return '';
      return parsed.toLocaleString('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      });
    };
    const getEquipmentSpecs = (equipment: any) => {
      const specs: string[] = [];
      const type = String(equipment?.type || '').toUpperCase();

      if (equipment?.brand || equipment?.model) {
        specs.push([equipment.brand, equipment.model].filter(Boolean).join(' '));
      }

      if ((type === 'PUMP' || type === 'HEAT_PUMP') && equipment?.flowRate) {
        specs.push(`Caudal: ${formatNumeric(equipment.flowRate)} m³/h`);
      }
      if (type === 'FILTER') {
        if (equipment?.filterDiameter) specs.push(`Diámetro: ${formatNumeric(equipment.filterDiameter)} mm`);
        if (equipment?.filterArea) specs.push(`Área filtrante: ${formatNumeric(equipment.filterArea, 2)} m²`);
        if (equipment?.sandRequired) specs.push(`Arena requerida: ${formatNumeric(equipment.sandRequired)} kg`);
        if (equipment?.capacity) specs.push(`Capacidad de trabajo: ${formatNumeric(equipment.capacity)} m³/h`);
      }
      if (type === 'HEATER' || type === 'HEAT_PUMP') {
        if (equipment?.thermalPower) specs.push(`Potencia térmica: ${formatNumeric(equipment.thermalPower)} kcal/h`);
        if (equipment?.power) specs.push(`${type === 'HEAT_PUMP' ? 'Potencia eléctrica' : 'Potencia'}: ${formatNumeric(equipment.power)} ${type === 'HEAT_PUMP' ? 'kW' : 'HP'}`);
      }
      if (type === 'CHLORINATOR' && equipment?.capacity) {
        specs.push(`Producción: ${formatNumeric(equipment.capacity)} g/h`);
      }
      if (!['FILTER'].includes(type) && equipment?.power) {
        const powerUnit = type === 'HEATER' || type === 'HEAT_PUMP' ? 'kW' : 'HP';
        specs.push(`Potencia: ${formatNumeric(equipment.power)} ${powerUnit}`);
      }
      if (equipment?.consumption) specs.push(`Consumo: ${formatNumeric(equipment.consumption)} W`);
      if (equipment?.voltage) specs.push(`Tensión: ${equipment.voltage} V`);
      if (equipment?.connectionSize) specs.push(`Conexión: ${equipment.connectionSize}`);

      return specs.filter(Boolean);
    };
    const technicalMaterialRows = [
      materials?.electroweldedMesh && shouldInclude(materials.electroweldedMesh.quantity)
        ? `<tr><td>Malla electrosoldada</td><td>${formatQuantity(materials.electroweldedMesh.quantity, materials.electroweldedMesh.unit)}</td><td>${materials.electroweldedMesh.unit}</td><td>Refuerzo de apoyo y relleno</td></tr>`
        : '',
      materials?.sandForBed && shouldInclude(materials.sandForBed.quantity)
        ? `<tr><td>Arena terciada para relleno</td><td>${formatQuantity(materials.sandForBed.quantity, materials.sandForBed.unit)}</td><td>${materials.sandForBed.unit}</td><td>Cama y relleno de instalación</td></tr>`
        : '',
      materials?.cementBags && shouldInclude(materials.cementBags.quantity)
        ? `<tr><td>Cemento para cama y relleno</td><td>${formatQuantity(materials.cementBags.quantity, materials.cementBags.unit)}</td><td>${materials.cementBags.unit}</td><td>Base y fijación de instalación</td></tr>`
        : '',
    ].filter(Boolean);

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
    .hydraulic-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }
    .hydraulic-item { padding: 14px; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; }
    .hydraulic-label { font-size: 11px; color: #71717a; text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em; }
    .hydraulic-value { font-size: 18px; font-weight: 700; color: #18181b; margin-top: 6px; }
    .equipment-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 18px; }
    .equipment-card { padding: 16px; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 10px; }
    .equipment-title { font-size: 15px; font-weight: 700; color: #18181b; }
    .equipment-qty { font-size: 11px; color: #71717a; text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; margin-top: 4px; }
    .equipment-specs { margin: 10px 0 0; padding-left: 18px; color: #3f3f46; }
    .equipment-specs li { margin: 4px 0; font-size: 13px; }
    .materials-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .materials-table th { background: #18181b; color: white; padding: 12px; text-align: left; font-size: 13px; }
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
          <div class="spec-item"><div class="spec-label">Profundidad</div><div class="spec-value">${effectiveProjectSpec.depthLabel}</div></div>
          <div class="spec-item"><div class="spec-label">Volumen</div><div class="spec-value">${effectiveProjectSpec.volume.toFixed(2)} m³</div></div>
          <div class="spec-item"><div class="spec-label">Capacidad</div><div class="spec-value">${(effectiveProjectSpec.volume * 1000).toFixed(0)} litros</div></div>
          <div class="spec-item"><div class="spec-label">Área Espejo</div><div class="spec-value">${effectiveProjectSpec.waterMirrorArea.toFixed(2)} m²</div></div>
          <div class="spec-item"><div class="spec-label">Forma</div><div class="spec-value">${effectiveProjectSpec.shapeLabel}</div></div>
          <div class="spec-item"><div class="spec-label">Skimmers</div><div class="spec-value">${hydraulicSummary.total.skimmers}</div></div>
          <div class="spec-item"><div class="spec-label">Retornos</div><div class="spec-value">${hydraulicSummary.total.returns}</div></div>
        </div>
        ${hydraulicSummary.added.items.length > 0 ? `
        <div style="margin-top:16px;padding:14px;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;">
          <div style="font-size:12px;font-weight:700;color:#27272a;text-transform:uppercase;margin-bottom:8px;">Agregados del proyecto</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${hydraulicSummary.added.items.map((item) => `<span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#f4f4f5;color:#27272a;font-size:12px;font-weight:600;border:1px solid #e4e4e7;">${item.name} x${item.quantity}</span>`).join('')}
          </div>
        </div>
        ` : ''}
        ${projectEquipmentAdditionals.length > 0 ? `
        <div class="equipment-grid">
          ${projectEquipmentAdditionals.map(({ equipment, quantity }) => {
            const specs = getEquipmentSpecs(equipment);
            return `
            <div class="equipment-card">
              <div class="equipment-title">${equipment.name}</div>
              <div class="equipment-qty">${quantity} ${quantity === 1 ? 'unidad instalada' : 'unidades instaladas'}</div>
              ${specs.length > 0 ? `
              <ul class="equipment-specs">
                ${specs.map((spec) => `<li>${spec}</li>`).join('')}
              </ul>
              ` : ''}
            </div>`;
          }).join('')}
        </div>
        ` : ''}
        <div class="hydraulic-grid">
          <div class="hydraulic-item">
            <div class="hydraulic-label">Retornos orientables</div>
            <div class="hydraulic-value">${hydraulicSummary.total.returns}</div>
          </div>
          <div class="hydraulic-item">
            <div class="hydraulic-label">Tomas de aspiración</div>
            <div class="hydraulic-value">${hydraulicSummary.total.vacuumIntakes}</div>
          </div>
          <div class="hydraulic-item">
            <div class="hydraulic-label">Desagües de fondo</div>
            <div class="hydraulic-value">${hydraulicSummary.total.bottomDrains}</div>
          </div>
          <div class="hydraulic-item">
            <div class="hydraulic-label">Skimmers</div>
            <div class="hydraulic-value">${hydraulicSummary.total.skimmers}</div>
          </div>
          <div class="hydraulic-item">
            <div class="hydraulic-label">Hidrojets</div>
            <div class="hydraulic-value">${hydraulicSummary.total.hydrojets}</div>
          </div>
          <div class="hydraulic-item">
            <div class="hydraulic-label">Luces</div>
            <div class="hydraulic-value">${hydraulicSummary.total.lights}</div>
          </div>
        </div>
      </div>

      ${technicalMaterialRows.length > 0 ? `
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
            ${technicalMaterialRows.join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

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

      ${basePlumbingItems.length > 0 ? `
      <div class="section">
        <h2>Instalación Hidráulica</h2>
        <p style="font-size: 13px; color: #6b7280; margin: 0 0 10px;">Sistema de unión: ${getProjectPipeSystemLabel(project)}</p>
        <table class="materials-table">
          <thead>
            <tr><th>Item</th><th>Cantidad</th><th>Especificación</th></tr>
          </thead>
          <tbody>
            ${basePlumbingItems.map((item: any) =>
              `<tr><td>${getPlumbingItemName(item)}</td><td>${item.quantity}</td><td>${item.diameter || item.specification || '-'}</td></tr>`
            ).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${extraPlumbingItems.length > 0 ? `
      <div class="section">
        <h2>Adicionales Hidráulicos</h2>
        <table class="materials-table">
          <thead>
            <tr><th>Item</th><th>Cantidad</th><th>Especificación</th></tr>
          </thead>
          <tbody>
            ${extraPlumbingItems.map((item: any) =>
              `<tr><td>${getPlumbingItemName(item)}</td><td>${item.quantity}</td><td>${item.diameter || item.specification || '-'}</td></tr>`
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
        <p>Generado: ${new Date().toLocaleDateString('es-AR')} | ID: ${getProjectCode(project)}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const generateMaterialsList = (templateSettings: ExportTemplateSettings = getTemplateSettings('materials')) => {
    const materials = project.materials as any;
    const installationMode = templateSettings.installationMode || 'with_extras';
    const includeExtras = installationMode === 'with_extras';
    const plumbingConfig = project.plumbingConfig as any;
    const taskMaterials = getTaskMaterials();
    const taskMaterialsByStage = getTaskMaterialsByStage();
    const hydraulicExtras = getHydraulicExtraAdditionals();
    const accessoryExtras = getAccessoryAdditionals();
    const otherExtras = getOtherAdditionals();
    const calculatedTiles = Array.isArray(materials?.tiles) ? materials.tiles : [];
    const hasStructuredMaterials = materials && Object.keys(materials).length > 0;
    const sections = templateSettings.sections || {};
    const includeSection = (key: MaterialExportSectionKey) => sections[key] !== false;
    const shouldInclude = (quantity: number | string | undefined) => {
      const qty = Number(quantity || 0);
      return !!qty && !Number.isNaN(qty);
    };
    const formatMeshSheets = (quantity: number, unit: string, sheetAreaM2: number, sheetLabel: string) => {
      if (!quantity || !unit) return '';
      const normalizedUnit = unit.toLowerCase();
      if (!normalizedUnit.includes('m²') && !normalizedUnit.includes('m2')) return '';
      const sheets = Math.ceil(quantity / sheetAreaM2);
      return ` (≈ ${sheets} mallas de ${sheetLabel})`;
    };
    const hasElectroweldedMesh = materials?.electroweldedMesh?.quantity > 0;
    const sidewalkMaterials = [
      materials?.cement ? { name: 'Cemento Portland', quantity: materials.cement.quantity, unit: materials.cement.unit } : null,
      materials?.sand ? { name: 'Arena Gruesa', quantity: materials.sand.quantity, unit: materials.sand.unit } : null,
      materials?.gravel ? { name: 'Piedra/Grava', quantity: materials.gravel.quantity, unit: materials.gravel.unit } : null,
      materials?.adhesive ? { name: 'Adhesivo para Losetas', quantity: materials.adhesive.quantity, unit: materials.adhesive.unit } : null,
      materials?.whiteCement ? { name: 'Cemento Blanco', quantity: materials.whiteCement.quantity, unit: materials.whiteCement.unit } : null,
      materials?.marmolina ? { name: 'Marmolina', quantity: materials.marmolina.quantity, unit: materials.marmolina.unit } : null,
    ].filter((item): item is { name: string; quantity: number; unit: string } => Boolean(item && shouldInclude(item.quantity)));
    const supportBedMaterials = [
      materials?.electroweldedMesh
      && shouldInclude(materials.electroweldedMesh.quantity)
        ? {
            name: 'Malla Electrosoldada',
            quantityLabel: `${materials.electroweldedMesh.quantity} ${materials.electroweldedMesh.unit}${formatMeshSheets(materials.electroweldedMesh.quantity, materials.electroweldedMesh.unit, 12, '2x6m')}`,
          }
        : null,
      materials?.sandForBed
      && shouldInclude(materials.sandForBed.quantity)
        ? { name: 'Arena terciada para relleno', quantityLabel: `${materials.sandForBed.quantity} ${materials.sandForBed.unit}` }
        : null,
      materials?.sandForBedBulkBags
      && shouldInclude(materials.sandForBedBulkBags.quantity)
        ? { name: 'Referencia bolsones arena', quantityLabel: `${materials.sandForBedBulkBags.quantity} ${materials.sandForBedBulkBags.unit}` }
        : null,
      materials?.cementBags
      && shouldInclude(materials.cementBags.quantity)
        ? { name: 'Cemento para cama/relleno', quantityLabel: `${materials.cementBags.quantity} ${materials.cementBags.unit}` }
        : null,
    ].filter((item): item is { name: string; quantityLabel: string } => Boolean(item));
    const complementaryMaterials = [
      materials?.wireMesh && !hasElectroweldedMesh
      && shouldInclude(materials.wireMesh.quantity)
        ? {
            name: 'Malla de Alambre',
            quantityLabel: `${materials.wireMesh.quantity} ${materials.wireMesh.unit}${formatMeshSheets(materials.wireMesh.quantity, materials.wireMesh.unit, 6, '2x3m')}`,
          }
        : null,
      materials?.waterproofing
      && shouldInclude(materials.waterproofing.quantity)
        ? {
            name: 'Impermeabilizante',
            quantityLabel: `${materials.waterproofing.quantity} ${materials.waterproofing.unit}`,
          }
        : null,
    ].filter((item): item is { name: string; quantityLabel: string } => Boolean(item));
    const electricalMaterials = Array.isArray(electricalConfig?.items)
      ? electricalConfig.items
          .filter((item: any) => Number(item?.quantity || 0) > 0)
          .map((item: any) => {
            const detailParts = [
              item?.cableType ? `· ${item.cableType}` : '',
              item?.cableLength ? `· ${item.cableLength} m` : '',
              item?.watts ? `· ${item.watts} W` : '',
            ].filter(Boolean);
            return {
              name: item?.name || 'Ítem eléctrico',
              quantityLabel: `${item.quantity} ud ${detailParts.join(' ')}`.trim(),
            };
          })
      : [];
    const showSidewalkSection = includeSection('sidewalkBase') && sidewalkMaterials.length > 0;
    const showSupportBedSection = supportBedMaterials.length > 0;
    const showComplementarySection = includeSection('complementary') && complementaryMaterials.length > 0;
    const showElectricalSection = includeSection('electrical') && electricalMaterials.length > 0;

    const headerSubtitle = templateSettings.subtitle || 'Listado Interno de Materiales';
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
    .summary-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
    .summary-card { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px; }
    .summary-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; margin-bottom: 6px; }
    .summary-value { font-size: 18px; font-weight: 700; color: #18181b; }
    .category-section { margin: 22px 0; }
    .category-title { background: #18181b; color: white; padding: 12px 18px; font-size: 17px; font-weight: 600; margin-bottom: 10px; border-radius: 10px; }
    .category-meta { margin: 0 0 10px; font-size: 12px; color: #71717a; }
    .material-item { display: flex; justify-content: space-between; gap: 16px; padding: 12px 16px; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 10px; margin-bottom: 8px; align-items: center; }
    .material-name { font-weight: 600; color: #1f2937; flex: 1; }
    .material-qty { font-size: 16px; font-weight: 700; color: #18181b; min-width: 140px; text-align: right; }
    .content-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
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
      <div class="summary-strip">
        <div class="summary-card">
          <div class="summary-label">Proyecto</div>
          <div class="summary-value">${project.name}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Instalación</div>
          <div class="summary-value">${includeExtras ? installationTier : 'Base'}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Cliente</div>
          <div class="summary-value">${project.clientName}</div>
        </div>
      </div>

      <div class="content-grid">
          ${showSidewalkSection ? `
          <div class="category-section">
            <div class="category-title">Materiales de Vereda</div>
            <div class="category-meta">Base estructural y terminación exterior.</div>
            ${sidewalkMaterials.map((item) =>
              `<div class="material-item"><span class="material-name">${item.name}</span><span class="material-qty">${item.quantity} ${item.unit}</span></div>`
            ).join('')}
          </div>
          ` : ''}

          ${includeSection('taskMaterials') && taskMaterials.length > 0 ? `
          <div class="category-section">
            <div class="category-title">Materiales por Tareas</div>
            <div class="category-meta">Cargados manualmente en la planificación de obra.</div>
            ${taskMaterials.map((material) =>
              `<div class="material-item"><span class="material-name">${material.name}</span><span class="material-qty">${material.quantity} ${material.unit}</span></div>`
            ).join('')}
          </div>
          ` : ''}

          ${includeSection('taskSequence') && taskMaterialsByStage.length > 0 ? `
          <div class="category-section">
            <div class="category-title">Materiales por Orden de Avance</div>
            <div class="category-meta">Agrupados por etapa de obra.</div>
            ${taskMaterialsByStage.map((stage) => `
              <div style="margin-bottom: 18px;">
                <div style="font-size: 13px; font-weight: 700; color: #18181b; margin-bottom: 8px;">${stage.label}</div>
                ${stage.items.map((material) =>
                  `<div class="material-item"><span class="material-name">${material.name}</span><span class="material-qty">${material.quantity} ${material.unit}</span></div>`
                ).join('')}
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${includeSection('sidewalkBase') && includeSection('tiles') && calculatedTiles.length > 0 ? `
          <div class="category-section">
            <div class="category-title">Losetas y Revestimientos</div>
            <div class="category-meta">Piezas calculadas para terminaciones.</div>
            ${calculatedTiles.map((tile: any) =>
              `<div class="material-item"><span class="material-name">${tile.tileName}</span><span class="material-qty">${tile.quantity} ${tile.unit}</span></div>`
            ).join('')}
          </div>
          ` : ''}

          ${includeSection('plumbing') && basePlumbingItems.length > 0 ? `
          <div class="category-section">
            <div class="category-title">Instalación Hidráulica Base</div>
            <div class="category-meta">Accesorios y cañería de la instalación base.</div>
            ${basePlumbingItems.map((item: any) =>
              `<div class="material-item"><span class="material-name">${getPlumbingItemName(item)}</span><span class="material-qty">${item.quantity} ${item.unit || 'ud'}</span></div>`
            ).join('')}
          </div>
          ` : ''}

          ${includeSection('additionals') && extraPlumbingItems.length > 0 ? `
          <div class="category-section">
            <div class="category-title">Adicionales Hidráulicos</div>
            <div class="category-meta">Agregados hidráulicos por encima de la instalación base.</div>
            ${extraPlumbingItems.map((item: any) =>
              `<div class="material-item"><span class="material-name">${getPlumbingItemName(item)}</span><span class="material-qty">${item.quantity} ${item.unit || 'ud'}</span></div>`
            ).join('')}
          </div>
          ` : ''}

          ${showComplementarySection ? `
          <div class="category-section">
            <div class="category-title">Materiales Complementarios</div>
            <div class="category-meta">Apoyos y refuerzos complementarios.</div>
            ${complementaryMaterials.map((item) =>
              `<div class="material-item"><span class="material-name">${item.name}</span><span class="material-qty">${item.quantityLabel}</span></div>`
            ).join('')}
          </div>
          ` : ''}

          ${showSupportBedSection ? `
          <div class="category-section">
            <div class="category-title">Materiales para Cama y Relleno</div>
            <div class="category-meta">Se incluyen siempre que existan en el proyecto.</div>
            ${supportBedMaterials.map((item) =>
              `<div class="material-item"><span class="material-name">${item.name}</span><span class="material-qty">${item.quantityLabel}</span></div>`
            ).join('')}
          </div>
          ` : ''}

          ${showElectricalSection ? `
          <div class="category-section">
            <div class="category-title">Materiales Eléctricos</div>
            <div class="category-meta">Cableado, protecciones y componentes cargados en la instalación eléctrica.</div>
            ${electricalMaterials.map((item) =>
              `<div class="material-item"><span class="material-name">${item.name}</span><span class="material-qty">${item.quantityLabel}</span></div>`
            ).join('')}
          </div>
          ` : ''}

          ${includeSection('additionals') && includeExtras && hydraulicExtras.length > 0 ? `
          <div class="category-section">
            <div class="category-title">Extras Hidráulicos y Equipos</div>
            <div class="category-meta">Bombas, calefacción y accesorios agregados al proyecto.</div>
            ${hydraulicExtras.map((add: any) => {
              const name = getAdditionalName(add);
              return `<div class="material-item"><span class="material-name">${name}</span><span class="material-qty">${add.newQuantity} ${add.customUnit || 'ud'}</span></div>`;
            }).join('')}
          </div>
          ` : ''}

          ${includeSection('additionals') && includeExtras && accessoryExtras.length > 0 ? `
          <div class="category-section">
            <div class="category-title">Adicionales Accesorios</div>
            <div class="category-meta">Accesorios extra cargados fuera de la instalación base.</div>
            ${accessoryExtras.map((add: any) => {
              const name = getAdditionalName(add);
              return `<div class="material-item"><span class="material-name">${name}</span><span class="material-qty">${add.newQuantity} ${add.customUnit || 'ud'}</span></div>`;
            }).join('')}
          </div>
          ` : ''}

          ${includeSection('additionals') && includeExtras && otherExtras.length > 0 ? `
          <div class="category-section">
            <div class="category-title">Otros Adicionales</div>
            <div class="category-meta">Otros agregados cargados en el proyecto.</div>
            ${otherExtras.map((add: any) => {
              const name = getAdditionalName(add);
              return `<div class="material-item"><span class="material-name">${name}</span><span class="material-qty">${add.newQuantity} ${add.customUnit || 'ud'}</span></div>`;
            }).join('')}
          </div>
          ` : ''}
      </div>

      <div class="footer">
        <p><strong>Pool Installer</strong> | Lista de Materiales</p>
        <p>Generado: ${new Date().toLocaleDateString('es-AR')} | ID: ${getProjectCode(project)}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const generateDetailedBudget = (templateSettings: ExportTemplateSettings = getTemplateSettings('budget')) => {
    const materials = project.materials as any;
    const installationMode = templateSettings.installationMode || 'with_extras';
    const includeExtras = installationMode === 'with_extras';
    const clientPricingMode = templateSettings.clientPricingMode || 'labor_only';
    const showMaterialsToClient = clientPricingMode === 'full';
    const { additionals, additionalsCosts, totalMaterialCost, grandTotal, baseMaterialCost } = resolveCostOverrides(templateSettings);
    const rolesSummary = getRolesCostSummary();
    const visibleMaterialCost = includeExtras ? totalMaterialCost : baseMaterialCost;
    const baseVisibleLaborCost = exportInstallationProfile.baseLaborCost;
    const heatingVisibleLaborCost = includeExtras ? exportInstallationProfile.heatingLaborCost : 0;
    const visibleLaborCost = baseVisibleLaborCost + heatingVisibleLaborCost;
    const visibleGrandTotal = showMaterialsToClient
      ? visibleMaterialCost + visibleLaborCost
      : grandTotal;
    const conditions = getConditionsList(templateSettings.conditions);
    const visibleInstallationExclusions = getVisibleInstallationExclusions(conditions);
    const headerSubtitle = templateSettings.subtitle || (showMaterialsToClient ? 'Presupuesto Detallado con Costos Unitarios' : 'Presupuesto de Instalación');
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
    .budget-table th { background: #18181b; color: white; padding: 12px; text-align: left; font-size: 13px; }
    .budget-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .budget-table tr:hover { background: #f9fafb; }
    .budget-table .subtotal-row { background: #fafafa; font-weight: 600; }
    .budget-table .total-row { background: #111111; color: white; font-weight: 700; font-size: 16px; }
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
      ${showMaterialsToClient ? `
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
            <tr class="subtotal-row"><td colspan="4">Subtotal Materiales Base</td><td class="text-right">$ ${baseMaterialCost.toLocaleString('es-AR')}</td></tr>
          </tbody>
        </table>
      </div>
      ` : ''}

      ${showMaterialsToClient && basePlumbingItems.length > 0 ? `
      <div class="section">
        <h2>Instalación Hidráulica Base</h2>
        <table class="budget-table">
          <thead>
            <tr><th>Item</th><th>Cantidad</th><th class="text-right">Precio Unit.</th><th class="text-right">Subtotal</th></tr>
          </thead>
          <tbody>
            ${basePlumbingItems.map((item: any) =>
              `<tr><td>${getPlumbingItemName(item)}</td><td>${item.quantity}</td><td class="text-right">$ ${item.pricePerUnit.toLocaleString('es-AR')}</td><td class="text-right">$ ${(item.quantity * item.pricePerUnit).toLocaleString('es-AR')}</td></tr>`
            ).join('')}
            <tr class="subtotal-row"><td colspan="3">Subtotal Plomería Base</td><td class="text-right">$ ${basePlumbingCosts.toLocaleString('es-AR')}</td></tr>
          </tbody>
        </table>
      </div>
      ` : ''}

      ${showMaterialsToClient && includeExtras && extraPlumbingItems.length > 0 ? `
      <div class="section">
        <h2>Adicionales Hidráulicos</h2>
        <table class="budget-table">
          <thead>
            <tr><th>Item</th><th>Cantidad</th><th class="text-right">Precio Unit.</th><th class="text-right">Subtotal</th></tr>
          </thead>
          <tbody>
            ${extraPlumbingItems.map((item: any) =>
              `<tr><td>${getPlumbingItemName(item)}</td><td>${item.quantity}</td><td class="text-right">$ ${item.pricePerUnit.toLocaleString('es-AR')}</td><td class="text-right">$ ${(item.quantity * item.pricePerUnit).toLocaleString('es-AR')}</td></tr>`
            ).join('')}
            <tr class="subtotal-row"><td colspan="3">Subtotal Adicionales Hidráulicos</td><td class="text-right">$ ${extraPlumbingCosts.toLocaleString('es-AR')}</td></tr>
          </tbody>
        </table>
      </div>
      ` : ''}

      ${showMaterialsToClient && includeExtras && additionals?.length > 0 ? `
      <div class="section">
        <h2>Items Adicionales</h2>
        <table class="budget-table">
          <thead>
            <tr><th>Item</th><th>Cantidad</th><th class="text-right">Precio Unit.</th><th class="text-right">Subtotal</th></tr>
          </thead>
          <tbody>
            ${additionals.map((add: any) => {
              const name = getAdditionalName(add);
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
            <tr class="subtotal-row"><td colspan="3">Instalación base</td><td class="text-right">$ ${baseVisibleLaborCost.toLocaleString('es-AR')}</td></tr>
            ${includeExtras && exportInstallationProfile.includesHeating ? `<tr class="subtotal-row"><td colspan="3">Adicional instalación de calefacción</td><td class="text-right">$ ${heatingVisibleLaborCost.toLocaleString('es-AR')}</td></tr>` : ''}
            <tr class="subtotal-row"><td colspan="3">Total Mano de Obra</td><td class="text-right">$ ${visibleLaborCost.toLocaleString('es-AR')}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Alcance de Instalación</h2>
        <table class="budget-table">
          <thead>
            <tr><th>Concepto</th><th>Detalle</th></tr>
          </thead>
          <tbody>
            ${exportInstallationProfile.baseScope.map((item) => `<tr><td>Incluye</td><td>${item}</td></tr>`).join('')}
            ${includeExtras && exportInstallationProfile.includesHeating ? exportInstallationProfile.heatingExtras.map((item) => `<tr><td>Extra calefacción</td><td>${item}</td></tr>`).join('') : ''}
            ${visibleInstallationExclusions.map((item) => `<tr><td>No incluye</td><td>${item}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="cost-section">
          ${showMaterialsToClient ? `
          <div class="cost-row">
            <span class="cost-label">Total materiales</span>
            <span class="cost-value">$ ${visibleMaterialCost.toLocaleString('es-AR')}</span>
          </div>
          ` : ''}
          <div class="cost-row">
            <span class="cost-label">Total mano de obra</span>
            <span class="cost-value">$ ${visibleLaborCost.toLocaleString('es-AR')}</span>
          </div>
          ${showMaterialsToClient ? `
          <div class="cost-row" style="font-weight: 700;">
            <span class="cost-label">Inversión total del proyecto</span>
            <span class="cost-value">$ ${visibleGrandTotal.toLocaleString('es-AR')}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <div class="footer">
        <p><strong>Pool Installer</strong> | Presupuesto Detallado</p>
        <p>Generado: ${new Date().toLocaleDateString('es-AR')} | ID: ${getProjectCode(project)}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const generateCompleteReport = (templateSettings: ExportTemplateSettings = getTemplateSettings('complete')) => {
    const { grandTotal } = resolveCostOverrides(templateSettings);
    const conditions = getConditionsList(getTemplateSettings('client').conditions);
    const visibleInstallationExclusions = getVisibleInstallationExclusions(conditions);
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
    .timeline-item { padding: 15px 20px; background: #fafafa; border-left: 2px solid #d4d4d8; margin: 10px 0; }
    .timeline-date { font-size: 12px; color: #6b7280; font-weight: 500; }
    .timeline-content { font-size: 14px; color: #1f2937; margin-top: 5px; }
    .highlight-box { background: #fafafa; border: 1px solid #d4d4d8; padding: 20px; border-radius: 8px; margin: 20px 0; }
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
        <h3 style="color: #18181b; margin: 0 0 10px 0; font-size: 18px;">Resumen Ejecutivo</h3>
        <p style="font-size: 14px; line-height: 1.6; margin: 0;">
          Proyecto <strong>${project.name}</strong> para <strong>${project.clientName}</strong>.
          Piscina de ${project.poolPreset?.length}m x ${project.poolPreset?.width}m x ${effectiveProjectSpec.depthLabel}
          con capacidad de ${(effectiveProjectSpec.volume * 1000).toFixed(0)} litros.
          Inversión total: <strong style="color: #111111; font-size: 18px;">$${grandTotal.toLocaleString('es-AR')}</strong>
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
        <p>Generado: ${new Date().toLocaleDateString('es-AR')} | ID: ${getProjectCode(project)}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const generateOverview = (
    templateSettings: ExportTemplateSettings = getTemplateSettings('overview'),
    poolImageDataUrl?: string
  ) => {
    const sidewalkAreaM2 = calculatedSidewalkArea || project.sidewalkArea || 0;
    const headerSubtitle = templateSettings.subtitle || 'Vista General del Proyecto';
    const documentTitle = templateSettings.title || `Vista General - ${project.name}`;
    const logoDataUrl = getLogoForTemplate('overview');
    const overviewHydraulicSummary = hydraulicSummary;

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
    .project-badge {
      display: inline-flex;
      align-items: center;
      margin-top: 10px;
      padding: 6px 12px;
      border-radius: 999px;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
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
      padding: 12px 0;
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
    .scope-panel {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 16px 18px;
    }
    .scope-title {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .scope-value {
      font-size: 13px;
      color: #111827;
      font-weight: 600;
      line-height: 1.5;
    }
    .visual-panel {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 18px;
    }
    .visual-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 14px;
    }
    .visual-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }
    .visual-caption {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .visual-frame {
      background: linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
      border: 1px solid #dbeafe;
      border-radius: 8px;
      padding: 12px;
      min-height: 290px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .visual-frame img {
      max-width: 100%;
      max-height: 420px;
      height: auto;
      display: block;
      object-fit: contain;
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
        <div class="project-id">Proyecto: ${getProjectCode(project)}</div>
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
      <div class="project-badge">${installationTier}</div>
    </div>

    <!-- CONTENT -->
    <div class="content-wrapper">

      <!-- METRICS -->
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-value">${effectiveProjectSpec.length} × ${effectiveProjectSpec.width}</div>
          <div class="metric-label">Dimensiones (m)</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${effectiveProjectSpec.depthLabel}</div>
          <div class="metric-label">Profundidad</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${(effectiveProjectSpec.volume * 1000).toFixed(0)}</div>
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
              <span class="info-value">${effectiveProjectSpec.modelName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Forma</span>
              <span class="info-value">${effectiveProjectSpec.shapeLabel}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Volumen</span>
              <span class="info-value">${effectiveProjectSpec.volume.toFixed(2)} m³</span>
            </div>
            <div class="info-item">
              <span class="info-label">Espejo de Agua</span>
              <span class="info-value">${effectiveProjectSpec.waterMirrorArea.toFixed(2)} m²</span>
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
          ${equipmentRecommendation?.pump && equipmentRecommendation?.filter ? `
          <div class="equipment-grid">
            <div class="equipment-item">
              <div class="equipment-label">Bomba</div>
              <div class="equipment-name">${equipmentRecommendation.pump.name || 'Sin definir'}</div>
              <div class="equipment-spec">${equipmentRecommendation.pump.power || '-'} HP | ${equipmentRecommendation.pump.flowRate || '-'} m³/h</div>
            </div>
            <div class="equipment-item">
              <div class="equipment-label">Filtro</div>
              <div class="equipment-name">${equipmentRecommendation.filter.name || 'Sin definir'}</div>
              <div class="equipment-spec">${equipmentRecommendation.filter.capacity || '-'} m³/h</div>
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

      <div class="content-grid" style="flex: 0 0 auto;">
        <div class="scope-panel">
          <div class="scope-title">Instalación Base</div>
          <div class="scope-value">${[
            exportInstallationProfile.baseScope.join(', '),
            visibleInstallationExclusions.length > 0 ? visibleInstallationExclusions.join(', ') : '',
          ].filter(Boolean).join('. ')}.</div>
        </div>
        <div class="scope-panel">
          <div class="scope-title">Extras y Personalizaciones</div>
          <div class="scope-value">${extraPlumbingItems.length > 0 || summarizedAdditionalItems.length > 0
            ? [
                ...extraPlumbingItems.map((item: any) => `${getPlumbingItemName(item)} x${item.quantity}`),
                ...dedupeLabeledItems(overviewHydraulicSummary.added.items).map((item) => `${item.name} x${item.quantity}`),
              ].join(', ')
            : 'Sin extras cargados'}
          </div>
        </div>
      </div>

      ${poolImageDataUrl ? `
      <div class="visual-panel">
        <div class="visual-header">
          <div class="visual-title">Visualización del Proyecto</div>
          <div class="visual-caption">Planta con medidas y terminación</div>
        </div>
        <div class="visual-frame">
          <img src="${poolImageDataUrl}" alt="Visualización de la piscina con losetas y medidas" />
        </div>
      </div>
      ` : ''}

      <!-- ACCESSORIES -->
      <div class="info-panel">
        <div class="panel-title">Accesorios e Instalaciones</div>
        <div class="accessories-grid">
          <div class="accessory-box">
            <div class="accessory-count">${overviewHydraulicSummary.total.returns}</div>
            <div class="accessory-label">Retornos</div>
          </div>
          <div class="accessory-box">
            <div class="accessory-count">${overviewHydraulicSummary.total.skimmers}</div>
            <div class="accessory-label">Skimmers</div>
          </div>
          ${overviewHydraulicSummary.total.hydrojets > 0 ? `
          <div class="accessory-box">
            <div class="accessory-count">${overviewHydraulicSummary.total.hydrojets}</div>
            <div class="accessory-label">Hidrojets</div>
          </div>
          ` : ''}
          ${effectiveProjectSpec.lightingCount > 0 ? `
          <div class="accessory-box">
            <div class="accessory-count">${effectiveProjectSpec.lightingCount}</div>
            <div class="accessory-label">Luces LED</div>
          </div>
          ` : ''}
          ${effectiveProjectSpec.hasBottomDrain ? `
          <div class="accessory-box">
            <div class="accessory-count">1</div>
            <div class="accessory-label">Desagüe Fondo</div>
          </div>
          ` : ''}
          ${effectiveProjectSpec.hasVacuumIntake ? `
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

  const generateHydraulicReport = (
    templateSettings: ExportTemplateSettings = getTemplateSettings('hydraulic')
  ) => {
    const headerSubtitle = templateSettings.subtitle || 'Esquema técnico hidráulico';
    const documentTitle = templateSettings.title || `Hidráulica - ${project.name}`;
    const logoDataUrl = getLogoForTemplate('hydraulic');
    const hydraulicLayout = plumbingConfig?.hydraulicLayout || {
      referenceSide: 'north',
      points: [],
      equipmentWorkspaceLayout: undefined,
    };
    const distanceToEquipment = Number(plumbingConfig?.distanceToEquipment || 0);
    const pointRows = Array.isArray(hydraulicLayout.points)
      ? hydraulicLayout.points.map((point: any) => `
          <tr>
            <td>${point.label || point.kind || 'Punto'}</td>
            <td>${point.side || '-'}</td>
            <td>${Number(point.offsetMeters || 0).toFixed(2)} m</td>
            <td>${Number(point.depthMeters || 0).toFixed(2)} m</td>
          </tr>
        `).join('')
      : '';
    const poolLength = Number(project.poolPreset?.length || 8);
    const poolWidth = Number(project.poolPreset?.width || 4);
    const topViewSvg = (() => {
      const W = 1120;
      const H = 700;
      const PAD_X = 140;
      const PAD_Y = 90;
      const drawW = W - PAD_X * 2;
      const drawH = H - PAD_Y * 2;
      const scale = Math.min(drawW / Math.max(poolLength, 0.01), drawH / Math.max(poolWidth, 0.01));
      const poolW = poolLength * scale;
      const poolH = poolWidth * scale;
      const poolX = (W - poolW) / 2;
      const poolY = (H - poolH) / 2;
      const metersToSvg = (meters: number) => meters * scale;
      const oppositeSideDepth = Math.min(metersToSvg(1), poolW * 0.35);
      const oppositeSideHalfH = poolH / 2;
      const internalWallSpanMeters = 1;
      const internalWallXStart = poolX + poolW - oppositeSideDepth;
      const internalWallXEnd = poolX + poolW;
      const internalWallY = poolY + oppositeSideHalfH;
      const equipmentSide = String(hydraulicLayout.referenceSide || 'north') as 'north' | 'south' | 'east' | 'west';
      const equipmentSideSpan = equipmentSide === 'north' || equipmentSide === 'south' ? poolWidth : poolLength;
      const equipmentOffsetRatio = Math.min(1, Math.max(0, Number(hydraulicLayout.equipmentOffsetMeters || 0) / Math.max(equipmentSideSpan, 0.01)));
      const equipmentDistanceSvg = Math.max(metersToSvg(distanceToEquipment), metersToSvg(0.8));
      const equipmentSymbolRadius = Math.max(metersToSvg(0.48), 40);
      const colors: Record<string, string> = {
        skimmer: '#38bdf8',
        return: '#34d399',
        hydrojet: '#f59e0b',
        hydrojet_suction: '#f97316',
        vacuum: '#e879f9',
        bottom_drain: '#f87171',
      };
      const labels: Record<string, string> = {
        north: 'NORTE',
        south: 'SUR',
        east: 'ESTE',
        west: 'OESTE',
        internal_wall: 'PARED INTERNA',
      };
      const laneOrder: Record<string, number> = {
        skimmer: 0,
        return: 1,
        hydrojet: 2,
        hydrojet_suction: 3,
        vacuum: 4,
        bottom_drain: 5,
      };
      const equipment = equipmentSide === 'north'
        ? { x: poolX - equipmentDistanceSvg, y: poolY + poolH * equipmentOffsetRatio }
        : equipmentSide === 'south'
          ? { x: poolX + poolW + equipmentDistanceSvg, y: poolY + poolH * equipmentOffsetRatio }
          : equipmentSide === 'east'
            ? { x: poolX + poolW * equipmentOffsetRatio, y: poolY - equipmentDistanceSvg }
            : { x: poolX + poolW * equipmentOffsetRatio, y: poolY + poolH + equipmentDistanceSvg };

      const pointToSvg = (point: any) => {
        if (point.side === 'internal_wall') {
          const ratio = Math.min(1, Math.max(0, Number(point.offsetMeters || 0) / Math.max(internalWallSpanMeters, 0.01)));
          return {
            x: internalWallXEnd - oppositeSideDepth * ratio,
            y: internalWallY,
          };
        }

        const sideSpan = point.side === 'north' || point.side === 'south' ? poolWidth : poolLength;
        const ratio = Math.min(1, Math.max(0, Number(point.offsetMeters || 0) / Math.max(sideSpan, 0.01)));
        if (point.side === 'north') return { x: poolX, y: poolY + poolH * ratio };
        if (point.side === 'south') return { x: poolX + poolW, y: poolY + poolH * ratio };
        if (point.side === 'east') return { x: poolX + poolW * ratio, y: poolY };
        return { x: poolX + poolW * ratio, y: poolY + poolH };
      };

      const pointPipeRoute = (point: any) => {
        const pos = pointToSvg(point);
        const match = String(point.id || '').match(/-(\d+)$/);
        const sequence = match ? Number(match[1]) - 1 : 0;
        const laneMeters = 0.65 + (laneOrder[point.kind || 'return'] ?? 0) * 0.18 + sequence * 0.08;
        const outsideGap = Math.max(metersToSvg(laneMeters), 44);
        const outerLeft = poolX - outsideGap;
        const outerRight = poolX + poolW + outsideGap;
        const outerTop = poolY - outsideGap;
        const outerBottom = poolY + poolH + outsideGap;

        const exitPoint =
          point.side === 'north'
            ? { x: outerLeft, y: pos.y }
            : point.side === 'south'
              ? { x: outerRight, y: pos.y }
              : point.side === 'east'
                ? { x: pos.x, y: outerTop }
                : point.side === 'west'
                  ? { x: pos.x, y: outerBottom }
                  : { x: outerRight, y: pos.y };

        const route = [pos, exitPoint];

        if (point.side === 'internal_wall') {
          route.push({ x: outerRight, y: pos.y });
          route.push({ x: outerRight, y: equipment.y });
        } else if (
          (point.side === 'north' && equipmentSide === 'south') ||
          (point.side === 'south' && equipmentSide === 'north')
        ) {
          const useTop = ((pos.y + equipment.y) / 2) < (poolY + poolH / 2);
          const perimeterY = useTop ? outerTop : outerBottom;
          route.push({ x: exitPoint.x, y: perimeterY });
          route.push({ x: equipmentSide === 'north' ? outerLeft : outerRight, y: perimeterY });
          route.push({ x: equipmentSide === 'north' ? outerLeft : outerRight, y: equipment.y });
        } else if (
          (point.side === 'east' && equipmentSide === 'west') ||
          (point.side === 'west' && equipmentSide === 'east')
        ) {
          const useLeft = ((pos.x + equipment.x) / 2) < (poolX + poolW / 2);
          const perimeterX = useLeft ? outerLeft : outerRight;
          route.push({ x: perimeterX, y: exitPoint.y });
          route.push({ x: perimeterX, y: equipmentSide === 'east' ? outerTop : outerBottom });
          route.push({ x: equipment.x, y: equipmentSide === 'east' ? outerTop : outerBottom });
        } else if (point.side !== equipmentSide) {
          if (
            (point.side === 'east' && equipmentSide === 'north') ||
            (point.side === 'north' && equipmentSide === 'east')
          ) {
            route.push({ x: outerLeft, y: outerTop });
          } else if (
            (point.side === 'east' && equipmentSide === 'south') ||
            (point.side === 'south' && equipmentSide === 'east')
          ) {
            route.push({ x: outerRight, y: outerTop });
          } else if (
            (point.side === 'west' && equipmentSide === 'north') ||
            (point.side === 'north' && equipmentSide === 'west')
          ) {
            route.push({ x: outerLeft, y: outerBottom });
          } else if (
            (point.side === 'west' && equipmentSide === 'south') ||
            (point.side === 'south' && equipmentSide === 'west')
          ) {
            route.push({ x: outerRight, y: outerBottom });
          }
        }

        if (equipmentSide === 'north' || equipmentSide === 'south') {
          route.push({ x: equipmentSide === 'north' ? outerLeft : outerRight, y: equipment.y });
        } else {
          route.push({ x: equipment.x, y: equipmentSide === 'east' ? outerTop : outerBottom });
        }

        route.push(equipment);
        return route;
      };

      const collectorRouteToEquipment = (start: { x: number; y: number }, kind: 'return' | 'hydrojet') => {
        const laneMeters = kind === 'hydrojet' ? 1.45 : 1.05;
        const outsideGap = Math.max(metersToSvg(laneMeters), kind === 'hydrojet' ? 74 : 58);
        const outerLeft = poolX - outsideGap;
        const outerRight = poolX + poolW + outsideGap;
        const outerTop = poolY - outsideGap;
        const outerBottom = poolY + poolH + outsideGap;
        const route = [start];

        if (equipmentSide === 'south') {
          route.push({ x: Math.max(start.x, outerRight), y: start.y });
          route.push({ x: Math.max(start.x, outerRight), y: equipment.y });
        } else if (equipmentSide === 'north') {
          const perimeterY = start.y <= poolY + poolH / 2 ? outerTop : outerBottom;
          route.push({ x: Math.max(start.x, outerRight), y: perimeterY });
          route.push({ x: outerLeft, y: perimeterY });
          route.push({ x: outerLeft, y: equipment.y });
        } else if (equipmentSide === 'east') {
          route.push({ x: start.x, y: outerTop });
          route.push({ x: equipment.x, y: outerTop });
        } else {
          route.push({ x: start.x, y: outerBottom });
          route.push({ x: equipment.x, y: outerBottom });
        }

        route.push(equipment);
        return route;
      };

      const points = Array.isArray(hydraulicLayout.points) ? hydraulicLayout.points : [];
      const returnPoints = points.filter((point: any) => point.kind === 'return').sort((a: any, b: any) => a.offsetMeters - b.offsetMeters);
      const returnCollectorGap = Math.max(metersToSvg(1.05), 58);
      const returnCollectorX = poolX + poolW + returnCollectorGap;
      const returnCollectorNodes = returnPoints.map((point: any) => ({ point, pos: pointToSvg(point) }));
      const returnCollectorAnchor =
        returnCollectorNodes.find(({ point }: any) => point.id === 'return-4') ||
        returnCollectorNodes[Math.min(3, Math.max(returnCollectorNodes.length - 1, 0))] ||
        null;
      const returnCollectorStartY = returnCollectorNodes.length > 0 ? Math.min(...returnCollectorNodes.map(({ pos }: any) => pos.y)) : null;
      const returnCollectorEndY = returnCollectorNodes.length > 0 ? Math.max(...returnCollectorNodes.map(({ pos }: any) => pos.y)) : null;
      const returnCollectorRoute = returnCollectorAnchor
        ? collectorRouteToEquipment({ x: returnCollectorX, y: returnCollectorAnchor.pos.y }, 'return')
        : [];

      const hydrojetPoints = points.filter((point: any) => point.kind === 'hydrojet').sort((a: any, b: any) => a.offsetMeters - b.offsetMeters);
      const hydrojetCollectorGap = Math.max(metersToSvg(1.45), 74);
      const hydrojetCollectorX = poolX + poolW + hydrojetCollectorGap;
      const hydrojetCollectorNodes = hydrojetPoints.map((point: any) => ({ point, pos: pointToSvg(point) }));
      const hydrojetCollectorAnchor =
        hydrojetCollectorNodes.find(({ point }: any) => point.id === 'hydrojet-4') ||
        hydrojetCollectorNodes[Math.min(3, Math.max(hydrojetCollectorNodes.length - 1, 0))] ||
        null;
      const hydrojetCollectorStartY = hydrojetCollectorNodes.length > 0 ? Math.min(...hydrojetCollectorNodes.map(({ pos }: any) => pos.y)) : null;
      const hydrojetCollectorEndY = hydrojetCollectorNodes.length > 0 ? Math.max(...hydrojetCollectorNodes.map(({ pos }: any) => pos.y)) : null;
      const hydrojetCollectorRoute = hydrojetCollectorAnchor
        ? collectorRouteToEquipment({ x: hydrojetCollectorX, y: hydrojetCollectorAnchor.pos.y }, 'hydrojet')
        : [];

      const returnCollectorSvg = returnCollectorStartY !== null && returnCollectorEndY !== null ? `
        <g>
          ${returnCollectorNodes.map(({ point, pos }: any) => (
            returnCollectorAnchor?.point.id === point.id ? '' : `
              <line
                x1="${pos.x}"
                y1="${pos.y}"
                x2="${returnCollectorX}"
                y2="${pos.y}"
                stroke="${colors.return}"
                stroke-opacity="0.5"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            `
          )).join('')}
          <line x1="${returnCollectorX}" y1="${returnCollectorStartY}" x2="${returnCollectorX}" y2="${returnCollectorEndY}" stroke="${colors.return}" stroke-opacity="0.85" stroke-width="2.4" stroke-linecap="round" />
          ${returnCollectorAnchor ? `<line x1="${returnCollectorAnchor.pos.x}" y1="${returnCollectorAnchor.pos.y}" x2="${returnCollectorX}" y2="${returnCollectorAnchor.pos.y}" stroke="${colors.return}" stroke-opacity="1" stroke-width="2.8" stroke-linecap="round" />` : ''}
          <polyline points="${returnCollectorRoute.map((node) => `${node.x},${node.y}`).join(' ')}" fill="none" stroke="${colors.return}" stroke-opacity="0.85" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />
        </g>
      ` : '';

      const hydrojetCollectorSvg = hydrojetCollectorStartY !== null && hydrojetCollectorEndY !== null ? `
        <g>
          ${hydrojetCollectorNodes.map(({ point, pos }: any) => (
            hydrojetCollectorAnchor?.point.id === point.id ? '' : `
              <line
                x1="${pos.x}"
                y1="${pos.y}"
                x2="${hydrojetCollectorX}"
                y2="${pos.y}"
                stroke="${colors.hydrojet}"
                stroke-opacity="0.5"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            `
          )).join('')}
          <line x1="${hydrojetCollectorX}" y1="${hydrojetCollectorStartY}" x2="${hydrojetCollectorX}" y2="${hydrojetCollectorEndY}" stroke="${colors.hydrojet}" stroke-opacity="0.85" stroke-width="2.4" stroke-linecap="round" />
          ${hydrojetCollectorAnchor ? `<line x1="${hydrojetCollectorAnchor.pos.x}" y1="${hydrojetCollectorAnchor.pos.y}" x2="${hydrojetCollectorX}" y2="${hydrojetCollectorAnchor.pos.y}" stroke="${colors.hydrojet}" stroke-opacity="1" stroke-width="2.8" stroke-linecap="round" />` : ''}
          <polyline points="${hydrojetCollectorRoute.map((node) => `${node.x},${node.y}`).join(' ')}" fill="none" stroke="${colors.hydrojet}" stroke-opacity="0.85" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />
        </g>
      ` : '';

      const pointSvg = points.map((point: any) => {
        const pos = pointToSvg(point);
        const route = pointPipeRoute(point);
        const color = colors[point.kind || 'return'] || '#334155';
        const drawRoute = point.kind !== 'return' && point.kind !== 'hydrojet';
        return `
          <g>
            ${drawRoute ? `<polyline points="${route.map((node) => `${node.x},${node.y}`).join(' ')}" fill="none" stroke="${color}" stroke-opacity="0.42" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" />` : ''}
            <circle cx="${pos.x}" cy="${pos.y}" r="9" fill="transparent" stroke="${color}" stroke-opacity="0.28" stroke-width="1.5" />
            <circle cx="${pos.x}" cy="${pos.y}" r="5" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
          </g>
        `;
      }).join('');

      return `
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vista superior hidráulica">
          <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>
          <rect x="${poolX}" y="${poolY}" width="${poolW}" height="${poolH}" fill="#dbeafe" stroke="#0f172a" stroke-width="2.2"/>
          <rect x="${poolX + 14}" y="${poolY + 14}" width="${poolW - 28}" height="${poolH - 28}" fill="none" stroke="#93c5fd" stroke-width="1.2"/>
          <text x="${W / 2}" y="${poolY - 28}" text-anchor="middle" fill="#334155" font-size="12" font-weight="700">${labels.east}</text>
          <text x="${W / 2}" y="${poolY + poolH + 42}" text-anchor="middle" fill="#334155" font-size="12" font-weight="700">${labels.west}</text>
          <text x="${poolX - 56}" y="${H / 2}" text-anchor="middle" fill="#334155" font-size="12" font-weight="700" transform="rotate(-90 ${poolX - 56} ${H / 2})">${labels.north}</text>
          <text x="${poolX + poolW + 56}" y="${H / 2}" text-anchor="middle" fill="#334155" font-size="12" font-weight="700" transform="rotate(90 ${poolX + poolW + 56} ${H / 2})">${labels.south}</text>
          <rect x="${poolX + poolW - oppositeSideDepth}" y="${poolY + oppositeSideHalfH}" width="${oppositeSideDepth}" height="${oppositeSideHalfH}" fill="rgba(8,145,178,0.12)" stroke="rgba(14,116,144,0.45)" stroke-width="1.3"/>
          <text x="${poolX + poolW - oppositeSideDepth + 12}" y="${poolY + oppositeSideHalfH + 24}" fill="#155e75" font-size="12" font-weight="700">PLAYA HUMEDA</text>
          <rect x="${poolX + poolW - oppositeSideDepth}" y="${poolY}" width="${oppositeSideDepth}" height="${oppositeSideHalfH}" fill="rgba(240,249,255,0.16)" stroke="rgba(125,211,252,0.5)" stroke-width="1.5"/>
          <line x1="${internalWallXStart}" y1="${internalWallY}" x2="${internalWallXEnd}" y2="${internalWallY}" stroke="rgba(14,116,144,0.95)" stroke-width="2.4" stroke-dasharray="10 6"/>
          ${[0, 1, 2].map((step) => {
            const treadInset = (2 - step) * 14;
            const stepX = poolX + poolW - oppositeSideDepth + treadInset;
            const stepW = oppositeSideDepth - treadInset;
            return `
              <g>
                <rect x="${stepX}" y="${poolY}" width="${stepW}" height="${oppositeSideHalfH}" rx="2" fill="rgba(255,255,255,0.16)" stroke="rgba(14,116,144,0.55)" stroke-width="1.6"/>
                <line x1="${stepX}" y1="${poolY}" x2="${stepX}" y2="${poolY + oppositeSideHalfH}" stroke="rgba(14,116,144,0.82)" stroke-width="1.8"/>
                <rect x="${stepX}" y="${poolY}" width="5" height="${oppositeSideHalfH}" fill="rgba(8,47,73,0.22)"/>
              </g>
            `;
          }).join('')}
          <text x="${poolX + poolW - oppositeSideDepth + 12}" y="${poolY + 24}" fill="#155e75" font-size="12" font-weight="700">ESCALERAS</text>
          <line x1="${equipmentSide === 'north' ? poolX : equipmentSide === 'south' ? poolX + poolW : equipment.x}"
            y1="${equipmentSide === 'east' ? poolY : equipmentSide === 'west' ? poolY + poolH : equipment.y}"
            x2="${equipment.x}"
            y2="${equipment.y}"
            stroke="#fbbf24"
            stroke-width="4"
            stroke-dasharray="10 8"
            stroke-linecap="round"/>
          ${returnCollectorSvg}
          ${hydrojetCollectorSvg}
          ${pointSvg}
          <g>
            <circle cx="${equipment.x}" cy="${equipment.y}" r="${equipmentSymbolRadius + 10}" fill="rgba(245,158,11,0.08)" stroke="rgba(217,119,6,0.22)" stroke-width="2"/>
            <circle cx="${equipment.x}" cy="${equipment.y}" r="${equipmentSymbolRadius}" fill="#ffffff" stroke="rgba(217,119,6,0.65)" stroke-width="2.4"/>
            <polygon points="${equipment.x - equipmentSymbolRadius * 0.42},${equipment.y + equipmentSymbolRadius * 0.52} ${equipment.x - equipmentSymbolRadius * 0.42},${equipment.y - equipmentSymbolRadius * 0.52} ${equipment.x + equipmentSymbolRadius * 0.62},${equipment.y}" fill="rgba(217,119,6,0.92)" stroke="#78350f" stroke-width="1.4" stroke-linejoin="round"/>
          </g>
          <text x="${equipment.x}" y="${equipment.y + equipmentSymbolRadius + 18}" fill="#0f172a" font-size="14" font-weight="700" text-anchor="middle">Equipo</text>
          <text x="${equipment.x}" y="${equipment.y + equipmentSymbolRadius + 36}" fill="#475569" font-size="11" text-anchor="middle">${labels[equipmentSide]} · ${distanceToEquipment.toFixed(1)} m</text>
          <text x="${poolX + 18}" y="${poolY + 26}" fill="#0f172a" font-size="13" font-weight="700">${poolLength.toFixed(2)} m x ${poolWidth.toFixed(2)} m</text>
        </svg>
      `;
    })();
    const equipmentSvg = renderToStaticMarkup(
      <EquipmentWorkspacePreviewShared
        project={project}
        hydraulicSummary={hydraulicSummary}
        hydraulicLayout={hydraulicLayout}
        distanceToEquipment={distanceToEquipment}
      />
    );

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${documentTitle}</title>
  <style>
    ${getCommonStyles()}
    body { background: #eceff1; color: #18181b; }
    .container { width: 210mm; max-width: 210mm; border-radius: 0; box-shadow: 0 0 0 1px #d4d4d8, 0 18px 40px rgba(15, 23, 42, 0.08); }
    .content.hyd-wrap {
      display: grid;
      gap: 18px;
      background: #f5f5f4;
      padding: 22px;
    }
    .section {
      margin: 0;
      padding: 18px 20px;
      background: white;
      border: 1px solid #d4d4d8;
      border-radius: 0;
      box-shadow: inset 0 0 0 1px #f5f5f5;
    }
    .section h2 {
      margin: 0 0 14px;
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #27272a;
      border-bottom: 1px solid #d4d4d8;
      padding-bottom: 10px;
    }
    .hyd-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .hyd-card {
      padding: 14px;
      background: linear-gradient(180deg, #fafaf9 0%, #f5f5f4 100%);
      border: 1px solid #d6d3d1;
      border-radius: 0;
      min-height: 92px;
    }
    .hyd-label { font-size: 10px; color: #71717a; text-transform: uppercase; font-weight: 700; letter-spacing: 0.08em; }
    .hyd-value { font-size: 24px; font-weight: 800; color: #18181b; margin-top: 8px; line-height: 1; }
    .hyd-detail { font-size: 12px; color: #52525b; margin-top: 8px; }
    .hyd-diagram {
      border: 1px solid #a1a1aa;
      border-radius: 0;
      overflow: hidden;
      background: #020617;
      padding: 8px;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
    }
    .hyd-diagram svg { display: block; width: 100%; height: auto; }
    .hyd-top-view {
      border: 1px solid #a1a1aa;
      border-radius: 0;
      overflow: hidden;
      background: #ffffff;
      padding: 10px;
    }
    .hyd-top-view svg { display: block; width: 100%; height: auto; }
    .hyd-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .hyd-table th {
      background: #27272a;
      color: white;
      padding: 10px 12px;
      text-align: left;
      font-size: 11px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border: 1px solid #3f3f46;
    }
    .hyd-table td {
      padding: 10px 12px;
      border: 1px solid #d4d4d8;
      font-size: 12px;
      color: #27272a;
      background: #fff;
    }
    .hyd-table tbody tr:nth-child(even) td { background: #fafaf9; }
    .footer {
      margin-top: 0;
      padding: 14px 20px 0;
      border-top: 1px solid #d4d4d8;
      text-align: left;
      font-size: 11px;
      color: #71717a;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
      .content.hyd-wrap { background: white; padding: 12mm; }
      .section { break-inside: avoid; }
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
    <div class="content hyd-wrap">
      <div class="section">
        <h2>Resumen Hidráulico</h2>
        <div class="hyd-grid">
          <div class="hyd-card"><div class="hyd-label">Skimmers</div><div class="hyd-value">${hydraulicSummary.total.skimmers}</div><div class="hyd-detail">Base ${hydraulicSummary.base.skimmers}</div></div>
          <div class="hyd-card"><div class="hyd-label">Retornos</div><div class="hyd-value">${hydraulicSummary.total.returns}</div><div class="hyd-detail">Base ${hydraulicSummary.base.returns}</div></div>
          <div class="hyd-card"><div class="hyd-label">Hidrojets</div><div class="hyd-value">${hydraulicSummary.total.hydrojets}</div><div class="hyd-detail">Extra hidráulico</div></div>
          <div class="hyd-card"><div class="hyd-label">Cabecera</div><div class="hyd-value">${String(hydraulicLayout.referenceSide || 'north').toUpperCase()}</div><div class="hyd-detail">Distancia ${distanceToEquipment.toFixed(2)} m</div></div>
        </div>
      </div>
      <div class="section">
        <h2>Vista Superior Hidráulica</h2>
        <div class="hyd-top-view">${topViewSvg}</div>
      </div>
      <div class="section">
        <h2>Flujo de sentido hidráulico</h2>
        <div class="hyd-diagram">${equipmentSvg}</div>
      </div>
      <div class="section">
        <h2>Puntos Configurados</h2>
        <table class="hyd-table">
          <thead>
            <tr>
              <th>Punto</th>
              <th>Lateral</th>
              <th>Offset</th>
              <th>Profundidad</th>
            </tr>
          </thead>
          <tbody>
            ${pointRows || '<tr><td colspan="4">Sin puntos hidráulicos configurados.</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="footer">
        <p><strong>Pool Installer</strong> | Esquema Hidráulico</p>
        <p>Documento generado el ${new Date().toLocaleDateString('es-AR')} | Código: ${getProjectCode(project)}</p>
      </div>
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
    .header { background: #111111; color: white; padding: 30px 40px; text-align: center; }
    .logo { font-size: 28px; font-weight: 700; letter-spacing: 1px; margin-bottom: 10px; }
    .subtitle { font-size: 16px; opacity: 0.9; }
    .date { font-size: 13px; opacity: 0.7; margin-top: 10px; }
    .content { padding: 30px 40px; }
    .section { margin: 30px 0; page-break-inside: avoid; }
    .section h2 { color: #111111; border-bottom: 1px solid #d4d4d8; padding-bottom: 10px; margin-bottom: 20px; font-size: 20px; font-weight: 600; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .info-item { padding: 15px; background: #fafafa; border-left: 2px solid #d4d4d8; }
    .info-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; font-weight: 500; }
    .info-value { font-size: 15px; font-weight: 600; color: #1f2937; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; }
    @media print { body { background: white; padding: 0; } .container { box-shadow: none; } }
  `;

  const generateWhatsAppMessage = (template: ExportTemplate, sections = selectedSections): string => {
    const materials = project.materials as any;
    const plumbingConfig = project.plumbingConfig as any;
    const clientTemplateSettings = getTemplateSettings('client');
    const clientPricingMode = clientTemplateSettings.clientPricingMode || 'labor_only';
    const installationMode = clientTemplateSettings.installationMode || 'with_extras';
    const includeExtras = installationMode === 'with_extras';
    const showMaterialsToClient = clientPricingMode === 'full';
    const {
      additionals,
      additionalsCosts,
      plumbingCosts,
      electricalCosts,
      baseMaterialCost,
    } = calculateProjectFinancials(project);
    const visibleAdditionals = includeExtras ? additionals : [];
    const visibleExtraPlumbingItems = includeExtras ? extraPlumbingItems : [];
    const visibleAdditionalsMaterialCost = includeExtras ? additionalsCosts.materialCost : 0;
    const visibleMaterialCost = baseMaterialCost + visibleAdditionalsMaterialCost;
    const clientBaseLaborCost = exportInstallationProfile.baseLaborCost;
    const visibleHeatingLaborCost = includeExtras ? exportInstallationProfile.heatingLaborCost : 0;
    const visibleLaborCost = clientBaseLaborCost + visibleHeatingLaborCost;
    const visibleGrandTotal = visibleMaterialCost + visibleLaborCost;
    const visibleInstallationTier = includeExtras ? installationTier : 'Instalación base';
    const conditions = getConditionsList(clientTemplateSettings.conditions);
    const visibleInstallationExclusions = getVisibleInstallationExclusions(conditions);

    let message = '';

    if (sections.header) {
      message += `*PRESUPUESTO - INSTALACION DE PISCINA*\n\n*Proyecto:* ${project.name}\n*Cliente:* ${project.clientName}\n*Ubicacion:* ${project.location || 'A definir'}`;
    }

    if (sections.characteristics) {
      message += `${message ? '\n\n' : ''}*CARACTERISTICAS DE LA PISCINA*\n- Modelo: ${effectiveProjectSpec.modelName}\n- Dimensiones: ${project.poolPreset?.length || 0}m x ${project.poolPreset?.width || 0}m x ${effectiveProjectSpec.depthLabel}\n- Volumen: ${effectiveProjectSpec.volume.toFixed(2)} m³ (${(effectiveProjectSpec.volume * 1000).toFixed(0)} litros)\n- Forma: ${project.poolPreset?.shape || 'N/A'}`;
    }

    if (sections.includes) {
      const baseScopeLines = exportInstallationProfile.baseScope.map((item) => `- ${item}`).join('\n');
      const heatingLines = exportInstallationProfile.includesHeating && includeExtras
        ? `\n- Adicional instalacion de calefaccion: $${exportInstallationProfile.heatingLaborCost.toLocaleString('es-AR')}\n${exportInstallationProfile.heatingExtras.map((item) => `- ${item}`).join('\n')}`
        : '';
      const exclusionsLines = visibleInstallationExclusions.map((item) => `- ${item}`).join('\n');
      message += `${message ? '\n\n' : ''}*INCLUYE:*\n- ${includeExtras ? `${installationTier} recomendada` : visibleInstallationTier}\n${baseScopeLines}${heatingLines}\n${exclusionsLines}\n${visibleExtraPlumbingItems.length > 0 ? `- Accesorios extra de instalacion: ${visibleExtraPlumbingItems.map((item: any) => `${getPlumbingItemName(item)} x${item.quantity}`).join(', ')}\n` : ''}${visibleAdditionals.length > 0 ? `- Equipos/agregados adicionales: ${visibleAdditionals.map((add: any) => `${getAdditionalName(add)} x${add.newQuantity}`).join(', ')}\n` : ''}${showMaterialsToClient ? '- Materiales de construccion' : '- Materiales y equipos fuera del valor comercial informado'}`;
    }

    if (sections.additionals && visibleAdditionals.length > 0) {
      message += `${message ? '\n\n' : ''}*ADICIONALES INCLUIDOS:*\n`;
      visibleAdditionals.forEach((add: any) => {
        const name = getAdditionalName(add);
        message += `- ${name} (${add.newQuantity} ${add.customUnit || 'unidades'})\n`;
      });
    }

    if (sections.costs) {
      if (showMaterialsToClient) {
        message += `${message ? '\n\n' : ''}*INVERSION TOTAL*\n- Materiales base: $${project.materialCost.toLocaleString('es-AR')}`;

        if (plumbingCosts > 0) {
          message += `\n- Plomeria: $${plumbingCosts.toLocaleString('es-AR')}`;
        }

        if (electricalCosts > 0) {
          message += `\n- Electrica: $${electricalCosts.toLocaleString('es-AR')}`;
        }

        if (visibleAdditionalsMaterialCost > 0) {
          message += `\n- Adicionales: $${visibleAdditionalsMaterialCost.toLocaleString('es-AR')}`;
        }

        message += `\n- Total materiales: $${visibleMaterialCost.toLocaleString('es-AR')}`;
        message += `\n\n- Mano de obra: $${visibleLaborCost.toLocaleString('es-AR')}`;
        message += `\n\n*TOTAL PROYECTO: $${visibleGrandTotal.toLocaleString('es-AR')}*`;
      } else {
        message += `${message ? '\n\n' : ''}*MANO DE OBRA*\n- Instalacion base: $${clientBaseLaborCost.toLocaleString('es-AR')}`;

        if (visibleHeatingLaborCost > 0) {
          message += `\n- Instalacion de calefaccion: $${visibleHeatingLaborCost.toLocaleString('es-AR')}`;
        }

        message += `\n- Total mano de obra: $${visibleLaborCost.toLocaleString('es-AR')}`;
      }
    }

    if (sections.conditions) {
      message += `${message ? '\n\n' : ''}*CONDICIONES:*\n${conditions.map((item) => `- ${item}`).join('\n')}`;
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
    extras: { cadImageDataUrl?: string; poolImageDataUrl?: string } = {}
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
        return generateOverview(templateSettings, extras.poolImageDataUrl);
      case 'hydraulic':
        return generateHydraulicReport(templateSettings);
      default:
        return generateClientBudget(templateSettings);
    }
  };

  const extractBodyContent = (html: string) =>
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.trim() || html;

  const createUnifiedPackageDocument = (parts: Array<{ title: string; content: string }>) => {
    const logoDataUrl = getLogoForTemplate('complete');
    const renderedSections = parts
      .filter((part) => part.content.trim().length > 0)
      .map((part) => `
        <section class="merged-section">
          <div class="merged-section-title">${part.title}</div>
          <div class="merged-section-body">${extractBodyContent(part.content)}</div>
        </section>
      `)
      .join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Proyecto ${project.name} ${project.clientName}</title>
  <style>
    ${getCommonStyles()}
    @page { size: A4; margin: 10mm; }
    body { background: #f3f4f6; padding: 16px; }
    .merged-cover { width: min(100%, 210mm); margin: 0 auto 16px; background: #111111; color: white; padding: 20px 24px; border-radius: 18px; }
    .merged-title { font-size: 30px; font-weight: 800; margin-bottom: 8px; }
    .merged-subtitle { font-size: 15px; opacity: 0.82; }
    .merged-meta { margin-top: 12px; font-size: 13px; opacity: 0.7; }
    .merged-index { width: min(100%, 210mm); margin: 0 auto 12px; background: white; border: 1px solid #e5e7eb; border-radius: 18px; padding: 16px 24px; box-shadow: 0 6px 22px rgba(15, 23, 42, 0.06); }
    .merged-index-title { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #71717a; margin-bottom: 10px; }
    .merged-index-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; }
    .merged-index-item { font-size: 13px; color: #18181b; }
    .merged-section { width: min(100%, 210mm); margin: 0 auto 16px; background: white; border-radius: 18px; overflow: hidden; box-shadow: 0 6px 22px rgba(15, 23, 42, 0.08); page-break-before: always; }
    .merged-section:first-of-type { page-break-before: auto; }
    .merged-section-title { background: #f4f4f5; color: #18181b; padding: 12px 24px; font-size: 15px; font-weight: 700; letter-spacing: 0.01em; border-bottom: 1px solid #e5e7eb; }
    .merged-section-body { padding: 0; }
    .merged-section-body .container,
    .merged-section-body .page {
      width: 100% !important;
      max-width: 100% !important;
      min-height: auto !important;
      height: auto !important;
      margin: 0 !important;
      box-shadow: none !important;
    }
    .merged-section-body .page {
      padding: 10mm !important;
    }
    .merged-section-body .content,
    .merged-section-body .content-wrapper {
      padding: 24px !important;
      gap: 16px !important;
    }
    .merged-section-body .header,
    .merged-section-body .project-header {
      display: none !important;
    }
    .merged-section-body .footer { padding-bottom: 24px; }
    .merged-section-body img,
    .merged-section-body svg,
    .merged-section-body canvas {
      max-width: 100% !important;
      height: auto !important;
    }
    .merged-section-body .content-grid,
    .merged-section-body .info-grid,
    .merged-section-body .features-list {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }
    .merged-section-body .spec-grid,
    .merged-section-body .hydraulic-grid,
    .merged-section-body .metrics-row,
    .merged-section-body .summary-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 12px !important;
    }
    .merged-section-body .equipment-grid {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
    }
    .merged-section-body .accessories-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 10px !important;
    }
    .merged-section-body .visual-panel,
    .merged-section-body .scope-panel,
    .merged-section-body .info-panel,
    .merged-section-body .section,
    .merged-section-body .cad-wrap {
      page-break-inside: avoid;
    }
    .merged-section-body .visual-frame,
    .merged-section-body .cad-wrap {
      min-height: 0 !important;
      padding: 10px !important;
      overflow: hidden !important;
    }
    .merged-section-body .visual-frame img {
      max-height: 150mm !important;
      object-fit: contain !important;
    }
    .merged-section-body .cad-wrap img {
      width: 100% !important;
      max-height: 170mm !important;
      object-fit: contain !important;
    }
    .merged-section-body .project-name,
    .merged-section-body .summary-value,
    .merged-section-body .scope-value,
    .merged-section-body .equipment-name,
    .merged-section-body .material-name {
      overflow-wrap: anywhere;
    }
    .merged-section-body table {
      width: 100% !important;
      table-layout: fixed;
    }
    .merged-section-body th,
    .merged-section-body td {
      word-break: break-word;
    }
    @media (max-width: 900px) {
      .merged-cover,
      .merged-index,
      .merged-section {
        width: 100%;
      }
      .merged-index-list {
        grid-template-columns: 1fr;
      }
      .merged-section-body .spec-grid,
      .merged-section-body .hydraulic-grid,
      .merged-section-body .metrics-row,
      .merged-section-body .summary-strip,
      .merged-section-body .accessories-grid {
        grid-template-columns: 1fr !important;
      }
    }
    @media print {
      body { background: white; padding: 0; }
      .merged-cover,
      .merged-index { box-shadow: none; border-radius: 0; margin-bottom: 0; }
      .merged-section { box-shadow: none; border-radius: 0; margin-bottom: 0; }
      .merged-section-body .page { padding: 0 !important; }
      .merged-section-body .content,
      .merged-section-body .content-wrapper { padding: 20px !important; }
    }
  </style>
</head>
<body>
  <div class="merged-cover">
    <div class="logo">${logoDataUrl ? `<img src="${logoDataUrl}" alt="Domotics IoT Solutions" style="height:34px;width:auto;vertical-align:middle;"/>` : 'POOL CALCULATOR'}</div>
    <div class="merged-title">Proyecto ${project.name} ${project.clientName}</div>
    <div class="merged-subtitle">Propuesta comercial, especificaciones tecnicas y listado de materiales</div>
    <div class="merged-meta">Código ${getProjectCode(project)} · ${new Date().toLocaleDateString('es-AR')}</div>
  </div>
  <div class="merged-index">
    <div class="merged-index-title">Indice del expediente</div>
    <div class="merged-index-list">
      ${parts
        .filter((part) => part.content.trim().length > 0)
        .map((part, index) => `<div class="merged-index-item">${index + 1}. ${part.title}</div>`)
        .join('')}
    </div>
  </div>
  ${renderedSections}
</body>
</html>`;
  };

  const getPoolImageDataUrl = async () => {
    const nextFrame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));
    let poolImageDataUrl = '';

    if (poolCanvasRef.current) {
      await nextFrame();
      await nextFrame();
      try {
        poolImageDataUrl = poolCanvasRef.current.toDataURL('image/png');
      } catch (error) {
        console.warn('No se pudo capturar la vista de la piscina:', error);
      }
    }

    return poolImageDataUrl;
  };

  const getProfessionalImageDataUrl = async (settings: ExportSettings = exportSettings) => {
    const nextFrame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));
    let cadImageDataUrl = '';
    const templateSettings = getTemplateSettings('professional', settings);
    const canvasRef = templateSettings.drawingView === 'planta' ? poolCanvasRef : cadCanvasRef;

    if (canvasRef.current) {
      await nextFrame();
      try {
        cadImageDataUrl = canvasRef.current.toDataURL('image/png');
      } catch (error) {
        console.warn('No se pudo capturar el plano CAD:', error);
      }
    }

    if (cadCanvasRef.current && !cadImageDataUrl) {
      await nextFrame();
      try {
        cadImageDataUrl = cadCanvasRef.current.toDataURL('image/png');
      } catch (error) {
        console.warn('No se pudo capturar el plano CAD:', error);
      }
    }

    return cadImageDataUrl;
  };

  const handleGenerateProjectPackage = async () => {
    try {
      setGeneratingPackage(true);
      const cadImageDataUrl = await getProfessionalImageDataUrl(exportSettings);
      const poolImageDataUrl = await getPoolImageDataUrl();
      const packageSettings: ExportSettings = JSON.parse(JSON.stringify(exportSettings || { templates: {} }));
      const clientTemplate = getTemplateSettings('client', packageSettings);
      const hasRecommendedExtras = extraPlumbingItems.length > 0 || summarizedAdditionalItems.length > 0;
      const recommendedClientContent = getContentForTemplate('client', {
        ...packageSettings,
        templates: {
          ...packageSettings.templates,
          client: {
            ...clientTemplate,
            installationMode: hasRecommendedExtras ? 'with_extras' : 'basic',
            title: `${hasRecommendedExtras ? 'Propuesta Comercial Recomendada' : 'Propuesta Comercial Base'} - ${project.name}`,
          },
        },
      }, { cadImageDataUrl, poolImageDataUrl });
      const professionalContent = getContentForTemplate('professional', packageSettings, { cadImageDataUrl, poolImageDataUrl });
      const overviewContent = getContentForTemplate('overview', packageSettings, { cadImageDataUrl, poolImageDataUrl });
      const materialsContent = getContentForTemplate('materials', packageSettings, { cadImageDataUrl, poolImageDataUrl });
      const unifiedPackageContent = createUnifiedPackageDocument([
        { title: hasRecommendedExtras ? 'Propuesta Comercial Recomendada' : 'Propuesta Comercial Base', content: recommendedClientContent },
        { title: 'Especificaciones Técnicas', content: professionalContent },
        { title: 'Vista General', content: overviewContent },
        { title: 'Lista de Materiales', content: materialsContent },
      ]);

      const documents = [
        {
          fileName: '00-propuesta-comercial-base.html',
          content: getContentForTemplate('client', {
            ...packageSettings,
            templates: {
              ...packageSettings.templates,
              client: {
                ...clientTemplate,
                installationMode: 'basic',
                title: `Propuesta Comercial Base - ${project.name}`,
              },
            },
          }, { cadImageDataUrl, poolImageDataUrl }),
        },
        {
          fileName: `01-Proyecto ${project.name} ${project.clientName}.html`,
          content: unifiedPackageContent,
        },
        {
          fileName: '04-dossier-proyecto.html',
          content: getContentForTemplate('complete', packageSettings, { cadImageDataUrl, poolImageDataUrl }),
        },
        {
          fileName: '06-presupuesto-interno.html',
          content: getContentForTemplate('budget', {
            ...packageSettings,
            templates: {
              ...packageSettings.templates,
              budget: {
                ...getTemplateSettings('budget', packageSettings),
                clientPricingMode: 'full',
                title: `Presupuesto Interno - ${project.name}`,
              },
            },
          }, { cadImageDataUrl, poolImageDataUrl }),
        },
      ];

      await projectService.createProjectPackage(project.id, {
        documents,
        excelSections,
        metadata: {
          includedTemplates: documents.map((doc) => doc.fileName),
          projectName: project.name,
          clientName: project.clientName,
        },
      });

      alert('Expediente generado en el servidor.');
    } catch (error: any) {
      console.error('Error al generar expediente del proyecto:', error);
      alert(error?.response?.data?.error || 'No se pudo generar el expediente del proyecto');
    } finally {
      setGeneratingPackage(false);
    }
  };

  const handleDownloadProjectPackage = async () => {
    try {
      setDownloadingPackage(true);
      await projectService.downloadProjectPackage(project.id);
    } catch (error: any) {
      console.error('Error al descargar expediente del proyecto:', error);
      alert(error?.response?.data?.error || 'No se pudo descargar el expediente del proyecto');
    } finally {
      setDownloadingPackage(false);
    }
  };

  const handleExport = async (format: 'html', template: ExportTemplate) => {
    let cadImageDataUrl = '';
    let poolImageDataUrl = '';
    if (template === 'overview' || template === 'complete') {
      poolImageDataUrl = await getPoolImageDataUrl();
    }
    if (template === 'professional') {
      cadImageDataUrl = await getProfessionalImageDataUrl(exportSettings);
    }
    const content = getContentForTemplate(template, exportSettings, { cadImageDataUrl, poolImageDataUrl });
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
    let poolImageDataUrl = '';
    if (template === 'overview' || template === 'complete') {
      poolImageDataUrl = await getPoolImageDataUrl();
    }
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
    const html = getContentForTemplate(template, exportSettings, { cadImageDataUrl, poolImageDataUrl });
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

    const createPdfPageShell = (pageWidthPx: number, pagePaddingPx: number) => {
      const page = document.createElement('div');
      page.className = 'pdf-page-shell';
      page.style.width = `${pageWidthPx}px`;
      page.style.padding = '0';
      page.style.background = '#ffffff';
      page.style.color = '#111827';
      page.style.boxSizing = 'border-box';
      page.style.overflow = 'hidden';

      const frame = document.createElement('div');
      frame.className = 'pdf-page-frame';
      frame.style.background = '#ffffff';
      frame.style.border = '0';
      frame.style.borderRadius = '0';
      frame.style.boxShadow = 'none';
      frame.style.padding = `${pagePaddingPx}px`;
      frame.style.overflow = 'hidden';
      frame.style.boxSizing = 'border-box';

      const content = document.createElement('div');
      content.className = 'pdf-page-content';
      content.style.display = 'block';

      frame.appendChild(content);
      page.appendChild(frame);
      return page;
    };

    const getPdfPageContentTarget = (page: HTMLElement) =>
      (page.querySelector('.pdf-page-content') as HTMLElement | null) || page;

    const collectPdfBlocks = (root: HTMLElement) => {
      const container = root.querySelector('.container') as HTMLElement | null;
      if (!container) {
        return Array.from(root.children) as HTMLElement[];
      }

      const blocks: HTMLElement[] = [];
      const header = container.querySelector(':scope > .header') as HTMLElement | null;
      if (header) blocks.push(header);

      const content = (container.querySelector(':scope > .content') ||
        container.querySelector(':scope > .content-wrapper')) as HTMLElement | null;

      if (content) {
        const sectionChildren = Array.from(content.children).filter(
          (child): child is HTMLElement => child instanceof HTMLElement
        );
        if (sectionChildren.length > 0) {
          blocks.push(...sectionChildren);
        } else {
          blocks.push(content);
        }
      } else {
        blocks.push(
          ...Array.from(container.children).filter(
            (child): child is HTMLElement => child instanceof HTMLElement && child !== header
          )
        );
      }

      const footer = container.querySelector(':scope > .footer') as HTMLElement | null;
      if (footer) blocks.push(footer);

      return blocks.filter((block, index, list) => list.indexOf(block) === index);
    };

    const paginatePdfBlocks = async (
      root: HTMLElement,
      pageWidthPx: number,
      pagePaddingPx: number,
      maxPageHeightPx: number
    ) => {
      const topBlocks = collectPdfBlocks(root);
      if (topBlocks.length === 0) return [root.cloneNode(true) as HTMLElement];

      const measurementHost = document.createElement('div');
      measurementHost.style.position = 'fixed';
      measurementHost.style.left = '0';
      measurementHost.style.top = '0';
      measurementHost.style.transform = 'translateX(-300vw)';
      measurementHost.style.pointerEvents = 'none';
      measurementHost.style.zIndex = '2147483647';
      document.body.appendChild(measurementHost);

      const MAX_SPLIT_DEPTH = 3;
      const queue: Array<{ block: HTMLElement; depth: number }> = topBlocks.map(b => ({ block: b, depth: 0 }));

      const pages: HTMLElement[] = [];
      let currentPage = createPdfPageShell(pageWidthPx, pagePaddingPx);
      measurementHost.appendChild(currentPage);
      let currentContent = getPdfPageContentTarget(currentPage);
      let isFirstOnPage = true;

      while (queue.length > 0) {
        const { block, depth } = queue.shift()!;
        const clonedBlock = block.cloneNode(true) as HTMLElement;
        const blockShell = document.createElement('div');
        blockShell.className = 'pdf-page-block';
        if (!isFirstOnPage) {
          blockShell.style.borderTop = '1px solid #e5e7eb';
          blockShell.style.paddingTop = '18px';
          blockShell.style.marginTop = '18px';
        }
        blockShell.appendChild(clonedBlock);
        currentContent.appendChild(blockShell);
        await nextFrame();

        const fitsCurrentPage = currentPage.scrollHeight <= maxPageHeightPx;

        if (fitsCurrentPage) {
          isFirstOnPage = false;
          continue;
        }

        if (!isFirstOnPage) {
          // Move block to a fresh page
          currentContent.removeChild(blockShell);
          pages.push(currentPage.cloneNode(true) as HTMLElement);
          currentPage = createPdfPageShell(pageWidthPx, pagePaddingPx);
          measurementHost.replaceChildren(currentPage);
          currentContent = getPdfPageContentTarget(currentPage);
          isFirstOnPage = true;
          queue.unshift({ block, depth });
          continue;
        }

        // Block is alone on the page and still too tall — try splitting into children
        if (depth < MAX_SPLIT_DEPTH) {
          const children = Array.from(block.children).filter(
            (c): c is HTMLElement => c instanceof HTMLElement
          );
          if (children.length > 1) {
            currentContent.removeChild(blockShell);
            queue.unshift(...children.map(c => ({ block: c, depth: depth + 1 })));
            continue;
          }
        }

        // Can't split further — keep it as-is (will be scaled down at render time)
        isFirstOnPage = false;
      }

      if (currentContent.children.length > 0) {
        pages.push(currentPage.cloneNode(true) as HTMLElement);
      }

      measurementHost.remove();
      return pages;
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
      if (template === 'complete' || template === 'overview') {
        poolImageDataUrl = await getPoolImageDataUrl();
      }

      // 3) Construimos wrapper A4 en px (evita “mm” inconsistentes en html2canvas)
      const A4_W = mmToPx(190);
      const A4_PADDING = 16;

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

      const html = getContentForTemplate(template, exportSettings, { cadImageDataUrl, poolImageDataUrl });
      const { styleText, bodyHtml } = extractBodyAndStyles(html);

      wrapper = document.createElement('div');
      wrapper.setAttribute('data-export-root', '1');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '0';
      wrapper.style.top = '0';
      wrapper.style.transform = 'translateX(-250vw)';
      wrapper.style.width = `${A4_W}px`;
      wrapper.style.padding = '0';
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
        ${poolImageDataUrl && template === 'complete' ? `
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

      const scale = Math.min(3, Math.max(2, (window.devicePixelRatio || 1)));
      // 6) Generación PDF por páginas A4 reales.
      // En vez de cortar un canvas largo, armamos páginas por bloques y
      // renderizamos cada una por separado para evitar cortes entre secciones.

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      const marginMm = 8;
      const headerMm = 8;
      const footerMm = 8;
      const contentW = pdfW - marginMm * 2;
      const contentH = pdfH - marginMm * 2 - headerMm - footerMm;

      // Relación mm->px para construir páginas A4 sin cortar secciones.
      const pxPerMm = wrapper.scrollWidth / contentW;
      const maxPageHeightPx = Math.floor(contentH * pxPerMm);
      const pagedWrappers = await paginatePdfBlocks(wrapper, A4_W, A4_PADDING, maxPageHeightPx);
      const totalPages = Math.max(1, pagedWrappers.length);

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

      // Renderizamos cada página ya paginada por bloques.
      for (let page = 1; page <= totalPages; page++) {
        const pageWrapper = pagedWrappers[page - 1];
        wrapper.replaceChildren(pageWrapper);
        await waitForImages(wrapper);
        await nextFrame();

        const pageCanvas = await html2canvas(wrapper, {
          scale,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: wrapper.scrollWidth,
          windowHeight: wrapper.scrollHeight,
        });

        const sliceMega = (pageCanvas.width * pageCanvas.height) / 1_000_000;
        const useJpeg = sliceMega > 10;
        const imgData = useJpeg ? pageCanvas.toDataURL('image/jpeg', 0.92) : pageCanvas.toDataURL('image/png');

        if (page > 1) pdf.addPage();
        drawHeaderFooter(page);

        const rawDrawH = (pageCanvas.height / pageCanvas.width) * contentW;
        const scaleFactor = rawDrawH > contentH ? contentH / rawDrawH : 1;
        const drawW = contentW * scaleFactor;
        const drawH = rawDrawH * scaleFactor;
        const drawX = marginMm + (contentW - drawW) / 2;
        pdf.addImage(
          imgData,
          useJpeg ? 'JPEG' : 'PNG',
          drawX,
          marginMm + headerMm,
          drawW,
          drawH,
          undefined,
          'FAST'
        );
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
    if (selectedExcelItems.length === 0) {
      alert('Seleccioná al menos un ítem para exportar a Excel.');
      return;
    }

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

  const updateDraftClientBlocks = (updater: (blocks: ClientDocumentBlock[]) => ClientDocumentBlock[]) => {
    setDraftSettings((prev) => {
      const prevTemplate = (prev.templates?.client || {}) as ExportTemplateSettings;
      const nextBlocks = updater(Array.isArray(prevTemplate.documentBlocks) ? prevTemplate.documentBlocks : []);
      return {
        ...prev,
        templates: {
          ...prev.templates,
          client: {
            ...prevTemplate,
            documentBlocks: nextBlocks,
          },
        },
      };
    });
  };

  const addClientDocumentBlock = (type: ClientDocumentBlockType) => {
    const defaults: Record<ClientDocumentBlockType, Partial<ClientDocumentBlock>> = {
      heading: { content: 'Nuevo título', fontSize: 22, align: 'left' },
      paragraph: { content: 'Nuevo párrafo. Podés usar variables como {{clientName}} o {{laborCost}}.', fontSize: 14, align: 'left' },
      bullet_list: { content: 'Primer punto\nSegundo punto', fontSize: 14, align: 'left' },
      divider: {},
      data_field: { fieldKey: 'clientName', label: 'Dato real', fontSize: 14, align: 'left' },
    };

    updateDraftClientBlocks((blocks) => ([
      ...blocks,
      {
        id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        ...defaults[type],
      },
    ]));
  };

  const patchClientDocumentBlock = (blockId: string, updates: Partial<ClientDocumentBlock>) => {
    updateDraftClientBlocks((blocks) =>
      blocks.map((block) => block.id === blockId ? { ...block, ...updates } : block)
    );
  };

  const removeClientDocumentBlock = (blockId: string) => {
    updateDraftClientBlocks((blocks) => blocks.filter((block) => block.id !== blockId));
  };

  const moveClientDocumentBlock = (blockId: string, direction: -1 | 1) => {
    updateDraftClientBlocks((blocks) => {
      const index = blocks.findIndex((block) => block.id === blockId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) return blocks;
      const cloned = [...blocks];
      const [item] = cloned.splice(index, 1);
      cloned.splice(nextIndex, 0, item);
      return cloned;
    });
  };

  const updateDraftClientCustomBody = (html: string) => {
    setClientDocumentEditorHtml(html);
    setDraftSettings((prev) => {
      const prevTemplate = (prev.templates?.client || {}) as ExportTemplateSettings;
      return {
        ...prev,
        templates: {
          ...prev.templates,
          client: {
            ...prevTemplate,
            useCustomClientBody: true,
            customBodyHtml: html,
          },
        },
      };
    });
  };

  const handleResetClientDocument = () => {
    const nextHtml = buildClientBudgetBody((draftSettings.templates?.client || {}) as ExportTemplateSettings);
    updateDraftClientCustomBody(nextHtml);
  };

  const handleUseAutomaticClientDocument = () => {
    setClientDocumentEditorHtml(buildClientBudgetBody((draftSettings.templates?.client || {}) as ExportTemplateSettings));
    setDraftSettings((prev) => {
      const prevTemplate = (prev.templates?.client || {}) as ExportTemplateSettings;
      const nextTemplate = { ...prevTemplate };
      delete nextTemplate.customBodyHtml;
      nextTemplate.useCustomClientBody = false;
      return {
        ...prev,
        templates: {
          ...prev.templates,
          client: nextTemplate,
        },
      };
    });
  };

  const runClientDocumentCommand = (command: string, value?: string) => {
    if (selectedTemplate !== 'client') return;
    clientDocumentEditorRef.current?.focus();
    document.execCommand(command, false, value);
    const currentHtml = clientDocumentEditorRef.current?.innerHTML || '';
    updateDraftClientCustomBody(currentHtml);
  };

  const insertClientDocumentHtml = (html: string) => {
    runClientDocumentCommand('insertHTML', html);
  };

  const handleSaveExportSettings = async () => {
    setSavingSettings(true);
    try {
      await projectService.update(project.id, { exportSettings: draftSettings });
      setExportSettings(draftSettings);
      if (editorFullscreen) setEditorFullscreen(false);
    } catch (error) {
      console.error('Error al guardar configuración de exportación:', error);
      alert('No se pudo guardar la configuración del documento');
    } finally {
      setSavingSettings(false);
    }
  };

  const selectedTemplateData = templates.find((template) => template.id === selectedTemplate) || visibleTemplates[0] || templates[0];
  const activeDraftTemplate = draftSettings.templates?.[selectedTemplate] || {};
  const activeClientBlocks = selectedTemplate === 'client' && Array.isArray((activeDraftTemplate as ExportTemplateSettings).documentBlocks)
    ? (activeDraftTemplate as ExportTemplateSettings).documentBlocks || []
    : [];
  const draftSections = selectedTemplate === 'client'
    ? {
        ...selectedSections,
        ...(activeDraftTemplate.sections || {}),
      }
    : undefined;
  const draftMaterialSections = selectedTemplate === 'materials'
    ? (activeDraftTemplate.sections || {})
    : undefined;
  const draftPreviewHtml = getContentForTemplate(selectedTemplate, draftSettings);
  const defaultConditionsText = getConditionsList().join('\n');
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
          renderQuality={2.5}
        />
        <PoolVisualizationCanvas
          ref={cadCanvasRef}
          project={project}
          tileConfig={project.tileCalculation}
          width={1600}
          height={1000}
          showMeasurements={true}
          viewMode="cad"
          renderQuality={2.5}
        />
      </div>

      <Card className="overflow-hidden border border-zinc-800 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <div className="bg-zinc-950 text-white p-6 border-b border-white/8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/[0.06] p-3 rounded-2xl border border-white/10 shadow-inner">
                <HdDownload size={30} className="text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">Exportación de Documentos</h2>
              </div>
            </div>
            <div className="text-sm text-zinc-300">
              Plantilla activa: <span className="font-semibold text-white">{selectedTemplateData.name}</span>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8 bg-zinc-950">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Plantillas disponibles</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {visibleTemplates.map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate === template.id;

                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`text-left p-4 rounded-2xl border transition-all duration-200 ${
                        isSelected
                          ? 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-[0_10px_30px_rgba(0,0,0,0.22)]'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/90'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl ${isSelected ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-100">{template.name}</p>
                          <p className="text-xs text-zinc-400 mt-1">{template.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {internalTemplates.length > 0 && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/55 p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100">Documentos internos</h4>
                    </div>
                    <span className="text-[11px] uppercase tracking-wide text-zinc-500">Interno</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {internalTemplates.map((template) => {
                      const Icon = template.icon;
                      const isSelected = selectedTemplate === template.id;

                      return (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`text-left p-4 rounded-2xl border transition-all duration-200 ${
                            isSelected
                              ? 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-[0_10px_30px_rgba(0,0,0,0.22)]'
                              : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/90'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl ${isSelected ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>
                              <Icon size={20} />
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-100">{template.name}</p>
                              <p className="text-xs text-zinc-400 mt-1">{template.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            <div className="bg-zinc-900/85 border border-zinc-800 rounded-2xl p-6 shadow-[0_12px_32px_rgba(0,0,0,0.18)] h-fit space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-white">Acciones rápidas</h4>
                <p className="text-xs text-zinc-400">Exportá, imprimí o compartí la plantilla seleccionada.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleExportPDF(selectedTemplate)}
                  className="flex flex-col items-center gap-2 p-4 bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl transition-colors shadow-sm"
                >
                  <HdDownload size={20} />
                  <span className="font-semibold text-xs">PDF</span>
                </button>

                <button
                  onClick={() => handleExport('html', selectedTemplate)}
                  className="flex flex-col items-center gap-2 p-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl transition-colors shadow-sm"
                >
                  <HdDownload size={20} />
                  <span className="font-semibold text-xs">HTML</span>
                </button>

                <button
                  onClick={() => handlePrint(selectedTemplate)}
                  className="flex flex-col items-center gap-2 p-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl transition-colors shadow-sm"
                >
                  <HdPrinter size={20} />
                  <span className="font-semibold text-xs">Imprimir</span>
                </button>

                <button
                  onClick={handleWhatsAppShare}
                  className="flex flex-col items-center gap-2 p-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800 rounded-xl transition-colors shadow-sm"
                >
                  <HdMessageBubble size={20} />
                  <span className="font-semibold text-xs">WhatsApp</span>
                </button>
              </div>

              <button
                onClick={() => setShowExcelDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl transition-colors shadow-sm text-sm font-semibold"
              >
                <HdFileSpreadsheet size={18} />
                Excel Técnico
              </button>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleGenerateProjectPackage}
                  disabled={generatingPackage}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-zinc-100 border border-zinc-800 rounded-xl transition-colors shadow-sm text-sm font-semibold"
                >
                  <HdFileText size={18} />
                  {generatingPackage ? 'Generando expediente...' : 'Generar expediente'}
                </button>

                <button
                  onClick={handleDownloadProjectPackage}
                  disabled={downloadingPackage}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 hover:bg-white disabled:opacity-60 text-zinc-950 rounded-xl transition-colors shadow-sm text-sm font-semibold"
                >
                  <HdDownload size={18} />
                  {downloadingPackage ? 'Preparando ZIP...' : 'Descargar ZIP'}
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Resumen verificable</p>
                  <span className="text-xs text-zinc-500">Antes de exportar</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                    <p className="text-xs text-zinc-400">Materiales</p>
                    <p className="font-semibold text-zinc-100">{formatCurrency(computedCosts.totalMaterialCost)}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                    <p className="text-xs text-zinc-400">Mano de obra</p>
                    <p className="font-semibold text-zinc-100">{formatCurrency(computedCosts.totalLaborCost)}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                    <p className="text-xs text-zinc-400">Tareas cargadas</p>
                    <p className="font-semibold text-zinc-100">{computedTaskCount}</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
                    <p className="text-xs text-zinc-400">Ítems hidráulicos</p>
                    <p className="font-semibold text-zinc-100">{plumbingItemsCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {isEditorOpen && (
        <div className={editorFullscreen
          ? "fixed inset-0 z-50 bg-zinc-950 flex flex-col"
          : "border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
        }>
          <div className={editorFullscreen ? "flex flex-col h-full" : ""}>
            <div className="flex flex-col gap-3 border-b border-zinc-800 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {selectedTemplateData.name}
                </h3>
                <p className="text-sm text-zinc-400">Editá el documento y guardá los cambios</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditorFullscreen(!editorFullscreen)}
                  className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-sm"
                >
                  {editorFullscreen ? 'Reducir' : 'Pantalla completa'}
                </button>
                <button
                  onClick={handleSaveExportSettings}
                  className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-950 hover:bg-white text-sm font-semibold"
                  disabled={savingSettings}
                >
                  {savingSettings ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] ${editorFullscreen ? 'flex-1 min-h-0 overflow-hidden' : ''}`}>
              <div className="bg-zinc-950 p-4 overflow-auto">
                <div className={`bg-white rounded-2xl border border-zinc-800 shadow-sm overflow-hidden ${editorFullscreen ? 'h-[calc(100vh-110px)]' : 'min-h-[560px]'}`}>
                  <iframe
                    title="preview-editor"
                    srcDoc={draftPreviewHtml}
                    className="w-full h-full"
                    sandbox=""
                  />
                </div>
              </div>

              <div className={`border-l border-zinc-800 p-5 overflow-auto bg-zinc-950 ${editorFullscreen ? 'h-[calc(100vh-65px)]' : 'max-h-[700px]'}`}>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3">Textos del documento</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Título del documento</label>
                        <input
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm"
                          value={activeDraftTemplate.title || ''}
                          onChange={(event) => updateDraftTemplate({ title: event.target.value })}
                          placeholder={`${selectedTemplateData.name} - ${project.name}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Subtítulo de portada</label>
                        <input
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm"
                          value={activeDraftTemplate.subtitle || ''}
                          onChange={(event) => updateDraftTemplate({ subtitle: event.target.value })}
                          placeholder={selectedTemplateData.description}
                        />
                      </div>
                      {selectedTemplate === 'client' && (
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Condiciones comerciales</label>
                          <textarea
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm min-h-[140px]"
                            value={activeDraftTemplate.conditions || ''}
                            onChange={(event) => updateDraftTemplate({ conditions: event.target.value })}
                            placeholder={defaultConditionsText}
                          />
                          <p className="text-[11px] text-zinc-500 mt-1">Una condición por línea.</p>
                        </div>
                      )}
                      {selectedTemplate === 'client' && (
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Texto del alcance</label>
                          <textarea
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm min-h-[120px]"
                            value={(activeDraftTemplate as ExportTemplateSettings).scopeSummary || ''}
                            onChange={(event) => updateDraftTemplate({ scopeSummary: event.target.value })}
                            placeholder={automaticScopeLines.join('\n')}
                          />
                          <p className="text-[11px] text-zinc-500 mt-1">Si lo dejás vacío, la app arma un alcance automático corto.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3">Valores y costos</h4>
                    {selectedTemplate === 'client' && (
                      <div className="mb-4">
                        <label className="block text-xs text-zinc-400 mb-1">Alcance de instalación</label>
                        <select
                          value={activeDraftTemplate.installationMode || 'with_extras'}
                          onChange={(event) => updateDraftTemplate({ installationMode: event.target.value as 'basic' | 'with_extras' })}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm mb-3"
                        >
                          <option value="basic">Instalación base</option>
                          <option value="with_extras">{installationTier}</option>
                        </select>
                        <p className="text-[11px] text-zinc-500 mt-1 mb-3">Elegí si el presupuesto sale con el alcance base o con los adicionales cargados en el proyecto.</p>

                        <label className="block text-xs text-zinc-400 mb-1">Modo comercial</label>
                        <select
                          value={activeDraftTemplate.clientPricingMode || 'labor_only'}
                          onChange={(event) => updateDraftTemplate({ clientPricingMode: event.target.value as 'full' | 'labor_only' })}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm"
                        >
                          <option value="labor_only">Solo mano de obra</option>
                          <option value="full">Materiales + mano de obra</option>
                        </select>
                        <p className="text-[11px] text-zinc-500 mt-1">En modo cliente estándar podés ocultar materiales y mostrar solo el valor de instalación.</p>

                        <label className="mt-4 block text-xs text-zinc-400 mb-1">Posición de inversión</label>
                        <select
                          value={activeDraftTemplate.pricingPosition || 'bottom'}
                          onChange={(event) => updateDraftTemplate({ pricingPosition: event.target.value as 'top' | 'bottom' })}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm"
                        >
                          <option value="bottom">Al final</option>
                          <option value="top">Al principio</option>
                        </select>
                        <p className="text-[11px] text-zinc-500 mt-1">Elegís dónde aparece el precio dentro del presupuesto.</p>

                        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
                          <input
                            type="checkbox"
                            checked={activeDraftTemplate.showRecommendedInstallationBox !== false}
                            onChange={(event) => updateDraftTemplate({ showRecommendedInstallationBox: event.target.checked })}
                            className="h-4 w-4"
                          />
                          <span>Mostrar bloque de adicionales</span>
                        </label>
                        <p className="text-[11px] text-zinc-500 mt-1">Si lo desactivás, el presupuesto automático no muestra el resumen de adicionales.</p>

                        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
                          <input
                            type="checkbox"
                            checked={activeDraftTemplate.includeAdditionalsPricing !== false}
                            onChange={(event) => updateDraftTemplate({ includeAdditionalsPricing: event.target.checked })}
                            className="h-4 w-4"
                          />
                          <span>Sumar precios de adicionales</span>
                        </label>
                        <p className="text-[11px] text-zinc-500 mt-1">Si lo desactivás, los adicionales se muestran como alcance pero no se suman al precio comercial exportado.</p>

                        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
                          <input
                            type="checkbox"
                            checked={activeDraftTemplate.includeVeredaMaterials !== false}
                            onChange={(event) => updateDraftTemplate({ includeVeredaMaterials: event.target.checked })}
                            className="h-4 w-4"
                          />
                          <span>Cobrar materiales de vereda</span>
                        </label>
                        <p className="text-[11px] text-zinc-500 mt-1">Si lo desactivás, se muestra solo la mano de obra de colocación de losetas sin sumar el costo de materiales.</p>

                        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
                          <input
                            type="checkbox"
                            checked={!!activeDraftTemplate.useCustomClientBody}
                            onChange={(event) => {
                              if (event.target.checked) {
                                handleResetClientDocument();
                                return;
                              }
                              handleUseAutomaticClientDocument();
                            }}
                            className="h-4 w-4"
                          />
                          <span>Usar propuesta personalizada editada</span>
                        </label>
                        <p className="text-[11px] text-zinc-500 mt-1">Si está desactivado, la exportación usa siempre la plantilla automática actual del sistema.</p>
                      </div>
                    )}
                    <div className="space-y-3">
                      {!(selectedTemplate === 'client' && (activeDraftTemplate.clientPricingMode || 'labor_only') === 'labor_only') && (
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Materiales</label>
                          <input
                            type="number"
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm"
                            value={activeDraftTemplate.values?.materialCost ?? ''}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateDraftValues({ materialCost: value === '' ? undefined : Number(value) });
                            }}
                            placeholder={computedCosts.totalMaterialCost.toFixed(2)}
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Mano de obra</label>
                        <input
                          type="number"
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm"
                          value={activeDraftTemplate.values?.laborCost ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateDraftValues({ laborCost: value === '' ? undefined : Number(value) });
                          }}
                          placeholder={computedCosts.totalLaborCost.toFixed(2)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Total</label>
                        <input
                          type="number"
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm"
                          value={activeDraftTemplate.values?.totalCost ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateDraftValues({ totalCost: value === '' ? undefined : Number(value) });
                          }}
                          placeholder={selectedTemplate === 'client' && (activeDraftTemplate.clientPricingMode || 'labor_only') === 'labor_only'
                            ? computedCosts.totalLaborCost.toFixed(2)
                            : computedCosts.grandTotal.toFixed(2)}
                        />
                      </div>
                    </div>
                  </div>

                  {selectedTemplate === 'client' && (
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-3">Secciones visibles</h4>
                      <div className="space-y-2 text-sm text-zinc-300">
                        {[
                          { key: 'header', label: 'Información del cliente' },
                          { key: 'includes', label: 'Alcance del proyecto' },
                          { key: 'costs', label: 'Detalle de costos' },
                          { key: 'conditions', label: 'Condiciones comerciales' },
                        ].map((item) => (
                          <label key={item.key} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                            checked={draftSections?.[item.key] !== false}
                              onChange={(event) => updateDraftSection(item.key, event.target.checked)}
                              className="h-4 w-4"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTemplate === 'client' && (
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <h4 className="text-sm font-semibold text-white">Documento editable</h4>
                          <p className="text-[11px] text-zinc-500 mt-1">Editás la propuesta de este proyecto. Los placeholders siguen saliendo de la app, por ejemplo <code>{'{{clientName}}'}</code> o <code>{'{{laborCost}}'}</code>.</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleResetClientDocument}
                            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:border-zinc-700"
                          >
                            Cargar base
                          </button>
                          <button
                            type="button"
                            onClick={handleUseAutomaticClientDocument}
                            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:border-zinc-700"
                          >
                            Volver a automático
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => runClientDocumentCommand('bold')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">Negrita</button>
                          <button type="button" onClick={() => runClientDocumentCommand('italic')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">Itálica</button>
                          <button type="button" onClick={() => runClientDocumentCommand('formatBlock', '<h2>')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">H2</button>
                          <button type="button" onClick={() => runClientDocumentCommand('formatBlock', '<h3>')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">H3</button>
                          <button type="button" onClick={() => runClientDocumentCommand('formatBlock', '<p>')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">Párrafo</button>
                          <button type="button" onClick={() => runClientDocumentCommand('insertUnorderedList')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">Lista</button>
                          <button type="button" onClick={() => runClientDocumentCommand('justifyLeft')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">Izq</button>
                          <button type="button" onClick={() => runClientDocumentCommand('justifyCenter')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">Centro</button>
                          <button type="button" onClick={() => runClientDocumentCommand('justifyRight')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">Der</button>
                          <button type="button" onClick={() => insertClientDocumentHtml('<hr />')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">División</button>
                          <button type="button" onClick={() => insertClientDocumentHtml('<table><thead><tr><th>Concepto</th><th>Detalle</th></tr></thead><tbody><tr><td>Item</td><td>Valor</td></tr></tbody></table>')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">Tabla</button>
                          <button type="button" onClick={() => insertClientDocumentHtml('<div class=\"doc-columns\"><div><h3>Columna 1</h3><p>Contenido</p></div><div><h3>Columna 2</h3><p>Contenido</p></div></div>')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">2 columnas</button>
                          <button type="button" onClick={() => insertClientDocumentHtml('<div class=\"doc-comment\">Comentario interno o nota comercial.</div>')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">Comentario</button>
                        </div>

                        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-3">
                          <p className="text-[11px] font-semibold text-zinc-400 mb-2">Insertar dato real del proyecto</p>
                          <div className="flex flex-wrap gap-2">
                            {CLIENT_DYNAMIC_FIELDS.map((field) => (
                              <button
                                key={field.key}
                                type="button"
                                onClick={() => insertClientDocumentHtml(`{{${field.key}}}`)}
                                className="rounded bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 hover:text-white"
                              >
                                {field.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div
                          ref={clientDocumentEditorRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(event) => updateDraftClientCustomBody(event.currentTarget.innerHTML)}
                          className="min-h-[360px] rounded-xl border border-zinc-800 bg-white px-4 py-4 text-sm text-zinc-900 focus:outline-none"
                          dangerouslySetInnerHTML={{ __html: clientDocumentEditorHtml }}
                        />

                        <p className="text-[11px] text-zinc-500">
                          Si querés volver al armado original de la app, usá <strong>Volver a automático</strong>. Mientras uses este editor, el contenido queda persistido en este proyecto.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedTemplate === 'client' && (
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <h4 className="text-sm font-semibold text-white">Bloques personalizados</h4>
                          <p className="text-[11px] text-zinc-500 mt-1">Texto libre con variables reales del proyecto. Se guarda dentro de este proyecto.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <button type="button" onClick={() => addClientDocumentBlock('heading')} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:border-zinc-700">+ Título</button>
                        <button type="button" onClick={() => addClientDocumentBlock('paragraph')} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:border-zinc-700">+ Párrafo</button>
                        <button type="button" onClick={() => addClientDocumentBlock('bullet_list')} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:border-zinc-700">+ Lista</button>
                        <button type="button" onClick={() => addClientDocumentBlock('data_field')} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:border-zinc-700">+ Dato real</button>
                        <button type="button" onClick={() => addClientDocumentBlock('divider')} className="col-span-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:border-zinc-700">+ División</button>
                      </div>

                      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-3 mb-4">
                        <p className="text-[11px] font-semibold text-zinc-400 mb-2">Variables disponibles</p>
                        <div className="flex flex-wrap gap-2">
                          {CLIENT_DYNAMIC_FIELDS.map((field) => (
                            <code key={field.key} className="rounded bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">
                              {`{{${field.key}}}`}
                            </code>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {activeClientBlocks.length === 0 && (
                          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
                            Todavía no hay bloques personalizados para esta propuesta.
                          </div>
                        )}

                        {activeClientBlocks.map((block, index) => (
                          <div key={block.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                Bloque {index + 1} · {block.type}
                              </div>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => moveClientDocumentBlock(block.id, -1)} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">↑</button>
                                <button type="button" onClick={() => moveClientDocumentBlock(block.id, 1)} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:text-white">↓</button>
                                <button type="button" onClick={() => removeClientDocumentBlock(block.id)} className="rounded border border-red-900/60 px-2 py-1 text-xs text-red-300 hover:text-red-200">Eliminar</button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Tipografía</label>
                                <select
                                  value={block.fontFamily || 'Segoe UI, Arial, sans-serif'}
                                  onChange={(event) => patchClientDocumentBlock(block.id, { fontFamily: event.target.value })}
                                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 px-3 py-2 text-sm"
                                >
                                  <option value="Segoe UI, Arial, sans-serif">Sans</option>
                                  <option value="Georgia, serif">Serif</option>
                                  <option value="'Courier New', monospace">Monospace</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Tamaño</label>
                                <input
                                  type="number"
                                  value={block.fontSize || ''}
                                  onChange={(event) => patchClientDocumentBlock(block.id, { fontSize: event.target.value === '' ? undefined : Number(event.target.value) })}
                                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 px-3 py-2 text-sm"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs text-zinc-400 mb-1">Alineación</label>
                              <select
                                value={block.align || 'left'}
                                onChange={(event) => patchClientDocumentBlock(block.id, { align: event.target.value as 'left' | 'center' | 'right' })}
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 px-3 py-2 text-sm"
                              >
                                <option value="left">Izquierda</option>
                                <option value="center">Centro</option>
                                <option value="right">Derecha</option>
                              </select>
                            </div>

                            {block.type === 'data_field' ? (
                              <>
                                <div>
                                  <label className="block text-xs text-zinc-400 mb-1">Dato de proyecto</label>
                                  <select
                                    value={block.fieldKey || 'clientName'}
                                    onChange={(event) => patchClientDocumentBlock(block.id, { fieldKey: event.target.value })}
                                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 px-3 py-2 text-sm"
                                  >
                                    {CLIENT_DYNAMIC_FIELDS.map((field) => (
                                      <option key={field.key} value={field.key}>{field.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-zinc-400 mb-1">Etiqueta</label>
                                  <input
                                    value={block.label || ''}
                                    onChange={(event) => patchClientDocumentBlock(block.id, { label: event.target.value })}
                                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 px-3 py-2 text-sm"
                                    placeholder="Ej: Inversión estimada"
                                  />
                                </div>
                              </>
                            ) : block.type !== 'divider' ? (
                              <div>
                                <label className="block text-xs text-zinc-400 mb-1">Contenido</label>
                                <textarea
                                  value={block.content || ''}
                                  onChange={(event) => patchClientDocumentBlock(block.id, { content: event.target.value })}
                                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 px-3 py-2 text-sm min-h-[110px]"
                                  placeholder="Podés escribir texto libre y usar variables como {{clientName}} o {{laborCost}}"
                                />
                              </div>
                            ) : (
                              <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-400">
                                Este bloque agrega una división visual en el documento.
                              </div>
                            )}

                            <div>
                              <label className="block text-xs text-zinc-400 mb-1">Comentario interno</label>
                              <input
                                value={block.comments || ''}
                                onChange={(event) => patchClientDocumentBlock(block.id, { comments: event.target.value })}
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 px-3 py-2 text-sm"
                                placeholder="Nota para vos sobre este bloque"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTemplate === 'professional' && (
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-3">Plano incluido</h4>
                      <div className="space-y-2 text-sm text-zinc-300">
                        <label className="block text-xs text-zinc-400 mb-1">Vista del dibujo</label>
                        <select
                          value={activeDraftTemplate.drawingView || 'cad'}
                          onChange={(event) => updateDraftTemplate({ drawingView: event.target.value as 'cad' | 'planta' })}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm"
                        >
                          <option value="cad">Plano CAD</option>
                          <option value="planta">Vista Planta</option>
                        </select>
                        <p className="text-[11px] text-zinc-500">Se mostrará en la exportación de Especificaciones Técnicas.</p>
                      </div>
                    </div>
                  )}

                  {selectedTemplate === 'materials' && (
                    <div>
                      <div className="mb-4">
                        <label className="block text-xs text-zinc-400 mb-1">Alcance de instalación</label>
                        <select
                          value={activeDraftTemplate.installationMode || 'with_extras'}
                          onChange={(event) => updateDraftTemplate({ installationMode: event.target.value as 'basic' | 'with_extras' })}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm"
                        >
                          <option value="basic">Instalación básica</option>
                          <option value="with_extras">Instalación con extras</option>
                        </select>
                        <p className="text-[11px] text-zinc-500 mt-1">La lista de materiales sigue sin valores; esto solo cambia el alcance incluido.</p>
                      </div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h4 className="text-sm font-semibold text-white">Bloques del listado de materiales</h4>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => materialSectionDefinitions.forEach((item) => updateDraftSection(item.key, true))}
                            className="text-[11px] text-zinc-400 hover:text-white"
                          >
                            Marcar todo
                          </button>
                          <button
                            type="button"
                            onClick={() => materialSectionDefinitions.forEach((item) => updateDraftSection(item.key, false))}
                            className="text-[11px] text-zinc-400 hover:text-white"
                          >
                            Quitar todo
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {materialSectionDefinitions.map((item) => (
                          <label
                            key={item.key}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
                              draftMaterialSections?.[item.key] !== false
                            ? 'border-zinc-700 bg-zinc-900'
                            : 'border-zinc-800 bg-zinc-900/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={draftMaterialSections?.[item.key] !== false}
                              onChange={(event) => updateDraftSection(item.key, event.target.checked)}
                              className="h-4 w-4 mt-0.5"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-100">{item.label}</p>
                              <p className="text-xs text-zinc-400 mt-1">{item.description}</p>
                              <p className="text-[11px] text-zinc-500 mt-2">{item.preview}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTemplate === 'budget' && (
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-3">Alcance del presupuesto</h4>
                      <label className="block text-xs text-zinc-400 mb-1">Modo comercial</label>
                      <select
                        value={activeDraftTemplate.clientPricingMode || 'labor_only'}
                        onChange={(event) => updateDraftTemplate({ clientPricingMode: event.target.value as 'full' | 'labor_only' })}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm mb-3"
                      >
                        <option value="labor_only">Solo mano de obra</option>
                        <option value="full">Materiales + mano de obra</option>
                      </select>
                      <label className="block text-xs text-zinc-400 mb-1">Modo de instalación</label>
                      <select
                        value={activeDraftTemplate.installationMode || 'with_extras'}
                        onChange={(event) => updateDraftTemplate({ installationMode: event.target.value as 'basic' | 'with_extras' })}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 px-3 py-2 text-sm"
                      >
                        <option value="basic">Instalación básica</option>
                        <option value="with_extras">Instalación con extras</option>
                      </select>
                      <p className="text-[11px] text-zinc-500 mt-1">Por defecto queda seguro para cliente: solo mano de obra. Si activás materiales, vuelve a mostrarse el presupuesto interno completo.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExcelDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-950 text-white p-6 rounded-t-2xl border-b border-zinc-800">
              <h3 className="text-xl font-bold">Configurar Exportación a Excel</h3>
              <p className="text-sm text-zinc-300 mt-2">
                Seleccione las secciones y valide los datos reales que se van a incluir en el documento técnico
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {excelSectionDefinitions.map((section) => (
                      <label
                        key={section.key}
                        className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                          excelSections[section.key]
                            ? 'border-zinc-700 bg-zinc-900'
                            : 'border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={excelSections[section.key]}
                          onChange={(e) => setExcelSections({ ...excelSections, [section.key]: e.target.checked })}
                          className="w-5 h-5 rounded mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-zinc-100">{section.label}</p>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              section.ready
                                ? 'bg-zinc-100 text-zinc-950 border border-zinc-200'
                                : 'bg-zinc-900 text-zinc-300 border border-zinc-700'
                            }`}>
                              {section.ready ? 'Datos listos' : 'Revisar'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 mt-1">{section.description}</p>
                          <p className="text-xs text-zinc-500 mt-2">Vista previa: {section.preview}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-zinc-800 mt-4">
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

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 h-fit space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Comprobación previa</h4>
                    <p className="text-xs text-zinc-400 mt-1">Confirmá qué ítems van a salir y con qué datos.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                      <p className="text-xs text-zinc-400">Seleccionados</p>
                      <p className="text-lg font-semibold text-zinc-100">{selectedExcelItems.length}</p>
                    </div>
                    <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                      <p className="text-xs text-zinc-400">Con datos listos</p>
                      <p className="text-lg font-semibold text-zinc-100">{readyExcelItems}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {selectedExcelItems.length > 0 ? selectedExcelItems.map((section) => (
                      <div key={section.key} className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-zinc-100">{section.label}</p>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            section.ready
                              ? 'bg-zinc-100 text-zinc-950 border border-zinc-200'
                              : 'bg-zinc-900 text-zinc-300 border border-zinc-700'
                          }`}>
                            {section.ready ? 'OK' : 'Revisar'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-2">{section.preview}</p>
                      </div>
                    )) : (
                      <div className="rounded-xl bg-zinc-950 border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
                        No hay secciones seleccionadas para exportar.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-zinc-950/95 border-t border-zinc-800 p-6 flex gap-3 backdrop-blur-sm">
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
                className="flex-1 bg-zinc-100 hover:bg-white text-zinc-950"
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
