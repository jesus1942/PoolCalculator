import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Project } from '@/types';
import { FileText, FileSpreadsheet, Download, Printer } from 'lucide-react';

interface ExportManagerProps {
  project: Project;
}

export const ExportManager: React.FC<ExportManagerProps> = ({ project }) => {
  const generateHTMLReport = () => {
    const materials = project.materials as any;
    const plumbingConfig = project.plumbingConfig as any;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presupuesto - ${project.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #1e40af; margin: 0; }
    .header .subtitle { color: #64748b; font-size: 14px; margin-top: 5px; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
    .info-item { padding: 10px; background: #f8fafc; border-radius: 5px; }
    .info-label { font-size: 12px; color: #64748b; margin-bottom: 3px; }
    .info-value { font-weight: bold; color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #2563eb; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    tr:hover { background: #f8fafc; }
    .cost-summary { background: #dbeafe; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .cost-row { display: flex; justify-content: space-between; margin: 10px 0; }
    .cost-total { font-size: 24px; font-weight: bold; color: #1e40af; border-top: 2px solid #2563eb; padding-top: 15px; margin-top: 15px; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
    @media print {
      body { margin: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PRESUPUESTO DE PISCINA</h1>
    <div class="subtitle">Pool Installer - ${new Date().toLocaleDateString('es-AR')}</div>
  </div>

  <div class="section">
    <h2>Información del Proyecto</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Proyecto</div>
        <div class="info-value">${project.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Cliente</div>
        <div class="info-value">${project.clientName}</div>
      </div>
      ${project.clientEmail ? `
      <div class="info-item">
        <div class="info-label">Email</div>
        <div class="info-value">${project.clientEmail}</div>
      </div>` : ''}
      ${project.clientPhone ? `
      <div class="info-item">
        <div class="info-label">Teléfono</div>
        <div class="info-value">${project.clientPhone}</div>
      </div>` : ''}
      ${project.location ? `
      <div class="info-item">
        <div class="info-label">Ubicación</div>
        <div class="info-value">${project.location}</div>
      </div>` : ''}
      <div class="info-item">
        <div class="info-label">Estado</div>
        <div class="info-value">${project.status}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Especificaciones de la Piscina</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Modelo</div>
        <div class="info-value">${project.poolPreset?.name || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Dimensiones</div>
        <div class="info-value">${project.poolPreset?.length}m x ${project.poolPreset?.width}m x ${project.poolPreset?.depth}m</div>
      </div>
      <div class="info-item">
        <div class="info-label">Volumen</div>
        <div class="info-value">${project.volume.toFixed(2)} m³ (${(project.volume * 1000).toFixed(0)} litros)</div>
      </div>
      <div class="info-item">
        <div class="info-label">Perímetro</div>
        <div class="info-value">${project.perimeter.toFixed(2)} m</div>
      </div>
      <div class="info-item">
        <div class="info-label">Excavación</div>
        <div class="info-value">${project.excavationLength.toFixed(2)}m x ${project.excavationWidth.toFixed(2)}m x ${project.excavationDepth.toFixed(2)}m</div>
      </div>
      <div class="info-item">
        <div class="info-label">Área Espejo de Agua</div>
        <div class="info-value">${project.waterMirrorArea.toFixed(2)} m²</div>
      </div>
    </div>
  </div>

  ${materials && Object.keys(materials).length > 0 ? `
  <div class="section">
    <h2>Materiales de Construcción</h2>
    <h3 style="color: #475569; font-size: 16px; margin-top: 20px;">Vereda (${project.sidewalkArea.toFixed(2)} m²)</h3>
    <table>
      <thead>
        <tr>
          <th>Material</th>
          <th style="text-align: center;">Cantidad</th>
          <th style="text-align: center;">Unidad</th>
        </tr>
      </thead>
      <tbody>
        ${materials.adhesive ? `<tr><td>Pegamento</td><td style="text-align: center;">${materials.adhesive.quantity}</td><td style="text-align: center;">${materials.adhesive.unit}</td></tr>` : ''}
        ${materials.cement ? `<tr><td>Cemento</td><td style="text-align: center;">${materials.cement.quantity}</td><td style="text-align: center;">${materials.cement.unit}</td></tr>` : ''}
        ${materials.sand && parseFloat(materials.sand.quantity) > 0 ? `<tr><td>Arena</td><td style="text-align: center;">${materials.sand.quantity}</td><td style="text-align: center;">${materials.sand.unit}</td></tr>` : ''}
        ${materials.gravel && parseFloat(materials.gravel.quantity) > 0 ? `<tr><td>Piedra</td><td style="text-align: center;">${materials.gravel.quantity}</td><td style="text-align: center;">${materials.gravel.unit}</td></tr>` : ''}
        ${materials.whiteCement ? `<tr><td>Cemento Blanco</td><td style="text-align: center;">${materials.whiteCement.quantity}</td><td style="text-align: center;">${materials.whiteCement.unit}</td></tr>` : ''}
        ${materials.marmolina ? `<tr><td>Marmolina</td><td style="text-align: center;">${materials.marmolina.quantity}</td><td style="text-align: center;">${materials.marmolina.unit}</td></tr>` : ''}
        ${materials.wireMesh ? `<tr><td>Malla Metálica</td><td style="text-align: center;">${materials.wireMesh.quantity}</td><td style="text-align: center;">${materials.wireMesh.unit}</td></tr>` : ''}
        ${materials.waterproofing && materials.waterproofing.quantity > 0 ? `<tr><td>Impermeabilizante</td><td style="text-align: center;">${materials.waterproofing.quantity}</td><td style="text-align: center;">${materials.waterproofing.unit}</td></tr>` : ''}
      </tbody>
    </table>

    <h3 style="color: #475569; font-size: 16px; margin-top: 20px;">Cama Interna</h3>
    <table>
      <thead>
        <tr>
          <th>Material</th>
          <th style="text-align: center;">Cantidad</th>
          <th style="text-align: center;">Unidad</th>
        </tr>
      </thead>
      <tbody>
        ${materials.geomembrane ? `<tr><td>Geomembrana</td><td style="text-align: center;">${materials.geomembrane.quantity}</td><td style="text-align: center;">${materials.geomembrane.unit}</td></tr>` : ''}
        ${materials.electroweldedMesh ? `<tr><td>Malla Electrosoldada</td><td style="text-align: center;">${materials.electroweldedMesh.quantity}</td><td style="text-align: center;">${materials.electroweldedMesh.unit}</td></tr>` : ''}
        ${materials.sandForBed && parseFloat(materials.sandForBed.quantity) > 0 ? `<tr><td>Arena para Cama</td><td style="text-align: center;">${materials.sandForBed.quantity}</td><td style="text-align: center;">${materials.sandForBed.unit}</td></tr>` : ''}
        ${materials.cementBags ? `<tr><td>Cemento (bolsas)</td><td style="text-align: center;">${materials.cementBags.quantity}</td><td style="text-align: center;">${materials.cementBags.unit}</td></tr>` : ''}
        ${materials.drainStone && parseFloat(materials.drainStone.quantity) > 0 ? `<tr><td>Piedra para Drenaje</td><td style="text-align: center;">${materials.drainStone.quantity}</td><td style="text-align: center;">${materials.drainStone.unit}</td></tr>` : ''}
      </tbody>
    </table>
  </div>` : ''}

  ${plumbingConfig && plumbingConfig.selectedItems && plumbingConfig.selectedItems.length > 0 ? `
  <div class="section">
    <h2>Instalaciones Hidráulicas</h2>
    ${plumbingConfig.distanceToEquipment ? `<p><strong>Distancia a cabecera:</strong> ${plumbingConfig.distanceToEquipment} metros</p>` : ''}
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Diámetro</th>
          <th style="text-align: center;">Cantidad</th>
          <th style="text-align: right;">Precio Unit.</th>
          <th style="text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${plumbingConfig.selectedItems.map((item: any) => `
          <tr>
            <td>${item.itemName}</td>
            <td style="text-align: center;">${item.diameter || '-'}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">$${item.pricePerUnit.toLocaleString('es-AR')}</td>
            <td style="text-align: right;">$${(item.pricePerUnit * item.quantity).toLocaleString('es-AR')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <div class="section">
    <h2>Resumen de Costos</h2>
    <div class="cost-summary">
      <div class="cost-row">
        <span>Materiales:</span>
        <strong>$${project.materialCost.toLocaleString('es-AR')}</strong>
      </div>
      <div class="cost-row">
        <span>Mano de Obra:</span>
        <strong>$${project.laborCost.toLocaleString('es-AR')}</strong>
      </div>
      <div class="cost-row cost-total">
        <span>TOTAL:</span>
        <span>$${project.totalCost.toLocaleString('es-AR')}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Presupuesto generado por Pool Installer el ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR')}</p>
    <p>Este presupuesto tiene una validez de 30 días desde su emisión</p>
  </div>
</body>
</html>
    `;

    return html;
  };

  const handlePrintReport = () => {
    const html = generateHTMLReport();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleDownloadHTML = () => {
    const html = generateHTMLReport();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presupuesto-${project.name.replace(/\s+/g, '-').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const materials = project.materials as any;
    let csv = 'Categoría,Material,Cantidad,Unidad\n';

    // Materiales de vereda
    if (materials) {
      Object.entries(materials).forEach(([key, value]: [string, any]) => {
        if (value && value.quantity) {
          csv += `Vereda/Cama,${key},${value.quantity},${value.unit}\n`;
        }
      });
    }

    // Plomería
    const plumbingConfig = project.plumbingConfig as any;
    if (plumbingConfig && plumbingConfig.selectedItems) {
      plumbingConfig.selectedItems.forEach((item: any) => {
        csv += `Plomería,${item.itemName},${item.quantity},unidades\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `materiales-${project.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold mb-4">Exportar Presupuesto</h3>
        <p className="text-gray-600 mb-6">
          Genera reportes y exporta los datos del proyecto en diferentes formatos
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3">
              <FileText className="text-blue-600 mt-1" size={24} />
              <div className="flex-1">
                <h4 className="font-medium mb-1">Presupuesto HTML</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Genera un presupuesto completo en formato HTML con todos los detalles
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleDownloadHTML}>
                    <Download size={16} className="mr-2" />
                    Descargar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handlePrintReport}>
                    <Printer size={16} className="mr-2" />
                    Imprimir
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="text-green-600 mt-1" size={24} />
              <div className="flex-1">
                <h4 className="font-medium mb-1">Lista de Materiales CSV</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Exporta la lista de materiales en formato CSV para Excel/Sheets
                </p>
                <Button size="sm" onClick={handleExportCSV}>
                  <Download size={16} className="mr-2" />
                  Descargar CSV
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-4">Vista Previa del Presupuesto</h3>
        <div className="bg-gray-50 p-6 rounded border">
          <div className="mb-4">
            <h4 className="font-bold text-xl text-blue-900">{project.name}</h4>
            <p className="text-gray-600">Cliente: {project.clientName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Modelo de Piscina</p>
              <p className="font-medium">{project.poolPreset?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Volumen</p>
              <p className="font-medium">{project.volume.toFixed(2)} m³</p>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Materiales:</span>
              <span className="font-medium">${project.materialCost.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Mano de Obra:</span>
              <span className="font-medium">${project.laborCost.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-blue-900 border-t pt-2">
              <span>TOTAL:</span>
              <span>${project.totalCost.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
