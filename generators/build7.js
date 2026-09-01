const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType,
  ImageRun, VerticalAlign, PageOrientation, Footer,
} = require("docx");

// ---------- DATOS DE ENTRADA ----------
// La app escribe un JSON con el perfil del cliente y pasa su ruta en
// GENERATOR_DATA. El one-pager no usa datos de proyecto: lo que consume es
// `profile.onepager` y `profile.references`, es decir, los textos del SECTOR
// del destinatario. Sin esa variable el script sigue funcionando con los
// textos del sector genérico (`node build7.js`).
const D = (() => {
  const p = process.env.GENERATOR_DATA;
  if (!p || !fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { console.error("GENERATOR_DATA ilegible:", e.message); return {}; }
})();

const v = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s === "" ? fallback : s;
};

const P = (D.profile && typeof D.profile === "object") ? D.profile : {};
const OP = (P.onepager && typeof P.onepager === "object") ? P.onepager : {};

// Textos del sector genérico: respaldo exacto del folleto original, para que
// ejecutar el script suelto siga produciendo el documento de siempre.
const CARDS_FALLBACK = [
  ["icon_design.png", "INGENIERÍA Y REDISEÑO", "Rediseño de piezas y ensambles, optimización de material y cambios por modificaciones internas de producto."],
  ["icon_gear.png", "PROGRAMACIÓN Y PRODUCCIÓN", "Programación CNC y optimización de procesos para cumplir plazos y resolver cuellos de botella."],
  ["icon_doc.png", "DOCUMENTACIÓN TÉCNICA", "Documentación de proceso y calidad para proyectos internos o externos, lista para auditoría o cliente."],
  ["icon_automation.png", "AUTOMATIZACIÓN Y APPS A MEDIDA", "Automatizamos tareas repetitivas y creamos herramientas propias de gestión documental para tu equipo."],
];
const STEPS_FALLBACK = [
  "Nos cuentas tu reto: una pieza, un cuello de botella o un proceso a mejorar",
  "Diseñamos la solución a medida, con plazos y resultados claros",
  "Tu equipo la aplica sin fricciones — con soporte nuestro si lo necesitas",
];
const REFS_FALLBACK = [
  ["Serie de bancadas mecanizadas", "Reducción del 30 % en tiempo de ciclo tras replantear la estrategia de desbaste."],
  ["Utillaje de amarre a medida", "Diseño y fabricación de utillaje que eliminó una segunda sujeción."],
  ["Documentación de proceso para auditoría", "Fichas de taller y hojas de punto cero de una familia completa de piezas."],
];

// Una tarjeta/paso/referencia solo se acepta si trae la forma esperada; si no,
// se usa el respaldo, para que un perfil mal formado no rompa el folleto.
const pickList = (value, expectedLen, fallback) =>
  (Array.isArray(value) && value.length === fallback.length
    && value.every(i => Array.isArray(i) ? i.length >= expectedLen : expectedLen === 1))
    ? value : fallback;

const CARDS = pickList(OP.cards, 3, CARDS_FALLBACK);
const STEPS = (Array.isArray(OP.steps) && OP.steps.length === 3) ? OP.steps : STEPS_FALLBACK;
const REFS = pickList(P.references, 2, REFS_FALLBACK);

const TAGLINE_1 = v(OP.tagline1, "Ingeniería de precisión.");
const TAGLINE_2 = v(OP.tagline2, "Resultados que se notan.");
const SUBHEAD = v(OP.subhead, "Reforzamos a tu equipo cuando el tiempo aprieta: rediseños, optimización de material, programación CNC, documentación técnica y automatización de tareas repetitivas — con la maquinaria y el equipo que ya tienes.");
const RIBBON = v(OP.ribbon, "ENFOQUE 100% EN RESULTADOS MEDIBLES — NO FACTURAMOS HORAS");
const CTA_TITLE = v(OP.cta_title, "¿Tienes un proyecto atascado?");
const CTA_SUB = v(OP.cta_sub, "Hablemos — sin compromiso.");

