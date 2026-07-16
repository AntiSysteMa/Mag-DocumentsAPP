# 🏗️ Arquitectura Técnica — MAG Industries Document Generator

## Diagrama General del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                       NAVEGADOR WEB                              │
│                   (Streamlit Interface)                          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Cargar Datos │  │ Revisar      │  │ Generar      │          │
│  │  (HTML)      │→ │ Extraídos    │→ │ Documento    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    app.py (Streamlit)                            │
│                                                                   │
│  extract_fusion_data() → parse HTML → JSON data                 │
│  generate_document()   → inject data → exec Node.js            │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Node.js Scripts (build4.js, etc.)                  │
│                                                                   │
│  Template → Inyectar datos JSON → Generar DOCX                │
│  (docx-js library)                                              │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│               Archivo DOCX Generado                             │
│                                                                   │
│  Ficha_Taller_[PROYECTO].docx (descarga al usuario)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flujo Detallado de Datos

### 1. Usuario Carga Setup Sheet HTML

```
Fusion 360 Export
      ↓
11_103__EINSATZ-UT__20172465_MATERIAL.html
      ↓
Streamlit (upload_file)
      ↓
app.py lectura: html_content = uploaded_file.getvalue().decode('utf-8')
```

### 2. Parsing del HTML

```
html_content (string)
      ↓
BeautifulSoup (parse HTML)
      ↓
find('table', class_='sheet')  [hay 3 tablas: summary, tools, ops]
      ↓
extract_value() / extract_between()  [regex + text parsing]
      ↓
data = {
  'total_operations': '10',
  'total_tools': '4',
  'z_max': '160.05mm',
  'z_min': '60.25mm',
  'cycle_time': '23h 23m 51s',
  'bruto_dx': '415 mm',
  'bruto_dy': '243.93 mm',
  'bruto_dz': '145.05 mm',
  'pieza_image_base64': '[base64 de imagen]',
  ...
}
```

### 3. Usuario Selecciona Documento y Parámetros

```
Sidebar selectbox: "FICHA TALLER"
text_input: "Nombre cliente"
text_input: "Material / Dureza"
text_input: "Programador"
      ↓
st.session_state['fusion_data'] = data
st.session_state['html_content'] = html_content
```

### 4. Generación de Documento

```
generate_document(doc_type, data, client_name, material, programmer)
      ↓
script_map = {
  'FICHA TALLER': 'build4.js',
  'PROPUESTA': 'build5.js',
  ...
}
      ↓
script = 'build4.js'
      ↓
Crear archivo JSON temporal: {client_name, material, programmer, **data}
      ↓
subprocess.run(['node', 'build4.js'], env={'GENERATOR_DATA': tmp.json})
      ↓
node build4.js (lee env var → requiere('docx') → inyecta datos → genera DOCX)
      ↓
Ficha_Taller_Herramientas_MAG_Industries_v2.docx
      ↓
Python lee archivo binario
      ↓
st.download_button() → usuario descarga
```

---

## Arquitectura de Archivos

```
mag_app/
│
├── app.py                    ← APP PRINCIPAL (Streamlit)
│   ├── Interfaz de usuario (Streamlit)
│   ├── Parsing HTML (BeautifulSoup)
│   └── Ejecución de scripts Node.js (subprocess)
│
├── build4.js                 ← PLANTILLAS (Node.js + docx-js)
├── build5.js                    (cada uno genera un tipo de doc)
├── build6.js
├── build7.js
├── build8.js
│
├── package.json              ← Dependencias Node.js
├── node_modules/             ← Módulos instalados (npm install)
│
├── requirements.txt          ← Dependencias Python
├── install.sh                ← Script de setup automático
├── run.sh                    ← Script de lanzamiento
│
├── logo_claro.png            ← ACTIVOS (imágenes, íconos)
├── qr_whatsapp.png
├── icon_gear.png
├── icon_design.png
└── ... (6 más)
```

---

## Tecnologías Usadas

| Capa | Tecnología | Propósito |
|------|-----------|----------|
| **Frontend** | Streamlit | Interfaz web sin código |
| **Backend** | Python 3 | Parsing, lógica, orquestación |
| **Generación** | Node.js + docx-js | Generar archivos DOCX |
| **Parsing** | BeautifulSoup | Extrae datos de HTML |
| **Templating** | docx-js | Inyecta datos en templates Word |

---

## Flujo de Ejecución paso a paso

### Paso 1: Inicio de la app
```bash
$ streamlit run app.py
2026-07-16 12:34:56 Streamlit app starting...
http://localhost:8501
```

