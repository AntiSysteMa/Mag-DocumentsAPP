const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, HeadingLevel, ShadingType,
  ImageRun, VerticalAlign, PageOrientation, Header, Footer, TabStopType,
  TabStopPosition, PageBreak, LevelFormat, convertInchesToTwip,
  TextDirection, HeightRule
} = require("docx");

// ---------- DATOS DE ENTRADA ----------
// La app escribe un JSON con los datos de la Hoja G54 y pasa su ruta en
// GENERATOR_DATA. Sin esa variable el script sigue funcionando con valores
// de ejemplo, para poder ejecutarlo suelto (`node build_g54.js`).
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

const NAVY = "1B2A41";
const ORANGE = "E07B39";
const STEEL = "5A6B7A";
const LIGHTGREY = "F2F2F2";
const MIDGREY = "D9D9D9";
const DARKTEXT = "1A1A1A";

const PAGE_W = 16838; // A4 landscape width in DXA (297mm)
const PAGE_H = 11906; // A4 landscape height in DXA (210mm)
const MARGIN = 566; // ~1cm

// ---------- VALORES DE LA HOJA (JSON de la app o placeholders) ----------
const REVISION = v(D.revision, "00");
const CLIENTE = v(D.client_name, "[NOMBRE CLIENTE]");
const PIEZA_REF = v(D.project_ref, "[NOMBRE Y REFERENCIA]");
const FASE_OP = v(D.phase_op, "[Nº FASE]");
const MAQUINA = v(D.machine, "HAAS VF-2 (3 ejes)");
const PROGRAMA = v(D.cnc_program, "[O-XXXX / archivo.nc]");
const POSTPRO = v(D.postprocessor, "HAAS Next Generation");
const MATERIAL = v(D.material, "D2");
const DUREZA = v(D.hardness, "62 HRC");
const BRUTO = v(D.stock_dims, "[XX x XX x XX mm]");
const PROGRAMADOR = v(D.programmer, "[NOMBRE]");
const OPERARIO = v(D.operator, "[NOMBRE]");
// Perfil efectivo del cliente (sector + ficha). Vacio al ejecutar suelto.
const P = (D.profile && typeof D.profile === "object") ? D.profile : {};

// Idea 10 — cada taller tiene su convencion: que origen usa (G54-G59), como
// llama a los amarres y en que rango numera los programas. La hoja sale ya
// con la del cliente en lugar de imponer la nuestra.
const OFFSET = (/^G5[4-9]$/i.test(v(P.work_offset, ""))) ? P.work_offset.toUpperCase() : "G54";
const PROGRAM_RANGE = v(P.program_range, "");
const FIXTURE = v(P.fixture_naming, "");

// Idea 12 — numeracion documental propia del cliente si su ficha la define.
const DOC_NUM = v(D.doc_number, `${PIEZA_REF}-${OFFSET}-${REVISION}`);
const DOC_DATE = v(D.doc_date, (() => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
})());

// Texto del método de origen G54 (aprobado). Editable desde la app; este es
// el default que se inyecta si el usuario no lo cambia.
const ORIGIN_DEFAULT =
`Eje X (centro de la pieza): Palpar las dos caras laterales opuestas en el eje X y establecer el cero en el punto medio entre ambas. El origen X queda en el centro geométrico de la pieza final.

Eje Y (centro de la pieza): Palpar los cantos opuestos (superior e inferior) en el eje Y y establecer el cero en el punto medio. El origen Y queda en el centro geométrico de la pieza final.

Eje Z (base de la pieza): Establecer el cero en la cara inferior de la pieza final (Z mínimo). Verificar con una altura o distancia medible y conocida, de modo que el cero sea comprobable y trazable para mantener las tolerancias bajo control.

Verificación con comparador de carátula: Antes de mecanizar, comprobar el origen en X e Y apoyándose en referencias verificables —agujeros de referencia o caras perfectamente paralelas— usando el comparador de carátula. Confirmar que la desviación esté dentro de tolerancia antes de dar inicio al programa.`;
const ORIGIN_TEXT = v(D.origin_text, ORIGIN_DEFAULT);

// Capturas de las 4 vistas (frontal/superior/lateral/isométrica). La app las
// reescala en Python a la caja exacta de la celda (core/images.py:
// box_for_g54_view) antes de escribirlas a disco, así que aquí solo se
// colocan con las medidas que llegan en el JSON.
const VIEWS = D.views || {};

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };

function cellBorders(overrides = {}) {
  return {
    top: overrides.top || thinBorder,
    bottom: overrides.bottom || thinBorder,
    left: overrides.left || thinBorder,
    right: overrides.right || thinBorder,
  };
}