// Identidad visual (fuentes y paleta): ver generators/brand.js.
const {
  NAVY, GOLD, GOLD_SOFT, TEXT_ON_DARK, DARKTEXT, STEEL, STEEL_ON_DARK,
  SURFACE, SURFACE_ALT, FONT_TITLE, FONT_BODY, FONT_BODY_SB, FS, TRACK,
  titleRun, labelRun, bodyRun,
} = require("./brand");

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
          // Jerarquía: la marca hace de antetítulo (pequeña y muy tracked,
          // porque el logo grande ya está a la derecha) y el peso visual se
          // lo llevan las dos líneas de tagline en stencil.
          new Paragraph({ children: [new TextRun(labelRun("MAG INDUSTRIES", 20, GOLD))] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun(bodyRun("Servicios de ingeniería CAD/CAM", 20, STEEL_ON_DARK))] }),
          new Paragraph({ spacing: { before: 80 }, children: [new TextRun(titleRun(TAGLINE_1, 40, TEXT_ON_DARK, { characterSpacing: TRACK.hero }))] }),
          new Paragraph({ children: [new TextRun(titleRun(TAGLINE_2, 40, GOLD, { characterSpacing: TRACK.hero }))] }),
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
  spacing: { before: 140, after: 60 },
  alignment: AlignmentType.CENTER,
  // Sin cursiva: a este tamaño y centrada, la redonda se lee mejor y da un
  // aire más sobrio que la cursiva anterior.
  children: [new TextRun(bodyRun(SUBHEAD, 21, DARKTEXT))],
});

// Franja de promesa. Sin emoji (la marca no los usa) y encerrada entre dos
// filetes dorados finos, que es lo que le da el aire de sello.
const ribbon = new Paragraph({
  spacing: { before: 60, after: 150 },
  alignment: AlignmentType.CENTER,
  shading: { type: ShadingType.CLEAR, color: "auto", fill: SURFACE_ALT },
  border: {
    top: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 6 },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 6 },
  },
  children: [new TextRun(labelRun(RIBBON, 17, NAVY))],
});

// ---------- VALUE CARDS (2x2) ----------
const GAP = 240;
const CARD_W = Math.floor((CONTENT_W - GAP) / 2);

function cardCell(iconFile, titulo, texto, rightPad) {
  return new TableCell({
    width: { size: CARD_W, type: WidthType.DXA },
    borders: noBorders(),
    margins: { top: 0, bottom: 120, left: 0, right: rightPad ? GAP : 0 },
    children: [valueCardInner(iconFile, titulo, texto)],
  });
}
function valueCardInner(iconFile, titulo, texto) {
  // Un icono ausente no debe tumbar la generación: se cae al icono genérico.
  const iconPath = fs.existsSync(iconFile) ? iconFile : "icon_gear.png";
  const icon = new ImageRun({ type: "png", data: fs.readFileSync(iconPath), transformation: { width: 62, height: 62 } });
  const ICON_COL_W = 1500;
  const TEXT_COL_W = CARD_W - ICON_COL_W;
  return new Table({
    width: { size: CARD_W, type: WidthType.DXA },
    columnWidths: [CARD_W],
    borders: noBorders(),
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: CARD_W, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: SURFACE_ALT },
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
                  new Paragraph({ spacing: { after: 80 }, children: [new TextRun(labelRun(titulo, 18, NAVY))] }),
                  new Paragraph({ children: [new TextRun(bodyRun(texto, 18, DARKTEXT))] }),
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
    new TableRow({ children: [cardCell(CARDS[0][0], CARDS[0][1], CARDS[0][2], true), cardCell(CARDS[1][0], CARDS[1][1], CARDS[1][2], false)] }),
    new TableRow({ children: [cardCell(CARDS[2][0], CARDS[2][1], CARDS[2][2], true), cardCell(CARDS[3][0], CARDS[3][1], CARDS[3][2], false)] }),
  ],
});

// ---------- ALCANCE TÉCNICO ----------
// Franja fija, NO personalizable por sector, y es a propósito.
//
// Las cuatro tarjetas de arriba se adaptan al sector del destinatario, y ahí
// está el riesgo: un perfil centrado en, por ejemplo, perfiles 2D deja el
// folleto dando a entender que MAG solo hace 2D. Esta línea es el contrapeso
// — el gancho puede ser específico, pero el rango completo de capacidad se
// ve siempre. Por eso no lee de `profile`: para que ningún perfil pueda
// recortarla sin querer.
const CAPABILITIES = [
  "Perfiles y contornos 2D",
  "Piezas 3D",
  "5 ejes continuos",
  "Utillaje y postizos",
  "Documentación y trazabilidad",
];

