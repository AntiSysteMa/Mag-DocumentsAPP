const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType,
  ImageRun, VerticalAlign, PageOrientation, Footer,
} = require("docx");

const NAVY = "1B2A41";
const ORANGE = "E07B39";
const STEEL = "5A6B7A";
const LIGHTGREY = "F2F2F2";
const CARDGREY = "EDEFF1";
const DARKTEXT = "1A1A1A";

const PAGE_W = 11906, PAGE_H = 16838, MARGIN = 700;
const CONTENT_W = PAGE_W - 2 * MARGIN; // 10506

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
function noBorders() { return { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }; }

// ---------- HERO HEADER ----------
const HERO_LEFT_W = Math.floor(CONTENT_W * 0.62);
const HERO_RIGHT_W = CONTENT_W - HERO_LEFT_W;

const bigLogoImage = new ImageRun({ type: "png", data: fs.readFileSync("logo_oscuro_transparent.png"), transformation: { width: 230, height: 221 } });

const heroBand = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [HERO_LEFT_W, HERO_RIGHT_W],
  borders: noBorders(),
  rows: [new TableRow({
    children: [
      new TableCell({
        width: { size: HERO_LEFT_W, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
        margins: { top: 180, bottom: 160, left: 360, right: 200 },
        borders: noBorders(),
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({ children: [new TextRun({ text: "MAG INDUSTRIES", bold: true, size: 46, font: "Arial", color: "FFFFFF" })] }),
          new Paragraph({ spacing: { after: 220 }, children: [new TextRun({ text: "Servicios de ingeniería CAD/CAM", italics: true, size: 24, font: "Arial", color: "C9D2DC" })] }),
          new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: "Ingeniería de precisión.", bold: true, size: 46, font: "Arial", color: "FFFFFF" })] }),
          new Paragraph({ children: [new TextRun({ text: "Resultados que se notan.", bold: true, size: 46, font: "Arial", color: ORANGE })] }),
        ],
      }),
      new TableCell({
        width: { size: HERO_RIGHT_W, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        borders: noBorders(),
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [bigLogoImage] })],
      }),
    ],
  })],
});

// ---------- SUBHEAD ----------
const subhead = new Paragraph({
  spacing: { before: 200, after: 100 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({
    text: "Reforzamos a tu equipo cuando el tiempo aprieta: rediseños, optimización de material, programación CNC, documentación técnica y automatización de tareas repetitivas — con la maquinaria y el equipo que ya tienes.",
    size: 24, font: "Arial", color: DARKTEXT, italics: true,
  })],
});

const ribbon = new Paragraph({
  spacing: { before: 40, after: 200 },
  alignment: AlignmentType.CENTER,
  shading: { type: ShadingType.CLEAR, color: "auto", fill: CARDGREY },
  children: [new TextRun({ text: "🎯  ENFOQUE 100% EN RESULTADOS MEDIBLES — NO FACTURAMOS HORAS", bold: true, size: 20, font: "Arial", color: NAVY })],
});

// ---------- VALUE CARDS (2x2) ----------
function valueCard(iconFile, titulo, texto) {
  const icon = new ImageRun({ type: "png", data: fs.readFileSync(iconFile), transformation: { width: 56, height: 56 } });
  return new TableCell({
    width: { size: Math.floor(CONTENT_W / 2), type: WidthType.DXA },
    borders: noBorders(),
    shading: { type: ShadingType.CLEAR, color: "auto", fill: CARDGREY },
    margins: { top: 200, bottom: 220, left: 220, right: 220 },
    children: [
      new Paragraph({ children: [icon] }),
      new Paragraph({ spacing: { before: 140, after: 60 }, children: [new TextRun({ text: titulo, bold: true, size: 22, font: "Arial", color: NAVY })] }),
      new Paragraph({ children: [new TextRun({ text: texto, size: 19, font: "Arial", color: DARKTEXT })] }),
    ],
  });
}

const GAP = 240;

const CARD_W = Math.floor((CONTENT_W - GAP) / 2);
function cardCell(iconFile, titulo, texto, rightPad) {
  return new TableCell({
    width: { size: CARD_W, type: WidthType.DXA },
    borders: noBorders(),
    margins: { top: 0, bottom: 170, left: 0, right: rightPad ? GAP : 0 },
    children: [valueCardInner(iconFile, titulo, texto)],
  });
}
function valueCardInner(iconFile, titulo, texto) {
  const icon = new ImageRun({ type: "png", data: fs.readFileSync(iconFile), transformation: { width: 62, height: 62 } });
  const ICON_COL_W = 1500;
  const TEXT_COL_W = CARD_W - ICON_COL_W;
  return new Table({
    width: { size: CARD_W, type: WidthType.DXA },
    columnWidths: [CARD_W],
    borders: noBorders(),
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: CARD_W, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: CARDGREY },
        borders: noBorders(),
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children: [new Table({
          width: { size: CARD_W, type: WidthType.DXA },
          columnWidths: [ICON_COL_W, TEXT_COL_W],
          borders: noBorders(),
          rows: [new TableRow({
            children: [
              new TableCell({
                width: { size: ICON_COL_W, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(),
                margins: { top: 200, bottom: 200, left: 220, right: 100 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [icon] })],
              }),
              new TableCell({
                width: { size: TEXT_COL_W, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(),
                margins: { top: 200, bottom: 200, left: 60, right: 220 },
                children: [
                  new Paragraph({ spacing: { after: 70 }, children: [new TextRun({ text: titulo, bold: true, size: 23, font: "Arial", color: NAVY })] }),
                  new Paragraph({ children: [new TextRun({ text: texto, size: 20, font: "Arial", color: DARKTEXT })] }),
                ],
              }),
            ],
          })],
        })],
      })],
    })],
  });
}

