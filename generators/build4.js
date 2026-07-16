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
const LIGHTGREY = "F2F2F2";
const CARDGREY = "EDEFF1";
const MIDGREY = "D9D9D9";
const DARKTEXT = "1A1A1A";
const REDWARN = "B00020";
const GREENOK = "1B6E3C";

const PAGE_W = 16838; // content width landscape (DXA)
const PAGE_H = 11906; // content height landscape (DXA)
const MARGIN = 566;
const CONTENT_W = PAGE_W - 2 * MARGIN; // 15706

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const dashedBorder = { style: BorderStyle.DASHED, size: 6, color: "9AA5AF" };

function cellBorders(overrides = {}) {
  return { top: overrides.top || thinBorder, bottom: overrides.bottom || thinBorder, left: overrides.left || thinBorder, right: overrides.right || thinBorder };
}
function noBorders() { return { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }; }

// ---------- Typography scale (half-points) ----------
const FS_TITLE = 36, FS_SUBTITLE = 24, FS_META = 16;
const FS_SECTION = 22;
const FS_LABEL = 19, FS_VALUE = 19;
const FS_TH = 18, FS_TD = 18;
const FS_CARD_TITLE = 21, FS_CARD_LABEL = 17, FS_CARD_VALUE = 17;
const FS_NOTE = 18, FS_FOOT = 15, FS_FOOTSMALL = 13;

function labelCell(text, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 140, right: 100 },
    borders: cellBorders(),
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: FS_LABEL, font: "Arial" })] })],
    ...opts,
  });
}
function valueCell(text, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 140, right: 100 },
    borders: cellBorders(),
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "FFFFFF" },
    children: [new Paragraph({ children: [new TextRun({ text, size: FS_VALUE, font: "Arial", color: DARKTEXT, bold: !!opts.bold, italics: !!opts.italic })] })],
    ...opts,
  });
}
function headCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 90, right: 90 },
    borders: cellBorders(),
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: "FFFFFF", size: FS_TH, font: "Arial" })] })],
  });
}
function dataCell(text, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 90, right: 90 },
    borders: cellBorders(),
    shading: { type: ShadingType.CLEAR, color: "auto", fill: opts.fill || "FFFFFF" },
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      children: [new TextRun({ text, size: FS_TD, bold: !!opts.bold, color: opts.color || DARKTEXT, font: "Arial", italics: !!opts.italic })],
    })],
  });
}
function sectionHeader(text) {
  return new Paragraph({
    spacing: { before: 200, after: 120 },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
    border: { left: { style: BorderStyle.SINGLE, size: 36, color: ORANGE, space: 4 } },
    children: [new TextRun({ text: "   " + text, bold: true, color: "FFFFFF", size: FS_SECTION, font: "Arial" })],
  });
}

// ---------- HEADER ----------
const logoImage = new ImageRun({ type: "png", data: fs.readFileSync("logo_claro.png"), transformation: { width: 66, height: 66 } });

function buildHeaderTable(titleLine1, titleLine2) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [1150, 5250, 4150, 5156],
    borders: { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 16, color: NAVY }, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [new TableRow({
      children: [
        new TableCell({ width: { size: 1150, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(), margins: { top: 40, bottom: 40, left: 0, right: 80 }, children: [new Paragraph({ children: [logoImage] })] }),
        new TableCell({
          width: { size: 5250, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(), margins: { top: 40, bottom: 40, left: 0, right: 0 },
          children: [
            new Paragraph({ children: [new TextRun({ text: "MAG INDUSTRIES", bold: true, size: FS_TITLE, font: "Arial", color: NAVY })] }),
            new Paragraph({ children: [new TextRun({ text: "Servicios de ingeniería CAD/CAM", italics: true, size: FS_META + 2, font: "Arial", color: STEEL })] }),
          ],
        }),
        new TableCell({
          width: { size: 4150, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(),
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: titleLine1, bold: true, size: FS_SUBTITLE + 2, font: "Arial", color: DARKTEXT })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: titleLine2, bold: true, size: FS_SUBTITLE - 4, font: "Arial", color: ORANGE })] }),
          ],
        }),
        new TableCell({
          width: { size: 5156, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(), margins: { top: 40, bottom: 40, left: 0, right: 0 },
          children: [
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Doc. Nº: ", size: FS_META, font: "Arial", color: STEEL }), new TextRun({ text: "02_111-OBERGESENK-RH-FT-00", size: FS_META, font: "Arial", bold: true, color: DARKTEXT })] }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Fecha: ", size: FS_META, font: "Arial", color: STEEL }), new TextRun({ text: "09/07/2026", size: FS_META, font: "Arial" })] }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Revisión: ", size: FS_META, font: "Arial", color: STEEL }), new TextRun({ text: "00", size: FS_META, font: "Arial" })] }),
          ],
        }),
      ],
    })],
  });
}

