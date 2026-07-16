const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType,
  ImageRun, VerticalAlign, PageOrientation, Footer, TabStopType,
  LevelFormat,
} = require("docx");

const NAVY = "1B2A41";
const ORANGE = "E07B39";
const STEEL = "5A6B7A";
const LIGHTGREY = "F2F2F2";
const CARDGREY = "EDEFF1";
const MIDGREY = "D9D9D9";
const DARKTEXT = "1A1A1A";

const PAGE_W = 11906; // A4 portrait DXA
const PAGE_H = 16838;
const MARGIN = 850; // ~1.5cm
const CONTENT_W = PAGE_W - 2 * MARGIN; // 10206

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
function cellBorders(o = {}) { return { top: o.top || thinBorder, bottom: o.bottom || thinBorder, left: o.left || thinBorder, right: o.right || thinBorder }; }
function noBorders() { return { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }; }

function sectionHeader(text) {
  return new Paragraph({
    spacing: { before: 300, after: 160 },
    keepNext: true,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
    border: { left: { style: BorderStyle.SINGLE, size: 36, color: ORANGE, space: 4 } },
    children: [new TextRun({ text: "   " + text, bold: true, color: "FFFFFF", size: 24, font: "Arial" })],
  });
}

const logoImage = new ImageRun({ type: "png", data: fs.readFileSync("logo_claro.png"), transformation: { width: 62, height: 62 } });

const headerTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [1000, 5200, 4006],
  borders: { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 16, color: NAVY }, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
  rows: [new TableRow({
    children: [
      new TableCell({ width: { size: 1000, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(), margins: { top: 40, bottom: 40, left: 0, right: 80 }, children: [new Paragraph({ children: [logoImage] })] }),
      new TableCell({
        width: { size: 5200, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(),
        children: [
          new Paragraph({ children: [new TextRun({ text: "MAG INDUSTRIES", bold: true, size: 32, font: "Arial", color: NAVY })] }),
          new Paragraph({ children: [new TextRun({ text: "Servicios de ingeniería CAD/CAM", italics: true, size: 18, font: "Arial", color: STEEL })] }),
        ],
      }),
      new TableCell({
        width: { size: 4006, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(),
        children: [
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "PROPUESTA COMERCIAL", bold: true, size: 22, font: "Arial", color: DARKTEXT })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Doc. Nº: ", size: 15, font: "Arial", color: STEEL }), new TextRun({ text: "MAG-PROP-001", size: 15, font: "Arial", bold: true })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Fecha: ", size: 15, font: "Arial", color: STEEL }), new TextRun({ text: "09/07/2026", size: 15, font: "Arial" })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Válida hasta: ", size: 15, font: "Arial", color: STEEL }), new TextRun({ text: "08/08/2026 (30 días)", size: 15, font: "Arial", bold: true })] }),
        ],
      }),
    ],
  })],
});

// ---------- DESTINATARIO ----------
function labelValue(label, value, opts = {}) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: label + ": ", bold: true, size: 20, font: "Arial", color: STEEL }),
      new TextRun({ text: value, size: 20, font: "Arial", color: DARKTEXT, italics: !!opts.italic }),
    ],
  });
}

const destinatarioBlock = [
  labelValue("Presentado a", "MECÁNICA J PARENTE"),
  labelValue("Contacto", "[Nombre de contacto]", { italic: true }),
  labelValue("Proyecto", "Fabricación de insertos de matriz — Ref. 02_111 OBERGESENK-RH"),
];

// ---------- POSICIONAMIENTO ----------
const posicionamiento = new Paragraph({
  spacing: { before: 100, after: 200 },
  border: { left: { style: BorderStyle.SINGLE, size: 24, color: ORANGE, space: 8 } },
  children: [
    new TextRun({
      text: "MAG Industries no factura horas: entrega piezas terminadas, con trazabilidad completa de proceso y control dimensional. Trabajamos como un socio técnico de tu producción — no como un proveedor puntual — priorizando fiabilidad de entrega y calidad certificable frente al cliente final.",
      italics: true, size: 21, font: "Arial", color: DARKTEXT,
    }),
  ],
});

// ---------- ALCANCE ----------
const alcanceParrafo = new Paragraph({
  spacing: { after: 160 },
  children: [new TextRun({
    text: "Mecanizado CNC completo de 3 insertos de matriz de forja en acero D2 templado a 62 HRC, sobre centro de mecanizado HAAS VF-2 (3 ejes), a partir de los planos y bruto suministrados por el cliente. Incluye programación CAM, verificación de colisiones, mecanizado de desbaste y acabado, y control dimensional final bajo plano.",
    size: 21, font: "Arial", color: DARKTEXT,
  })],
});

