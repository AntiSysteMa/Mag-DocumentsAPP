const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType,
  ImageRun, VerticalAlign, PageOrientation, Footer, TabStopType,
  PageBreak,
} = require("docx");

const NAVY = "1B2A41";
const ORANGE = "E07B39";
const STEEL = "5A6B7A";
const TEAL = "2E7D6B";
const PURPLE = "6B4C8A";
const BRONZE = "8A5A2E";
const LIGHTGREY = "F2F2F2";
const CARDGREY = "EDEFF1";
const MIDGREY = "D9D9D9";
const DARKTEXT = "1A1A1A";
const REDWARN = "B00020";
const GREENOK = "1B6E3C";

const PAGE_W = 16838, PAGE_H = 11906, MARGIN = 566;
const CONTENT_W = PAGE_W - 2 * MARGIN; // 15706

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
function cellBorders(o = {}) { return { top: o.top || thinBorder, bottom: o.bottom || thinBorder, left: o.left || thinBorder, right: o.right || thinBorder }; }
function noBorders() { return { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }; }

const FS_TITLE = 36, FS_SUBTITLE = 22, FS_META = 16;
const FS_SECTION = 22;
const FS_LABEL = 19, FS_VALUE = 19;
const FS_TH = 17, FS_TD = 17;
const FS_BADGE = 16;
const FS_NOTE = 18, FS_FOOT = 15, FS_FOOTSMALL = 13;

function labelCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY }, verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 140, right: 100 }, borders: cellBorders(),
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: FS_LABEL, font: "Arial" })] })],
  });
}
function valueCell(text, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 90, bottom: 90, left: 140, right: 100 }, borders: cellBorders(), shading: { type: ShadingType.CLEAR, color: "auto", fill: "FFFFFF" },
    children: [new Paragraph({ children: [new TextRun({ text, size: FS_VALUE, font: "Arial", color: opts.color || DARKTEXT, italics: !!opts.italic, bold: !!opts.bold })] })],
  });
}
function headCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY }, verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 80, right: 80 }, borders: cellBorders(),
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: "FFFFFF", size: FS_TH, font: "Arial" })] })],
  });
}
function dataCell(text, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 80, right: 80 }, borders: cellBorders(), shading: { type: ShadingType.CLEAR, color: "auto", fill: opts.fill || "FFFFFF" },
    children: [new Paragraph({ alignment: opts.align || AlignmentType.LEFT, children: [new TextRun({ text, size: FS_TD, bold: !!opts.bold, color: opts.color || DARKTEXT, font: "Arial", italics: !!opts.italic })] })],
  });
}
function badgeCell(code, width, opts = {}) {
  const map = {
    DIM: [NAVY, "DIM"], SUP: [ORANGE, "SUP"], GEO: [TEAL, "GEO"], REF: [PURPLE, "REF"], TRAT: [BRONZE, "TRAT"],
  };
  const [color, label] = map[code] || [STEEL, code];
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 60, bottom: 60, left: 40, right: 40 }, borders: cellBorders(), shading: { type: ShadingType.CLEAR, color: "auto", fill: opts.fill || "FFFFFF" },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.CLEAR, color: "auto", fill: color },
      children: [new TextRun({ text: label, bold: true, color: "FFFFFF", size: FS_BADGE, font: "Arial" })],
    })],
  });
}
function resultCell(text, width, opts = {}) {
  let color = STEEL;
  if (text === "OK") color = GREENOK; else if (text === "NOK") color = REDWARN;
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 80, right: 80 }, borders: cellBorders(), shading: { type: ShadingType.CLEAR, color: "auto", fill: opts.fill || "FFFFFF" },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color, size: FS_TD, font: "Arial" })] })],
  });
}
function sectionHeader(text) {
  return new Paragraph({
    spacing: { before: 200, after: 120 }, keepNext: true,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
    border: { left: { style: BorderStyle.SINGLE, size: 36, color: ORANGE, space: 4 } },
    children: [new TextRun({ text: "   " + text, bold: true, color: "FFFFFF", size: FS_SECTION, font: "Arial" })],
  });
}
function phaseHeader(text, color) {
  return new Paragraph({
    spacing: { before: 220, after: 120 }, keepNext: true,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: color },
    children: [new TextRun({ text: "   " + text, bold: true, color: "FFFFFF", size: FS_SECTION, font: "Arial" })],
  });
}

