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
3. **Colores de marca fijos:** navy `#1B2A41`, orange `#E07B39`, steel grey `#5A6B7A`. No usar otros colores de acento sin aprobación explícita del usuario.
4. **Teléfono de contacto correcto: `+34 635 013 953`.** Nunca `636 013 953` (typo histórico ya corregido en todas las plantillas — no reintroducirlo).
5. **Repositorio de GitHub DEBE ser privado.** Contiene datos reales de clientes (nombres, piezas, materiales).
6. **No subir a git:** `node_modules/`, documentos `.docx` de ejemplo con datos reales de clientes, archivos de memoria/config con datos sensibles.
7. **El usuario es no-técnico.** Cualquier instrucción que se le dé (en commits, README, mensajes) debe ser explícita, sin asumir conocimiento previo de terminal/git/Python.
8. **La app es de uso personal exclusivo** (un solo usuario) — no diseñar para multi-tenancy.

---

## Estado actual

**Hito actual:** Integrando la plantilla "HOJA G54" a la app Streamlit + añadiendo sistema de presets y memoria de último uso + preparando despliegue a Streamlit Community Cloud.

**Ver `PROJECT_STATE.md`** para el detalle completo de esta sesión: qué se hizo, qué falta, y los próximos 3 pasos exactos.