// ---------- ESPECIFICACIONES ----------
function specLabelCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY }, verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 140, right: 100 }, borders: cellBorders(),
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 19, font: "Arial" })] })],
  });
}
function specValueCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 140, right: 100 }, borders: cellBorders(), shading: { type: ShadingType.CLEAR, color: "auto", fill: "FFFFFF" },
    children: [new Paragraph({ children: [new TextRun({ text, size: 19, font: "Arial", color: DARKTEXT })] })],
  });
}
const specL = 3000, specV = CONTENT_W - specL;
function specRow(l, v) { return new TableRow({ children: [specLabelCell(l, specL), specValueCell(v, specV)] }); }

const especificacionesTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [specL, specV],
  rows: [
    specRow("PIEZA / REFERENCIA", "Insertos de matriz — 02_111 OBERGESENK-RH — 20182855"),
    specRow("MATERIAL", "Acero D2, templado y revenido a 62 HRC"),
    specRow("CANTIDAD", "3 unidades"),
    specRow("MÁQUINA / PROCESO", "HAAS VF-2 (3 ejes) · CAM en Fusion 360 · postprocesador HAAS Next Generation"),
    specRow("TOLERANCIAS", "Según DIN ISO 2768-mK, salvo indicación específica en plano"),
  ],
});

// ---------- ENTREGABLES ----------
const entregablesItems = [
  "Programación CAM completa y verificada (simulación de colisiones incluida)",
  "Mecanizado de desbaste y acabado de las 3 piezas en D2 a 62 HRC",
  "Ficha de taller y hoja de herramientas de cada fase (documentación de proceso)",
  "Control dimensional final bajo plano, con reporte de calidad",
  "Piezas terminadas, limpias y embaladas para entrega",
];
const entregablesParas = entregablesItems.map(t => new Paragraph({
  numbering: { reference: "entregables-list", level: 0 },
  spacing: { after: 70 },
  children: [new TextRun({ text: t, size: 20, font: "Arial" })],
}));

// ---------- CRONOGRAMA ----------
const cronoHeaders = ["FASE", "DURACIÓN ESTIMADA"];
const cronoColW = [7000, 3206];
const cronoHeaderRow = new TableRow({ children: cronoHeaders.map((h, i) => specLabelCell(h, cronoColW[i])) });
function cronoRow(fase, dur, fill) {
  return new TableRow({
    children: [
      new TableCell({ width: { size: cronoColW[0], type: WidthType.DXA }, borders: cellBorders(), shading: { type: ShadingType.CLEAR, color: "auto", fill }, margins: { top: 80, bottom: 80, left: 140, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: fase, size: 19, font: "Arial" })] })] }),
      new TableCell({ width: { size: cronoColW[1], type: WidthType.DXA }, borders: cellBorders(), shading: { type: ShadingType.CLEAR, color: "auto", fill }, margins: { top: 80, bottom: 80, left: 140, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: dur, size: 19, font: "Arial", bold: true })] })] }),
    ],
  });
}
const cronogramaTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: cronoColW,
  rows: [
    cronoHeaderRow,
    cronoRow("Programación CAM y verificación", "1 – 2 días", "FFFFFF"),
    cronoRow("Mecanizado (desbaste + acabado, 3 piezas)", "4 – 5 días", LIGHTGREY),
    cronoRow("Control dimensional y documentación", "1 día", "FFFFFF"),
    cronoRow("PLAZO TOTAL ESTIMADO", "6 – 8 días laborables", LIGHTGREY),
  ],
});

// ---------- INVERSIÓN (precio único) ----------
const inversionBox = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [CONTENT_W],
  borders: cellBorders({ top: { style: BorderStyle.SINGLE, size: 12, color: NAVY }, bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY }, left: { style: BorderStyle.SINGLE, size: 12, color: NAVY }, right: { style: BorderStyle.SINGLE, size: 12, color: NAVY } }),
  rows: [new TableRow({
    cantSplit: false,
    children: [new TableCell({
      width: { size: CONTENT_W, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY }, margins: { top: 220, bottom: 220, left: 300, right: 300 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, keepLines: true, keepNext: true, children: [new TextRun({ text: "INVERSIÓN DEL PROYECTO — PRECIO ÚNICO (3 PIEZAS)", bold: true, size: 20, font: "Arial", color: "FFFFFF" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, keepLines: true, keepNext: true, spacing: { before: 120 }, children: [new TextRun({ text: "600 €", bold: true, size: 56, font: "Arial", color: ORANGE })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, keepLines: true, spacing: { before: 100 }, children: [new TextRun({ text: "Precio cerrado por el proyecto completo — no se factura por horas trabajadas. IVA no incluido.", italics: true, size: 17, font: "Arial", color: "D9D9D9" })] }),
      ],
    })],
  })],
});

