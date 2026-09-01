const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType,
  ImageRun, VerticalAlign, PageOrientation, Footer, TabStopType,
  LevelFormat,
} = require("docx");

// ---------- DATOS DE ENTRADA ----------
// La app escribe un JSON con los datos de la propuesta y pasa su ruta en
// GENERATOR_DATA. Sin esa variable el script sigue funcionando con datos de
// ejemplo, para poder ejecutarlo suelto (`node build5.js`).
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

// Perfil efectivo del cliente (sector + ficha). Vacío al ejecutar suelto.
const P = (D.profile && typeof D.profile === "object") ? D.profile : {};

// Idea 11 — co-branding: logo del cliente junto al de MAG. La marca MAG no se
// sustituye nunca; solo se añade la del cliente a su derecha.
const clientLogo = (P.logo_path && fs.existsSync(P.logo_path))
  ? new ImageRun({ type: "png", data: fs.readFileSync(P.logo_path), transformation: { width: 52, height: 52 } })
  : null;

const DOC_DATE = v(D.doc_date, (() => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
})());

// Identidad visual (fuentes y paleta): ver generators/brand.js.
const {
  NAVY, GOLD, TEXT_ON_DARK, DARKTEXT, STEEL, SURFACE, SURFACE_ALT, RULE, FONT_TITLE, FONT_BODY, FONT_BODY_SB, FS, TRACK, titleRun, labelRun,
} = require("./brand");

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
    border: { left: { style: BorderStyle.SINGLE, size: 36, color: GOLD, space: 4 } },
    children: [new TextRun({ text: "   " + text, bold: true, color: "FFFFFF", size: 24, font: FONT_BODY })],
  });
}

const logoImage = new ImageRun({ type: "png", data: fs.readFileSync("logo_claro.png"), transformation: { width: 62, height: 62 } });

const headerTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [1000, 5200, 4006],
  borders: { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 16, color: NAVY }, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
  rows: [new TableRow({
    children: [
      new TableCell({ width: { size: 1000, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(), margins: { top: 40, bottom: 40, left: 0, right: 80 }, children: [new Paragraph({ children: clientLogo ? [logoImage, new TextRun({ text: "  " }), clientLogo] : [logoImage] })] }),
      new TableCell({
        width: { size: 5200, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(),
        children: [
          new Paragraph({ children: [new TextRun(titleRun("MAG INDUSTRIES", 32, NAVY))] }),
          new Paragraph({ children: [new TextRun({ text: "Servicios de ingeniería CAD/CAM", size: 18, font: FONT_BODY, color: STEEL, characterSpacing: 14 })] }),
        ],
      }),
      new TableCell({
        width: { size: 4006, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(),
        children: [
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun(labelRun("PROPUESTA COMERCIAL", 22, DARKTEXT))] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Doc. Nº: ", size: 15, font: FONT_BODY, color: STEEL }), new TextRun({ text: v(D.doc_number, "MAG-PROP-001"), size: 15, font: FONT_BODY, bold: true })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Fecha: ", size: 15, font: FONT_BODY, color: STEEL }), new TextRun({ text: DOC_DATE, size: 15, font: FONT_BODY })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Válida hasta: ", size: 15, font: FONT_BODY, color: STEEL }), new TextRun({ text: v(D.valid_until, "30 días desde la fecha de este documento"), size: 15, font: FONT_BODY, bold: true })] }),
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
      new TextRun({ text: label + ": ", bold: true, size: 20, font: FONT_BODY, color: STEEL }),
      new TextRun({ text: value, size: 20, font: FONT_BODY, color: DARKTEXT, italics: !!opts.italic }),
    ],
  });
}

const destinatarioBlock = [
  labelValue("Presentado a", v(D.client_name, "[Nombre de la empresa]"), { italic: !D.client_name }),
  labelValue("Contacto", v(D.contact_name, "[Nombre de contacto]"), { italic: !D.contact_name }),
  labelValue("Proyecto", v(D.project_title, "[Título del proyecto]"), { italic: !D.project_title }),
];

// ---------- POSICIONAMIENTO ----------
const posicionamiento = new Paragraph({
  spacing: { before: 100, after: 200 },
  border: { left: { style: BorderStyle.SINGLE, size: 24, color: GOLD, space: 8 } },
  children: [
    new TextRun({
      text: "MAG Industries no factura horas: entrega piezas terminadas, con trazabilidad completa de proceso y control dimensional. Trabajamos como un socio técnico de tu producción — no como un proveedor puntual — priorizando fiabilidad de entrega y calidad certificable frente al cliente final.",
      italics: true, size: 21, font: FONT_BODY, color: DARKTEXT,
    }),
  ],
});

// ---------- ALCANCE ----------
const alcanceParrafo = new Paragraph({
  spacing: { after: 160 },
  children: [new TextRun({
    text: v(D.scope_text, "[Describe aquí el alcance técnico del proyecto: proceso, material, máquina y qué incluye el trabajo.]"),
    size: 21, font: FONT_BODY, color: DARKTEXT, italics: !D.scope_text,
  })],
});

// ---------- ESPECIFICACIONES ----------
function specLabelCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY }, verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 140, right: 100 }, borders: cellBorders(),
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 19, font: FONT_BODY })] })],
  });
}
function specValueCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 80, bottom: 80, left: 140, right: 100 }, borders: cellBorders(), shading: { type: ShadingType.CLEAR, color: "auto", fill: "FFFFFF" },
    children: [new Paragraph({ children: [new TextRun({ text, size: 19, font: FONT_BODY, color: DARKTEXT })] })],
  });
}
const specL = 3000, specV = CONTENT_W - specL;
function specRow(l, v) { return new TableRow({ children: [specLabelCell(l, specL), specValueCell(v, specV)] }); }

const especificacionesTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [specL, specV],
  rows: [
    specRow("PIEZA / REFERENCIA", v(D.project_ref, "[Referencia de la pieza]")),
    specRow("MATERIAL", v(D.material, "[Material y tratamiento]")),
    specRow("CANTIDAD", v(D.quantity, "[Nº de unidades]")),
    specRow("MÁQUINA / PROCESO", v(D.machine_process, "[Máquina y proceso de fabricación]")),
    specRow("TOLERANCIAS", v(D.tolerances, v(P.tolerance, "Según DIN ISO 2768-mK, salvo indicación específica en plano"))),
  ],
});

// ---------- ENTREGABLES ----------
const entregablesItems = (Array.isArray(D.deliverables) && D.deliverables.length)
  ? D.deliverables
  : ((Array.isArray(P.deliverables) && P.deliverables.length) ? P.deliverables : [
  "Programación CAM completa y verificada (simulación de colisiones incluida)",
  "Mecanizado de desbaste y acabado de las piezas según especificación",
  "Ficha de taller y hoja de herramientas de cada fase (documentación de proceso)",
  "Control dimensional final bajo plano, con reporte de calidad",
  "Piezas terminadas, limpias y embaladas para entrega",
]);
const entregablesParas = entregablesItems.map(t => new Paragraph({
  numbering: { reference: "entregables-list", level: 0 },
  spacing: { after: 70 },
  children: [new TextRun({ text: t, size: 20, font: FONT_BODY })],
}));

// ---------- CRONOGRAMA ----------
const cronoHeaders = ["FASE", "DURACIÓN ESTIMADA"];
const cronoColW = [7000, 3206];
const cronoHeaderRow = new TableRow({ children: cronoHeaders.map((h, i) => specLabelCell(h, cronoColW[i])) });
function cronoRow(fase, dur, fill) {
  return new TableRow({
    children: [
      new TableCell({ width: { size: cronoColW[0], type: WidthType.DXA }, borders: cellBorders(), shading: { type: ShadingType.CLEAR, color: "auto", fill }, margins: { top: 80, bottom: 80, left: 140, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: fase, size: 19, font: FONT_BODY })] })] }),
      new TableCell({ width: { size: cronoColW[1], type: WidthType.DXA }, borders: cellBorders(), shading: { type: ShadingType.CLEAR, color: "auto", fill }, margins: { top: 80, bottom: 80, left: 140, right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: dur, size: 19, font: FONT_BODY, bold: true })] })] }),
    ],
  });
}
const FASES_FALLBACK = [
  { fase: "Programación CAM y verificación", duracion: "1 – 2 días" },
  { fase: "Mecanizado (desbaste + acabado)", duracion: "4 – 5 días" },
  { fase: "Control dimensional y documentación", duracion: "1 día" },
];
const fases = (Array.isArray(D.timeline_phases) && D.timeline_phases.length) ? D.timeline_phases : FASES_FALLBACK;

const cronogramaTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: cronoColW,
  rows: [
    cronoHeaderRow,
    ...fases.map((f, i) => cronoRow(v(f.fase, "—"), v(f.duracion, "—"), i % 2 === 0 ? "FFFFFF" : SURFACE)),
    cronoRow("PLAZO TOTAL ESTIMADO", v(D.total_duration, "6 – 8 días laborables"), fases.length % 2 === 0 ? "FFFFFF" : SURFACE),
  ],
});

// ---------- INVERSIÓN (precio único) ----------
const PRICE_TEXT = (() => {
  const raw = D.price;
  if (raw === null || raw === undefined || String(raw).trim() === "") return "[Precio] €";
  const n = Number(String(raw).replace(/[^\d.,]/g, "").replace(",", "."));
  if (isNaN(n)) return String(raw).trim();
  return `${n.toLocaleString("es-ES")} €`;
})();
const PRICE_LABEL = v(D.price_label, "INVERSIÓN DEL PROYECTO — PRECIO ÚNICO");

