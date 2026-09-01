const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType,
  ImageRun, VerticalAlign, PageOrientation, Footer, TabStopType,
  PageBreak,
} = require("docx");

// ---------- DATOS DE ENTRADA ----------
// La app escribe un JSON con los datos del Setup Sheet y pasa su ruta en
// GENERATOR_DATA. Sin esa variable el script sigue funcionando con datos de
// ejemplo, para poder ejecutarlo suelto (`node build4.js`).
const D = (() => {
  const p = process.env.GENERATOR_DATA;
  if (!p || !fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { console.error("GENERATOR_DATA ilegible:", e.message); return {}; }
})();

// Devuelve el valor si tiene contenido; si no, el respaldo.
const v = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s === "" ? fallback : s;
};

// '01_216__KERN-RH__20182855' → ['01_216', 'KERN-RH', '20182855']
const refParts = v(D.project_ref, "").split("__").filter(Boolean);
const refCode = refParts[0] || "";
const refName = refParts[1] || "";
const refNum = refParts[2] || "";

// Perfil efectivo del cliente (sector + ficha). Vacio al ejecutar suelto.
const P = (D.profile && typeof D.profile === "object") ? D.profile : {};

// Idea 6 — nivel de detalle de la ficha: "compacta" (solo parametros, sin
// renders ni grafico), "estandar" (como siempre) o "extendida" (ademas,
// fabricante, referencia y limites de cada herramienta).
const DETAIL = ["compacta", "estandar", "extendida"].includes(P.ficha_detail)
  ? P.ficha_detail : "estandar";

// Idea 9 — condiciones reales del taller del cliente. Solo endurecen lo que
// dice el Setup Sheet: si Fusion marca corte en seco, seco se queda, porque
// la regla de voladizo de MAG no la puede relajar la ficha del cliente.
const SHOP_COOLANT = v(P.coolant, "");
const SHOP_DRY = /seco|dry|mql|aire/i.test(SHOP_COOLANT);

const REVISION = v(D.revision, "00");
// Idea 12 — numeracion documental propia del cliente si su ficha la define.
const DOC_NUM = v(D.doc_number, refCode && refName
  ? `${refCode}-${refName}-FT-${REVISION}`
  : v(D.project_ref, "SIN-REFERENCIA") + `-FT-${REVISION}`);

const PIEZA_REF = (() => {
  if (!refCode) return v(D.project_ref, "[Sin referencia en el export]");
  let s = `${refCode} ${refName}`.trim();
  if (refNum) s += ` — ${refNum}`;
  const variant = v(D.variant, "");
  if (variant) s += ` (${variant})`;
  return s;
})();

const DOC_DATE = v(D.doc_date, (() => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
})());

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

// Idea 11 — co-branding: el logo del cliente se anade junto al de MAG; la
// marca MAG no se sustituye nunca. Sin logo, la cabecera queda como estaba.
const clientLogo = (P.logo_path && fs.existsSync(P.logo_path))
  ? new ImageRun({ type: "png", data: fs.readFileSync(P.logo_path), transformation: { width: 50, height: 50 } })
  : null;

