# Guía de Cálculos Profesionales - Pool Calculator

## 📐 Descripción General

Se ha implementado un **sistema profesional de cálculos hidráulicos y eléctricos** que utiliza los datos reales del proyecto (diámetros de accesorios, equipos seleccionados, distancias) para realizar cálculos precisos basados en normativas y fórmulas ingenieriles.

---

## 🔧 Módulos Implementados

### 1. **Cálculos Hidráulicos** (`hydraulicCalculations.ts`)

#### Características:
- ✅ **Pérdida de carga por fricción** (Fórmula de Hazen-Williams)
- ✅ **Pérdida de carga singular** por accesorios (codos, tees, válvulas)
- ✅ **TDH (Total Dynamic Head)** real considerando:
  - Altura de aspiración
  - Pérdidas por fricción
  - Pérdidas singulares
  - Presión requerida en filtro
- ✅ **Validación de velocidad del agua** (1.5 - 2.5 m/s)
- ✅ **Selección de bomba según TDH y caudal requerido**
- ✅ **Extracción de datos reales** del proyecto (diámetros, accesorios)

#### Fórmulas Utilizadas:

**Pérdida de fricción (Hazen-Williams):**
```
hf = 10.67 × Q^1.85 × L / (C^1.85 × D^4.87)

Donde:
  hf = pérdida de carga (m)
  Q  = caudal (m³/s)
  L  = longitud tubería (m)
  C  = coeficiente rugosidad (PVC=150, PP=140)
  D  = diámetro interno (m)
```

**Pérdida singular:**
```
hs = K × v² / (2g)

Donde:
  hs = pérdida singular (m)
  K  = coeficiente de pérdida (codo 90°=0.9, tee=1.8, etc.)
  v  = velocidad (m/s)
  g  = gravedad (9.81 m/s²)
```

**TDH Total:**
```
TDH = Altura estática + hf + hs + Presión_filtro

Con factor de seguridad del 15%
```

**Velocidad del agua:**
```
v = Q / A

Donde:
  A = π × (D/2)²
```

---

### 2. **Cálculos Eléctricos** (`electricalCalculations.ts`)

#### Características:
- ✅ **Caída de tensión real** según distancia y sección
- ✅ **Factor de potencia** por tipo de carga
- ✅ **Factor de temperatura** ambiente
- ✅ **Factor de instalación** (aérea, enterrada, cañería)
- ✅ **Dimensionamiento de cable** según normativa (máx. 3% caída)
- ✅ **Breaker y diferencial** automáticos
- ✅ **Costos operativos** (diario, mensual, anual)
- ✅ **Factor de simultaneidad** (no todos los equipos funcionan al mismo tiempo)

#### Fórmulas Utilizadas:

**Caída de tensión:**
```
ΔV = (2 × L × I × ρ) / S

Donde:
  ΔV = caída de tensión (V)
  L  = longitud del cable (m)
  I  = corriente (A)
  ρ  = resistividad del conductor (cobre=0.01724 Ohm·mm²/m)
  S  = sección del cable (mm²)
```

**Corriente con factor de potencia:**
```
I = P / (V × cos φ × η)

Donde:
  P   = potencia (W)
  V   = voltaje (V)
  cosφ = factor de potencia
  η   = eficiencia
```

**Breaker recomendado:**
```
Breaker = I × 1.25  (factor de seguridad 25%)

Redondeado al valor estándar superior
```

---

## 🌐 API Endpoints

### Base URL: `/api/professional-calculations`

#### 1. **GET /:projectId**
Obtiene cálculos profesionales completos (hidráulico + eléctrico)

**Query Parameters:**
- `distanceToEquipment`: número (metros) - default: 5
- `staticLift`: número (metros) - default: 1.5
- `voltage`: 220 | 380 - default: 220
- `installationType`: 'AERIAL' | 'BURIED' | 'CONDUIT' - default: 'CONDUIT'
- `ambientTemp`: número (°C) - default: 25

**Ejemplo:**
```bash
GET /api/professional-calculations/abc123?distanceToEquipment=8&staticLift=2
```