const valueGridFixed = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [CARD_W, CARD_W],
  borders: noBorders(),
  rows: [
    new TableRow({ children: [cardCell("icon_design.png", "INGENIERÍA Y REDISEÑO", "Rediseño de piezas y ensambles, optimización de material y cambios por modificaciones internas de producto.", true), cardCell("icon_gear.png", "PROGRAMACIÓN Y PRODUCCIÓN", "Programación CNC y optimización de procesos para cumplir plazos y resolver cuellos de botella.", false)] }),
    new TableRow({ children: [cardCell("icon_doc.png", "DOCUMENTACIÓN TÉCNICA", "Documentación de proceso y calidad para proyectos internos o externos, lista para auditoría o cliente.", true), cardCell("icon_automation.png", "AUTOMATIZACIÓN Y APPS A MEDIDA", "Automatizamos tareas repetitivas y creamos herramientas propias de gestión documental para tu equipo.", false)] }),
  ],
});

// ---------- CÓMO FUNCIONA ----------
const comoFuncionaTitle = new Paragraph({
  spacing: { before: 220, after: 140 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "¿CÓMO FUNCIONA?", bold: true, size: 28, font: "Arial", color: NAVY })],
});

function pasoCell(num, texto) {
  return new TableCell({
    width: { size: Math.floor(CONTENT_W / 3), type: WidthType.DXA },
    borders: noBorders(),
    margins: { top: 0, bottom: 0, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        shading: { type: ShadingType.CLEAR, color: "auto", fill: ORANGE },
        children: [new TextRun({ text: "  " + num + "  ", bold: true, size: 34, font: "Arial", color: "FFFFFF" })],
      }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 140 }, children: [new TextRun({ text: texto, size: 21, font: "Arial", color: DARKTEXT })] }),
    ],
  });
}
const pasosTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [Math.floor(CONTENT_W / 3), Math.floor(CONTENT_W / 3), Math.floor(CONTENT_W / 3)],
  borders: noBorders(),
  rows: [new TableRow({ children: [pasoCell("1", "Nos cuentas tu reto: una pieza, un cuello de botella o un proceso a mejorar"), pasoCell("2", "Diseñamos la solución a medida, con plazos y resultados claros"), pasoCell("3", "Tu equipo la aplica sin fricciones — con soporte nuestro si lo necesitas")] })],
});

// ---------- CTA BANNER ----------
const qrImage = new ImageRun({ type: "png", data: fs.readFileSync("qr_whatsapp.png"), transformation: { width: 130, height: 130 } });

const ctaBanner = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [Math.floor(CONTENT_W * 0.68), Math.floor(CONTENT_W * 0.32)],
  borders: noBorders(),
  rows: [new TableRow({
    children: [
      new TableCell({
        width: { size: Math.floor(CONTENT_W * 0.68), type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 240, bottom: 240, left: 320, right: 200 },
        borders: noBorders(),
        children: [
          new Paragraph({ children: [new TextRun({ text: "¿Tienes un proyecto atascado?", bold: true, size: 27, font: "Arial", color: "FFFFFF" })] }),
          new Paragraph({ spacing: { before: 60, after: 160 }, children: [new TextRun({ text: "Hablemos — sin compromiso.", size: 22, font: "Arial", color: "C9D2DC" })] }),
          new Paragraph({ children: [new TextRun({ text: "📞 +34 635 013 953", bold: true, size: 34, font: "Arial", color: ORANGE })] }),
          new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: "Alexmakerdesign@gmail.com", size: 20, font: "Arial", color: "FFFFFF" })] }),
        ],
      }),
      new TableCell({
        width: { size: Math.floor(CONTENT_W * 0.32), type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: "FFFFFF" },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 200, bottom: 200, left: 100, right: 100 },
        borders: noBorders(),
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [qrImage] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: "Escanea y escribe por WhatsApp", size: 13, font: "Arial", italics: true, color: STEEL })] }),
        ],
      }),
    ],
  })],
});

// ---------- DOCUMENT ----------
const doc = new Document({
  sections: [
    {
      properties: { page: { size: { width: PAGE_W, height: PAGE_H, orientation: PageOrientation.PORTRAIT }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      children: [
        heroBand,
        subhead,
        ribbon,
        valueGridFixed,
        comoFuncionaTitle,
        pasosTable,
        new Paragraph({ text: "", spacing: { after: 180 } }),
        ctaBanner,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("OnePager_Propuesta_Valor_MAG_Industries.docx", buffer);
  console.log("OK");
}).catch(e => { console.error("ERR", e); process.exit(1); });