function buildHeaderTable(titleLine1, titleLine2) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [1150, 5250, 4150, 5156],
    borders: { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 16, color: NAVY }, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [new TableRow({
      children: [
        new TableCell({ width: { size: 1150, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: noBorders(), margins: { top: 40, bottom: 40, left: 0, right: 80 }, children: [new Paragraph({ children: clientLogo ? [logoImage, new TextRun({ text: " " }), clientLogo] : [logoImage] })] }),
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
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Doc. Nº: ", size: FS_META, font: "Arial", color: STEEL }), new TextRun({ text: DOC_NUM, size: FS_META, font: "Arial", bold: true, color: DARKTEXT })] }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Fecha: ", size: FS_META, font: "Arial", color: STEEL }), new TextRun({ text: DOC_DATE, size: FS_META, font: "Arial" })] }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Revisión: ", size: FS_META, font: "Arial", color: STEEL }), new TextRun({ text: REVISION, size: FS_META, font: "Arial" })] }),
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
    fullRow("CLIENTE", v(D.client_name, "[Nombre cliente — no incluido en export]"),
      D.client_name ? {} : { italic: true, color: STEEL }),
    fullRow("PIEZA / REFERENCIA", PIEZA_REF),
    fullRow("MÁQUINA", `${v(D.machine, "HAAS VF-2 (3 ejes)")}`
      + `${v(D.machine_taper, "") ? "  ·  Cono: " + D.machine_taper : ""}`
      + `  ·  Postprocesador: ${v(D.postprocessor, "HAAS Next Generation")}`),
    fullRow("PROGRAMA CNC", `Program ${v(D.program_number, "—")} (O${v(D.program_number, "—")})   ·   Plano de trabajo: ${v(D.work_plane, "#1")}`),
    fullRow("MATERIAL / DUREZA", v(D.material, "[No incluido en export — confirmar]"),
      D.material ? {} : { italic: true, color: STEEL }),
    fullRow("BRUTO (DX x DY x DZ)", brutoText()),
    fullRow("PROGRAMADOR / FASE", `${v(D.programmer, "[Nombre]")}  ·  ${v(D.job_description, "—")}`),
  ],
});

function brutoText() {
  const dx = v(D.bruto_dx, null), dy = v(D.bruto_dy, null), dz = v(D.bruto_dz, null);
  if (!dx || !dy || !dz) return "[No detectado en el export]";
  return `${dx} x ${dy} x ${dz} mm`;
}

// Los valores del Setup Sheet llegan con unidad ('15mm', '2918rpm'); para
// componer las frases del resumen se usa solo el número.
const numOf = (s) => {
  const m = String(v(s, "")).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return m ? m[0] : null;
};
const withUnit = (s, unit) => {
  const n = numOf(s);
  return n === null ? "—" : `${n} ${unit}`;
};

const resumenTable = new Table({
  width: { size: LEFT_W, type: WidthType.DXA },
  columnWidths: [gLabelW, gValueW],
  rows: [
    fullRow("OPERACIONES / HERRAMIENTAS", `${v(D.total_operations, "—")} operaciones   ·   ${v(D.total_tools, "—")} herramientas`),
    fullRow("RANGO EN Z", `de ${withUnit(D.z_max, "mm")} a ${withUnit(D.z_min, "mm")}`),
    fullRow("AVANCE / RPM MÁXIMO", `${withUnit(D.feedrate_max, "mm/min")}   ·   ${withUnit(D.rpm_max, "rpm")}`),
    fullRow("DISTANCIAS (CORTE / RÁPIDO)", `${withUnit(D.cutting_distance, "mm")}   /   ${withUnit(D.rapid_distance, "mm")}`),
    fullRow("TIEMPO TOTAL ESTIMADO", v(D.cycle_time, "—"), { bold: true }),
  ],
});

// ---------- IMAGEN DE PIEZA (right block) ----------
// El Setup Sheet suele incrustar el render de la pieza; la app lo extrae y
// deja la ruta en pieza_image_path. Si no viene, se usa el render de ejemplo.
const piezaImgPath = (D.pieza_image_path && fs.existsSync(D.pieza_image_path))
  ? D.pieza_image_path
  : "pieza_render.png";
const piezaImgBuffer = fs.readFileSync(piezaImgPath);
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