// ---------- DATOS GENERALES + RESUMEN (left block) ----------
function dataRow(pairs) {
  const cells = [];
  pairs.forEach(([label, value, lw, vw, opts]) => { cells.push(labelCell(label, lw)); cells.push(valueCell(value, vw, opts || {})); });
  return new TableRow({ children: cells });
}

// Left block width ~ 62%% of content, right block (image) ~38%
const LEFT_W = 9700;
const RIGHT_W = CONTENT_W - LEFT_W; // 6006

const gL = 2000, gV = Math.floor((LEFT_W - 2 * 2000) / 1); // single pair per row for readability at bigger font
// Use 2-column (label/value) single pair per row layout for the left block to keep font large and readable
const gLabelW = 2600, gValueW = LEFT_W - gLabelW; // 7100

function fullRow(label, value, opts = {}) {
  return new TableRow({ children: [labelCell(label, gLabelW), valueCell(value, gValueW, opts)] });
}

const datosGeneralesTable = new Table({
  width: { size: LEFT_W, type: WidthType.DXA },
  columnWidths: [gLabelW, gValueW],
  rows: [
    fullRow("CLIENTE", "[Nombre cliente — no incluido en export]", { italic: true, color: STEEL }),
    fullRow("PIEZA / REFERENCIA", "02_111 OBERGESENK-RH — 20182855 (REPARADA)"),
    fullRow("MÁQUINA", "HAAS VF-2 (3 ejes)  ·  Postprocesador: HAAS Next Generation"),
    fullRow("PROGRAMA CNC", "Program 1001 (O1001)   ·   Plano de trabajo: #1"),
    fullRow("MATERIAL / DUREZA", "[No incluido en export — confirmar]", { italic: true, color: STEEL }),
    fullRow("BRUTO (DX x DY x DZ)", "400 x 206.8 x 145.49 mm"),
    fullRow("PROGRAMADOR / FASE", "[Nombre]  ·  DEBASTE"),
  ],
});

const resumenTable = new Table({
  width: { size: LEFT_W, type: WidthType.DXA },
  columnWidths: [gLabelW, gValueW],
  rows: [
    fullRow("OPERACIONES / HERRAMIENTAS", "10 operaciones   ·   4 herramientas"),
    fullRow("RANGO EN Z", "de +15 mm a −83.45 mm"),
    fullRow("AVANCE / RPM MÁXIMO", "3676.479 mm/min   ·   2918 rpm"),
    fullRow("DISTANCIAS (CORTE / RÁPIDO)", "415534.78 mm   /   66223.66 mm"),
    fullRow("TIEMPO TOTAL ESTIMADO", "19h 42m 16s", { bold: true }),
  ],
});

// ---------- IMAGEN DE PIEZA (right block) ----------
const piezaImgBuffer = fs.readFileSync("pieza_render.png");
const piezaImage = new ImageRun({ type: "png", data: piezaImgBuffer, transformation: { width: 430, height: 249 } });

