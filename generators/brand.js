/**
 * brand.js — única fuente de verdad de la identidad visual de MAG Industries.
 *
 * Deriva de la skill `mi-marca`. Todos los generadores (`build*.js`) importan
 * de aquí sus fuentes y sus colores: si la marca cambia, se cambia en este
 * archivo y no en seis sitios distintos.
 *
 * NO contiene lógica de ningún documento — solo constantes y ayudas de
 * formato — así que no incumple la regla «un script build*.js = un documento».
 * Al requerirse con ruta relativa (`require("./brand")`) sigue funcionando
 * tanto desde la app (que ejecuta con cwd=generators/) como al lanzar
 * `node build7.js` a pelo.
 *
 * ---------------------------------------------------------------------------
 * MODO CLARO A PROPÓSITO
 * ---------------------------------------------------------------------------
 * `mi-marca` fija el modo oscuro como predeterminado, pero contempla la
 * excepción del soporte impreso. Estos seis documentos se imprimen y se
 * archivan en taller o se mandan al cliente para que los imprima, así que el
 * fondo es blanco y el navy se usa en bandas y cabeceras. Es la excepción
 * prevista por la skill, no una desviación.
 */

// ---------------------------------------------------------------------------
// TIPOGRAFÍA
// ---------------------------------------------------------------------------
// Ambas familias se instalan desde Google Fonts (licencia OFL). Si faltan en
// el equipo, Word sustituye por su cuenta y el documento pierde el diseño:
// ver README (sección «Fuentes de marca») para reinstalarlas.

/** Titulares grandes únicamente.
 *  Saira Stencil One es una display stencil de UN SOLO PESO: nunca pedirle
 *  `bold: true` — Word lo simularía engordando el trazo y ensucia el troquel.
 *  Tampoco usarla en textos largos ni por debajo de ~18 half-points: el
 *  stencil deja de leerse. Para eso está FONT_BODY_SB. */
const FONT_TITLE = "Saira Stencil One";

/** Cuerpo, tablas y todo lo demás. La familia trae Regular/Italic/Bold/
 *  BoldItalic, así que aquí sí valen los flags `bold` e `italics`. */
const FONT_BODY = "Barlow";

/** Pesos intermedios. Se instalan como familias propias, así que se piden por
 *  nombre y NO con `bold: true` (pedir bold sobre ellas da un peso falso). */
const FONT_BODY_MD = "Barlow Medium";
const FONT_BODY_SB = "Barlow SemiBold";

// ---------------------------------------------------------------------------
// COLOR — paleta `mi-marca`
// ---------------------------------------------------------------------------
/** Navy profundo. Fondo de bandas, cabeceras y pies. */
const NAVY = "041A25";
/** Un punto por encima del navy: para degradados y filas alternas sobre banda. */
const NAVY_SOFT = "0B2836";
/** Dorado: acento principal. Botones, cifras clave, filetes de énfasis.
 *  Con intención — si se reparte por todo, deja de destacar. */
const GOLD = "D4AF37";
/** Dorado apagado, para filetes finos que no deben competir con el texto. */
const GOLD_SOFT = "9C8130";
/** Verde de validación. Reservado a estados OK / conforme / éxito.
 *  No es un acento decorativo. Sobre blanco NO vale como color de texto
 *  (contraste insuficiente): úsalo como relleno con DARKTEXT encima. */
const GREEN = "2EE6A8";
/** Versión oscura del verde, esta sí legible como texto sobre blanco. */
const GREEN_DEEP = "0F6B4F";

// Texto
/** Sobre fondo navy. Titanio claro: menos duro que el blanco puro. */
const TEXT_ON_DARK = "E6EBEE";
/** Sobre fondo blanco. Navy casi negro. */
const DARKTEXT = "0D1B24";
/** Texto secundario, pies y notas. Gris azulado derivado del navy. */
const STEEL = "5E7180";
/** Texto secundario sobre banda navy. */
const STEEL_ON_DARK = "9FB1BD";

