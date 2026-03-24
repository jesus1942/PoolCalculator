import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsPDF } from 'jspdf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const outputDir = path.join(repoRoot, 'docs', 'manuales');
const outputFile = path.join(outputDir, 'manual-funcionamiento-proyecto-es-ar-interactivo.pdf');

const projectUrl = 'http://localhost:5173/projects/ef3c75c2-6bfd-4f9c-95f3-f2790ed6e963';
const generatedAt = '18/03/2026';

const doc = new jsPDF({
  orientation: 'p',
  unit: 'mm',
  format: 'a4',
  compress: true,
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const marginX = 18;
const topY = 22;
const bottomY = 18;
const usableWidth = pageWidth - marginX * 2;
const lineHeight = 6;

let cursorY = topY;

const palette = {
  ink: [20, 24, 39],
  muted: [95, 99, 110],
  blue: [17, 87, 174],
  softBlue: [225, 236, 252],
  green: [25, 135, 84],
  softGreen: [228, 246, 236],
  border: [206, 216, 228],
};

const sections = [
  {
    title: 'Qué Es Esta Pantalla',
    paragraphs: [
      'La vista de detalle del proyecto centraliza la operación técnica, comercial y documental de una obra. Desde esta pantalla se cargan configuraciones base, se calculan materiales, se eligen equipos, se asignan tareas y se generan entregables.',
      'Cuando el proyecto tiene un modelo de pileta asociado y faltan configuraciones, la página autogenera hidráulica, eléctrica y losetas y luego las guarda automáticamente.'
    ],
  },
  {
    title: 'Flujo Recomendado De Uso',
    bullets: [
      'Revisar Vista General para validar modelo, medidas, costos, materiales y resumen del sistema.',
      'Confirmar Estado y checklist para detectar faltantes antes de presupuestar o ejecutar.',
      'Ajustar Losetas y después guardar para recalcular materiales automáticamente.',
      'Definir Hidráulica con distancia al equipo y selección automática o manual de insumos.',
      'Seleccionar equipos en Eléctrica para que impacten en análisis profesionales y costos.',
      'Cargar Roles antes de cerrar Tareas si querés costos de mano de obra más consistentes.',
      'Agregar Adicionales al final para contemplar cambios reales de obra y dependencias.',
      'Usar Exportar cuando los datos críticos ya estén completos y auditados.',
    ],
  },
  {
    title: 'Encabezado Y Navegación',
    bullets: [
      'Muestra nombre del proyecto, cliente y estado general.',
      'Incluye navegación horizontal por pestañas: Vista General, Estado, Losetas, Hidráulica, Eléctrica, Análisis Hidráulico, Análisis Eléctrico, Tareas, Roles, Sistemas, Adicionales y Exportar.',
      'El estado visible arriba distingue al menos Borrador, En Progreso y Completado.',
    ],
  },
  {
    title: 'Vista General',
    bullets: [
      'Concentra el resumen ejecutivo del proyecto y permite ocultar o mostrar el total global.',
      'Muestra datos del cliente, ubicación, dimensiones, volumen, materiales base y costos consolidados.',
      'Integra visualización de la pileta y exportación de imagen desde el canvas cuando corresponde.',
      'Resume el sistema hidráulico visible para la obra combinando configuración guardada y adicionales.',
      'Puede comparar la bomba elegida contra la recomendada por el análisis hidráulico profesional.',
      'Agrupa costos de materiales, adicionales, hidráulica, eléctrica y mano de obra.',
    ],
  },
  {
    title: 'Estado',
    bullets: [
      'Expone fechas de creación y última actualización del proyecto.',
      'Calcula progreso general a partir del estado de las tareas cargadas.',
      'Muestra detalle por categoría de tareas con porcentaje, horas y cantidad completada.',
      'Incluye checklist de configuración y un resumen financiero para control rápido.',
    ],
  },
  {
    title: 'Losetas',
    bullets: [
      'Trabaja por lateral con una orientación fija: norte = izquierdo superior, sur = derecho inferior, oeste = skimmer, este = escalera.',
      'En cada lado se define tipo de primer anillo, cantidad de filas y loseta común seleccionada.',
      'La pantalla advierte que el catálogo de medidas está expresado en centímetros.',
      'Ofrece vista simple y vista detallada; en detallada también se puede alternar entre Planta y CAD.',
      'Permite exportar la visualización como imagen.',
      'Al guardar, recalcula materiales automáticamente y devuelve a Vista General.',
    ],
  },
  {
    title: 'Hidráulica',
    bullets: [
      'Calcula cañerías automáticamente a partir del proyecto y la distancia al equipo.',
      'Permite trabajar con selección automática sugerida o con selección manual del catálogo.',
      'El catálogo se puede filtrar por búsqueda y categoría: cañería, accesorios, válvulas y otros.',
      'La sugerencia automática arma caños, codos, tees, uniones, válvulas y adhesivo según diámetro y longitud estimada.',
      'Al guardar, persiste distancia al equipo e items elegidos para análisis posteriores.',
    ],
  },
  {
    title: 'Eléctrica',
    bullets: [
      'Se usa como selector de equipamiento real del proyecto.',
      'Organiza el catálogo por tipo: bombas, filtros, cloradores, calefactores y bombas de calor.',
      'Cada tarjeta de equipo puede incluir foto, marca, modelo, potencia, caudal, altura máxima, voltaje y ficha técnica.',
      'Agregar un equipo lo incorpora como adicional del proyecto; quitarlo lo elimina del conjunto seleccionado.',
      'La selección impacta en costos, análisis eléctricos y análisis hidráulicos.',
    ],
  },
  {
    title: 'Análisis Hidráulico Profesional',
    bullets: [
      'Toma como parámetros distancia al equipo y altura estática.',
      'Calcula TDH total, caudal requerido y pérdidas totales.',
      'Contrasta la bomba seleccionada en el proyecto contra la bomba recomendada.',
      'Desglosa pérdidas por fricción, validaciones de velocidad y advertencias técnicas.',
      'Si no hay configuración hidráulica suficiente, informa el faltante y permite reintentar.',
    ],
  },
  {
    title: 'Análisis Eléctrico Profesional',
    bullets: [
      'Toma como parámetros voltaje, distancia al tablero, tipo de instalación, temperatura ambiente y costo de energía.',
      'Calcula potencia instalada, potencia demandada, corriente total y tensión de trabajo.',
      'Lista los equipos tomados para el cálculo desde los adicionales del proyecto.',
      'Incluye costos operativos estimados diarios, mensuales y anuales.',
      'Sirve para validar sección, consumo y carga real antes de exportar o presupuestar.',
    ],
  },
  {
    title: 'Tareas',
    bullets: [
      'Agrupa tareas por categorías como excavación, hidráulica, eléctrica, piso, losetas, terminaciones y adicionales.',
      'Cada tarea puede tener nombre, descripción, estado, horas, cantidad, unidad y rol asignado.',
      'Si se asigna un rol, el costo de mano de obra puede calcularse automáticamente según su tipo de cobro.',
      'Soporta cobro por hora, por día, por m2, por metro lineal y por boca eléctrica.',
      'El estado de cada tarea alimenta el progreso mostrado en la pestaña Estado.',
    ],
  },
  {
    title: 'Roles',
    paragraphs: [
      'Administra oficios y tarifas base reutilizables. La pantalla incluye una referencia editable de Puerto Madryn, Chubut, apoyada en salarios UOCRA Zona B informados el 11 de marzo de 2026, como punto de partida operativo.',
    ],
    bullets: [
      'Cada rol puede definirse por hora, día, m2, metro lineal o por boca.',
      'En roles por boca se pueden cargar subtipos y valores específicos, por ejemplo luz LED o toma exterior.',
      'Estos valores luego se usan al asignar tareas para estimar mano de obra.',
    ],
  },
  {
    title: 'Sistemas',
    bullets: [
      'Reúne recomendaciones inteligentes de calefacción, filtración y mantenimiento de agua.',
      'Usa el volumen del proyecto para sugerir capacidad térmica, filtración y rutinas de cuidado.',
      'La sección es desplegable y sirve como apoyo de dimensionamiento, no como reemplazo del criterio técnico final.',
    ],
  },
  {
    title: 'Adicionales',
    bullets: [
      'Permite sumar accesorios, equipos, materiales o items personalizados por fuera del preset base.',
      'Se puede elegir entre usar un preset existente o crear un item totalmente personalizado.',
      'Cada adicional admite cantidad base, cantidad nueva, costo unitario, mano de obra por unidad y notas.',
      'El sistema puede agregar dependencias automáticamente según reglas de negocio, por ejemplo materiales asociados o chequeo de bomba.',
      'Los adicionales impactan en costos, visualización de sistema y exportaciones.',
    ],
  },
  {
    title: 'Exportar',
    bullets: [
      'Ofrece seis plantillas: Presupuesto Cliente, Especificaciones Técnicas, Lista de Materiales, Presupuesto Detallado, Reporte Completo y Vista General.',
      'Cada plantilla tiene vista previa real en iframe, auditoría de datos detectados y editor de documentos.',
      'Las salidas rápidas disponibles son PDF, HTML e impresión.',
      'También permite exportación a Excel con selección de secciones y comprobación previa de datos listos o faltantes.',
      'Antes de exportar conviene revisar la auditoría para confirmar que el documento no salga con vacíos.',
    ],
  },
  {
    title: 'Buenas Prácticas',
    bullets: [
      'No cierres presupuesto sin revisar primero Estado, Roles y Exportar.',
      'Si cambiás equipos, recalculá análisis hidráulico y eléctrico para ver el impacto real.',
      'Si ajustás losetas o hidráulica, guardá antes de pasar a exportación.',
      'Usá Adicionales para cambios de obra reales en vez de deformar el preset base.',
      'Tomá las recomendaciones inteligentes como soporte y no como aprobación automática de diseño.',
    ],
  },
  {
    title: 'Observación Metodológica',
    paragraphs: [
      'Este manual fue redactado a partir del comportamiento implementado en la pantalla de detalle del proyecto dentro del código fuente. En esta sesión no hubo respuesta del servidor local en http://localhost:5173, por lo que el contenido describe el funcionamiento real programado y no una captura navegada en vivo.'
    ],
  },
];

function setFillColor(color) {
  doc.setFillColor(...color);
}

function setDrawColor(color) {
  doc.setDrawColor(...color);
}

function setTextColor(color) {
  doc.setTextColor(...color);
}

function ensureSpace(heightNeeded = lineHeight) {
  if (cursorY + heightNeeded > pageHeight - bottomY) {
    doc.addPage();
    cursorY = topY;
  }
}

function writeWrappedText(text, options = {}) {
  const {
    x = marginX,
    fontSize = 11,
    color = palette.ink,
    maxWidth = usableWidth,
    indent = 0,
    extraGap = 1.5,
  } = options;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  setTextColor(color);

  const lines = doc.splitTextToSize(text, maxWidth - indent);
  const blockHeight = lines.length * lineHeight;
  ensureSpace(blockHeight + extraGap);

  doc.text(lines, x + indent, cursorY);
  cursorY += blockHeight + extraGap;
}

function writeBullet(text) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  setTextColor(palette.ink);

  const bulletX = marginX;
  const textX = marginX + 5;
  const lines = doc.splitTextToSize(text, usableWidth - 5);
  const blockHeight = lines.length * lineHeight;
  ensureSpace(blockHeight + 1.5);

  doc.text('•', bulletX, cursorY);
  doc.text(lines, textX, cursorY);
  cursorY += blockHeight + 1.5;
}

function drawSectionTitle(title) {
  const wrapped = doc.splitTextToSize(title, usableWidth);
  const blockHeight = wrapped.length * 7 + 10;
  ensureSpace(blockHeight);

  setFillColor(palette.softBlue);
  setDrawColor(palette.border);
  doc.roundedRect(marginX, cursorY - 6, usableWidth, blockHeight, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setTextColor(palette.blue);
  doc.text(wrapped, marginX + 4, cursorY + 1);
  cursorY += blockHeight + 4;
}

function drawFooter() {
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    setDrawColor(palette.border);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setTextColor(palette.muted);
    doc.text('Generado por poolmanager by Jesus Olguin', marginX, pageHeight - 7);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - marginX, pageHeight - 7, { align: 'right' });
  }
}

