# CLAUDE.md — MAG Industries Document Generator

## Stack y comandos

- **Frontend/orquestación:** Python 3.8+ / Streamlit → `app.py`
- **Generación de documentos:** Node.js 16+ / librería `docx` → scripts `build_g54.js`, `build4.js`, `build5.js`, `build6.js`, `build7.js`, `build8.js`
- **Parsing de datos:** BeautifulSoup4 (extrae Setup Sheet HTML de Fusion 360)

**Instalar dependencias:**
```
pip install -r requirements.txt
npm install
```

**Correr localmente:**
```
python -m streamlit run app.py
```
(usar `python -m streamlit`, no `streamlit` directo — evita problema de PATH en Windows)

**Generar un documento sin la UI (debug):**
```
node build_g54.js
```

**No hay suite de tests automatizada todavía.** Verificación manual: generar cada tipo de documento y abrir el .docx resultante.

---

## Reglas de arquitectura inquebrantables

1. **Los generadores de documentos son Node.js + `docx`, NO python-docx.** Si Streamlit Cloud requiere Python puro, es una decisión que se toma explícitamente y se documenta aquí — nunca migrar en silencio.
2. **Un script build*.js = un tipo de documento.** No fusionar lógica de distintos documentos en un mismo script.
3. **Identidad visual: `generators/brand.js` es la única fuente de verdad.** Fuentes y
   colores salen de ahí; ningún `build*.js` define los suyos. Deriva de la skill
   `mi-marca`.
   - **Colores:** navy profundo `#041A25`, dorado `#D4AF37` (acento), verde `#2EE6A8`
     (solo estados de validación/OK, nunca decorativo). Texto `#0D1B24` sobre blanco y
     `#E6EBEE` sobre navy. Los grises son desaturaciones del navy, no un gris ajeno.
     No introducir otros colores de acento sin aprobación explícita del usuario.
   - **Excepción documentada:** `REDWARN` y `CAT_GEO/CAT_REF/CAT_TRAT` en `brand.js`
     quedan fuera de paleta a propósito — codifican información (aviso de corte en
     seco, leyenda de 5 categorías de cota del reporte de calidad), no decoran.
   - **Fuentes:** `Saira Stencil One` solo en titulares grandes —es de un solo peso,
     así que **nunca pedirle `bold`**— y `Barlow` (+ `Barlow Medium` / `Barlow SemiBold`)
     para todo lo demás. Los ayudantes `titleRun` / `labelRun` / `bodyRun` de `brand.js`
     ya lo aplican bien: úsalos en vez de escribir `font:` a mano.
   - **Modo claro a propósito:** `mi-marca` usa oscuro por defecto, pero estos
     documentos se imprimen. Es la excepción que la propia skill contempla.
   - **Sin emojis** en ningún documento (regla de `mi-marca`). El `☐` de la Hoja G54
     es una casilla de formulario, no un emoji, y se queda. Los `🟢🟡⚪` de
     `core/clients.py` y `core/memory.py` son de la UI interna de Streamlit, no de
     documentos de cliente.

3b. **Las dos fuentes hay que instalarlas en el equipo que ABRE el .docx.**
   Generar no las necesita (Node solo escribe el nombre de la fuente en el XML), así
   que Streamlit Cloud funciona igual. Pero si Word no las encuentra, sustituye por su
   cuenta y el documento se ve con tipografías mezcladas. Para instalarlas:
   `powershell -ExecutionPolicy Bypass -File scripts/instalar_fuentes.ps1`.
   **Al cliente se le manda PDF**, no .docx: al exportar desde un Word que sí tiene las
   fuentes, quedan incrustadas y el documento se ve igual en cualquier ordenador.
4. **Datos de contacto canónicos — no reintroducir variantes antiguas:**
   - Teléfono: `+34 635 013 953`. Nunca `636 013 953` (typo histórico).
   - Email: `info@magindustries.es`. Nunca `Alexmakerdesign@gmail.com` (correo personal antiguo).
   - `generators/qr_whatsapp.png` codifica `https://wa.me/34635013953`. Es un PNG sin script fuente en el repo:
     si el teléfono cambia, **hay que regenerar el QR**, no basta con editar el texto de las plantillas.
5. **Repositorio de GitHub DEBE ser privado.** Contiene datos reales de clientes (nombres, piezas, materiales).
6. **No subir a git:** `node_modules/`, documentos `.docx` de ejemplo con datos reales de clientes, archivos de memoria/config con datos sensibles.
7. **El usuario es no-técnico.** Cualquier instrucción que se le dé (en commits, README, mensajes) debe ser explícita, sin asumir conocimiento previo de terminal/git/Python.
8. **La app es de uso personal exclusivo** (un solo usuario) — no diseñar para multi-tenancy.
9. **El perfil de cliente es la única fuente de personalización.** `core/sectors.py` define los
   valores por sector (constantes) y `core/clients.py` la ficha de cada cliente, que solo guarda
   lo que se desvía del sector. `clients.effective()` fusiona ambas capas y el resultado viaja a
   los scripts Node dentro de `GENERATOR_DATA` bajo la clave `profile`. **Ningún generador debe
   inventar valores por defecto propios que contradigan al perfil.**
10. **Todo generador tiene que seguir funcionando sin perfil.** `node buildX.js` a pelo debe
    producir el documento de siempre: los `profile` ausentes caen a los respaldos del sector
    genérico. Es la forma de depurar un documento sin levantar la app.
11. **Restricciones de maquetación que hay que verificar tras tocar un generador:**
    - ONE-PAGER: **una sola hoja**, en los 6 sectores. Es literalmente un «one-pager».
    - HOJA G54: la **página 1** debe contener los datos generales y las 4 vistas.
    Se comprueban abriendo el `.docx` en Word y mirando el número de páginas — no a ojo.

---

## Persistencia (Supabase, proyecto `supabase-aero-bell`)

Dos tablas, ambas con **RLS activo y cero políticas** — el mismo patrón que `leads`:

| Tabla | Clave | Para qué |
|---|---|---|
| `doc_memory` | `(client_id, doc_type)` | Últimos valores usados, para precargar el formulario |
| `clients` | `id` | Fichas de cliente: sector + perfil en JSONB |

Contienen nombres reales de clientes, así que **hace falta una clave de servicio
(`sb_secret_…`) en `.streamlit/secrets.toml`** para leer y escribir. Con la clave publicable
(`sb_publishable_…`) el `SELECT` devuelve una lista vacía sin error pero el `INSERT` falla por
RLS; por eso `available()` **comprueba escribiendo** una fila centinela, no leyendo — un sondeo
de lectura hacía que la app dijera «memoria sincronizada» mientras cada guardado fallaba en
silencio. Sin permiso de escritura, las fichas caen a `data/clients.json` (local y en
`.gitignore`) y la app sigue funcionando; solo se pierde la sincronización entre dispositivos.

## Estado actual

**Hito actual:** identidad visual de marca aplicada a los 6 generadores vía
`generators/brand.js` (tipografía Saira Stencil One + Barlow, paleta navy/dorado), sobre la
app con fichas de cliente y personalización por sector (18 de las 20 ideas de configuración
implementadas). Pendientes a petición del usuario: **idea 7** (vocabulario y unidades por
cliente) e **idea 14** (idioma del documento).

**Pendiente en el one-pager de Espumas del Vallès:** las referencias de `data/clients.json`
son descriptivas de servicio, sin cifras inventadas. Sustituirlas por casos reales antes de
enviar el documento.

**Ver `PROJECT_STATE.md`** para el detalle de cada sesión.