// ---------- HEADER ----------
const logoImage = new ImageRun({ type: "png", data: fs.readFileSync("logo_claro.png"), transformation: { width: 66, height: 66 } });

const headerTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [1150, 5250, 4150, 5156],
  borders: { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 16, color: NAVY }, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
  rows: [new TableRow({
    children: [
      new TableCell({ width: { size: 1150, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(), margins: { top: 40, bottom: 40, left: 0, right: 80 }, children: [new Paragraph({ children: [logoImage] })] }),
      new TableCell({
        width: { size: 5250, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(),
        children: [
          new Paragraph({ children: [new TextRun({ text: "MAG INDUSTRIES", bold: true, size: FS_TITLE, font: "Arial", color: NAVY })] }),
          new Paragraph({ children: [new TextRun({ text: "Servicios de ingeniería CAD/CAM", italics: true, size: FS_META + 2, font: "Arial", color: STEEL })] }),
        ],
      }),
      new TableCell({
        width: { size: 4150, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(),
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "REPORTE DE CONTROL", bold: true, size: FS_SUBTITLE + 2, font: "Arial", color: DARKTEXT })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DE CALIDAD", bold: true, size: FS_SUBTITLE - 2, font: "Arial", color: ORANGE })] }),
        ],
      }),
      new TableCell({
        width: { size: 5156, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(),
        children: [
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Doc. Nº: ", size: FS_META, font: "Arial", color: STEEL }), new TextRun({ text: "[REF-PIEZA]-QC-[REV]", size: FS_META, font: "Arial", bold: true, color: DARKTEXT })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Fecha inspección: ", size: FS_META, font: "Arial", color: STEEL }), new TextRun({ text: "[DD/MM/AAAA]", size: FS_META, font: "Arial" })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Revisión: ", size: FS_META, font: "Arial", color: STEEL }), new TextRun({ text: "[00]", size: FS_META, font: "Arial" })] }),
        ],
      }),
    ],
  })],
});

// ---------- DATOS GENERALES (compact, left) + RESULTADO GLOBAL (right) ----------
const gLabelW = 2600, LEFT_W = 9700, RIGHT_W = CONTENT_W - LEFT_W;
const gValueW = LEFT_W - gLabelW;
function fullRow(label, value, opts = {}) { return new TableRow({ children: [labelCell(label, gLabelW), valueCell(value, gValueW, opts)] }); }

const datosGeneralesTable = new Table({
  width: { size: LEFT_W, type: WidthType.DXA },
  columnWidths: [gLabelW, gValueW],
  rows: [
    fullRow("CLIENTE", "[Nombre cliente]", { italic: true, color: STEEL }),
    fullRow("PIEZA / REFERENCIA", "[Nombre y referencia de pieza]", { italic: true, color: STEEL }),
    fullRow("MATERIAL / DUREZA", "[Material] / [Dureza]", { italic: true, color: STEEL }),
    fullRow("Nº PLANO / REVISIÓN", "[__] / [__]", { italic: true, color: STEEL }),
    fullRow("INSPECTOR", "[Nombre]", { italic: true, color: STEEL }),
    fullRow("INSTRUMENTOS UTILIZADOS", "[Ej: calibre, micrómetro, rugosímetro, durómetro]", { italic: true, color: STEEL }),
  ],
});

