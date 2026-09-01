# PROJECT_STATE.md — MAG Industries Document Generator

*Última actualización: sesión del 01/09/2026 (tipografía de marca)*

---

## Sesión 01/09/2026 — Tipografía de marca y one-pager de Espumas del Vallès

Origen: el borrador del one-pager para **Espumas del Vallès** (fabricante de espumas
técnicas en Polinyà, lead entrante por la oficina técnica externa CAD/CAM) tenía tres
problemas de tono y forma. Se corrigieron los tres, más la identidad visual completa.

**Tipografía y paleta (`generators/brand.js`, nuevo).** Única fuente de verdad de la
identidad: los 6 generadores importan de ahí y ninguno define ya sus propios colores.
Se aplicó la skill `mi-marca`: `Saira Stencil One` en titulares, `Barlow` en el resto
(169 declaraciones `font: "Arial"` sustituidas), y la paleta navy profundo `#041A25` +
dorado `#D4AF37`, con el verde `#2EE6A8` reservado a estados de validación.
Se documentó como excepción que `REDWARN` y `CAT_*` quedan fuera de paleta porque
codifican información (aviso de corte en seco, leyenda de 5 categorías de cota).

**Las fuentes hay que instalarlas.** Van incluidas en `assets/fonts/` (licencia OFL) y
se instalan con `scripts/instalar_fuentes.ps1`. Solo las necesita el equipo que ABRE el
`.docx`; generar no las necesita, así que Streamlit Cloud no se ve afectado. Al cliente
se le manda PDF, que lleva las fuentes incrustadas.

**El problema de «5 tipos de letra» no era del código.** Se verificó: las 169
declaraciones eran todas `Arial`. La mezcla venía de la sustitución de fuentes al
previsualizar en otro entorno, como sospechaba el resumen de sesión.

**Tono (`core/sectors.py`).** El patrón que molestaba era abrir señalando la carencia
del cliente («¿Tienes un proyecto atascado?», «cuando el tiempo aprieta», «un cuello de
botella en serie»). Reescritos los 6 sectores para abrir sobre capacidad y resultado.
Fuera los emojis `🎯` y `📞` del one-pager (`mi-marca` los prohíbe).

**Rango de capacidad siempre visible (`build7.js`).** Franja nueva «ALCANCE TÉCNICO»
—perfiles 2D · piezas 3D · 5 ejes continuos · utillaje · documentación— **fija y no
personalizable por sector**, a propósito: era el fallo de la v2, donde adaptar el
folleto a los perfiles 2D del cliente daba a entender que MAG solo hace 2D.

**Ficha de Espumas del Vallès** en `data/clients.json` (gitignored), sector base
`automocion`. Las referencias son descriptivas de servicio, **sin cifras de resultado
inventadas** — hay que sustituirlas por casos reales antes de enviar.

**Verificado en Word real** (COM, no a ojo): one-pager 1 hoja en los 6 sectores y en la
versión de Espumas; Hoja G54 con datos generales y las 4 vistas en la página 1.

---

## Sesión 01/09/2026 — Perfiles de cliente

**Corrección de contacto.** El QR de WhatsApp del ONE-PAGER apuntaba a `wa.me/34636013953`
(el typo histórico del 636). Se regeneró apuntando al número correcto y se verificó
decodificándolo y comprobando los síndromes Reed-Solomon. El email `Alexmakerdesign@gmail.com`
se sustituyó por `info@magindustries.es` en los 6 generadores.

**Personalización por cliente.** Se implementaron 18 de las 20 ideas de configuración
(pendientes por decisión del usuario: la 7, vocabulario y unidades, y la 14, idioma del
documento). Piezas nuevas:

- `core/sectors.py` — 6 sectores (taller general, molde y matricería, aeronáutico, automoción,
  médico, prototipado). Cada uno fija tolerancia, plan de control, nivel de detalle de la ficha,
  refrigeración, anexos, firmas, textos del one-pager, bloques de alcance, entregables y casos
  de referencia.
- `core/clients.py` — fichas de cliente sobre Supabase con respaldo local, plantillas de
  numeración documental y de nombre de archivo.
- Pestaña **👤 Clientes** en la app para dar de alta y editar fichas.

**Hallazgo:** la tabla `doc_memory` **nunca había existido** en Supabase. La app mostraba
«🟢 Memoria sincronizada» porque solo comprobaba que el cliente Supabase se creara; cada
guardado fallaba en silencio. Se creó la tabla y se cambió la comprobación a una prueba de
escritura real.

**Verificación:** los 6 generadores se ejecutan sueltos y con perfil; el one-pager cabe en una
hoja en los 6 sectores; la página 1 de la Hoja G54 mantiene las 4 vistas. Contado con Word, no
a ojo.

---

## Sesión del 16/07/2026

## 1. Qué se logró en esta sesión

