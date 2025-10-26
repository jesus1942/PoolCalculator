#!/usr/bin/env python3
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
import sys
import json
from datetime import datetime

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

        # Bomba
        pump = electrical.get('pump', {})
        ws[f'B{current_row}'] = 'Bomba'
        ws[f'C{current_row}'] = pump.get('power', '-')
        ws[f'E{current_row}'] = 1
        ws[f'F{current_row}'] = pump.get('observations', '-')
        current_row += 1

        # Filtro
        filter_data = electrical.get('filter', {})
        ws[f'B{current_row}'] = 'Filtro'
        ws[f'C{current_row}'] = filter_data.get('diameter', '-')
        ws[f'E{current_row}'] = 1
        ws[f'F{current_row}'] = filter_data.get('observations', '-')
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
