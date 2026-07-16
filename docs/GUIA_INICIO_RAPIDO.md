# 🚀 Guía de Inicio Rápido — MAG Industries Document Generator

## ¿Qué es esto?

Una **app Streamlit** que genera automáticamente documentos técnicos (fichas de taller, propuestas, reportes) desde archivos HTML exportados de Fusion 360.

**Ventaja clave:** Cero tokens de Claude gastados. Todo funciona localmente en tu máquina.

---

## Instalación (5 minutos)

### 1. Descarga los archivos
```
✅ app.py (la app principal)
✅ requirements.txt (dependencias Python)
✅ install.sh (script de instalación)
✅ run.sh (script para lanzar la app)
```

### 2. Coloca todos en una carpeta
```bash
mkdir mag_app
cd mag_app
# Copia los 4 archivos aquí
```

### 3. Ejecuta la instalación
```bash
bash install.sh
```

El script verificará:
- ✅ Python 3 instalado
- ✅ Node.js instalado  
- ✅ Dependencias Python
- ✅ Scripts de generación (build*.js)

---

## Primer uso (3 minutos)

### Lanzar la app
```bash
bash run.sh
# O:
streamlit run app.py
```

Se abrirá automáticamente en tu navegador: `http://localhost:8501`

### Uso básico
1. **Pestaña "Cargar Datos"**
   - Descarga un Setup Sheet de Fusion 360 como HTML
   - Cargalo en la app (drag & drop)

2. **Pestaña "Revisar"**
   - Verifica que los datos se extrajeron correctamente
   - Mira la imagen de la pieza

3. **Pestaña "Generar"**
   - Elige tipo de documento (Ficha Taller, Propuesta, etc.)
   - Rellena Cliente, Material, Programador
   - Haz clic en "GENERAR DOCUMENTO"
   - Descarga el DOCX

---

## Documentos que puedes generar

| Documento | Uso |
|-----------|-----|
| **FICHA TALLER** | Operaciones, herramientas, secuencia de mecanizado |
| **PROPUESTA** | Presupuesto con precio fijo para el cliente |
| **CALIDAD** | Reporte de control dimensional y tolerancias |
| **ONE-PAGER** | Flyer B2B de propuesta de valor |
| **INFOGRAFÍA** | Proceso de ingeniería visualizado |

---

## Requisitos mínimos

- **Python 3.8+** (Windows, macOS, Linux)
- **Node.js 16+** (Windows, macOS, Linux)
- **Navegador web** (Chrome, Firefox, Safari, Edge)

No necesitas Docker, no necesitas servidor web, no necesitas Internet (funciona completamente offline).

---

## ¿Cómo exporto de Fusion 360?

1. Abre tu Setup Sheet en Fusion 360
2. Haz clic en **Export** (esquina superior derecha)
3. Selecciona **HTML**
4. Descarga el archivo
5. Cárgalo en la app

---

## Ahorro de tokens

**Sin la app:**
- Ficha de taller = ~50-80 tokens (parsing + iteraciones)
- Cada documento nuevo = 50-80 tokens

**Con la app:**
- Ilimitados documentos = 0 tokens

Para 10 documentos: **ahorro de 500-800 tokens** 🎯

---

## Próximos pasos (opcional)

### Agregar más documentos
1. Crea un nuevo `buildX.js` con tu template
2. Edita `app.py` línea 130 para agregarlo al menú
3. Reinicia la app

### Conectar a Google Drive (avanzado)
Puedes modificar `app.py` para que cargue/descargue directamente de Google Drive en lugar del navegador.

### Hacer una app web (avanzado)
Puedes desplegar la app en Heroku, Railway o AWS para acceder desde cualquier lado.

---

## 📞 Ayuda

### Error: "streamlit: command not found"
```bash
pip install streamlit --break-system-packages
```

### Error: "node: command not found"
Instala Node.js desde https://nodejs.org/

### Error: "No se encuentra build4.js"
Asegúrate de haber copiado **todos** los archivos build*.js al mismo directorio.

### La app genera pero el documento sale vacío
Verifica que los datos se extrajeron en la pestaña "Revisar" — si no hay datos, es que el HTML no se parsea correctamente.

---

## Estructura de carpetas (cómo debe verse)

```
mag_app/
├── app.py
├── requirements.txt
├── install.sh
├── run.sh
├── README_APP.md
├── build4.js           (ficha taller)
├── build5.js           (propuesta)
├── build6.js           (calidad)
├── build7.js           (one-pager)
├── build8.js           (infografía)
├── logo_claro.png
├── qr_whatsapp.png
├── icon_*.png          (9 archivos de íconos)
└── node_modules/       (se crea automáticamente)
```

---

## Ventajas de esta approach

✅ **Rápido:** 5-10 segundos por documento  
✅ **Offline:** Funciona sin Internet  
✅ **Gratis:** No usa tokens ni APIs de pago  
✅ **Escalable:** Genera 100 documentos sin problemas  
✅ **Personalizable:** Fácil agregar nuevos tipos  
✅ **Sin cloud:** Tus datos se quedan en tu máquina  

---

## ¿Preguntas?

Si algo no funciona:
1. Verifica que instalaste Node.js y Python
2. Ejecuta `bash install.sh` de nuevo
3. Revisa los logs en la terminal

---

**MAG Industries © 2026 | Document Generator v1.0**

*Optimización de tokens: 0 gastados por documento generado* 🎯