function addCoverPage() {
  setFillColor(palette.blue);
  doc.rect(0, 0, pageWidth, 58, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  setTextColor([255, 255, 255]);
  doc.text('Manual de Funcionamiento', marginX, 28);
  doc.text('Detalle de Proyecto', marginX, 39);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Español argentino', marginX, 49);

  cursorY = 78;
  drawInfoBox('Proyecto documentado', projectUrl);
  drawInfoBox('Fecha de generación', generatedAt);
  drawInfoBox('Alcance', 'Pantalla completa de detalle del proyecto y sus once pestañas operativas.');

  cursorY += 6;
  writeWrappedText(
    'Este PDF incluye índice clickeable, enlaces al proyecto local y una explicación ordenada del flujo completo de uso, desde la carga técnica hasta la exportación documental.',
    { fontSize: 12 }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setTextColor(palette.green);
  const linkLabel = 'Abrir proyecto en localhost';
  doc.textWithLink(linkLabel, marginX, cursorY + 6, { url: projectUrl });
  cursorY += 18;
}

function drawInfoBox(label, value) {
  ensureSpace(18);
  setFillColor([248, 250, 252]);
  setDrawColor(palette.border);
  doc.roundedRect(marginX, cursorY - 6, usableWidth, 16, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setTextColor(palette.muted);
  doc.text(label, marginX + 4, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  setTextColor(palette.ink);
  doc.text(value, marginX + 4, cursorY + 6);
  cursorY += 22;
}

function addTableOfContentsPlaceholder() {
  doc.addPage();
  cursorY = topY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  setTextColor(palette.ink);
  doc.text('Índice interactivo', marginX, cursorY);
  cursorY += 12;
  writeWrappedText(
    'Cada entrada lleva directo a la sección correspondiente dentro del PDF. Los enlaces funcionan mejor en visores que soportan navegación interna.',
    { fontSize: 11, color: palette.muted }
  );
}

function renderContent() {
  const tocEntries = [];

  sections.forEach((section) => {
    ensureSpace(18);
    tocEntries.push({
      title: section.title,
      page: doc.getCurrentPageInfo().pageNumber,
    });
    drawSectionTitle(section.title);

    section.paragraphs?.forEach((paragraph) => {
      writeWrappedText(paragraph, { fontSize: 11 });
    });

    section.bullets?.forEach((bullet) => {
      writeBullet(bullet);
    });

    cursorY += 3;
  });

  return tocEntries;
}

function fillTableOfContents(entries) {
  doc.setPage(2);
  cursorY = 44;

  entries.forEach((entry, index) => {
    ensureSpace(9);
    const y = cursorY;
    const number = `${index + 1}.`;
    const pageLabel = `${entry.page}`;
    const titleWidth = usableWidth - 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    setTextColor(palette.ink);
    doc.text(number, marginX, y);
    doc.text(entry.title, marginX + 8, y, { maxWidth: titleWidth });
    doc.text(pageLabel, pageWidth - marginX, y, { align: 'right' });
    setDrawColor(palette.border);
    doc.line(marginX + 8, y + 1.5, pageWidth - marginX - 7, y + 1.5);
    doc.link(marginX, y - 5, usableWidth, 7, { pageNumber: entry.page });
    cursorY += 9;
  });

  cursorY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setTextColor(palette.green);
  doc.textWithLink('Abrir la URL del proyecto', marginX, cursorY, { url: projectUrl });
}

fs.mkdirSync(outputDir, { recursive: true });

doc.setProperties({
  title: 'Manual de funcionamiento del detalle de proyecto',
  subject: 'Manual interactivo en español argentino',
  author: 'Codex',
  keywords: 'manual,piscina,proyecto,pdf,interactivo',
  creator: 'Codex',
});

addCoverPage();
addTableOfContentsPlaceholder();
doc.addPage();
cursorY = topY;
const tocEntries = renderContent();
fillTableOfContents(tocEntries);
drawFooter();

doc.save(outputFile);

console.log(outputFile);