const alcanceTitle = new Paragraph({
  spacing: { before: 40, after: 60 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun(labelRun("ALCANCE TÉCNICO", 15, GOLD_SOFT))],
});

const alcanceLine = new Paragraph({
  spacing: { after: 40 },
  alignment: AlignmentType.CENTER,
  children: CAPABILITIES.flatMap((cap, i) => (
    i === 0
      ? [new TextRun({ text: cap, size: 17, font: FONT_BODY_SB, color: NAVY })]
      : [
        new TextRun({ text: "   ·   ", size: 17, font: FONT_BODY_SB, color: GOLD }),
        new TextRun({ text: cap, size: 17, font: FONT_BODY_SB, color: NAVY }),
      ]
  )),
});

// ---------- CÓMO FUNCIONA ----------
const comoFuncionaTitle = new Paragraph({
  spacing: { before: 150, after: 100 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun(titleRun("¿Cómo funciona?", 26, NAVY))],
});

function pasoCell(num, texto) {
  return new TableCell({
    width: { size: Math.floor(CONTENT_W / 3), type: WidthType.DXA },
    borders: noBorders(),
    margins: { top: 0, bottom: 0, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        shading: { type: ShadingType.CLEAR, color: "auto", fill: GOLD },
        children: [new TextRun(titleRun("  " + num + "  ", 30, NAVY))],
      }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 110 }, children: [new TextRun(bodyRun(texto, 18, DARKTEXT))] }),
    ],
  });
}
const pasosTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [Math.floor(CONTENT_W / 3), Math.floor(CONTENT_W / 3), Math.floor(CONTENT_W / 3)],
  borders: noBorders(),
  rows: [new TableRow({ children: [pasoCell("1", STEPS[0]), pasoCell("2", STEPS[1]), pasoCell("3", STEPS[2])] })],
});

// ---------- TRABAJOS SIMILARES (filtrados por sector) ----------
// Franja compacta: el folleto tiene que seguir cabiendo en una sola hoja, así
// que cada referencia ocupa un título y una línea de detalle, nada más.
const REF_COL_W = Math.floor(CONTENT_W / 3);
function refCell(titulo, detalle) {
  return new TableCell({
    width: { size: REF_COL_W, type: WidthType.DXA },
    borders: noBorders(),
    shading: { type: ShadingType.CLEAR, color: "auto", fill: SURFACE },
    margins: { top: 70, bottom: 70, left: 130, right: 130 },
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: titulo, size: 15, font: FONT_BODY_SB, color: NAVY })] }),
      new Paragraph({ children: [new TextRun(bodyRun(detalle, 15, STEEL))] }),
    ],
  });
}
const referenciasTitle = new Paragraph({
  spacing: { before: 130, after: 60 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun(labelRun("TRABAJOS SIMILARES", 16, GOLD_SOFT))],
});
const referenciasTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [REF_COL_W, REF_COL_W, REF_COL_W],
  borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: { style: BorderStyle.SINGLE, size: 8, color: "FFFFFF" } },
  rows: [new TableRow({ children: REFS.slice(0, 3).map(r => refCell(r[0], r[1])) })],
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
          new Paragraph({ children: [new TextRun(titleRun(CTA_TITLE, 26, TEXT_ON_DARK))] }),
          new Paragraph({ spacing: { before: 80, after: 170 }, children: [new TextRun(bodyRun(CTA_SUB, 20, STEEL_ON_DARK))] }),
          new Paragraph({ children: [new TextRun({ text: "+34 635 013 953", size: 32, font: FONT_BODY_SB, color: GOLD, characterSpacing: 6 })] }),
          new Paragraph({ spacing: { before: 70 }, children: [new TextRun(bodyRun("info@magindustries.es", 19, TEXT_ON_DARK))] }),
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
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 90 }, children: [new TextRun(labelRun("ESCRÍBENOS POR WHATSAPP", 14, STEEL))] }),
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
        alcanceTitle,
        alcanceLine,
        comoFuncionaTitle,
        pasosTable,
        referenciasTitle,
        referenciasTable,
        new Paragraph({ text: "", spacing: { after: 40 } }),
        ctaBanner,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("OnePager_Propuesta_Valor_MAG_Industries.docx", buffer);
  console.log("OK");
}).catch(e => { console.error("ERR", e); process.exit(1); });