function labelCell(text, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 30, bottom: 30, left: 100, right: 100 },
    borders: cellBorders(),
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: text, bold: true, color: "FFFFFF", size: 15, font: "Arial" }),
        ],
      }),
    ],
    ...opts,
  });
}

function valueCell(text, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 30, bottom: 30, left: 100, right: 100 },
    borders: cellBorders(),
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "FFFFFF" },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: text, size: 18, font: "Arial", color: DARKTEXT }),
        ],
      }),
    ],
    ...opts,
  });
}

function sectionHeader(text) {
  return new Paragraph({
    spacing: { before: 90, after: 40 },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
    children: [
      new TextRun({ text: "  " + text, bold: true, color: "FFFFFF", size: 19, font: "Arial" }),
    ],
  });
}

// ---------- HEADER TABLE (logo + company + doc title/meta) ----------
// Logo reducido (era 60x60) para compactar el banner: es el elemento que más
// altura le impone a la fila del encabezado, y a este tamaño sigue siendo
// perfectamente legible.
const logoImage = new ImageRun({
  type: "png",
  data: fs.readFileSync("logo_claro.png"),
  transformation: { width: 46, height: 46 },
});

// Idea 11 — co-branding: logo del cliente junto al de MAG, nunca en su
// lugar. A 40 px no altera la altura de la fila de cabecera, que es lo que
// decide si la pagina 1 sigue cabiendo en una hoja.
const clientLogo = (P.logo_path && fs.existsSync(P.logo_path))
  ? new ImageRun({ type: "png", data: fs.readFileSync(P.logo_path), transformation: { width: 40, height: 40 } })
  : null;

const headerTable = new Table({
  width: { size: PAGE_W - 2 * MARGIN, type: WidthType.DXA },
  columnWidths: [1100, 5200, 4200, 5238],
  borders: {
    top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY },
    left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder,
  },
  rows: [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 1100, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders({ top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }),
          margins: { top: 10, bottom: 10, left: 0, right: 80 },
          children: [new Paragraph({ children: clientLogo ? [logoImage, new TextRun({ text: " " }), clientLogo] : [logoImage] })],
        }),
        new TableCell({
          width: { size: 5200, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders({ top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }),
          margins: { top: 10, bottom: 10, left: 0, right: 0 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: "MAG INDUSTRIES", bold: true, size: 26, font: "Arial", color: NAVY })],
            }),
            new Paragraph({
              children: [new TextRun({ text: "Servicios de ingeniería CAD/CAM", italics: true, size: 16, font: "Arial", color: STEEL })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 4200, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders({ top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }),
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "HOJA DE PUNTO CERO", bold: true, size: 22, font: "Arial", color: DARKTEXT })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `ORIGEN DE PIEZA — ${OFFSET}`, bold: true, size: 18, font: "Arial", color: ORANGE })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 5238, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders({ top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }),
          margins: { top: 10, bottom: 10, left: 0, right: 0 },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "Doc. Nº: ", size: 14, font: "Arial", color: STEEL }),
                         new TextRun({ text: DOC_NUM, size: 14, font: "Arial", bold: true, color: DARKTEXT })],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "Fecha: ", size: 14, font: "Arial", color: STEEL }),
                         new TextRun({ text: DOC_DATE, size: 14, font: "Arial" })],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "Revisión: ", size: 14, font: "Arial", color: STEEL }),
                         new TextRun({ text: REVISION, size: 14, font: "Arial" })],
            }),
          ],
        }),
      ],
    }),
  ],
});

// ---------- DATOS GENERALES TABLE ----------
function dataRow(pairs) {
  // pairs: [[label, value, labelWidth, valueWidth], ...]
  const cells = [];
  pairs.forEach(([label, value, lw, vw]) => {
    cells.push(labelCell(label, lw));
    cells.push(valueCell(value, vw));
  });
  return new TableRow({ children: cells });
}

const colA_L = 1750, colA_V = 3350, colB_L = 1750, colB_V = 3350, colC_L = 1750, colC_V = 3488;