const imagenPiezaCell = new TableCell({
  width: { size: RIGHT_W, type: WidthType.DXA },
  verticalAlign: VerticalAlign.TOP,
  borders: cellBorders({ top: dashedBorder, bottom: dashedBorder, left: dashedBorder, right: dashedBorder }),
  shading: { type: ShadingType.CLEAR, color: "auto", fill: CARDGREY },
  margins: { top: 140, bottom: 140, left: 140, right: 140 },
  children: [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "VISTA DEL BRUTO Y PIEZA", bold: true, size: FS_CARD_LABEL, font: "Arial", color: STEEL })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [piezaImage] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: "Origen y dimensiones de bruto/pieza extraídos del Setup Sheet de Fusion 360", italics: true, size: FS_FOOTSMALL + 1, font: "Arial", color: STEEL })] }),
  ],
});

const leftCellContent = new TableCell({
  width: { size: LEFT_W, type: WidthType.DXA },
  borders: noBorders(),
  margins: { top: 0, bottom: 0, left: 0, right: 100 },
  children: [
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "DATOS GENERALES", bold: true, size: FS_SECTION - 2, font: "Arial", color: NAVY })] }),
    datosGeneralesTable,
    new Paragraph({ spacing: { before: 160, after: 80 }, children: [new TextRun({ text: "RESUMEN GLOBAL DEL PROGRAMA", bold: true, size: FS_SECTION - 2, font: "Arial", color: NAVY })] }),
    resumenTable,
  ],
});

const panelPage1Fixed = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [LEFT_W, RIGHT_W],
  borders: noBorders(),
  rows: [new TableRow({ children: [leftCellContent, imagenPiezaCell] })],
});

// ---------- TABLA DE HERRAMIENTAS: tarjetas 2x2 ----------
function specLine(label, value, opts = {}) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text: label + ": ", bold: true, size: FS_CARD_LABEL, font: "Arial", color: STEEL }),
      new TextRun({ text: value, size: FS_CARD_VALUE, font: "Arial", color: opts.color || DARKTEXT, bold: !!opts.bold }),
    ],
  });
}

function buildToolCard(n, tipo, diam, resq, long, flutes, soporte, refrig, refrigColor, tiempo, pct) {
  const bannerColor = refrigColor === REDWARN ? REDWARN : NAVY;
  const CARD_IMG_W = 2450;
  const CARD_SPEC_W = 15706 / 2 - CARD_IMG_W - 260; // half content width minus image and gap, approx per card in 2-col outer grid (adjusted later)
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [CARD_IMG_W, CARD_SPEC_W],
    borders: cellBorders({ top: { style: BorderStyle.SINGLE, size: 8, color: NAVY }, bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY }, left: { style: BorderStyle.SINGLE, size: 8, color: NAVY }, right: { style: BorderStyle.SINGLE, size: 8, color: NAVY } }),
    rows: [
      new TableRow({
        children: [new TableCell({
          columnSpan: 2,
          shading: { type: ShadingType.CLEAR, color: "auto", fill: bannerColor },
          margins: { top: 70, bottom: 70, left: 140, right: 140 },
          borders: cellBorders(),
          children: [new Paragraph({ children: [new TextRun({ text: `T${n}  ·  ${tipo}`, bold: true, color: "FFFFFF", size: FS_CARD_TITLE, font: "Arial" })] })],
        })],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: CARD_IMG_W, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            shading: { type: ShadingType.CLEAR, color: "auto", fill: CARDGREY },
            borders: cellBorders({ top: noBorder, bottom: noBorder, left: noBorder, right: dashedBorder }),
            margins: { top: 100, bottom: 100, left: 80, right: 80 },
            children: [
              new Paragraph({ text: "" }), new Paragraph({ text: "" }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PEGAR RENDER", italics: true, size: FS_FOOTSMALL + 2, font: "Arial", color: "8A94A0" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Fusion 360 › Utillaje", italics: true, size: FS_FOOTSMALL + 2, font: "Arial", color: "8A94A0" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `T${n} + cono`, italics: true, size: FS_FOOTSMALL + 2, font: "Arial", color: "8A94A0" })] }),
              new Paragraph({ text: "" }), new Paragraph({ text: "" }),
            ],
          }),
          new TableCell({
            width: { size: CARD_SPEC_W, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            borders: cellBorders({ top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }),
            margins: { top: 110, bottom: 90, left: 160, right: 120 },
            children: [
              specLine("Ø / R. esquina", `${diam}  /  ${resq}`),
              specLine("Longitud de corte", long),
              specLine("Flutes", flutes),
              specLine("Porta-herramientas", soporte),
              specLine("Refrigeración", refrig, { bold: true, color: refrigColor }),
              specLine("Tiempo asociado", `${tiempo}  (${pct} del total)`),
            ],
          }),
        ],
      }),
    ],
  });
}