**Respuesta:**
```json
{
  "project": {
    "id": "abc123",
    "name": "Piscina Residencial",
    "volume": 45.5
  },
  "equipment": {
    "pump": {
      "name": "Bomba Pentair 1.5HP",
      "flowRate": 18,
      "maxHead": 20,
      "connectionSize": "2\"",
      "price": 85000
    },
    "filter": {
      "name": "Filtro 24\" Hayward",
      "diameter": 610,
      "area": 0.292,
      "sandRequired": 120,
      "price": 65000
    }
  },
  "hydraulicAnalysis": {
    "frictionLoss": {
      "suction": 1.8,
      "return": 1.2,
      "total": 3.0
    },
    "singularLoss": {
      "suction": 0.8,
      "return": 0.5,
      "total": 1.3
    },
    "totalDynamicHead": 16.5,
    "velocityChecks": [
      {
        "section": "Línea de Succión",
        "velocity": 2.1,
        "diameter": 50,
        "isValid": true,
        "recommendation": "Velocidad óptima"
      }
    ],
    "recommendedPump": { /* ... */ },
    "warnings": [],
    "errors": [],
    "isValid": true
  },
  "electricalAnalysis": {
    "loads": [
      {
        "name": "Bomba de filtrado",
        "power": 1118,
        "voltage": 220,
        "powerFactor": 0.85
      }
    ],
    "totalPowerInstalled": 1568,
    "totalPowerDemand": 1418,
    "totalCurrent": 7.5,
    "cable": {
      "section": 2.5,
      "sectionLabel": "2.5mm²",
      "voltageDrop": 2.1,
      "voltageDropPercent": 0.95,
      "acceptable": true
    },
    "protection": {
      "breaker": 10,
      "rcd": 16,
      "breakerType": "C",
      "rcdSensitivity": 30
    },
    "operatingCost": {
      "dailyKwh": 11.3,
      "dailyCost": 565,
      "monthlyCost": 16950,
      "annualCost": 206225
    },
    "warnings": [],
    "errors": [],
    "isValid": true
  },
  "summary": {
    "hydraulic": {
      "isValid": true,
      "totalDynamicHead": 16.5,
      "recommendedPump": "Bomba Pentair 1.5HP",
      "warningsCount": 0,
      "errorsCount": 0
    },
    "electrical": {
      "isValid": true,
      "totalPower": 1418,
      "cableSection": "2.5mm²",
      "breaker": 10,
      "monthlyCost": 16950,
      "warningsCount": 0,
      "errorsCount": 0
    }
  }
}
```

---

#### 2. **GET /:projectId/hydraulic**
Obtiene solo análisis hidráulico

**Query Parameters:**
- `distanceToEquipment`: número (metros) - default: 5
- `staticLift`: número (metros) - default: 1.5

---

#### 3. **GET /:projectId/electrical**
Obtiene solo análisis eléctrico

**Query Parameters:**
- `distanceToPanel`: número (metros) - default: 10
- `voltage`: 220 | 380 - default: 220
- `installationType`: 'AERIAL' | 'BURIED' | 'CONDUIT' - default: 'CONDUIT'
- `ambientTemp`: número (°C) - default: 25

---

#### 4. **GET /:projectId/electrical-report**
Genera reporte en texto plano del análisis eléctrico

**Returns:** `text/plain`

**Ejemplo de respuesta:**
```
=== INFORME ELÉCTRICO PROFESIONAL ===

1. CARGAS INSTALADAS:
   • Bomba de filtrado: 1118W (1x1118W) @ 220V
     Factor potencia: 0.85 | Simultaneidad: 100%
   • Luces LED RGB: 300W (6x50W) @ 12V
     Factor potencia: 0.95 | Simultaneidad: 50%

2. CONSUMO TOTAL:
   • Potencia instalada: 1.57 kW
   • Potencia de demanda: 1.42 kW
   • Corriente: 7.50 A

3. CONDUCTOR:
   • Sección: 2.5mm²
   • Caída de tensión: 2.09V (0.95%)
   • Estado: ✓ Cumple normativa

4. PROTECCIONES:
   • Térmica: 10A Curva C
   • Diferencial: 16A / 30mA

5. COSTOS OPERATIVOS:
   • Consumo diario: 11.34 kWh
   • Costo diario: $567
   • Costo mensual: $17007
   • Costo anual: $206807
```

---

#### 5. **POST /:projectId/validate**
Valida compatibilidad de componentes seleccionados

**Body:**
```json
{
  "pumpId": "pump-abc-123",
  "filterId": "filter-xyz-456",
  "distanceToEquipment": 8,
  "staticLift": 2
}
```

**Respuesta:**
```json
{
  "compatible": true,
  "pump": {
    "name": "Bomba Pentair 1.5HP",
    "flowRate": 18,
    "maxHead": 20
  },
  "filter": {
    "name": "Filtro 24\" Hayward",
    "flowRate": 17
  },
  "hydraulicAnalysis": {
    "totalDynamicHead": 16.5,
    "velocityChecks": [ /* ... */ ]
  },
  "issues": [],
  "warnings": [],
  "recommendation": "Los componentes son compatibles y adecuados para el proyecto."
}
```

---

## 🧪 Testing

### Ejemplo de uso con cURL:

```bash
# Análisis completo
curl -X GET "http://localhost:3000/api/professional-calculations/PROJECT_ID?distanceToEquipment=8&staticLift=2" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Solo hidráulico
curl -X GET "http://localhost:3000/api/professional-calculations/PROJECT_ID/hydraulic?distanceToEquipment=8" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Solo eléctrico
curl -X GET "http://localhost:3000/api/professional-calculations/PROJECT_ID/electrical?distanceToPanel=12&voltage=220" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Reporte eléctrico en texto
curl -X GET "http://localhost:3000/api/professional-calculations/PROJECT_ID/electrical-report" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Validar compatibilidad
curl -X POST "http://localhost:3000/api/professional-calculations/PROJECT_ID/validate" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pumpId": "pump-id",
    "filterId": "filter-id",
    "distanceToEquipment": 8,
    "staticLift": 2
  }'
```

---