const inversionBox = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [CONTENT_W],
  borders: cellBorders({ top: { style: BorderStyle.SINGLE, size: 12, color: NAVY }, bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY }, left: { style: BorderStyle.SINGLE, size: 12, color: NAVY }, right: { style: BorderStyle.SINGLE, size: 12, color: NAVY } }),
  rows: [new TableRow({
    cantSplit: false,
    children: [new TableCell({
      width: { size: CONTENT_W, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY }, margins: { top: 220, bottom: 220, left: 300, right: 300 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, keepLines: true, keepNext: true, children: [new TextRun({ text: PRICE_LABEL, bold: true, size: 20, font: FONT_BODY, color: "FFFFFF" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, keepLines: true, keepNext: true, spacing: { before: 120 }, children: [new TextRun({ text: PRICE_TEXT, bold: true, size: 56, font: FONT_BODY, color: GOLD })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, keepLines: true, spacing: { before: 100 }, children: [new TextRun({ text: "Precio cerrado por el proyecto completo — no se factura por horas trabajadas. IVA no incluido.", italics: true, size: 17, font: FONT_BODY, color: "D9D9D9" })] }),
      ],
    })],
  })],
});

// ---------- VALIDEZ Y CONDICIONES ----------
const condicionesItems = [
  "Precio fijo cerrado por el alcance descrito; no varía en función del tiempo real de mecanizado.",
  "El plazo de entrega comienza a contar desde la recepción del bruto y los planos definitivos.",
  `Oferta válida durante ${v(D.valid_until, v(P.offer_validity, "30 días naturales desde la fecha de este documento"))}.`,
  ...(v(P.payment_terms, "") ? [`Condiciones de pago acordadas: ${P.payment_terms}.`] : []),
  ...(v(P.rate_hour, "") ? [`Trabajos fuera del alcance descrito se presupuestan aparte a la tarifa acordada de ${P.rate_hour} €/h.`] : []),
  "MAG Industries se compromete a tratar los planos, modelos 3D y toda información técnica del cliente con estricta confidencialidad, respetando su propiedad intelectual. Dicha información se utilizará exclusivamente para la ejecución de este proyecto y no se compartirá, reproducirá ni cederá a terceros sin autorización expresa del cliente.",
];
const condicionesParas = condicionesItems.map(t => new Paragraph({
  numbering: { reference: "condiciones-list", level: 0 },
  spacing: { after: 70 },
  children: [new TextRun({ text: t, size: 19, font: FONT_BODY })],
}));

// ---------- ACEPTACIÓN ----------
function firmaBlock(titulo, width) {
  return new TableCell({
    width: { size: width || Math.floor(CONTENT_W / 2), type: WidthType.DXA },
    borders: noBorders(),
    margins: { top: 300, bottom: 0, left: 0, right: 200 },
    children: [
      new Paragraph({ spacing: { after: 500 }, children: [new TextRun({ text: titulo, bold: true, size: 19, font: FONT_BODY, color: NAVY })] }),
      new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE } }, children: [new TextRun({ text: "" })] }),
      new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: "Nombre y firma", size: 15, font: FONT_BODY, color: STEEL, italics: true })] }),
      new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: "Fecha: ______________", size: 15, font: FONT_BODY, color: STEEL })] }),
    ],
  });
}
// Idea 13 — quién firma lo define la ficha del cliente; si no dice nada, se
// mantienen las dos firmas de siempre.
const FIRMAS = (Array.isArray(P.signatures) && P.signatures.length)
  ? P.signatures.slice(0, 4)
  : ["Por MAG Industries", "Por el Cliente"];
const FIRMA_W = Math.floor(CONTENT_W / FIRMAS.length);
const aceptacionTable = new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: FIRMAS.map(() => FIRMA_W), borders: noBorders(), rows: [new TableRow({ children: FIRMAS.map(t => firmaBlock(t, FIRMA_W)) })] });

// ---------- TRABAJOS SIMILARES (idea 19: filtrados por sector) ----------
// Solo aparece si la ficha del cliente trae referencias de su sector.
const REFS = (Array.isArray(P.references) && P.references.length) ? P.references.slice(0, 3) : [];
const referenciasParas = REFS.map(r => new Paragraph({
  spacing: { after: 90 },
  children: [
    new TextRun({ text: (Array.isArray(r) ? r[0] : "") + " — ", bold: true, size: 20, font: FONT_BODY, color: NAVY }),
    new TextRun({ text: Array.isArray(r) ? (r[1] || "") : String(r), size: 20, font: FONT_BODY, color: DARKTEXT, italics: true }),
  ],
}));

// ---------- FOOTER ----------
const footer = new Footer({
  children: [
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE } },
      spacing: { before: 60 },
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
      children: [
        new TextRun({ text: "MAG Industries — Servicios de ingeniería CAD/CAM", size: 15, font: FONT_BODY, color: STEEL }),
        new TextRun({ text: "\t", size: 15 }),
        new TextRun({ text: "info@magindustries.es · +34 635 013 953", size: 15, font: FONT_BODY, color: STEEL }),
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
        ...(referenciasParas.length
          ? [sectionHeader(`TRABAJOS SIMILARES${v(P.sector_label, "") ? " — " + P.sector_label : ""}`), ...referenciasParas]
          : []),
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