const datosGeneralesTable = new Table({
  width: { size: PAGE_W - 2 * MARGIN, type: WidthType.DXA },
  columnWidths: [colA_L, colA_V, colB_L, colB_V, colC_L, colC_V],
  rows: [
    dataRow([
      ["CLIENTE", CLIENTE, colA_L, colA_V],
      ["PIEZA / REF.", PIEZA_REF, colB_L, colB_V],
      ["FASE / OP.", FASE_OP, colC_L, colC_V],
    ]),
    dataRow([
      ["MÁQUINA", MAQUINA, colA_L, colA_V],
      ["PROGRAMA CNC", PROGRAM_RANGE ? `${PROGRAMA}   (rango del cliente: ${PROGRAM_RANGE})` : PROGRAMA, colB_L, colB_V],
      ["POSTPROCESADOR", POSTPRO, colC_L, colC_V],
    ]),
    dataRow([
      ["MATERIAL", MATERIAL, colA_L, colA_V],
      ["DUREZA", DUREZA, colB_L, colB_V],
      ["BRUTO (X x Y x Z)", BRUTO, colC_L, colC_V],
    ]),
    dataRow([
      ["PROGRAMADOR", PROGRAMADOR, colA_L, colA_V],
      ["OPERARIO EJECUTOR", OPERARIO, colB_L, colB_V],
      ["REFRIGERACIÓN", "[VER NOTA MÁS ABAJO]", colC_L, colC_V],
    ]),
  ],
});

// ---------- VISTAS: 4 vistas con título lateral + imagen real ----------
// Cada vista es un par [etiqueta rotada | imagen], no una celda con el título
// arriba: así la imagen aprovecha casi todo el ancho y alto de la celda en
// vez de perder espacio vertical en un título horizontal.
//
// Geometría (debe coincidir con core/images.py: box_for_g54_view):
//   vistaW   = 7853 DXA (medio ancho de página en horizontal)
//   LABEL_W  =  450 DXA (columna de la etiqueta rotada)
//   IMG_W    = 7403 DXA (columna de la imagen)
//   ROW_H    = 3200 DXA, ATLEAST (mínimo, nunca recorta si la imagen creciera)
// Garantía de que la tabla nunca "salta" ni "corta" una imagen: cada fila
// lleva cantSplit=true (Word mueve la fila entera a la página siguiente en
// vez de partirla) y la imagen ya llega pre-escalada por Python al tamaño
// máximo que cabe en IMG_W x (ROW_H - márgenes), así que jamás necesita
// crecer más allá de la fila.
const vistaW = Math.floor((PAGE_W - 2 * MARGIN) / 2);
const LABEL_W = 450;
const IMG_W = vistaW - LABEL_W;
const ROW_H = 3200;
const IMG_CELL_MARGIN = 60;

function vistaLabelCell(title) {
  return new TableCell({
    width: { size: LABEL_W, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    textDirection: TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: NAVY },
    margins: { top: 80, bottom: 80, left: 50, right: 50 },
    borders: cellBorders(),
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: title, bold: true, size: 15, font: "Arial", color: "FFFFFF" })],
      }),
    ],
  });
}

function vistaImageCell(view, hint) {
  const info = view && view.path && fs.existsSync(view.path) ? view : null;
  const children = [];
  if (info) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        type: "png",
        data: fs.readFileSync(info.path),
        transformation: {
          width: Number(info.w) || 485,
          height: Number(info.h) || 205,
        },
      })],
    }));
  } else {
    children.push(
      new Paragraph({ text: "" }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "PEGAR CAPTURA FUSION 360", italics: true, size: 14, font: "Arial", color: "8A94A0" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: hint || "", italics: true, size: 12, font: "Arial", color: "8A94A0" })],
      }),
    );
  }
  return new TableCell({
    width: { size: IMG_W, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: info ? "FFFFFF" : LIGHTGREY },
    margins: { top: IMG_CELL_MARGIN, bottom: IMG_CELL_MARGIN, left: IMG_CELL_MARGIN, right: IMG_CELL_MARGIN },
    borders: cellBorders(info ? {} : {
      top: { style: BorderStyle.DASHED, size: 6, color: "9AA5AF" },
      bottom: { style: BorderStyle.DASHED, size: 6, color: "9AA5AF" },
      left: { style: BorderStyle.DASHED, size: 6, color: "9AA5AF" },
      right: { style: BorderStyle.DASHED, size: 6, color: "9AA5AF" },
    }),
    children,
  });
}

function vistaRow(items) {
  // items: [[title, view, hint], [title, view, hint]]
  const cells = [];
  items.forEach(([title, view, hint]) => {
    cells.push(vistaLabelCell(title));
    cells.push(vistaImageCell(view, hint));
  });
  return new TableRow({
    cantSplit: true,
    height: { value: ROW_H, rule: HeightRule.ATLEAST },
    children: cells,
  });
}