// Contenido de la celda de imagen de la tarjeta: el render pegado por el
// usuario si lo hay, y si no el hueco con la indicación de pegarlo. La app ya
// reescala la imagen y envía sus medidas, así que aquí solo se coloca.
function toolImageContent(n, tool) {
  if (tool && tool.image_path && fs.existsSync(tool.image_path)) {
    try {
      return [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({
          type: "png",
          data: fs.readFileSync(tool.image_path),
          transformation: {
            width: Number(tool.image_w) || 150,
            height: Number(tool.image_h) || 110,
          },
        })],
      })];
    } catch (e) {
      console.error(`Render de T${n} ilegible:`, e.message);
    }
  }
  return [
    new Paragraph({ text: "" }), new Paragraph({ text: "" }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PEGAR RENDER", italics: true, size: FS_FOOTSMALL + 2, font: "Arial", color: "8A94A0" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Fusion 360 › Utillaje", italics: true, size: FS_FOOTSMALL + 2, font: "Arial", color: "8A94A0" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `T${n} + cono`, italics: true, size: FS_FOOTSMALL + 2, font: "Arial", color: "8A94A0" })] }),
    new Paragraph({ text: "" }), new Paragraph({ text: "" }),
  ];
}

function buildToolCard(n, tipo, diam, resq, long, flutes, soporte, refrig, refrigColor, tiempo, pct, tool) {
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
            children: toolImageContent(n, tool),
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
              // Nivel extendido: datos que un operario nuevo agradece tener
              // delante y que en la ficha compacta solo estorban.
              ...(DETAIL === "extendida" ? [
                specLine("Fabricante / Ref.", `${v(tool && tool.vendor, "—")}  ·  ${v(tool && tool.product, "—")}`),
                specLine("Límites (RPM / avance)", `${v(tool && tool.rpm_max, "—")}  ·  ${v(tool && tool.feedrate_max, "—")}`),
                specLine("Z mínima alcanzada", v(tool && tool.z_min, "—")),
              ] : []),
            ],
          }),
        ],
      }),
    ],
  });
}

// Datos de ejemplo, solo para ejecutar el script sin GENERATOR_DATA.
const TOOLS_FALLBACK = [
  { number: "1", label: "T1", description: "12mm Bullnose Endmill CORTA JPARENTE", diameter: "12", corner_radius: "6", length: "35", flutes: "2", holder_full: "BT40 6MM End Mill Holder x 90mm (Haas Automation, ref. 04-0137)", coolant: "Fluido", cycle_time: "2h 39m 11s", percentage: "13.5%" },
];

const tools = (Array.isArray(D.tools) && D.tools.length) ? D.tools : TOOLS_FALLBACK;

// 'Desactivado' (o ausencia de refrigerante) marca el corte en seco, que la
// ficha resalta en rojo por la regla de refrigeración de MAG Industries.
function coolantInfo(coolant) {
  const c = v(coolant, "");
  const dry = !c || /desactiv|off|disabled|seco|none/i.test(c);
  // Corte en seco segun Fusion: no se relaja nunca, aunque el taller del
  // cliente trabaje con emulsion.
  if (dry) {
    return { text: `SIN refrigerante (${c || "Desactivado"})`, color: REDWARN, dry: true };
  }
  // Corte humedo: se imprime el medio real del taller, no el del Setup Sheet.
  if (SHOP_COOLANT) {
    return SHOP_DRY
      ? { text: `SIN refrigerante — ${SHOP_COOLANT} (condición del taller)`, color: REDWARN, dry: true }
      : { text: `CON refrigerante (${SHOP_COOLANT})`, color: NAVY, dry: false };
  }
  return { text: `CON refrigerante (${c})`, color: NAVY, dry: false };
}

// 'bullnose end mill' → 'Bullnose End Mill'
const titleCase = (s) => v(s, "").replace(/\b\w/g, (m) => m.toUpperCase());

// '12mm Bullnose Endmill CORTA JPARENTE' → 'Bullnose Endmill CORTA JPARENTE'
function toolTitle(t) {
  const desc = v(t.description, "");
  if (desc) return desc.replace(/^\d+(?:\.\d+)?\s*mm\s+/i, "");
  return titleCase(t.type) || `Herramienta ${v(t.label, "")}`;
}

const mm = (x) => (v(x, null) === null ? "—" : `${v(x, "")} mm`);