## 📊 Integración con Frontend

### Próximos pasos para el frontend:

1. **Crear servicio API** (`professionalCalculationsService.ts`):
```typescript
export const professionalCalculationsService = {
  async getFullAnalysis(projectId: string, params?: CalculationParams) {
    const response = await api.get(`/professional-calculations/${projectId}`, { params });
    return response.data;
  },

  async getHydraulicAnalysis(projectId: string, params?: HydraulicParams) {
    const response = await api.get(`/professional-calculations/${projectId}/hydraulic`, { params });
    return response.data;
  },

  async getElectricalAnalysis(projectId: string, params?: ElectricalParams) {
    const response = await api.get(`/professional-calculations/${projectId}/electrical`, { params });
    return response.data;
  },

  async validateComponents(projectId: string, data: ValidationData) {
    const response = await api.post(`/professional-calculations/${projectId}/validate`, data);
    return response.data;
  }
};
```

2. **Componente de visualización** (`ProfessionalAnalysisPanel.tsx`):
   - Mostrar TDH y pérdidas de carga
   - Gráfico de velocidades en tuberías
   - Desglose de consumo eléctrico
   - Warnings y errores con iconos
   - Costos operativos mensuales/anuales

3. **Integración en `ProjectDetail`**:
   - Agregar tab "Análisis Profesional"
   - Inputs para distancia al equipo y altura
   - Botón "Recalcular" con nuevos parámetros

---

## 🔍 Validaciones y Warnings

### Hidráulicos:
- ⚠️ Velocidad muy baja (< 1.5 m/s) - Riesgo de sedimentación
- ⚠️ Velocidad muy alta (> 2.5 m/s) - Riesgo de ruido y erosión
- ⚠️ Altura de aspiración elevada (> 3m) - Riesgo de cavitación
- ❌ Bomba insuficiente para TDH requerido

### Eléctricos:
- ⚠️ Caída de tensión cercana al límite (> 2.5%)
- ⚠️ Distancia muy larga (> 50m) - Considerar 380V
- ⚠️ Temperatura ambiente alta - Factor de corrección aplicado
- ❌ Caída de tensión excesiva (> 3%)
- ❌ Cable insuficiente para corriente

---

## 📚 Referencias Normativas

- **Hidráulica**: Fórmula de Hazen-Williams (estándar internacional)
- **Eléctrica**:
  - IEC 60364 (instalaciones eléctricas)
  - NEC (National Electrical Code)
  - REBT España (Reglamento Electrotécnico de Baja Tensión)
  - Caída de tensión máxima: 3% según normativa

---

## 🚀 Ventajas del Nuevo Sistema

### Antes:
- ❌ Cálculos genéricos sin considerar datos reales
- ❌ Selección de bomba solo por volumen
- ❌ Sin validación de velocidades
- ❌ Cable sin considerar caída de tensión
- ❌ Sin factor de potencia ni simultaneidad

### Ahora:
- ✅ Usa diámetros reales de accesorios del proyecto
- ✅ Selección de bomba según TDH real (pérdidas de carga)
- ✅ Validación de velocidades (1.5-2.5 m/s)
- ✅ Caída de tensión real según distancia y sección
- ✅ Factor de potencia, eficiencia y simultaneidad
- ✅ Warnings y errores específicos
- ✅ Costos operativos precisos
- ✅ Cumplimiento normativo verificado

---

## 📝 Notas Técnicas

1. **Coeficiente C de Hazen-Williams**:
   - PVC: 150
   - Polipropileno: 140
   - Cobre: 130

2. **Coeficientes K de pérdida singular**:
   - Codo 90°: 0.9
   - Codo 45°: 0.4
   - Tee: 1.8
   - Válvula de bola: 0.2
   - Válvula check: 2.5
   - Filtro: 5.0

3. **Factores de seguridad**:
   - TDH: 15%
   - Selección de bomba: 10%
   - Breaker: 25%

4. **Factores de potencia típicos**:
   - Bombas (motores): 0.85
   - LED: 0.95
   - Calefacción: 0.98
   - Equipos electrónicos: 0.90

---

## 🐛 Debugging

Para verificar que los cálculos funcionan correctamente:

1. **Verificar logs del backend** al iniciar:
```
[INIT] professionalCalculationsRoutes cargado
...
Professional Calculations: http://localhost:3000/api/professional-calculations
```

2. **Test básico**:
```bash
# Health check
curl http://localhost:3000/health

# Test con proyecto existente
curl -X GET "http://localhost:3000/api/professional-calculations/YOUR_PROJECT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Verificar tipos TypeScript**:
```bash
cd backend
npx tsc --noEmit
```

---

## ✅ Estado de Implementación

- [x] Servicio de cálculos hidráulicos
- [x] Servicio de cálculos eléctricos
- [x] Integración en equipmentSelection
- [x] API endpoints
- [x] Rutas configuradas
- [ ] Frontend - Servicio API
- [ ] Frontend - Componentes visualización
- [ ] Frontend - Integración en ProjectDetail
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Documentación de usuario

---

**Última actualización:** 2025-01-23
**Versión:** 1.0.0
