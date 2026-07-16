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
git clone https://github.com/<TU_USUARIO>/mag-doc-generator.git
cd mag-doc-generator

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

> **Nota sobre los datos:** los scripts `build4.js`–`build8.js` generan hoy los
> documentos a partir de su plantilla interna (contenido de ejemplo/plantilla de
> MAG Industries). La app les pasa los datos extraídos y editados en un JSON cuya
> ruta va en la variable de entorno `GENERATOR_DATA`, de modo que los scripts
> pueden empezar a consumirlos sin cambiar la orquestación (hoja de ruta).

## ☁️ Despliegue en Streamlit Community Cloud

El repositorio ya incluye todo lo necesario:

- `requirements.txt` — dependencias Python (sin paquetes que requieran compilación).
- `packages.txt` — instala `nodejs` y `npm` en el contenedor (Debian).
- La app ejecuta `npm install` automáticamente en el primer arranque si falta
  `node_modules` (en la nube no se sube, está en `.gitignore`).

Pasos:

1. Sube el repositorio a GitHub (público o privado).
2. Entra en [share.streamlit.io](https://share.streamlit.io) con tu cuenta de GitHub.
3. **New app** → elige el repositorio, rama `main` y archivo `streamlit_app.py`.
4. **Deploy**. El primer arranque tarda un poco más (instala nodejs + npm install).

### Variables de entorno

La app **no necesita variables de entorno ni secretos** para funcionar.
Internamente usa `GENERATOR_DATA` (la fija la propia app en cada generación;
no hay que configurarla).

## 🧩 Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| 🔴 «Motor Node.js: no disponible» | Node no instalado o falta `npm install` | Instala Node 18+ y ejecuta `npm install` en la raíz |
| «El script terminó pero no se encontró…» | El script Node falló al escribir | Ejecuta `node generators/build4.js` desde `generators/` y revisa el error |
| El HTML no extrae datos | Export distinto de *Setup Sheet HTML* | Reexporta desde Fusion 360 como Setup Sheet (HTML) |
| Falla en Streamlit Cloud al generar | `packages.txt` ausente | Verifica que `packages.txt` está en la raíz del repo |

## 📄 Licencia

MIT © MAG Industries
