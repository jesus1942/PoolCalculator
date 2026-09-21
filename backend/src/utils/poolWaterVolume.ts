import { calculateVolume, type PoolDimensions } from './calculations';

type WaterModel = Partial<Omit<PoolDimensions,'depthEnd'>> & { depthEnd?: number|null; waterVolumeM3?: number|null; waterVolumeSource?: string };
/** Volumen del folleto tiene prioridad; si falta, se estima desde forma y profundidad media. */
export function getPoolWaterVolume(model: WaterModel = {}, fallback = 0) {
  if (Number.isFinite(model.waterVolumeM3) && Number(model.waterVolumeM3)>0) {
    return {volumeM3:Number(model.waterVolumeM3),source:model.waterVolumeSource==='BROCHURE'?'BROCHURE':'CALCULATED'};
  }
  const valid=[model.length,model.width,model.depth].every(n=>Number.isFinite(n)&&Number(n)>0);
  const raw=valid?calculateVolume({...model,depthEnd:model.depthEnd&&model.depthEnd>0?model.depthEnd:undefined} as PoolDimensions):fallback;
  const volumeM3=Number.isFinite(raw)&&raw>0?Math.ceil(Number((raw*1000).toPrecision(15)))/1000:0;
  return {volumeM3,source:'CALCULATED'};
}
/** Prepara datos persistibles; nunca confía en un volumen automático enviado por el cliente. */
export function preparePoolWaterVolume(input: WaterModel) {
  const source=input.waterVolumeSource || 'CALCULATED';
  if (!['BROCHURE','CALCULATED'].includes(source)) throw new Error('Origen de volumen inválido.');
  if(source==='BROCHURE') {
    if(typeof input.waterVolumeM3!=='number'||!Number.isFinite(input.waterVolumeM3)||input.waterVolumeM3<=0||input.waterVolumeM3>1e6) throw new Error('Ingresá un volumen de folleto válido en m³.');
    return {waterVolumeM3:input.waterVolumeM3,waterVolumeSource:source};
  }
  const {volumeM3}=getPoolWaterVolume({...input,waterVolumeM3:null});
  if(volumeM3<=0 || volumeM3>1e6) throw new Error('Completá dimensiones válidas para calcular el volumen.');
  return {waterVolumeM3:volumeM3,waterVolumeSource:source};
}
/** Convierte m³ a litros y redondea sólo la cantidad de viajes al entero superior. */
export function calculateWaterDeliveries(volumeM3: number, truckLiters: number) {
  if(!Number.isFinite(volumeM3)||volumeM3<=0||!Number.isFinite(truckLiters)||truckLiters<=0) return {liters:0,trips:0,surplusLiters:0};
  const liters=Number((volumeM3*1000).toPrecision(15));
  const trips=Math.ceil(Number((liters/truckLiters).toPrecision(15)));
  return {liters,trips,surplusLiters:Number((trips*truckLiters-liters).toPrecision(15))};
}