const cards = tools.map((t) => {
  const ci = coolantInfo(t.coolant);
  const pct = v(t.percentage, null);
  return buildToolCard(
    v(t.number, "?"),
    toolTitle(t),
    mm(t.diameter),
    mm(t.corner_radius),
    mm(t.length),
    v(t.flutes, "—"),
    v(t.holder_full, v(t.holder, "—")),
    ci.text,
    ci.color,
    v(t.cycle_time, "—"),
    pct || "—",
    t,
  );
});

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

// Celda vacía para completar la rejilla cuando hay un número impar de
// herramientas (mantiene la maquetación a 2 columnas).
function emptyCardCell(isRight) {
  return new TableCell({
    width: { size: CARD_OUTER_W, type: WidthType.DXA },
    borders: noBorders(),
    margins: { top: 0, bottom: 200, left: isRight ? 130 : 0, right: isRight ? 0 : 130 },
    children: [new Paragraph({ text: "" })],
  });
}

const gridRows = [];
for (let i = 0; i < cards.length; i += 2) {
  gridRows.push(new TableRow({
    children: [
      cardCell(cards[i], false),
      cards[i + 1] ? cardCell(cards[i + 1], true) : emptyCardCell(true),
    ],
  }));
}

const herramientasGrid = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [CARD_OUTER_W, CARD_OUTER_W],
  borders: noBorders(),
  rows: gridRows,
});

// Nivel compacto: las herramientas caben en una tabla, sin renders ni
// tarjetas, para que la ficha ocupe lo minimo en el taller.
const compactCols = [700, 4400, 1300, 1300, 900, 3200, 2100, 1806];
const compactHeaders = ["HTA", "DESCRIPCIÓN", "Ø (mm)", "LONG. (mm)", "FLUTES", "PORTA-HERRAMIENTAS", "REFRIGERACIÓN", "TIEMPO"];
const herramientasCompacta = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: compactCols,
  rows: [
    new TableRow({ children: compactHeaders.map((h, i) => headCell(h, compactCols[i])) }),
    ...tools.map((t, i) => {
      const ci = coolantInfo(t.coolant);
      const fill = i % 2 === 0 ? "FFFFFF" : LIGHTGREY;
      return new TableRow({ children: [
        dataCell(`T${v(t.number, "?")}`, compactCols[0], { align: AlignmentType.CENTER, bold: true, fill }),
        dataCell(toolTitle(t), compactCols[1], { fill }),
        dataCell(v(t.diameter, "—"), compactCols[2], { align: AlignmentType.CENTER, fill }),
        dataCell(v(t.length, "—"), compactCols[3], { align: AlignmentType.CENTER, fill }),
        dataCell(v(t.flutes, "—"), compactCols[4], { align: AlignmentType.CENTER, fill }),
        dataCell(v(t.holder_full, v(t.holder, "—")), compactCols[5], { fill }),
        dataCell(ci.text, compactCols[6], { fill, bold: true, color: ci.color }),
        dataCell(v(t.cycle_time, "—"), compactCols[7], { align: AlignmentType.CENTER, fill }),
      ] });
    }),
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
  // Condiciones declaradas en la ficha del cliente: lo que de verdad hay en
  // su taller, que no tiene por que coincidir con el Setup Sheet.
  ...(SHOP_COOLANT ? [new Paragraph({
    spacing: { before: 60, after: 40 },
    children: [
      new TextRun({ text: "Condición de taller declarada por el cliente:  ", bold: true, size: FS_NOTE, font: "Arial" }),
      new TextRun({ text: SHOP_COOLANT, size: FS_NOTE, font: "Arial", bold: true, color: SHOP_DRY ? REDWARN : NAVY }),
      new TextRun({ text: SHOP_DRY
        ? " — este taller no usa refrigerante líquido: las operaciones marcadas como húmedas en el Setup Sheet se ejecutan bajo esta condición."
        : " — medio de refrigeración empleado en las operaciones húmedas de esta ficha.",
        size: FS_NOTE, font: "Arial" }),
    ],
  })] : []),
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

const OPS_FALLBACK = [
  { number: 1, description: "DESB ZONA SUPERIOR", strategy: "Festoneado", tool: "T1", coolant: "Fluido", rpm: "2918", feedrate: "500", z_max: "15", z_min: "-15.54", cycle_time: "2h 13m 13s" },
];

const operations = (Array.isArray(D.operations) && D.operations.length) ? D.operations : OPS_FALLBACK;

const opRows = [
  opHeaderRow,
  ...operations.map((op, i) => {
    const ci = coolantInfo(op.coolant);
    return opRow(
      v(op.number, i + 1),
      v(op.description, "—"),
      v(op.strategy, "—"),
      v(op.tool, "—"),
      v(op.coolant, "Desactivado"),
      ci.color,
      i % 2 === 0 ? "FFFFFF" : LIGHTGREY,
      v(op.rpm, "—"),
      v(op.feedrate, "—"),
      v(op.z_max, "—"),
      v(op.z_min, "—"),
      v(op.cycle_time, "—"),
    );
  }),
];

const operacionesTable = new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: opCols, rows: opRows });