const toolsData = [
  [1, "Bullnose Endmill CORTA JPARENTE", "12 mm", "6 mm", "35 mm", "2", "BT40 6MM End Mill Holder x 90mm (Haas Automation, ref. 04-0137)", "CON refrigerante (Fluido)", NAVY, "2h 39m 11s", "13.5%"],
  [2, "Bullnose Endmill LARGA JPARENTE", "12 mm", "6 mm", "85 mm", "3", "BT40 6MM End Mill Holder x 90mm (Haas Automation, ref. 04-0137)", "SIN refrigerante (Desactivado)", REDWARN, "1h 59m 28s", "10.1%"],
  [3, "Bullnose Endmill LARGA JPARENTE ACAB", "12 mm", "6 mm", "85 mm", "3", "BT40 6MM End Mill Holder x 90mm (Haas Automation, ref. 04-0137)", "SIN refrigerante (Desactivado)", REDWARN, "3h 42m 10s", "18.8%"],
  [4, "Bullnose Endmill CORTA JPARENTE ACAB", "12 mm", "6 mm", "35 mm", "2", "BT40 6MM End Mill Holder x 90mm (Haas Automation, ref. 04-0137)", "CON refrigerante (Fluido)", NAVY, "11h 20m 26s", "57.6%"],
];

const cards = toolsData.map(t => buildToolCard(...t));

const GAP_W = 260;
const CARD_OUTER_W = Math.floor((CONTENT_W - GAP_W) / 2); // 7723

function cardCell(cardTable, isRight) {
  return new TableCell({
    width: { size: CARD_OUTER_W, type: WidthType.DXA },
    borders: noBorders(),
    margins: { top: 0, bottom: 200, left: isRight ? 130 : 0, right: isRight ? 0 : 130 },
    children: [cardTable],
  });
}

const gapCellWidthAdj = CONTENT_W - 2 * CARD_OUTER_W; // small leftover used as spacing built into margins above

const herramientasGrid = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [CARD_OUTER_W, CARD_OUTER_W],
  borders: noBorders(),
  rows: [
    new TableRow({ children: [cardCell(cards[0], false), cardCell(cards[1], true)] }),
    new TableRow({ children: [cardCell(cards[2], false), cardCell(cards[3], true)] }),
  ],
});

// ---------- NOTA REFRIGERACIÓN ----------
const notaRefrigeracion = [
  new Paragraph({
    spacing: { before: 120, after: 40 },
    children: [
      new TextRun({ text: "Regla de refrigeración MAG Industries:  ", bold: true, size: FS_NOTE, font: "Arial" }),
      new TextRun({ text: "herramienta corta / bajo voladizo → corte húmedo permitido.  Herramienta larga / alto voladizo (Ej: Diabolo HPC 120 mm) → ", size: FS_NOTE, font: "Arial" }),
      new TextRun({ text: "SIN refrigerante, corte en seco OBLIGATORIO según ficha técnica del fabricante, sin excepciones.", size: FS_NOTE, font: "Arial", bold: true, color: REDWARN }),
    ],
  }),
];

// ---------- TABLA DE OPERACIONES ----------
const opCols = [700, 3400, 1900, 900, 1100, 1700, 1100, 1100, 1806, 2000];
const opHeaders = ["Nº", "DESCRIPCIÓN", "ESTRATEGIA", "HTA", "RPM", "AVANCE (mm/min)", "Z MÁX (mm)", "Z MÍN (mm)", "REFRIGERANTE", "TIEMPO EST."];
const opHeaderRow = new TableRow({ children: opHeaders.map((h, i) => headCell(h, opCols[i])) });

