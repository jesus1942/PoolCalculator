export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER' | 'SUPERADMIN' | 'INSTALLER';
  currentOrgId?: string | null;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export type PoolShape = 'RECTANGULAR' | 'CIRCULAR' | 'OVAL' | 'JACUZZI';
export type ProjectStatus = 'DRAFT' | 'BUDGETED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AccessoryType = 'CORNER' | 'TRIM' | 'GRILL' | 'BASEBOARD' | 'SKIMMER_ITEM' | 'RETURN_ITEM' | 'DRAIN_ITEM' | 'OTHER';
export type TileType = 'COMMON' | 'LOMO_BALLENA' | 'L_FINISH' | 'PERIMETER' | 'OTHER';
export type EquipmentType = 'PUMP' | 'FILTER' | 'HEATER' | 'CHLORINATOR' | 'LIGHTING' | 'OTHER';
export type MaterialType = 'CEMENT' | 'WHITE_CEMENT' | 'SAND' | 'STONE' | 'GRAVEL' | 'MARMOLINA' | 
  'WIRE_MESH' | 'WIRE' | 'NAILS' | 'WATERPROOFING' | 'GEOTEXTILE' | 'OTHER';

export interface TileConfig {
  rows: number;
  firstRing: TileType;
  tileType: TileType;
}

export interface PoolPreset {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  additionalImages?: string[];
  backDescription?: string;
  vendor?: string;
  length: number;
  width: number;
  depth: number;
  depthEnd?: number;
  shape: PoolShape;
  lateralCushionSpace: number;
  floorCushionDepth: number;
  hasWetDeck: boolean;
  hasStairsOnly: boolean;
  returnsCount: number;
  hasHotWaterReturn: boolean;
  hasHydroJets: boolean;
  hydroJetsCount: number;
  hasBottomDrain: boolean;
  hasVacuumIntake: boolean;
  vacuumIntakeCount: number;
  hasSkimmer: boolean;
  skimmerCount: number;
  hasLighting: boolean;
  lightingCount: number;
  lightingType?: string;
  tileConfig?: {
    north: TileConfig;
    south: TileConfig;
    east: TileConfig;
    west: TileConfig;
  };
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TilePreset {
  id: string;
  name: string;
  type: TileType;
  width: number;
  length: number;
  pricePerUnit: number;
  brand?: string;
  description?: string;
  imageUrl?: string;
  additionalImages?: string[];
  catalogPage?: string;
  hasCorner: boolean;
  cornerPricePerUnit?: number;
  cornersPerTile?: number;
  isForFirstRing: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccessoryPreset {
  id: string;
  name: string;
  type: AccessoryType;
  unit: string;
  pricePerUnit: number;
  description?: string;
  imageUrl?: string;
  additionalImages?: string[];
  catalogPage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentPreset {
  id: string;
  name: string;
  type: EquipmentType;
  brand?: string;
  model?: string;
  power?: number;
  capacity?: number;
  voltage?: number;
  pricePerUnit: number;
  description?: string;
  imageUrl?: string;
  additionalImages?: string[];
  catalogPage?: string;
  datasheet?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConstructionMaterialPreset {
  id: string;
  name: string;
  type: MaterialType;
  unit: string;
  mixRatio?: any;
  pricePerUnit: number;
  brand?: string;
  description?: string;
  imageUrl?: string;
  additionalImages?: string[];
  catalogPage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  price?: number;
}

export interface TaskDetail {
  name: string;
  description: string;
  materials: Material[];
  estimatedHours?: number;
  laborCost?: number;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  location?: string;
  poolPresetId: string;
  poolPreset?: PoolPreset;
  excavationLength: number;
  excavationWidth: number;
  excavationDepth: number;
  perimeter: number;
  waterMirrorArea: number;
  volume: number;
  tileCalculation: any;
  totalTileArea: number;
  sidewalkArea: number;
  plumbingConfig?: any;
  electricalConfig?: any;
  materials: any;
  tasks: {
    excavation?: TaskDetail;
    hydraulic?: TaskDetail;
    floor?: TaskDetail;
    electrical?: TaskDetail;
    tiles?: TaskDetail;
    finishes?: TaskDetail;
  };
  exportSettings?: any;
  laborCost: number;
  materialCost: number;
  totalCost: number;
  status: ProjectStatus;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CalculationResult {
  perimeter: number;
  waterMirrorArea: number;
  volume: number;
  volumeInLiters: number;
}

export type PlumbingCategory = 'PIPE' | 'FITTING' | 'VALVE' | 'ACCESSORY';
export type PlumbingType = 'PVC' | 'FUSION_FUSION' | 'FUSION_ROSCA' | 'POLIPROPILENO' | 'COBRE' | 'OTHER';

export interface PlumbingItem {
  id: string;
  name: string;
  category: PlumbingCategory;
  type: PlumbingType;
  diameter?: string;
  length?: number;
  unit: string;
  pricePerUnit: number;
  brand?: string;
  description?: string;
  imageUrl?: string;
  additionalImages?: string[];
  catalogPage?: string;
}

// Professional Calculations Types
export interface PipeLoss {
  type: string;
  diameter: number;
  length: number;
  velocity: number;
  loss: number;
  isValid: boolean;
  warning?: string;
}

export interface FittingLoss {
  type: string;
  diameter: number;
  quantity: number;
  kCoefficient: number;
  loss: number;
}

export interface HydraulicAnalysis {
  projectId: string;
  flowRate: number;
  staticLift: number;
  distanceToEquipment: number;
  suctionPipeLoss: PipeLoss;
  returnPipeLoss: PipeLoss;
  fittingLosses: FittingLoss[];
  totalFrictionLoss: number;
  totalSingularLoss: number;
  tdh: number;
  recommendedPump?: {
    id: string;
    name: string;
    brand: string;
    model: string;
    power: number;
    maxTdh: number;
    flowRate: number;
    imageUrl?: string;
  };
  warnings: string[];
  errors: string[];
}

export interface CableSpecification {
  phase: number;
  crossSection: number;
  maxCurrent: number;
  voltageDrop: number;
  voltageDropPercent: number;
  isValid: boolean;
  warning?: string;
}

export interface Protection {
  type: 'BREAKER' | 'RCD';
  rating: number;
  poles: number;
  breakingCapacity?: number;
  leakageCurrent?: number;
}

export interface LoadDetail {
  name: string;
  type: string;
  power: number;
  voltage: number;
  current: number;
  powerFactor: number;
}

export interface OperatingCost {
  dailyCost: number;
  monthlyCost: number;
  annualCost: number;
  electricityCostPerKwh: number;
}

export interface ElectricalAnalysis {
  projectId: string;
  totalInstalledPower: number;
  totalDemandPower: number;
  totalCurrent: number;
  voltage: number;
  distanceToPanel: number;
  cable: CableSpecification;
  breaker: Protection;
  rcd: Protection;
  loads: LoadDetail[];
  operatingCost: OperatingCost;
  warnings: string[];
  errors: string[];
}