const resultadoGlobalCell = new TableCell({
  width: { size: RIGHT_W, type: WidthType.DXA },
  verticalAlign: VerticalAlign.CENTER,
  borders: cellBorders({ top: { style: BorderStyle.SINGLE, size: 12, color: NAVY }, bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY }, left: { style: BorderStyle.SINGLE, size: 12, color: NAVY }, right: { style: BorderStyle.SINGLE, size: 12, color: NAVY } }),
  shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
  margins: { top: 200, bottom: 200, left: 200, right: 200 },
  children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "RESULTADO GLOBAL DE LA INSPECCIÓN", bold: true, size: FS_LABEL, font: "Arial", color: "FFFFFF" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 140 }, children: [new TextRun({ text: "[APTO / APTO CON OBSERVACIONES / NO APTO]", bold: true, size: 26, font: "Arial", color: ORANGE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 140 }, children: [new TextRun({ text: "Puntos controlados: [__]   ·   OK: [__]   ·   NOK: [__]   ·   Conformidad: [__]%", size: FS_FOOTSMALL + 2, font: "Arial", color: "D9D9D9" })] }),
  ],
});

const leftCellPanel = new TableCell({
  width: { size: LEFT_W, type: WidthType.DXA }, borders: noBorders(), margins: { top: 0, bottom: 0, left: 0, right: 100 },
  children: [
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "DATOS GENERALES", bold: true, size: FS_SECTION - 2, font: "Arial", color: NAVY })] }),
    datosGeneralesTable,
  ],
});

const panelPage1 = new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [LEFT_W, RIGHT_W], borders: noBorders(), rows: [new TableRow({ children: [leftCellPanel, resultadoGlobalCell] })] });

// ---------- LEYENDA DE TIPOS DE TOLERANCIA ----------
const leyendaItems = [
  ["DIM", NAVY, "DIMENSIONAL", "Cotas lineales, diámetros, profundidades, radios"],
  ["SUP", ORANGE, "SUPERFICIAL", "Acabado / rugosidad superficial (Ra, Rz)"],
  ["GEO", TEAL, "GEOMÉTRICA", "Planitud, paralelismo, perpendicularidad, posición (GD&T)"],
  ["REF", PURPLE, "DE REFERENCIA", "Datums, origen de pieza, puntos de referencia"],
  ["TRAT", BRONZE, "PINTURA / TRAT. TÉRMICO O QUÍMICO", "Dureza tras tratamiento, recubrimiento, acabado químico"],
];
const leyendaColW = Math.floor(CONTENT_W / 5);
function leyendaCard(code, color, titulo, desc) {
  return new TableCell({
    width: { size: leyendaColW, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP, margins: { top: 0, bottom: 0, left: 60, right: 60 }, borders: noBorders(),
    children: [
      new Paragraph({
        shading: { type: ShadingType.CLEAR, color: "auto", fill: color }, alignment: AlignmentType.CENTER, spacing: { after: 60 },
        children: [new TextRun({ text: "  " + code + "  ", bold: true, color: "FFFFFF", size: FS_LABEL, font: "Arial" })],
      }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 30 }, children: [new TextRun({ text: titulo, bold: true, size: FS_FOOTSMALL + 3, font: "Arial", color: DARKTEXT })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: desc, italics: true, size: FS_FOOTSMALL + 1, font: "Arial", color: STEEL })] }),
    ],
  });
}
const leyendaTable = new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: leyendaItems.map(() => leyendaColW), borders: noBorders(), rows: [new TableRow({ children: leyendaItems.map(i => leyendaCard(...i)) })] });

// ---------- TABLA DE CONTROL (reutilizable por fase) ----------
const ctrlCols = [600, 1700, 3200, 1400, 1400, 1400, 1800, 1200, 3006];
const ctrlHeaders = ["Nº", "TIPO", "DESCRIPCIÓN / COTA CONTROLADA", "NOMINAL", "TOLERANCIA", "MEDIDO", "INSTRUMENTO", "RESULT.", "OBSERVACIONES"];
function ctrlHeaderRow() { return new TableRow({ children: ctrlHeaders.map((h, i) => headCell(h, ctrlCols[i])) }); }