// ---------- VALIDEZ Y CONDICIONES ----------
const condicionesItems = [
  "Precio fijo cerrado por el alcance descrito; no varía en función del tiempo real de mecanizado.",
  "El plazo de entrega comienza a contar desde la recepción del bruto y los planos definitivos.",
  "Oferta válida durante 30 días naturales desde la fecha de este documento.",
  "MAG Industries se compromete a tratar los planos, modelos 3D y toda información técnica del cliente con estricta confidencialidad, respetando su propiedad intelectual. Dicha información se utilizará exclusivamente para la ejecución de este proyecto y no se compartirá, reproducirá ni cederá a terceros sin autorización expresa del cliente.",
];
const condicionesParas = condicionesItems.map(t => new Paragraph({
  numbering: { reference: "condiciones-list", level: 0 },
  spacing: { after: 70 },
  children: [new TextRun({ text: t, size: 19, font: "Arial" })],
}));

// ---------- ACEPTACIÓN ----------
function firmaBlock(titulo) {
  return new TableCell({
    width: { size: CONTENT_W / 2, type: WidthType.DXA },
    borders: noBorders(),
    margins: { top: 300, bottom: 0, left: 0, right: 200 },
    children: [
      new Paragraph({ spacing: { after: 500 }, children: [new TextRun({ text: titulo, bold: true, size: 19, font: "Arial", color: NAVY })] }),
      new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: MIDGREY } }, children: [new TextRun({ text: "" })] }),
      new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: "Nombre y firma", size: 15, font: "Arial", color: STEEL, italics: true })] }),
      new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: "Fecha: ______________", size: 15, font: "Arial", color: STEEL })] }),
    ],
  });
}
const aceptacionTable = new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [CONTENT_W / 2, CONTENT_W / 2], borders: noBorders(), rows: [new TableRow({ children: [firmaBlock("Por MAG Industries"), firmaBlock("Por el Cliente")] })] });

// ---------- FOOTER ----------
const footer = new Footer({
  children: [
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: MIDGREY } },
      spacing: { before: 60 },
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
      children: [
        new TextRun({ text: "MAG Industries — Servicios de ingeniería CAD/CAM", size: 15, font: "Arial", color: STEEL }),
        new TextRun({ text: "\t", size: 15 }),
        new TextRun({ text: "Alexmakerdesign@gmail.com · +34 635 013 953", size: 15, font: "Arial", color: STEEL }),
      ],
    }),
  ],
});

// ---------- DOCUMENT ----------
const doc = new Document({
  numbering: {
    config: [
      { reference: "entregables-list", levels: [{ level: 0, format: LevelFormat.BULLET, text: "●", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 280 } } } }] },
      { reference: "condiciones-list", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 280 } } } }] },
    ],
  },
  sections: [
    {
      properties: { page: { size: { width: PAGE_W, height: PAGE_H, orientation: PageOrientation.PORTRAIT }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      footers: { default: footer },
      children: [
        headerTable,
        new Paragraph({ text: "", spacing: { after: 180 } }),
        ...destinatarioBlock,
        posicionamiento,
        sectionHeader("ALCANCE DEL PROYECTO"),
        alcanceParrafo,
        sectionHeader("ESPECIFICACIONES"),
        especificacionesTable,
        sectionHeader("ENTREGABLES"),
        ...entregablesParas,
        sectionHeader("CRONOGRAMA ESTIMADO"),
        cronogramaTable,
        sectionHeader("INVERSIÓN"),
        new Paragraph({ text: "", spacing: { after: 60 } }),
        inversionBox,
        sectionHeader("CONDICIONES"),
        ...condicionesParas,
        new Paragraph({ text: "", spacing: { after: 300 } }),
        aceptacionTable,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Propuesta_Comercial_MAG_Industries_EJEMPLO.docx", buffer);
  console.log("OK");
}).catch(e => { console.error("ERR", e); process.exit(1); });