const vistasTable = new Table({
  width: { size: PAGE_W - 2 * MARGIN, type: WidthType.DXA },
  columnWidths: [LABEL_W, IMG_W, LABEL_W, IMG_W],
  rows: [
    vistaRow([
      ["VISTA FRONTAL (XZ)", VIEWS.frontal, "Win+Shift+S en Fusion 360"],
      [`VISTA SUPERIOR (XY) — ORIGEN ${OFFSET}`, VIEWS.superior, "Debe mostrar el punto de origen"],
    ]),
    vistaRow([
      ["VISTA LATERAL (YZ)", VIEWS.lateral, "Win+Shift+S en Fusion 360"],
      ["VISTA ISOMÉTRICA — SUJECIÓN", VIEWS.isometrica, "Con utillaje/mordaza visible"],
    ]),
  ],
});

// ---------- DESCRIPCIÓN DEL PUNTO G54 (método de origen aprobado/editable) ----------
// Cada párrafo del texto se renderiza por separado. Si la línea empieza con
// una etiqueta seguida de dos puntos ("Eje X (…):"), esa etiqueta va en negrita.
function originParagraphs(text) {
  return text
    .split(/\n\s*\n/)                 // párrafos separados por línea en blanco
    .map((block) => block.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx > 0 && idx <= 60) {
        return new Paragraph({
          spacing: { before: 20, after: 120 },
          children: [
            new TextRun({ text: line.slice(0, idx + 1) + " ", bold: true, size: 18, font: "Arial", color: NAVY }),
            new TextRun({ text: line.slice(idx + 1).trim(), size: 18, font: "Arial", color: DARKTEXT }),
          ],
        });
      }
      return new Paragraph({
        spacing: { before: 20, after: 120 },
        children: [new TextRun({ text: line, size: 18, font: "Arial", color: DARKTEXT })],
      });
    });
}
const descripcionG54 = originParagraphs(ORIGIN_TEXT);

// ---------- MÉTODO DE TOQUEO RECOMENDADO ----------
const metodoToqueo = [
  new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: "Método recomendado: ", bold: true, size: 18, font: "Arial" }),
               new TextRun({ text: "[Ej: Buscador de bordes manual para caras planas accesibles / Sonda de medición para geometrías curvas o de difícil acceso]", size: 18, font: "Arial", italics: true, color: STEEL })],
  }),
  new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: "Justificación técnica: ", bold: true, size: 18, font: "Arial" }),
               new TextRun({ text: "[Se genera automáticamente según geometría de la pieza, tolerancia requerida y accesibilidad — ej: \"Se recomienda sonda por la dureza del material (62 HRC) y el riesgo de desgaste/imprecisión del buscador de bordes manual sobre superficie templada\"]", size: 18, font: "Arial" })],
  }),
];

// ---------- NOTA DE REFRIGERACIÓN ----------
const notaRefrigeracion = [
  new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: "Herramienta corta (207342-12) — 24 mm cono térmico: ", bold: true, size: 17, font: "Arial" }),
               new TextRun({ text: "CON refrigerante (corte húmedo aprobado por fabricante).", size: 17, font: "Arial" })],
  }),
  new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: "Herramienta larga Diabolo HPC (207424-12, 120 mm): ", bold: true, size: 17, font: "Arial" }),
               new TextRun({ text: "SIN refrigerante — corte en seco OBLIGATORIO según ficha técnica del fabricante, sin excepciones.", size: 17, font: "Arial", bold: true, color: "B00020" })],
  }),
  new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: "Nota para esta operación: ", bold: true, size: 17, font: "Arial" }),
               new TextRun({ text: "[Especificar aquí si la fase actual usa herramienta corta, larga, o ambas, y confirmar el estado de refrigerante en el arranque del programa]", size: 17, font: "Arial", italics: true, color: STEEL })],
  }),
];

// ---------- CHECKLIST ----------
const checklistItems = [
  "Bruto correctamente sujeto y apoyado — sin holguras ni vibración al tacto",
  `Origen ${OFFSET} verificado con doble toque (ida y comprobación) en cada eje`,
  "Z0 referenciado con la herramienta y offset correctos cargados en el control",
  `Coordenadas de ${OFFSET} introducidas coinciden con las indicadas en esta hoja`,
  "Zona de trabajo libre de obstáculos — verificar recorrido del portaherramientas/cono en simulación",
  "Estado de refrigerante (ON/OFF) verificado según herramienta a utilizar en el arranque",
  "Primera pasada ejecutada en modo Single Block / a velocidad reducida antes de ciclo completo",
];

const checklistParas = checklistItems.map(item =>
  new Paragraph({
    numbering: { reference: "checklist", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text: item, size: 18, font: "Arial" })],
  })
);

