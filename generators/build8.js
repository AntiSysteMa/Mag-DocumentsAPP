const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType,
  ImageRun, VerticalAlign, PageOrientation, VerticalMergeType,
} = require("docx");

const NAVY = "1B2A41";
const ORANGE = "E07B39";
const STEEL = "5A6B7A";
const CARDGREY = "EDEFF1";
const DARKTEXT = "1A1A1A";

const PAGE_W = 11906, PAGE_H = 16838, MARGIN = 700;
const CONTENT_W = PAGE_W - 2 * MARGIN; // 10506

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
function noBorders() { return { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }; }

// ---------- HEADER ----------
const logoImage = new ImageRun({ type: "png", data: fs.readFileSync("logo_claro.png"), transformation: { width: 56, height: 56 } });

const headerTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [900, CONTENT_W - 900],
  borders: { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 16, color: NAVY }, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
  rows: [new TableRow({
    children: [
      new TableCell({ width: { size: 900, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(), margins: { top: 40, bottom: 40, left: 0, right: 80 }, children: [new Paragraph({ children: [logoImage] })] }),
      new TableCell({
        width: { size: CONTENT_W - 900, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(),
        children: [
          new Paragraph({ children: [new TextRun({ text: "MAG INDUSTRIES", bold: true, size: 26, font: "Arial", color: NAVY })] }),
          new Paragraph({ children: [new TextRun({ text: "Servicios de ingeniería CAD/CAM", italics: true, size: 15, font: "Arial", color: STEEL })] }),
        ],
      }),
    ],
  })],
});

const tituloPrincipal = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 260, after: 60 },
  children: [new TextRun({ text: "NUESTRO PROCESO DE INGENIERÍA", bold: true, size: 32, font: "Arial", color: NAVY })],
});
const subtituloPrincipal = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 320 },
  children: [new TextRun({ text: "De tu plano a la pieza terminada, con trazabilidad completa en cada paso.", italics: true, size: 19, font: "Arial", color: STEEL })],
});

// ---------- TIMELINE ----------
const LINE_W = 90;
const ICON_W = 1300;
const TEXT_W = CONTENT_W - LINE_W - ICON_W;

function badgeRun(num) {
  return new TextRun({ text: "", size: 1 });
}

function buildTimelineRow(num, iconFile, titulo, texto, isFirst) {
  const icon = new ImageRun({ type: "png", data: fs.readFileSync(iconFile), transformation: { width: 66, height: 66 } });
  const lineCell = new TableCell({
    width: { size: LINE_W, type: WidthType.DXA },
    verticalMerge: isFirst ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
    borders: noBorders(),
    children: isFirst ? [new Paragraph({ text: "" })] : [],
  });
  return new TableRow({
    children: [
      lineCell,
      new TableCell({
        width: { size: ICON_W, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP, borders: noBorders(),
        margins: { top: 40, bottom: 220, left: 40, right: 40 },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [icon] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50 }, children: [new TextRun({ text: "PASO " + num, bold: true, size: 14, font: "Arial", color: ORANGE })] }),
        ],
      }),
      new TableCell({
        width: { size: TEXT_W, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP, borders: noBorders(),
        shading: { type: ShadingType.CLEAR, color: "auto", fill: CARDGREY },
        margins: { top: 160, bottom: 160, left: 220, right: 220 },
        children: [
          new Paragraph({ spacing: { after: 70 }, children: [new TextRun({ text: titulo, bold: true, size: 22, font: "Arial", color: NAVY })] }),
          new Paragraph({ children: [new TextRun({ text: texto, size: 19, font: "Arial", color: DARKTEXT })] }),
        ],
      }),
    ],
  });
}

const pasos = [
  ["icon_receive.png", "RECEPCIÓN Y ANÁLISIS", "Recibimos el plano o la pieza, revisamos tolerancias y validamos la viabilidad técnica antes de empezar."],
  ["icon_gear.png", "PROGRAMACIÓN Y SIMULACIÓN", "Programamos el mecanizado y simulamos cada operación para evitar colisiones y errores antes de tocar material."],
  ["icon_doc.png", "DOCUMENTACIÓN DE PROCESO", "Generamos fichas de taller, herramientas y punto de referencia — cada paso queda documentado y es repetible."],
  ["icon_machining.png", "MECANIZADO CONTROLADO", "Ejecución con parámetros validados: velocidad, avance y refrigeración correctos para cada herramienta."],
  ["icon_quality.png", "CONTROL DE CALIDAD", "Verificación dimensional, geométrica y de tratamiento según plano, con reporte de resultados."],
  ["icon_delivery.png", "ENTREGA CON EVIDENCIA", "Piezas terminadas junto con la documentación completa: trazabilidad de principio a fin."],
];

const timelineTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [LINE_W, ICON_W, TEXT_W],
  borders: noBorders(),
  rows: pasos.map((p, i) => buildTimelineRow(i + 1, p[0], p[1], p[2], i === 0)),
});

// ---------- CLOSING BANNER ----------
const closingBanner = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [CONTENT_W],
  borders: noBorders(),
  rows: [new TableRow({
    children: [new TableCell({
      width: { size: CONTENT_W, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
      margins: { top: 220, bottom: 220, left: 300, right: 300 },
      borders: noBorders(),
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Detrás de cada pieza, un proceso de ingeniería documentado.", bold: true, size: 21, font: "Arial", color: "FFFFFF" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: "MAG Industries · Servicios de ingeniería CAD/CAM · Alexmakerdesign@gmail.com · +34 635 013 953", size: 15, font: "Arial", color: "C9D2DC" })] }),
      ],
    })],
  })],
});

// ---------- DOCUMENT ----------
const doc = new Document({
  sections: [
    {
      properties: { page: { size: { width: PAGE_W, height: PAGE_H, orientation: PageOrientation.PORTRAIT }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      children: [
        headerTable,
        tituloPrincipal,
        subtituloPrincipal,
        timelineTable,
        new Paragraph({ text: "", spacing: { after: 220 } }),
        closingBanner,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Infografia_Proceso_MAG_Industries.docx", buffer);
  console.log("OK");
}).catch(e => { console.error("ERR", e); process.exit(1); });
