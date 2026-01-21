#!/usr/bin/env python3
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.drawing.image import Image as XLImage
import sys
import json
from datetime import datetime
import os
from pathlib import Path

def add_image_to_cell(ws, image_url, cell_ref, width=100, height=100):
    """
    Agrega una imagen a una celda del Excel si existe

    Args:
        ws: Hoja de trabajo
        image_url: URL relativa de la imagen (ej: /uploads/products/equipment/bomba.jpg)
        cell_ref: Referencia de celda (ej: 'B10')
        width: Ancho de la imagen en píxeles
        height: Alto de la imagen en píxeles

    Returns:
        True si se agregó la imagen, False si no
    """
    try:
        # Construir ruta absoluta desde la URL relativa
        if not image_url or not image_url.startswith('/'):
            return False

        # Ruta base del proyecto
        base_path = Path(__file__).parent.parent  # backend/
        image_path = base_path / image_url.lstrip('/')

        if not image_path.exists():
            print(f"⚠ Imagen no encontrada: {image_path}")
            return False

        # Crear objeto de imagen
        img = XLImage(str(image_path))

        # Redimensionar
        img.width = width
        img.height = height

        # Agregar a la celda
        ws.add_image(img, cell_ref)
        print(f"✓ Imagen agregada: {image_path.name} en {cell_ref}")
        return True
    except Exception as e:
        print(f"Error al agregar imagen {image_url}: {e}")
        return False