// ---------- FIRMAS (idea 13: quien firma lo define la ficha del cliente) ----------
const FIRMAS = (Array.isArray(P.signatures) && P.signatures.length)
  ? P.signatures.slice(0, 4)
  : ["Programador — MAG Industries", "Operario ejecutor", "Responsable de taller"];
const FIRMA_W = Math.floor((PAGE_W - 2 * MARGIN) / FIRMAS.length);
function firmaBlock(titulo) {
  return new TableCell({
    width: { size: FIRMA_W, type: WidthType.DXA },
    borders: cellBorders({ top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }),
    margins: { top: 240, bottom: 0, left: 0, right: 240 },
    children: [
      new Paragraph({ spacing: { after: 380 }, children: [new TextRun({ text: titulo, bold: true, size: 17, font: "Arial", color: NAVY })] }),
      new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: MIDGREY } }, children: [new TextRun({ text: "" })] }),
      new Paragraph({ spacing: { before: 50 }, children: [new TextRun({ text: "Nombre y firma", size: 14, font: "Arial", color: STEEL, italics: true })] }),
      new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: "Fecha: ______________", size: 14, font: "Arial", color: STEEL })] }),
    ],
  });
}
const firmasTable = new Table({
  width: { size: PAGE_W - 2 * MARGIN, type: WidthType.DXA },
  columnWidths: FIRMAS.map(() => FIRMA_W),
  borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
  rows: [new TableRow({ children: FIRMAS.map(firmaBlock) })],
});

// ---------- FOOTER ----------
const footer = new Footer({
  children: [
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: MIDGREY } },
      spacing: { before: 60 },
      tabStops: [{ type: TabStopType.RIGHT, position: PAGE_W - 2 * MARGIN }],
      children: [
        new TextRun({ text: "MAG Industries — Servicios de ingeniería CAD/CAM", size: 14, font: "Arial", color: STEEL }),
        new TextRun({ text: "\t", size: 14 }),
        new TextRun({ text: "info@magindustries.es · +34 635 013 953", size: 14, font: "Arial", color: STEEL }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Documento de uso interno de taller y evidencia técnica de proceso. Prohibida su distribución sin autorización expresa de MAG Industries.", size: 11, font: "Arial", italics: true, color: "9AA5AF" })],
    }),
  ],
});

// ---------- DOCUMENT ----------
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "g54-steps",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 260 } } } }],
      },
      {
        reference: "checklist",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "☐", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 400, hanging: 260 } } } }],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_H, height: PAGE_W, orientation: PageOrientation.LANDSCAPE },
          // footer: 260 (~0,46 cm) queda por DEBAJO del margen inferior (566).
          // El default de la librería es 708, mayor que el margen, y eso obliga
          // a Word a subir el contenido para no pisar el pie de página —
          // justo lo que empujaba las vistas a una segunda hoja. Bajándolo,
          // el pie se sitúa más abajo y el cuerpo recupera ese espacio.
          margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, footer: 260 },
        },
      },
      footers: { default: footer },
      children: [
        headerTable,
        new Paragraph({ text: "", spacing: { after: 30 } }),
        sectionHeader("DATOS GENERALES"),
        datosGeneralesTable,
        sectionHeader("VISTAS Y ORIGEN DE PIEZA"),
        vistasTable,
        new Paragraph({ children: [new PageBreak()] }),
        sectionHeader(`DESCRIPCIÓN DEL PUNTO ${OFFSET} — GUÍA PARA EL OPERARIO`),
        ...descripcionG54,
        sectionHeader("MÉTODO DE TOQUEO / REFERENCIADO RECOMENDADO"),
        ...metodoToqueo,
        sectionHeader("SISTEMA DE SUJECIÓN"),
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: "Utillaje: ", bold: true, size: 18, font: "Arial" }),
                     new TextRun({ text: FIXTURE || "[Ej: mordaza Lang Makro-Grip / bridas / utillaje a medida — especificar modelo]", size: 18, font: "Arial", italics: !FIXTURE, color: FIXTURE ? DARKTEXT : STEEL })],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: "Par de apriete / observaciones: ", bold: true, size: 18, font: "Arial" }),
                     new TextRun({ text: "[__]", size: 18, font: "Arial" })],
        }),
        sectionHeader("REFRIGERACIÓN"),
        ...notaRefrigeracion,
        sectionHeader("CHECKLIST DE VERIFICACIÓN PREVIA"),
        ...checklistParas,
        sectionHeader("VALIDACIÓN"),
        firmasTable,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Hoja_Punto_Cero_G54_MAG_Industries_PLANTILLA.docx", buffer);
  console.log("OK");
});
