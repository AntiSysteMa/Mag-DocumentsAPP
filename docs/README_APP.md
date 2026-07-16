# 🔧 MAG INDUSTRIES — Document Generator

Aplicación Streamlit para generación automática de documentos técnicos desde Setup Sheets de Fusion 360.

## ⚙️ Instalación

### Requisitos previos
- **Python 3.8+**
- **Node.js 16+** (para ejecutar scripts de generación)
- **pip** (gestor de paquetes Python)

### Pasos de instalación

#### 1. Instalar dependencias Python
```bash
cd /home/claude/mag_g54
pip install -r requirements.txt --break-system-packages
```

#### 2. Verificar Node.js
```bash
node --version
npm --version
```

#### 3. Instalar dependencias Node (si aún no lo hiciste)
```bash
npm install  # dentro de /home/claude/mag_g54
```

---

## 🚀 Ejecución

### Desde terminal
```bash
cd /home/claude/mag_g54
streamlit run app.py
```

La app se abrirá en tu navegador (por defecto: `http://localhost:8501`)

### O con alias (opcional, para abreviar)
```bash
alias mag-docs="cd /home/claude/mag_g54 && streamlit run app.py"
mag-docs
```

---

## 📖 Cómo usar

### 1. **Pestaña "Cargar Datos"**
   - Descarga el Setup Sheet de Fusion 360 como **HTML**
     - En Fusion 360: Setup Sheet → Export → HTML
   - Carga el archivo en la app
   - La app extrae automáticamente:
     - Número de operaciones y herramientas
     - Dimensiones del bruto
     - Tiempos, velocidades, distancias
     - Imagen de la pieza

### 2. **Pestaña "Revisar"**
   - Verifica los datos extraídos
   - Mira la imagen de la pieza
   - Confirma que todo es correcto

### 3. **Pestaña "Generar"**
   - Elige el tipo de documento:
     - **FICHA TALLER** — Ficha de taller + herramientas (más usado)
     - **PROPUESTA** — Presupuesto/propuesta comercial
     - **CALIDAD** — Reporte de control de calidad
     - **ONE-PAGER** — Flyer de propuesta de valor
     - **INFOGRAFÍA** — Proceso de ingeniería
   
   - Rellena (o verifica):
     - Nombre del cliente
     - Material / Dureza
     - Programador / Responsable
   
   - Haz clic en **GENERAR DOCUMENTO**
   - Descarga el DOCX generado

---

## 📋 Tipos de documentos soportados

| Documento | Script | Output | Uso |
|-----------|--------|--------|-----|
| **FICHA TALLER** | build4.js | Ficha_Taller_[PROYECTO].docx | Operaciones, herramientas, secuencia |
| **PROPUESTA** | build5.js | Propuesta_Comercial_[CLIENTE].docx | Presupuesto con precio fijo |
| **CALIDAD** | build6.js | Reporte_Control_Calidad.docx | Control dimensional y tolerancias |
| **ONE-PAGER** | build7.js | OnePager_Propuesta_Valor.docx | Marketing B2B |
| **INFOGRAFÍA** | build8.js | Infografia_Proceso.docx | Proceso de ingeniería visual |

---

## 🔧 Configuración avanzada

### Editar datos extraídos manualmente
Si la extracción automática no captura todos los datos (ej: especificidades de tu máquina), puedes:

1. Editar `app.py` línea 50-100 (función `extract_fusion_data`)
2. Agregar lógica de parsing específica para tu formato Fusion
3. Reiniciar la app

### Agregar nuevos tipos de documentos
1. Crea un nuevo script `buildX.js` con tu template
2. Actualiza el diccionario `script_map` en `app.py` línea 130
3. Reinicia la app

---

## ⚡ Optimización de tokens / Ventajas

✅ **Cero tokens gastados** en generación de documentos repetitivos  
✅ **Automático al 100%** — solo cargas el HTML, todo lo demás es automático  
✅ **Rápido** — genera un documento en 5-10 segundos  
✅ **Offline** — funciona completamente en tu máquina, sin depender de la nube  
✅ **Extensible** — fácil agregar nuevos documentos o campos  

---

## 🐛 Troubleshooting

### Error: "node: command not found"
```bash
# Instala Node.js
# En macOS:
brew install node

# En Ubuntu/Debian:
sudo apt-get install nodejs npm
```

### Error: "ModuleNotFoundError: No module named 'streamlit'"
```bash
pip install streamlit beautifulsoup4 --break-system-packages
```

### Error: "Timeout: la generación tardó demasiado"
- Verifica que los scripts `build*.js` estén en `/home/claude/mag_g54/`
- Comprueba que `npm install` se ejecutó correctamente
- Intenta generar de nuevo

### Error: "No se pudo generar el documento"
- Revisa que los datos se extrajeron correctamente en la pestaña "Revisar"
- Verifica que el cliente/material/programador no estén vacíos
- Comprueba los logs de la terminal

---

## 📞 Soporte

Para agregar nuevas funcionalidades o reportar bugs:
1. Edita `app.py` para agregar el cambio
2. Prueba localmente
3. Documenta los cambios en este README

---

**MAG Industries © 2026 | Document Generator v1.0**
