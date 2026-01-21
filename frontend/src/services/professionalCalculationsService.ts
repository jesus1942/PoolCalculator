import api from './api';
import { HydraulicAnalysis, ElectricalAnalysis } from '@/types';

export interface HydraulicParams {
  distanceToEquipment?: number;
  staticLift?: number;
}

export interface ElectricalParams {
  voltage?: number;
  distanceToPanel?: number;
  installationType?: 'CONDUIT' | 'TRAY' | 'DIRECT' | 'AIR';
  ambientTemp?: number;
  electricityCostPerKwh?: number;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  hydraulic?: HydraulicAnalysis;
  electrical?: ElectricalAnalysis;
}

class ProfessionalCalculationsService {
  private readonly basePath = '/professional-calculations';

  /**
   * Get complete professional calculations for a project
   */
  async getCalculations(
    projectId: string,
    hydraulicParams?: HydraulicParams,
    electricalParams?: ElectricalParams
  ): Promise<{ hydraulic: HydraulicAnalysis; electrical: ElectricalAnalysis }> {
    const params = new URLSearchParams();

    if (hydraulicParams?.distanceToEquipment) {
      params.append('distanceToEquipment', hydraulicParams.distanceToEquipment.toString());
    }
    if (hydraulicParams?.staticLift) {
      params.append('staticLift', hydraulicParams.staticLift.toString());
    }
    if (electricalParams?.voltage) {
      params.append('voltage', electricalParams.voltage.toString());
    }
    if (electricalParams?.distanceToPanel) {
      params.append('distanceToPanel', electricalParams.distanceToPanel.toString());
    }
    if (electricalParams?.installationType) {
      params.append('installationType', electricalParams.installationType);
    }
    if (electricalParams?.ambientTemp) {
      params.append('ambientTemp', electricalParams.ambientTemp.toString());
    }
    if (electricalParams?.electricityCostPerKwh) {
      params.append('electricityCostPerKwh', electricalParams.electricityCostPerKwh.toString());
    }

    const queryString = params.toString();
    const url = `${this.basePath}/${projectId}${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{ hydraulic: HydraulicAnalysis; electrical: ElectricalAnalysis }>(url);
    return response.data;
  }

  /**
   * Get only hydraulic analysis
   */
  async getHydraulicAnalysis(
    projectId: string,
    params?: HydraulicParams
  ): Promise<HydraulicAnalysis> {
    const searchParams = new URLSearchParams();

    if (params?.distanceToEquipment) {
      searchParams.append('distanceToEquipment', params.distanceToEquipment.toString());
    }
    if (params?.staticLift) {
      searchParams.append('staticLift', params.staticLift.toString());
    }

    const queryString = searchParams.toString();
    const url = `${this.basePath}/${projectId}/hydraulic${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<HydraulicAnalysis>(url);
    return response.data;
  }

  /**
   * Get only electrical analysis
   */
  async getElectricalAnalysis(
    projectId: string,
    params?: ElectricalParams
  ): Promise<ElectricalAnalysis> {
    const searchParams = new URLSearchParams();

    if (params?.voltage) {
      searchParams.append('voltage', params.voltage.toString());
    }
    if (params?.distanceToPanel) {
      searchParams.append('distanceToPanel', params.distanceToPanel.toString());
    }
    if (params?.installationType) {
      searchParams.append('installationType', params.installationType);
    }
    if (params?.ambientTemp) {
      searchParams.append('ambientTemp', params.ambientTemp.toString());
    }
    if (params?.electricityCostPerKwh) {
      searchParams.append('electricityCostPerKwh', params.electricityCostPerKwh.toString());
    }

    const queryString = searchParams.toString();
    const url = `${this.basePath}/${projectId}/electrical${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<ElectricalAnalysis>(url);
    return response.data;
  }

  /**
   * Get electrical report with recommendations
   */
  async getElectricalReport(projectId: string, params?: ElectricalParams): Promise<{
    analysis: ElectricalAnalysis;
    recommendations: string[];
    summary: {
      totalPower: number;
      monthlyCost: number;
      cableSize: number;
      breakerRating: number;
    };
  }> {
    const searchParams = new URLSearchParams();

    if (params?.voltage) {
      searchParams.append('voltage', params.voltage.toString());
    }
    if (params?.distanceToPanel) {
      searchParams.append('distanceToPanel', params.distanceToPanel.toString());
    }
    if (params?.installationType) {
      searchParams.append('installationType', params.installationType);
    }
    if (params?.ambientTemp) {
      searchParams.append('ambientTemp', params.ambientTemp.toString());
    }
    if (params?.electricityCostPerKwh) {
      searchParams.append('electricityCostPerKwh', params.electricityCostPerKwh.toString());
    }

    const queryString = searchParams.toString();
    const url = `${this.basePath}/${projectId}/electrical-report${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    return response.data;
  }

  /**
   * Validate calculations and get warnings/errors
   */
  async validateCalculations(projectId: string): Promise<ValidationResult> {
    const response = await api.post<ValidationResult>(
      `${this.basePath}/${projectId}/validate`
    );
    return response.data;
  }
}

export const professionalCalculationsService = new ProfessionalCalculationsService();