function ctrlRow(n, tipo, desc, nom, tol, medido, instr, resultado, obs, fill) {
  return new TableRow({
    children: [
      dataCell(String(n), ctrlCols[0], { align: AlignmentType.CENTER, fill, bold: true }),
      badgeCell(tipo, ctrlCols[1], { fill }),
      dataCell(desc, ctrlCols[2], { fill }),
      dataCell(nom, ctrlCols[3], { align: AlignmentType.CENTER, fill }),
      dataCell(tol, ctrlCols[4], { align: AlignmentType.CENTER, fill }),
      dataCell(medido, ctrlCols[5], { align: AlignmentType.CENTER, fill, italic: medido.startsWith("[") }),
      dataCell(instr, ctrlCols[6], { fill }),
      resultCell(resultado, ctrlCols[7], { fill }),
      dataCell(obs, ctrlCols[8], { fill, italic: true, color: STEEL }),
    ],
  });
}

function buildFaseTable(rows) {
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: ctrlCols, rows: [ctrlHeaderRow(), ...rows] });
}

const filasDiseno = [
  ctrlRow(1, "REF", "Verificación de datum / origen principal según plano de diseño", "[__]", "[__]", "[__]", "Revisión de plano", "[OK/NOK]", "[__]", "FFFFFF"),
  ctrlRow(2, "GEO", "Tolerancia geométrica especificada en plano (planitud / posición)", "[__]", "[__]", "[__]", "Revisión de plano", "[OK/NOK]", "[__]", LIGHTGREY),
  ctrlRow(3, "DIM", "Cota crítica de diseño a validar antes de programar CAM", "[__]", "[__]", "[__]", "Revisión de plano", "[OK/NOK]", "[__]", "FFFFFF"),
];

const filasMecanizado = [
  ctrlRow(1, "DIM", "[Ej: Cota X — ancho de bolsa mecanizada]", "[__] mm", "±[__] mm", "[__] mm", "Calibre / Micrómetro", "[OK/NOK]", "[__]", "FFFFFF"),
  ctrlRow(2, "DIM", "[Ej: Profundidad Z de cavidad]", "[__] mm", "±[__] mm", "[__] mm", "Calibre de profundidad", "[OK/NOK]", "[__]", LIGHTGREY),
  ctrlRow(3, "GEO", "[Ej: Paralelismo cara superior respecto a base]", "[__]", "[__]", "[__]", "Reloj comparador", "[OK/NOK]", "[__]", "FFFFFF"),
  ctrlRow(4, "SUP", "[Ej: Rugosidad Ra en zona de acabado]", "Ra [__]", "±[__]", "Ra [__]", "Rugosímetro", "[OK/NOK]", "[__]", LIGHTGREY),
  ctrlRow(5, "REF", "Verificación de origen G54 tras mecanizado (coincide con hoja de punto cero)", "[__]", "[__]", "[__]", "Sonda / Buscador de bordes", "[OK/NOK]", "[__]", "FFFFFF"),
];

const filasPostProceso = [
  ctrlRow(1, "TRAT", "Dureza final tras tratamiento térmico", "[__] HRC", "±[__] HRC", "[__] HRC", "Durómetro", "[OK/NOK]", "[__]", "FFFFFF"),
  ctrlRow(2, "TRAT", "Recubrimiento / pintura aplicada según especificación de plano", "[__]", "[__]", "[__]", "Inspección visual / espesor de capa", "[OK/NOK]", "[__]", LIGHTGREY),
  ctrlRow(3, "DIM", "Verificación dimensional post-tratamiento (control de distorsión térmica)", "[__] mm", "±[__] mm", "[__] mm", "Calibre / Micrómetro", "[OK/NOK]", "[__]", "FFFFFF"),
];