- Se construyó la app Streamlit completa (`app.py`) que envuelve los 5 scripts Node.js existentes (FICHA TALLER, PROPUESTA, CALIDAD, ONE-PAGER, INFOGRAFÍA), con parsing automático del Setup Sheet HTML de Fusion 360 vía BeautifulSoup.
- Se instaló y verificó el entorno local del usuario (Windows): Python, Node.js, `pip install streamlit beautifulsoup4 lxml`, `npm install docx`. Se resolvió un bloqueo de `ExecutionPolicy` de PowerShell y un problema de PATH no reconociendo `streamlit`/`claude` tras la instalación (solucionado con `python -m streamlit run app.py` y ajuste manual de `PATH` de usuario).
- La app corre correctamente en local (`http://localhost:8501`), confirmado por el usuario con captura de pantalla funcionando.
- Se instaló Claude Code en el sistema del usuario (`irm https://claude.ai/install.ps1 | iex`), verificado con `claude --version`.
- Se identificó que la plantilla **Hoja G54** (`build.js`) existe pero **no está integrada** a la app Streamlit — es la tarea pendiente principal.
- Se diseñó y el usuario **aprobó** la redacción final del método de origen G54 (palpado en X/Y/Z + verificación con comparador de carátula) — ver `CLAUDE.md` para el texto exacto.
- Se diseñó la arquitectura de presets + memoria del último uso. Decisión: **persistencia en la nube** (no archivo local), porque la app se desplegará y debe ser accesible desde móvil y PC de forma sincronizada.
- Se redactó un prompt completo y estructurado para Claude Code cubriendo 3 tareas: integración de HOJA G54, sistema de presets/memoria, y mejora de diseño + despliegue en Streamlit Community Cloud con repo privado.
- Se guardó en la memoria persistente de Claude (fuera de este proyecto, a nivel de cuenta) el contexto completo de la biblioteca de plantillas y el estado del proyecto de la app.

## 2. Archivos modificados/creados clave

| Archivo | Estado |
|---|---|
| `app.py` | Creado — app Streamlit principal, 3 pestañas (Cargar/Revisar/Generar) |
| `build4.js` – `build8.js` | Existentes, sin cambios esta sesión |
| `build.js` | Existente — **pendiente renombrar a `build_g54.js` e integrar a app.py** |
| `install.sh` / `run.sh` | Creados (Mac/Linux) |
| `iniciar_app.bat` | Creado (Windows, doble clic para lanzar) |
| `requirements.txt` / `package.json` | Creados |
| `CLAUDE.md` | Creado esta sesión — contexto obligatorio para Claude Code |
| `PROJECT_STATE.md` | Este archivo |
| Documentación (`README_APP.md`, `GUIA_INICIO_RAPIDO.md`, `ARQUITECTURA_TECNICA.md`, `RESUMEN_COMPLETO.md`, `INDICE_ARCHIVOS.md`) | Creados |

## 3. Decisiones de diseño tomadas

1. **HOJA G54 usa formulario manual directo**, no carga de HTML (a diferencia de FICHA TALLER) — porque sus datos de origen/sujeción no vienen del Setup Sheet.
2. **Campos fijos precargados** (Máquina, Material, Dureza, Postprocesador) vs **campos variables** (Cliente, Pieza, Fase, Programa CNC, Bruto, Programador, Operario) — reduce el llenado manual en ~30%.
3. **Texto de método de origen G54 aprobado por el usuario** (ver `CLAUDE.md`), editable por proyecto pero con este default.
4. **Sistema de presets** ("D2 62HRC Estándar", "Aluminio 7075", "Custom") aplica a todos los documentos, no solo G54.
5. **Memoria de último uso en la nube**, no en archivo local — decisión explícita porque Streamlit Community Cloud tiene sistema de archivos efímero y el usuario quiere acceso sincronizado desde móvil.
6. **Repositorio de GitHub privado obligatorio** — el código y ejemplos contienen datos reales de clientes.
7. **Resolución de Node.js en la nube QUEDA ABIERTA para Claude Code** — debe recomendar entre `packages.txt` (instalar Node.js en el contenedor) vs. reescribir `build*.js` en Python puro, y el usuario debe leer y decidir, no aceptar a ciegas.
8. **Usuario no-técnico** — cualquier trabajo de Claude Code debe explicarse en términos simples, sin asumir conocimiento previo.

## 4. Próximos 3 pasos exactos

1. **Ejecutar el prompt de Claude Code** (ya redactado y entregado al usuario) dentro de la carpeta `mag_app`, cubriendo las 3 tareas: integración HOJA G54, presets/memoria, diseño + despliegue. El usuario debe **leer y decidir activamente** en los dos puntos abiertos que Claude Code le planteará (Node.js en la nube; backend de persistencia de memoria) — no aceptar automáticamente.
2. **Crear el repositorio privado en GitHub** y subir el código (Claude Code debe guiar el proceso paso a paso, incluyendo login/autenticación de git si hace falta).
3. **Conectar el repositorio a Streamlit Community Cloud**, obtener la URL pública, y **verificar el acceso desde el móvil del usuario** antes de dar la tarea por completada.