function opRow(n, desc, estrategia, hta, refrig, refrigColor, fill, rpm, avance, zmax, zmin, tiempo) {
  return new TableRow({
    children: [
      dataCell(String(n), opCols[0], { align: AlignmentType.CENTER, fill, bold: true }),
      dataCell(desc, opCols[1], { fill }),
      dataCell(estrategia, opCols[2], { fill }),
      dataCell(hta, opCols[3], { align: AlignmentType.CENTER, fill, bold: true }),
      dataCell(rpm, opCols[4], { align: AlignmentType.CENTER, fill }),
      dataCell(avance, opCols[5], { align: AlignmentType.CENTER, fill }),
      dataCell(zmax, opCols[6], { align: AlignmentType.CENTER, fill }),
      dataCell(zmin, opCols[7], { align: AlignmentType.CENTER, fill }),
      dataCell(refrig, opCols[8], { align: AlignmentType.CENTER, fill, bold: true, color: refrigColor }),
      dataCell(tiempo, opCols[9], { align: AlignmentType.CENTER, fill }),
    ],
  });
}

const opRows = [
  opHeaderRow,
  opRow(1, "DESB ZONA SUPERIOR", "Festoneado", "T1", "Fluido", NAVY, "FFFFFF", "2918", "500", "15", "-15.54", "2h 13m 13s"),
  opRow(2, "DESB RADIO SUP PENDIENTE", "Fusión", "T1", "Fluido", NAVY, LIGHTGREY, "2918", "636.62", "12", "-23.59", "15m 28s"),
  opRow(3, "DESB ZONA INFERIOR", "Festoneado", "T1", "Fluido", NAVY, "FFFFFF", "2918", "3676.479", "15", "-83.28", "10m 30s"),
  opRow(4, "DESB RAMPA HLARGA BOLA R6", "Rampa", "T2", "Desactivado", REDWARN, LIGHTGREY, "2785", "626.673", "15", "-75.8", "1h 48m 17s"),
  opRow(5, "DESB RADIO INFERIOR HLARGA", "Fusión", "T2", "Desactivado", REDWARN, "FFFFFF", "2918", "551.472", "12", "-81.06", "11m 11s"),
  opRow(6, "ACAB ZONA SUPERIOR", "Festoneado", "T4", "Fluido", NAVY, LIGHTGREY, "2918", "550", "15", "-15.69", "5h 34m 47s"),
  opRow(7, "ACAB RADIO SUP PENDIENTE", "Fusión", "T4", "Fluido", NAVY, "FFFFFF", "2918", "500", "12", "-23.59", "1h 12m 17s"),
  opRow(8, "ACAB ZONA INFERIOR", "Festoneado", "T4", "Fluido", NAVY, LIGHTGREY, "2918", "550", "15", "-83.45", "4h 33m 22s"),
  opRow(9, "ACAB RAMPA HLARGA BOLA R6", "Rampa", "T3", "Desactivado", REDWARN, "FFFFFF", "2918", "500", "15", "-74.8", "2h 49m 9s"),
  opRow(10, "ACAB RADIO INFERIOR HLARGA", "Fusión", "T3", "Desactivado", REDWARN, LIGHTGREY, "2918", "500", "12", "-81.21", "53m 0s"),
];

const operacionesTable = new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: opCols, rows: opRows });

// ---------- GRÁFICO DE BARRAS: DISTRIBUCIÓN DE TIEMPO POR HERRAMIENTA ----------
const BAR_LABEL_W = 3200;
const BAR_AREA_W = CONTENT_W - BAR_LABEL_W; // 12506
const BAR_MAX_PCT = 60; // headroom above the largest real value (57.6%)