// ---------- NOTA METODOLÓGICA ----------
const notaMetodologica = new Paragraph({
  spacing: { before: 120, after: 40 },
  children: [
    new TextRun({ text: "Cómo usar esta plantilla: ", bold: true, size: FS_NOTE, font: "Arial" }),
    new TextRun({ text: "cada fila representa un punto de control. Añade o elimina filas según los puntos reales a verificar en cada fase, y marca el ", size: FS_NOTE, font: "Arial" }),
    new TextRun({ text: "TIPO", bold: true, size: FS_NOTE, font: "Arial" }),
    new TextRun({ text: " correspondiente (DIM · SUP · GEO · REF · TRAT, ver leyenda). El resultado global de la inspección se calcula a partir del conjunto de las tres fases.", size: FS_NOTE, font: "Arial" }),
  ],
});

// ---------- FIRMAS ----------
function firmaBlock(titulo) {
  return new TableCell({
    width: { size: Math.floor(CONTENT_W / 3), type: WidthType.DXA }, borders: noBorders(), margins: { top: 300, bottom: 0, left: 0, right: 260 },
    children: [
      new Paragraph({ spacing: { after: 500 }, children: [new TextRun({ text: titulo, bold: true, size: FS_LABEL, font: "Arial", color: NAVY })] }),
      new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: MIDGREY } }, children: [new TextRun({ text: "" })] }),
      new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: "Nombre y firma", size: FS_FOOT, font: "Arial", color: STEEL, italics: true })] }),
      new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: "Fecha: ______________", size: FS_FOOT, font: "Arial", color: STEEL })] }),
    ],
  });
}
const firmasTable = new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [Math.floor(CONTENT_W / 3), Math.floor(CONTENT_W / 3), Math.floor(CONTENT_W / 3)], borders: noBorders(), rows: [new TableRow({ children: [firmaBlock("Inspector"), firmaBlock("Responsable de Calidad — MAG Industries"), firmaBlock("Cliente (si aplica)")] })] });

// ---------- FOOTER ----------
function buildFooter() {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: MIDGREY } }, spacing: { before: 60 },
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
        children: [
          new TextRun({ text: "MAG Industries — Servicios de ingeniería CAD/CAM", size: FS_FOOT, font: "Arial", color: STEEL }),
          new TextRun({ text: "\t", size: FS_FOOT }),
          new TextRun({ text: "Alexmakerdesign@gmail.com · +34 635 013 953", size: FS_FOOT, font: "Arial", color: STEEL }),
        ],
      }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Documento de evidencia técnica de control de calidad. Prohibida su distribución sin autorización expresa de MAG Industries.", size: FS_FOOTSMALL, font: "Arial", italics: true, color: "9AA5AF" })] }),
    ],
  });
}

// ---------- DOCUMENT ----------
const doc = new Document({
  sections: [
    {
      properties: { page: { size: { width: PAGE_H, height: PAGE_W, orientation: PageOrientation.LANDSCAPE }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      footers: { default: buildFooter() },
      children: [
        headerTable,
        new Paragraph({ text: "", spacing: { after: 140 } }),
        sectionHeader("DATOS GENERALES Y RESULTADO GLOBAL"),
        new Paragraph({ text: "", spacing: { after: 60 } }),
        panelPage1,
        sectionHeader("LEYENDA — TIPOS DE TOLERANCIA"),
        new Paragraph({ text: "", spacing: { after: 60 } }),
        leyendaTable,
        notaMetodologica,
        new Paragraph({ children: [new PageBreak()] }),
        phaseHeader("FASE 1 — DISEÑO", STEEL),
        buildFaseTable(filasDiseno),
        phaseHeader("FASE 2 — MECANIZADO", NAVY),
        buildFaseTable(filasMecanizado),
        new Paragraph({ children: [new PageBreak()] }),
        phaseHeader("FASE 3 — POSTERIOR AL MECANIZADO (tratamiento / acabado)", BRONZE),
        buildFaseTable(filasPostProceso),
        new Paragraph({ text: "", spacing: { after: 260 } }),
        sectionHeader("VALIDACIÓN"),
        new Paragraph({ text: "", spacing: { after: 200 } }),
        firmasTable,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Reporte_Control_Calidad_MAG_Industries_PLANTILLA.docx", buffer);
  console.log("OK");
}).catch(e => { console.error("ERR", e); process.exit(1); });