// ---------- GRÁFICO DE BARRAS: DISTRIBUCIÓN DE TIEMPO POR HERRAMIENTA ----------
const BAR_LABEL_W = 3200;
const BAR_AREA_W = CONTENT_W - BAR_LABEL_W; // 12506
// Escala del eje: múltiplo de 10 justo por encima del mayor porcentaje real,
// para que la barra más larga no toque el borde.
const pctOf = (t) => {
  const n = parseFloat(String(v(t.percentage, "0")).replace("%", "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};
const BAR_MAX_PCT = Math.max(10, Math.ceil((Math.max(...tools.map(pctOf)) * 1.05) / 10) * 10);

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

// '3h 2m 56s' → '3h 2m' (los segundos no aportan en la etiqueta de la barra)
const shortTime = (t) => v(t, "—").replace(/\s*\d+s$/, "") || v(t, "—");

function barLabel(t) {
  const ci = coolantInfo(t.coolant);
  let name = toolTitle(t).replace(/^bullnose\s+end\s*mill\s*/i, "").trim() || toolTitle(t);
  if (name.length > 26) name = name.slice(0, 25).trim() + "…";
  return `${v(t.label, "T" + v(t.number, "?"))} · ${name} (${ci.dry ? "seco" : "húmedo"}) — ${shortTime(t.cycle_time)}`;
}

const distribucionTiempoTable = new Table({
  width: { size: CONTENT_W, type: WidthType.DXA },
  columnWidths: [BAR_LABEL_W, BAR_AREA_W],
  borders: noBorders(),
  rows: tools.map((t) => barRow(barLabel(t), pctOf(t), coolantInfo(t.coolant).dry ? REDWARN : NAVY)),
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
          new TextRun({ text: "info@magindustries.es · +34 635 013 953", size: FS_FOOT, font: "Arial", color: STEEL }),
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
        DETAIL === "compacta" ? herramientasCompacta : herramientasGrid,
        ...notaRefrigeracion,
        // La ficha compacta no parte pagina aqui: cabe todo seguido.
        ...(DETAIL === "compacta"
          ? [new Paragraph({ text: "", spacing: { after: 160 } })]
          : [new Paragraph({ children: [new PageBreak()] })]),
        sectionHeader("SECUENCIA DE OPERACIONES DE MECANIZADO"),
        new Paragraph({ text: "", spacing: { after: 100 } }),
        operacionesTable,
        // El grafico de reparto de tiempo es util para planificar, no para
        // ejecutar: la ficha compacta lo omite.
        ...(DETAIL === "compacta" ? [] : [
          new Paragraph({ text: "", spacing: { after: 60 } }),
          sectionHeader("DISTRIBUCIÓN DE TIEMPO POR HERRAMIENTA"),
          new Paragraph({ text: "", spacing: { after: 140 } }),
          distribucionTiempoTable,
        ]),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Ficha_Taller_Herramientas_MAG_Industries_v2.docx", buffer);
  console.log("OK");
}).catch(e => { console.error("ERR", e); process.exit(1); });