function barRow(label, pct, color) {
  const fillW = Math.round((pct / BAR_MAX_PCT) * BAR_AREA_W);
  const spacerW = BAR_AREA_W - fillW;
  const barCells = [
    new TableCell({
      width: { size: fillW, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: color },
      borders: noBorders(),
      margins: { top: 60, bottom: 60, left: 100, right: 60 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ children: [new TextRun({ text: `${pct}%`, bold: true, color: "FFFFFF", size: FS_TD, font: "Arial" })] })],
    }),
  ];
  if (spacerW > 0) {
    barCells.push(new TableCell({ width: { size: spacerW, type: WidthType.DXA }, borders: noBorders(), shading: { type: ShadingType.CLEAR, color: "auto", fill: LIGHTGREY }, children: [new Paragraph({ text: "" })] }));
  }
  return new TableRow({
    children: [
      new TableCell({
        width: { size: BAR_LABEL_W, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(), margins: { top: 60, bottom: 60, left: 0, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: FS_TD, font: "Arial", color: DARKTEXT })] })],
      }),
      new TableCell({
        width: { size: BAR_AREA_W, type: WidthType.DXA }, borders: noBorders(), margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [new Table({ width: { size: BAR_AREA_W, type: WidthType.DXA }, columnWidths: spacerW > 0 ? [fillW, spacerW] : [fillW], borders: noBorders(), rows: [new TableRow({ children: barCells })] })],
      }),
    ],
  });
}

const distribucionTiempoTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [BAR_LABEL_W, BAR_AREA_W],
  borders: noBorders(),
  rows: [
    barRow("T1 · Corta (húmedo) — 2h 39m", 13.5, NAVY),
    barRow("T2 · Larga desbaste (seco) — 1h 59m", 10.1, REDWARN),
    barRow("T3 · Larga acabado (seco) — 3h 42m", 18.8, REDWARN),
    barRow("T4 · Corta acabado (húmedo) — 11h 20m", 57.6, NAVY),
  ],
});

// ---------- FOOTER ----------
function buildFooter() {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: MIDGREY } },
        spacing: { before: 60 },
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
        children: [
          new TextRun({ text: "MAG Industries — Servicios de ingeniería CAD/CAM", size: FS_FOOT, font: "Arial", color: STEEL }),
          new TextRun({ text: "\t", size: FS_FOOT }),
          new TextRun({ text: "Alexmakerdesign@gmail.com · +34 635 013 953", size: FS_FOOT, font: "Arial", color: STEEL }),
        ],
      }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Documento de uso interno de taller y evidencia técnica de proceso. Prohibida su distribución sin autorización expresa de MAG Industries.", size: FS_FOOTSMALL, font: "Arial", italics: true, color: "9AA5AF" })] }),
    ],
  });
}

// ---------- DOCUMENT ----------
const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_H, height: PAGE_W, orientation: PageOrientation.LANDSCAPE },
          margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        },
      },
      footers: { default: buildFooter() },
      children: [
        buildHeaderTable("FICHA DE TALLER", "HERRAMIENTAS Y SECUENCIA DE MECANIZADO"),
        new Paragraph({ text: "", spacing: { after: 140 } }),
        sectionHeader("DATOS GENERALES Y RESUMEN DEL PROGRAMA"),
        new Paragraph({ text: "", spacing: { after: 60 } }),
        panelPage1Fixed,
        new Paragraph({ children: [new PageBreak()] }),
        sectionHeader("HERRAMIENTAS UTILIZADAS"),
        new Paragraph({ text: "", spacing: { after: 100 } }),
        herramientasGrid,
        ...notaRefrigeracion,
        new Paragraph({ children: [new PageBreak()] }),
        sectionHeader("SECUENCIA DE OPERACIONES DE MECANIZADO"),
        new Paragraph({ text: "", spacing: { after: 100 } }),
        operacionesTable,
        new Paragraph({ text: "", spacing: { after: 60 } }),
        sectionHeader("DISTRIBUCIÓN DE TIEMPO POR HERRAMIENTA"),
        new Paragraph({ text: "", spacing: { after: 140 } }),
        distribucionTiempoTable,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Ficha_Taller_Herramientas_MAG_Industries_v2.docx", buffer);
  console.log("OK");
}).catch(e => { console.error("ERR", e); process.exit(1); });