// Superficies. No son colores nuevos: son desaturaciones del navy hasta
// casi blanco, para que las tarjetas y las tablas asienten sobre el papel
// sin introducir un gris ajeno a la paleta.
const SURFACE = "F5F7F8";      // fondo de tarjeta / fila alterna
const SURFACE_ALT = "E9EDF0";  // tarjeta con algo más de peso
const RULE = "C9D3D9";         // filetes y bordes de tabla
const RULE_SOFT = "DFE6EA";    // filetes interiores, muy tenues

// ---------------------------------------------------------------------------
// COLORES FUNCIONALES (excepción documentada)
// ---------------------------------------------------------------------------
// `mi-marca` prohíbe colores fuera de paleta, pero estos no son decorativos:
// codifican información en documentos técnicos y de calidad. Quitarlos haría
// el documento peor, no más de marca. Están desaturados a propósito para
// convivir con el navy y el dorado sin gritar.
//
//  - REDWARN  → aviso de corte en seco (seguridad) y estado NOK.
//  - CAT_*    → leyenda de 5 categorías de cota del reporte de calidad
//               (DIM / SUP / GEO / REF / TRAT). Necesitan ser distinguibles
//               entre sí; DIM y SUP ya usan navy y dorado de la paleta.
const REDWARN = "9E1B1B";
const CAT_GEO = "2F6E62";    // verde azulado apagado
const CAT_REF = "5B4A78";    // violeta apagado
const CAT_TRAT = "7A5326";   // bronce apagado

// ---------------------------------------------------------------------------
// ESCALA TIPOGRÁFICA (half-points, como los quiere `docx`)
// ---------------------------------------------------------------------------
// Una escala corta y consistente da más elegancia que ajustar cada texto a
// ojo. Los generadores no están obligados a usarla entera, pero sí a no
// inventar tamaños intermedios sin motivo.
const FS = {
  hero: 52,      // titular de portada del one-pager
  h1: 32,        // título de documento
  h2: 26,        // título de sección
  h3: 21,        // subtítulo / título de tarjeta
  lead: 22,      // entradilla
  body: 19,      // cuerpo
  small: 17,     // tablas densas
  micro: 14,     // pies, notas al margen
};

/** Tracking (espaciado entre letras) en veinteavos de punto.
 *  El stencil respira mejor con algo de aire; las etiquetas en versalitas
 *  ganan mucho con un tracking generoso. */
const TRACK = {
  hero: 10,
  title: 8,
  label: 30,   // etiquetas en MAYÚSCULAS
  none: 0,
};

// ---------------------------------------------------------------------------
// AYUDAS
// ---------------------------------------------------------------------------
// Devuelven objetos de opciones para `new TextRun({...})`. Así el generador
// no tiene que repetir font/color/tracking en cada línea y, sobre todo, no
// puede colar un `bold` sobre el stencil por descuido.

/** Titular en Saira Stencil One. Fuerza `bold: false` a propósito. */
function titleRun(text, size, color, extra) {
  return Object.assign(
    { text, size, color, font: FONT_TITLE, bold: false, characterSpacing: TRACK.title },
    extra || {},
  );
}

/** Etiqueta corta en MAYÚSCULAS, con tracking. Barlow SemiBold: legible a
 *  tamaños pequeños, donde el stencil ya no lo sería. */
function labelRun(text, size, color, extra) {
  return Object.assign(
    { text, size, color, font: FONT_BODY_SB, characterSpacing: TRACK.label },
    extra || {},
  );
}

/** Texto corriente en Barlow. Admite bold/italics con normalidad. */
function bodyRun(text, size, color, extra) {
  return Object.assign({ text, size, color, font: FONT_BODY }, extra || {});
}

module.exports = {
  FONT_TITLE, FONT_BODY, FONT_BODY_MD, FONT_BODY_SB,
  NAVY, NAVY_SOFT, GOLD, GOLD_SOFT, GREEN, GREEN_DEEP,
  TEXT_ON_DARK, DARKTEXT, STEEL, STEEL_ON_DARK,
  SURFACE, SURFACE_ALT, RULE, RULE_SOFT,
  REDWARN, CAT_GEO, CAT_REF, CAT_TRAT,
  FS, TRACK,
  titleRun, labelRun, bodyRun,
};