def export_project_to_excel(excel_path, project_data):
    """
    Exporta un proyecto a una nueva hoja en el Excel siguiendo el formato existente

    Args:
        excel_path: Ruta al archivo Excel
        project_data: Diccionario con los datos del proyecto
    """

    # Cargar el libro existente
    wb = openpyxl.load_workbook(excel_path)

    # Extraer datos anidados
    pool = project_data.get('pool', {})
    excavation = project_data.get('excavation', {})
    support_bed = project_data.get('supportBed', {})
    sidewalk = project_data.get('sidewalk', {})
    plumbing = project_data.get('plumbing', {})
    electrical = project_data.get('electrical', {})
    labor = project_data.get('labor', {})
    sections = project_data.get('sections', {})

    # Crear nombre de hoja basado en el proyecto
    sheet_name = f"{pool.get('name', 'Piscina')} - {project_data.get('clientName', 'Cliente')}"[:31]  # Max 31 caracteres

    # Si ya existe, eliminarla
    if sheet_name in wb.sheetnames:
        del wb[sheet_name]

    # Crear nueva hoja
    ws = wb.create_sheet(sheet_name)

    # Configurar estilos
    title_font = Font(name='Arial', size=14, bold=True)
    header_font = Font(name='Arial', size=11, bold=True)
    normal_font = Font(name='Arial', size=10)
    section_font = Font(name='Arial', size=12, bold=True)

    # Fila 2: Título
    ws['B2'] = 'Materiales e Instalación de Piscina'
    ws['B2'].font = title_font

    # Fila 4-8: Información del proyecto
    ws['B4'] = 'Fecha'
    ws['C4'] = datetime.now().strftime('%Y-%m-%d')
    ws['B5'] = 'Cliente'
    ws['C5'] = project_data.get('clientName', '-')
    ws['B6'] = 'Domicilio'
    ws['C6'] = project_data.get('address', '-')
    ws['B7'] = 'Piscina'
    ws['C7'] = f"{pool.get('name', '-')} ({pool.get('length', 0)}×{pool.get('width', 0)} m x {pool.get('shallowDepth', 0)} a {pool.get('deepDepth', 0)} metros de profundidad)"
    ws['B8'] = 'Volumen'
    ws['C8'] = f"{pool.get('volume', 0):.2f} m³ / Espejo de agua: {pool.get('waterMirrorArea', 0):.2f} m²"

    # Aplicar negrita a las etiquetas
    for row in [4, 5, 6, 7, 8]:
        ws[f'B{row}'].font = header_font

    # Fila 10: Encabezados de tabla
    ws['B10'] = 'Materiales / Consumible'
    ws['C10'] = 'Diámetro/Tipo'
    ws['D10'] = 'Unidad'
    ws['E10'] = 'Cantidad'
    ws['F10'] = 'Observaciones'
    for col in ['B', 'C', 'D', 'E', 'F']:
        ws[f'{col}10'].font = header_font

    # Fila 12: Responsable
    ws['B12'] = project_data.get('responsible', 'Jesús Olguin')
    ws['B12'].font = header_font

    current_row = 14

    # ===== SECCIÓN: EXCAVACIÓN =====
    if sections.get('excavation', True):
        ws[f'B{current_row}'] = 'EXCAVACIÓN'
        ws[f'B{current_row}'].font = section_font
        current_row += 1

        ws[f'B{current_row}'] = 'Longitud de excavación'
        ws[f'D{current_row}'] = 'm'
        ws[f'E{current_row}'] = excavation.get('length', 0)
        current_row += 1

        ws[f'B{current_row}'] = 'Ancho de excavación'
        ws[f'D{current_row}'] = 'm'
        ws[f'E{current_row}'] = excavation.get('width', 0)
        current_row += 1

        ws[f'B{current_row}'] = 'Profundidad de excavación'
        ws[f'D{current_row}'] = 'm'
        ws[f'E{current_row}'] = excavation.get('depth', 0)
        current_row += 1

        ws[f'B{current_row}'] = 'Volumen total de excavación'
        ws[f'D{current_row}'] = 'm³'
        ws[f'E{current_row}'] = excavation.get('volume', 0)
        current_row += 2

    # ===== SECCIÓN: CAMA DE APOYO =====
    if sections.get('supportBed', True):
        ws[f'B{current_row}'] = 'CAMA DE APOYO'
        ws[f'B{current_row}'].font = section_font
        current_row += 1

        materials = support_bed.get('materials', {})
        ws[f'B{current_row}'] = 'Cemento para la cama'
        ws[f'D{current_row}'] = materials.get('cementUnit', 'bolsas')
        ws[f'E{current_row}'] = materials.get('cement', 0)
        current_row += 1

        ws[f'B{current_row}'] = 'Arena gruesa'
        ws[f'D{current_row}'] = materials.get('sandUnit', 'm³')
        ws[f'E{current_row}'] = materials.get('sand', 0)
        current_row += 1

        ws[f'B{current_row}'] = 'Mixto para la cama'
        ws[f'D{current_row}'] = materials.get('mixedUnit', 'm³')
        ws[f'E{current_row}'] = materials.get('mixed', 0)
        current_row += 2

    # ===== SECCIÓN: VEREDA =====
    if sections.get('sidewalk', True):
        ws[f'B{current_row}'] = 'VEREDA'
        ws[f'B{current_row}'].font = section_font
        current_row += 1

        materials = sidewalk.get('materials', {})
        ws[f'B{current_row}'] = 'Cemento para vereda'
        ws[f'D{current_row}'] = materials.get('cementUnit', 'bolsas')
        ws[f'E{current_row}'] = materials.get('cement', 0)
        current_row += 1

        ws[f'B{current_row}'] = 'Arena para vereda'
        ws[f'D{current_row}'] = materials.get('sandUnit', 'm³')
        ws[f'E{current_row}'] = materials.get('sand', 0)
        current_row += 1

        ws[f'B{current_row}'] = 'Piedra para vereda'
        ws[f'D{current_row}'] = materials.get('stoneUnit', 'm³')
        ws[f'E{current_row}'] = materials.get('stone', 0)
        current_row += 1

        ws[f'B{current_row}'] = 'Malla sima'
        ws[f'D{current_row}'] = materials.get('meshUnit', 'unidad')
        ws[f'E{current_row}'] = materials.get('mesh', 0)
        current_row += 2

    # ===== SECCIÓN: PLOMERÍA =====
    if sections.get('plumbing', True):
        ws[f'B{current_row}'] = 'PLOMERÍA Y MATERIALES PVC'
        ws[f'B{current_row}'].font = section_font
        current_row += 1

        # Items de plomería con detalles completos
        plumbing_items = plumbing.get('items', [])
        if plumbing_items:
            for item in plumbing_items:
                ws[f'B{current_row}'] = item.get('name', '-')
                ws[f'C{current_row}'] = item.get('diameter', '-')
                ws[f'D{current_row}'] = item.get('type', 'PVC')
                ws[f'E{current_row}'] = item.get('quantity', 0)
                ws[f'F{current_row}'] = item.get('observations', '-')
                current_row += 1
        else:
            ws[f'B{current_row}'] = 'Sin items de plomería especificados'
            current_row += 1

        current_row += 1

    # ===== SECCIÓN: ELÉCTRICA =====
    if sections.get('electrical', True):
        ws[f'B{current_row}'] = 'INSTALACIÓN ELÉCTRICA Y EQUIPOS'
        ws[f'B{current_row}'].font = section_font
        current_row += 1

        # Bomba (con imagen si está disponible)
        pump = electrical.get('pump', {})
        pump_image_url = pump.get('imageUrl', None)

        ws[f'B{current_row}'] = 'Bomba'
        ws[f'C{current_row}'] = pump.get('power', '-')
        ws[f'E{current_row}'] = 1
        ws[f'F{current_row}'] = pump.get('observations', '-')

        # Intentar agregar imagen de la bomba
        if pump_image_url:
            # La imagen se inserta en la columna A de las siguientes filas
            image_added = add_image_to_cell(ws, pump_image_url, f'A{current_row}', width=80, height=80)
            if image_added:
                ws.row_dimensions[current_row].height = 60  # Ajustar altura de fila

        current_row += 1

        # Filtro (con imagen si está disponible)
        filter_data = electrical.get('filter', {})
        filter_image_url = filter_data.get('imageUrl', None)

        ws[f'B{current_row}'] = 'Filtro'
        ws[f'C{current_row}'] = filter_data.get('diameter', '-')
        ws[f'E{current_row}'] = 1
        ws[f'F{current_row}'] = filter_data.get('observations', '-')

        # Intentar agregar imagen del filtro
        if filter_image_url:
            image_added = add_image_to_cell(ws, filter_image_url, f'A{current_row}', width=80, height=80)
            if image_added:
                ws.row_dimensions[current_row].height = 60  # Ajustar altura de fila

        current_row += 1

        # Especificaciones eléctricas
        ws[f'B{current_row}'] = 'Consumo total'
        ws[f'E{current_row}'] = f"{electrical.get('watts', 0)} W"
        current_row += 1

        ws[f'B{current_row}'] = 'Amperaje'
        ws[f'E{current_row}'] = f"{electrical.get('amps', 0)} A"
        current_row += 1

        # Consumo desglosado
        consumption = electrical.get('consumptionBreakdown', [])
        if consumption:
            ws[f'B{current_row}'] = 'Desglose de consumo:'
            ws[f'B{current_row}'].font = header_font
            current_row += 1
            for item in consumption:
                ws[f'B{current_row}'] = f"  {item.get('item', '-')}"
                ws[f'E{current_row}'] = f"{item.get('watts', 0)} W"
                current_row += 1

        current_row += 1

    # ===== SECCIÓN: ANÁLISIS HIDRÁULICO PROFESIONAL =====
    hydraulic_analysis = project_data.get('hydraulicAnalysis', None)
    if sections.get('hydraulicAnalysis', True) and hydraulic_analysis:
        ws[f'B{current_row}'] = 'ANÁLISIS HIDRÁULICO PROFESIONAL'
        ws[f'B{current_row}'].font = section_font
        current_row += 1

        # TDH (Total Dynamic Head)
        tdh = hydraulic_analysis.get('totalDynamicHead', 0)
        ws[f'B{current_row}'] = 'TDH Total (Altura Dinámica Total)'
        ws[f'E{current_row}'] = f"{tdh:.2f} m"
        ws[f'F{current_row}'] = 'Altura que debe vencer la bomba'
        current_row += 1

        # Pérdidas por fricción
        friction = hydraulic_analysis.get('frictionLoss', {})
        ws[f'B{current_row}'] = 'Pérdida por fricción (succión)'
        ws[f'E{current_row}'] = f"{friction.get('suction', 0):.2f} m"
        current_row += 1

        ws[f'B{current_row}'] = 'Pérdida por fricción (retorno)'
        ws[f'E{current_row}'] = f"{friction.get('return', 0):.2f} m"
        current_row += 1

        ws[f'B{current_row}'] = 'Pérdida por fricción total'
        ws[f'E{current_row}'] = f"{friction.get('total', 0):.2f} m"
        ws[f'B{current_row}'].font = header_font
        current_row += 1

        # Pérdidas singulares
        singular = hydraulic_analysis.get('singularLoss', {})
        ws[f'B{current_row}'] = 'Pérdida singular (accesorios succión)'
        ws[f'E{current_row}'] = f"{singular.get('suction', 0):.2f} m"
        current_row += 1

        ws[f'B{current_row}'] = 'Pérdida singular (accesorios retorno)'
        ws[f'E{current_row}'] = f"{singular.get('return', 0):.2f} m"
        current_row += 1

        ws[f'B{current_row}'] = 'Pérdida singular total'
        ws[f'E{current_row}'] = f"{singular.get('total', 0):.2f} m"
        ws[f'B{current_row}'].font = header_font
        current_row += 1

        # Validaciones de velocidad
        velocity_checks = hydraulic_analysis.get('velocityChecks', [])
        if velocity_checks:
            ws[f'B{current_row}'] = 'Validación de velocidades:'
            ws[f'B{current_row}'].font = header_font
            current_row += 1
            for check in velocity_checks:
                line_type = check.get('lineType', '-')
                velocity = check.get('velocity', 0)
                is_ok = check.get('isOk', False)
                status = '✓ OK' if is_ok else '⚠ Fuera de rango'
                ws[f'B{current_row}'] = f"  {line_type}: {velocity:.2f} m/s - {status}"
                ws[f'F{current_row}'] = 'Rango óptimo: 1.5-2.5 m/s'
                current_row += 1

        # Advertencias
        warnings = hydraulic_analysis.get('warnings', [])
        if warnings:
            ws[f'B{current_row}'] = 'Advertencias:'
            ws[f'B{current_row}'].font = header_font
            current_row += 1
            for warning in warnings:
                ws[f'B{current_row}'] = f"  ⚠ {warning}"
                current_row += 1

        # Bomba recomendada
        recommended_pump = hydraulic_analysis.get('recommendedPump', None)
        if recommended_pump:
            ws[f'B{current_row}'] = 'Bomba seleccionada según TDH:'
            ws[f'B{current_row}'].font = header_font
            current_row += 1

            pump_name = recommended_pump.get('name', '-')
            pump_flow_rate = recommended_pump.get('flowRate', '-')
            pump_description = recommended_pump.get('description', '-')
            pump_image_url = recommended_pump.get('imageUrl', None)

            ws[f'B{current_row}'] = f"  {pump_name}"
            ws[f'C{current_row}'] = pump_flow_rate
            ws[f'F{current_row}'] = pump_description

            # Intentar agregar imagen de la bomba recomendada
            if pump_image_url:
                image_added = add_image_to_cell(ws, pump_image_url, f'A{current_row}', width=80, height=80)
                if image_added:
                    ws.row_dimensions[current_row].height = 60  # Ajustar altura de fila

            current_row += 1

        current_row += 1

    # ===== SECCIÓN: ANÁLISIS ELÉCTRICO PROFESIONAL =====
    electrical_analysis = project_data.get('electricalAnalysis', None)
    if sections.get('electricalAnalysis', True) and electrical_analysis:
        ws[f'B{current_row}'] = 'ANÁLISIS ELÉCTRICO PROFESIONAL'
        ws[f'B{current_row}'].font = section_font
        current_row += 1

        # Potencia total
        total_power = electrical_analysis.get('totalPowerInstalled', 0)
        demand_power = electrical_analysis.get('totalPowerDemand', 0)
        total_current = electrical_analysis.get('totalCurrent', 0)

        ws[f'B{current_row}'] = 'Potencia instalada total'
        ws[f'E{current_row}'] = f"{total_power:.0f} W"
        current_row += 1

        ws[f'B{current_row}'] = 'Potencia de demanda (con simultaneidad)'
        ws[f'E{current_row}'] = f"{demand_power:.0f} W"
        ws[f'F{current_row}'] = 'Considera factor de simultaneidad'
        current_row += 1

        ws[f'B{current_row}'] = 'Corriente total calculada'
        ws[f'E{current_row}'] = f"{total_current:.2f} A"
        ws[f'F{current_row}'] = 'Con factor de potencia y eficiencia'
        ws[f'B{current_row}'].font = header_font
        current_row += 1

        # Cable dimensionado
        cable = electrical_analysis.get('cable', {})
        ws[f'B{current_row}'] = 'Cable recomendado'
        ws[f'C{current_row}'] = f"{cable.get('section', '-')} mm²"
        ws[f'F{current_row}'] = f"Caída de tensión: {cable.get('voltageDrop', 0):.2f}% (máx 3%)"
        current_row += 1

        ws[f'B{current_row}'] = 'Capacidad de corriente del cable'
        ws[f'E{current_row}'] = f"{cable.get('currentCapacity', 0):.1f} A"
        current_row += 1

        # Protecciones
        protection = electrical_analysis.get('protection', {})
        ws[f'B{current_row}'] = 'Interruptor termomagnético (Breaker)'
        ws[f'C{current_row}'] = f"{protection.get('breakerSize', 0)} A"
        ws[f'F{current_row}'] = 'Curva C recomendada'
        current_row += 1

        ws[f'B{current_row}'] = 'Diferencial (RCD)'
        ws[f'C{current_row}'] = f"{protection.get('rcdSize', 0)} A / 30 mA"
        ws[f'F{current_row}'] = 'Obligatorio para piscinas'
        current_row += 1

        # Cargas individuales
        loads = electrical_analysis.get('loads', [])
        if loads:
            ws[f'B{current_row}'] = 'Desglose de cargas eléctricas:'
            ws[f'B{current_row}'].font = header_font
            current_row += 1
            ws[f'B{current_row}'] = 'Equipo'
            ws[f'C{current_row}'] = 'Potencia (W)'
            ws[f'D{current_row}'] = 'Corriente (A)'
            ws[f'E{current_row}'] = 'FP (cos φ)'
            ws[f'F{current_row}'] = 'Observaciones'
            for col in ['B', 'C', 'D', 'E', 'F']:
                ws[f'{col}{current_row}'].font = header_font
            current_row += 1

            for load in loads:
                ws[f'B{current_row}'] = load.get('name', '-')
                ws[f'C{current_row}'] = f"{load.get('power', 0)} W"
                ws[f'D{current_row}'] = f"{load.get('current', 0):.2f} A"
                ws[f'E{current_row}'] = f"{load.get('powerFactor', 1):.2f}"
                ws[f'F{current_row}'] = f"Eficiencia: {load.get('efficiency', 1):.0%}"
                current_row += 1

        # Costo operativo
        operating_cost = electrical_analysis.get('operatingCost', {})
        if operating_cost:
            ws[f'B{current_row}'] = 'Costo operativo estimado:'
            ws[f'B{current_row}'].font = header_font
            current_row += 1

            ws[f'B{current_row}'] = 'Consumo diario'
            ws[f'E{current_row}'] = f"{operating_cost.get('dailyKwh', 0):.2f} kWh"
            current_row += 1

            ws[f'B{current_row}'] = 'Costo mensual estimado'
            ws[f'E{current_row}'] = f"${operating_cost.get('monthlyCost', 0):.2f}"
            ws[f'F{current_row}'] = '8 hrs/día promedio'
            current_row += 1

            ws[f'B{current_row}'] = 'Costo anual estimado'
            ws[f'E{current_row}'] = f"${operating_cost.get('annualCost', 0):.2f}"
            current_row += 1

        # Advertencias eléctricas
        elec_warnings = electrical_analysis.get('warnings', [])
        if elec_warnings:
            ws[f'B{current_row}'] = 'Advertencias eléctricas:'
            ws[f'B{current_row}'].font = header_font
            current_row += 1
            for warning in elec_warnings:
                ws[f'B{current_row}'] = f"  ⚠ {warning}"
                current_row += 1

        current_row += 1

    # ===== SECCIÓN: MANO DE OBRA =====
    if sections.get('labor', True):
        ws[f'B{current_row}'] = 'MANO DE OBRA'
        ws[f'B{current_row}'].font = section_font
        current_row += 1

        roles = labor.get('roles', [])
        if roles:
            ws[f'B{current_row}'] = 'Rol'
            ws[f'C{current_row}'] = 'Tareas'
            ws[f'D{current_row}'] = 'Horas'
            ws[f'E{current_row}'] = 'Costo'
            for col in ['B', 'C', 'D', 'E']:
                ws[f'{col}{current_row}'].font = header_font
            current_row += 1

            total_labor_cost = 0
            for role in roles:
                ws[f'B{current_row}'] = role.get('role', '-')
                ws[f'C{current_row}'] = role.get('tasks', 0)
                ws[f'D{current_row}'] = role.get('hours', 0)
                ws[f'E{current_row}'] = f"${role.get('cost', 0):,.2f}"
                total_labor_cost += role.get('cost', 0)
                current_row += 1

            # Total de mano de obra
            ws[f'B{current_row}'] = 'TOTAL MANO DE OBRA'
            ws[f'B{current_row}'].font = header_font
            ws[f'E{current_row}'] = f"${total_labor_cost:,.2f}"
            ws[f'E{current_row}'].font = header_font
            current_row += 1
        else:
            ws[f'B{current_row}'] = 'Sin mano de obra especificada'
            current_row += 1

        current_row += 1

    # ===== SECCIÓN: SECUENCIA DE TRABAJO =====
    if sections.get('sequence', True):
        ws[f'B{current_row}'] = 'SECUENCIA DE TRABAJO'
        ws[f'B{current_row}'].font = section_font
        current_row += 1

        ws[f'B{current_row}'] = '1. Marcado y replanteo del terreno'
        current_row += 1
        ws[f'B{current_row}'] = '2. Excavación según dimensiones especificadas'
        current_row += 1
        ws[f'B{current_row}'] = '3. Preparación de cama de apoyo'
        current_row += 1
        ws[f'B{current_row}'] = '4. Instalación de la piscina'
        current_row += 1
        ws[f'B{current_row}'] = '5. Instalación hidráulica (plomería)'
        current_row += 1
        ws[f'B{current_row}'] = '6. Instalación eléctrica y equipos'
        current_row += 1
        ws[f'B{current_row}'] = '7. Relleno y compactación'
        current_row += 1
        ws[f'B{current_row}'] = '8. Construcción de vereda perimetral'
        current_row += 1
        ws[f'B{current_row}'] = '9. Pruebas de funcionamiento'
        current_row += 2

    # ===== SECCIÓN: NORMAS Y OBSERVACIONES =====
    if sections.get('standards', True):
        ws[f'B{current_row}'] = 'NORMAS Y OBSERVACIONES'
        ws[f'B{current_row}'].font = section_font
        current_row += 1

        ws[f'B{current_row}'] = '• Todos los materiales deben cumplir con normas IRAM vigentes'
        current_row += 1
        ws[f'B{current_row}'] = '• La instalación eléctrica debe ser realizada por electricista matriculado'
        current_row += 1
        ws[f'B{current_row}'] = '• Los equipos deben instalarse en lugar ventilado y protegido'
        current_row += 1
        ws[f'B{current_row}'] = '• Realizar prueba de estanqueidad antes del llenado final'
        current_row += 1
        ws[f'B{current_row}'] = '• Coordinar con albañil para trabajos de vereda y relleno'
        current_row += 1

    # Ajustar anchos de columna
    ws.column_dimensions['A'].width = 2
    ws.column_dimensions['B'].width = 50
    ws.column_dimensions['C'].width = 15
    ws.column_dimensions['D'].width = 12
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 30

    # Guardar el archivo
    wb.save(excel_path)
    print(f"✅ Hoja '{sheet_name}' agregada exitosamente al Excel")
    return sheet_name

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso: python export_to_excel.py <json_data>")
        sys.exit(1)

    # Leer datos del proyecto desde JSON
    project_data = json.loads(sys.argv[1])

    # Ruta al archivo Excel
    excel_path = '/home/jesusolguin/Projects/pool-calculator/backend/public/CALCULADORA MATERIALES AQUAM.xlsx'

    # Exportar
    export_project_to_excel(excel_path, project_data)
