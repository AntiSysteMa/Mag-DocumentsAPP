# 🔧 MAG Industries — Document Generator

Aplicación web (Streamlit) que genera **documentos Word técnicos** a partir de
**Setup Sheets exportados desde Fusion 360**. Pensada para el flujo diario de un
taller CNC: cargar el HTML del setup, revisar los datos extraídos y descargar el
documento listo para imprimir o enviar.

| Tipo de documento | Script generador | Contenido |
|---|---|---|
| Ficha Taller | `generators/build4.js` | Herramientas, operaciones y parámetros de mecanizado |
| Propuesta | `generators/build5.js` | Propuesta comercial |
| Calidad | `generators/build6.js` | Plantilla de reporte de control de calidad |
| One-Pager | `generators/build7.js` | Propuesta de valor en una página |
| Infografía | `generators/build8.js` | Infografía del proceso productivo |
| Hoja G54 | `generators/build_g54.js` | Hoja de punto cero / origen G54 (formulario manual) |

Los documentos se generan con **Node.js + [docx](https://www.npmjs.com/package/docx)**;
la interfaz y la extracción de datos son **Python + Streamlit + BeautifulSoup**.

## 📁 Estructura del proyecto

```
mag_app/
├── streamlit_app.py        # Punto de entrada de la aplicación
├── core/
│   ├── parser.py           # Extracción de datos del HTML de Fusion 360
│   └── generator.py        # Orquestación de los scripts Node.js
├── ui/
│   ├── theme.py            # Tema visual MAG (CSS puro, sin librerías externas)
│   └── components.py       # Header, dashboard, historial, validación…
├── generators/             # Motor de documentos (NO tocar sin revisar los .docx)
│   ├── build4.js … build8.js
│   └── *.png               # Logos e iconos que incrustan los documentos
├── docs/                   # Documentación histórica del proyecto
├── requirements.txt        # Dependencias Python
├── packages.txt            # Paquetes de sistema para Streamlit Cloud (nodejs, npm)
├── package.json            # Dependencias Node (docx)
└── .streamlit/config.toml  # Tema base de Streamlit
```

## 🚀 Instalación local

Requisitos: **Python 3.10+** y **Node.js 18+**.

```bash
git clone https://github.com/AntiSysteMa/Mag-DocumentsAPP.git
cd Mag-DocumentsAPP

# Dependencias Python
pip install -r requirements.txt

# Dependencias Node (motor de documentos)
npm install

# Arrancar la app
streamlit run streamlit_app.py
```

En Windows también puedes hacer doble clic en `iniciar_app.bat`.

## 🖥️ Uso

1. **Exporta el Setup Sheet** en Fusion 360: espacio *Manufacture* → clic derecho
   en el *Setup* → **Setup Sheet** → guardar como HTML.
2. **📤 Cargar Datos** — sube el HTML; verás la extracción en vivo y un dashboard
   con las métricas clave (operaciones, herramientas, tiempo de ciclo, bruto…).
3. **✏️ Revisar y Editar** — corrige cualquier valor extraído antes de generar.
4. **⚡ Generar** — elige el tipo de documento en la barra lateral, completa
   cliente/material/responsable y pulsa *Generar*. Descarga el `.docx`.
5. **🗂️ Historial** — vuelve a descargar cualquier documento generado en la sesión.

## 🔌 Cómo llegan los datos al documento

La app escribe un JSON con los datos de cada documento y pasa su ruta al
script Node en la variable de entorno `GENERATOR_DATA`. El script lo lee y
compone el documento con esos valores. No todos los documentos necesitan lo
mismo: cada uno es de naturaleza distinta, así que la interfaz se adapta según
el tipo elegido en la barra lateral.

| Documento | Origen de los datos | Notas |
|---|---|---|
| **Ficha Taller** | Setup Sheet de Fusion 360 (parser automático) | Herramientas, operaciones y renders pegados con Ctrl+V se incrustan tal cual el proyecto los traiga |
| **Propuesta** | Formulario manual en «Revisar y Editar» | Precio, alcance y plazos son criterio comercial; Fusion 360 no los tiene |
| **Calidad** | Solo cabecera automática (cliente/pieza/material) | El resto —mediciones, resultado— se rellena a mano en el Word tras la inspección física |
| **One-Pager** / **Infografía** | Ninguno — plantilla fija | Son folletos de empresa, no de proyecto; se descargan siempre iguales |
| **Hoja G54** | Formulario manual en «Revisar y Editar» | No usa Setup Sheet: campos variables (pieza, fase, programa, bruto, operario) + fijos precargados + texto de origen G54 editable |

### Presets y memoria de último uso

- **Presets de material** (barra lateral): «D2 62HRC Estándar», «Aluminio 7075» y
  «Custom» autocompletan material, dureza y máquina de una vez.
- **Memoria de último uso**: al generar, la app recuerda los datos del proyecto
  (cliente, referencia, programador…) en **Supabase** y los precarga en la
  siguiente sesión, también desde otro dispositivo. Si no hay conexión con
  Supabase, la app funciona igual pero sin recordar entre sesiones.

Campos del JSON por documento:

- **Ficha Taller** (`build4.js`): `project_ref`, `job_description`, `program_number`, `total_operations`, `total_tools`, `cycle_time`, `z_max`, `z_min`, `feedrate_max`, `rpm_max`, `cutting_distance`, `rapid_distance`, `bruto_dx/dy/dz`, `tools[]`, `operations[]`, `pieza_image_path`, más `machine`, `postprocessor`, `variant`, `revision`.
- **Propuesta** (`build5.js`): `project_ref`, `contact_name`, `project_title`, `scope_text`, `quantity`, `machine_process`, `tolerances`, `doc_number`, `deliverables[]`, `timeline_phases[]`, `total_duration`, `price`, `valid_until`.
- **Calidad** (`build6.js`): `project_ref`, `inspection_date`, `revision` (más `client_name`/`material`, ya globales).

Todos los scripts funcionan también sueltos (`cd generators && node build4.js`): sin `GENERATOR_DATA` usan datos de ejemplo.

## ☁️ Despliegue en Streamlit Community Cloud

El repositorio ya incluye todo lo necesario:

- `requirements.txt` — dependencias Python (sin paquetes que requieran compilación).
- `packages.txt` — instala `nodejs` y `npm` en el contenedor (Debian).
- La app ejecuta `npm install` automáticamente en el primer arranque si falta
  `node_modules` (en la nube no se sube, está en `.gitignore`).

Pasos:

1. Sube el repositorio a GitHub (**privado** — contiene datos reales de clientes).
2. Entra en [share.streamlit.io](https://share.streamlit.io) con tu cuenta de GitHub.
3. **New app** → elige el repositorio, rama `main` y archivo `streamlit_app.py`.
4. **Advanced settings → Secrets**: pega la configuración de Supabase (ver abajo).
5. **Deploy**. El primer arranque tarda un poco más (instala nodejs + npm install).

### Secretos (Supabase)

La memoria de último uso usa Supabase. Las credenciales se guardan como
**secretos**, nunca en el código (`.streamlit/secrets.toml` está en `.gitignore`).

En Streamlit Community Cloud: **Manage app → Settings → Secrets**, y pega:

```toml
[supabase]
url = "https://TU-PROYECTO.supabase.co"
key = "sb_publishable_..."
```

La clave `key` es la **publishable** de Supabase (Project Settings → API Keys),
segura para el cliente. Sin estos secretos la app arranca igual, pero no
recuerda los valores entre sesiones (usa solo la sesión actual).

> `GENERATOR_DATA` es interna (la fija la propia app en cada generación); no hay
> que configurarla.

## 🧩 Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| 🔴 «Motor Node.js: no disponible» | Node no instalado o falta `npm install` | Instala Node 18+ y ejecuta `npm install` en la raíz |
| «El script terminó pero no se encontró…» | El script Node falló al escribir | Ejecuta `node generators/build4.js` desde `generators/` y revisa el error |
| El HTML no extrae datos | Export distinto de *Setup Sheet HTML* | Reexporta desde Fusion 360 como Setup Sheet (HTML) |
| Falla en Streamlit Cloud al generar | `packages.txt` ausente | Verifica que `packages.txt` está en la raíz del repo |

## 📄 Licencia

MIT © MAG Industries