### Paso 2: Usuario carga HTML
```
[Usuario: arrastra archivo HTML a Streamlit]
   ↓
app.py: extract_fusion_data(html_content)
   ↓
BeautifulSoup parsea 3 tablas
   ↓
Extrae ~20 campos de datos
   ↓
JSON guardado en st.session_state
```

### Paso 3: Usuario revisa datos
```
Pestaña "Revisar"
   ↓
Streamlit renderiza: st.write(data)
   ↓
Usuario ve confirmación visual
```

### Paso 4: Usuario genera documento
```
[Usuario: clic en GENERAR]
   ↓
with st.spinner("Generando..."):
   ↓
generate_document('FICHA TALLER', data, ...)
   ↓
subprocess.run(['node', 'build4.js'])
   ↓
build4.js ejecuta:
   - require('docx')
   - new Document({...})
   - Packer.toBuffer()
   - fs.writeFileSync()
   ↓
DOCX guardado en disk
   ↓
Python lee bytes del archivo
   ↓
st.download_button() ofrece descarga
   ↓
Usuario descarga: Ficha_Taller_11_103_EINSATZ-UT.docx
```

---

## Optimización de Tokens (Por qué ahorra)

### Antes (sin la app)
```
Cada documento = 1 iteración en Claude
├── Cargar HTML: 100 tokens
├── Parsear y extraer: 150 tokens
├── Generar script: 200 tokens
├── Debuggear/iterar: 300 tokens
└── TOTAL: ~750 tokens por documento

10 documentos = 7,500 tokens ❌
```

### Después (con la app)
```
Setup inicial = 1 iteración en Claude
├── Crear app Streamlit: 300 tokens
├── Scripts build*.js: ya existen
└── TOTAL setup: ~300 tokens (una sola vez)

10 documentos = 0 tokens + ejecución local ✅
Ahorro: 7,200 tokens por 10 documentos
```

---

## Extensibilidad

### Agregar nuevo tipo de documento

1. **Crear `build9.js`** (template nuevo en Node.js)
   ```javascript
   const doc = new Document({ ... });
   Packer.toBuffer(doc).then(buffer => {
     fs.writeFileSync("NewDoc.docx", buffer);
     console.log("OK");
   });
   ```

2. **Actualizar `app.py`** línea 130
   ```python
   script_map = {
     'FICHA TALLER': 'build4.js',
     'PROPUESTA': 'build5.js',
     'MI_NUEVO_DOC': 'build9.js',  ← AGREGAR ESTA LÍNEA
   }
   ```

3. **Reiniciar app**
   ```bash
   streamlit run app.py
   ```

3 minutos, sin tokens, completamente escalable.

---

## Posibles Mejoras Futuras

### Nivel 1 (Fácil)
- [ ] Agregar campo "Notas" en formulario
- [ ] Exportar datos a CSV después de generar
- [ ] Preview del documento antes de descargar
- [ ] Historial de documentos generados

### Nivel 2 (Intermedio)
- [ ] Integración con Google Drive (upload/download automático)
- [ ] Base de datos de clientes (SQLite)
- [ ] Templates personalizados por cliente
- [ ] Multi-idioma (ES/EN)

### Nivel 3 (Avanzado)
- [ ] API REST (endpoint para integrar en otros sistemas)
- [ ] Docker container (distribución lista para usar)
- [ ] Despliegue en cloud (Heroku, Railway, AWS)
- [ ] Autenticación de usuarios

---

## Problemas Conocidos & Soluciones

| Problema | Causa | Solución |
|----------|-------|----------|
| "node: command not found" | Node.js no instalado | `brew install node` |
| "ModuleNotFoundError: docx" | npm install incompleto | `npm install` en directorio |
| Documento vacío | Datos no extraídos | Verificar HTML en pestaña "Revisar" |
| Timeout (30s) | Script Node.js tarda | Aumentar timeout en app.py línea 144 |
| Imagen de pieza no aparece | base64 no extracto | Verificar que imagen existe en HTML |

---

## Conclusión

La app Streamlit **elimina completamente la necesidad de Claude** para tareas repetitivas de generación de documentos.

- ✅ **0 tokens** por documento
- ✅ **100% automatizado**
- ✅ **Offline**
- ✅ **Escalable a ilimitados documentos**
- ✅ **Fácil de extender**

Es la solución ideal para evitar el consumo excesivo de tokens en operaciones repetitivas.

---

**MAG Industries © 2026 | Document Generator v1.0**
