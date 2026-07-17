"""MAG Industries — Document Generator.

Interfaz Streamlit para generar documentos Word técnicos a partir de
Setup Sheets exportados desde Fusion 360. Los documentos se generan con
los scripts Node.js originales (generators/build4.js … build8.js).
"""

import base64
import time
from datetime import datetime

import streamlit as st

from core.generator import (
    DOC_DESCRIPTIONS,
    SCRIPT_MAP,
    ensure_node_modules,
    find_node,
    generate_document,
    node_ready,
)
from core.parser import EDITABLE_FIELDS, extract_fusion_data
from ui.components import (
    inject_theme,
    render_dashboard,
    render_header,
    render_history,
    render_steps,
    validation_badge,
)

# ============== Configuración de página ==============

st.set_page_config(
    page_title="MAG Industries · Document Generator",
    page_icon="🔧",
    layout="wide",
    initial_sidebar_state="expanded",
)

inject_theme()
render_header()

# ============== Estado de sesión ==============

if 'history' not in st.session_state:
    st.session_state['history'] = []

# Bootstrap de dependencias Node (necesario la primera vez en Streamlit Cloud)
if 'node_checked' not in st.session_state:
    if find_node() and not node_ready():
        with st.spinner("Instalando dependencias de Node.js (solo la primera vez)…"):
            ensure_node_modules()
    st.session_state['node_checked'] = True

# ============== Sidebar: configuración ==============

with st.sidebar:
    st.header("⚙️ Configuración")

    doc_type = st.selectbox(
        "Tipo de documento",
        list(SCRIPT_MAP.keys()),
        help="Cada tipo se genera con su propio script Node.js (build4.js a build8.js).",
    )
    st.caption(DOC_DESCRIPTIONS.get(doc_type, ""))

    st.markdown("---")
    st.markdown("**Datos del proyecto**")

    client_name = st.text_input(
        "Nombre del cliente",
        value="",
        placeholder="Ej.: Talleres Norte S.A.",
        help="Aparecerá como destinatario del documento.",
    )
    client_ok = validation_badge(client_name, "cliente")

    material = st.text_input(
        "Material / Dureza",
        value="",
        placeholder="Ej.: Aluminio 7075-T6",
        help="Material de la pieza y su dureza. Fusion 360 no lo incluye en el export, complétalo aquí.",
    )
    material_ok = validation_badge(material, "material")

    programmer = st.text_input(
        "Programador / Responsable",
        value="",
        placeholder="Ej.: A. Torres",
        help="Responsable del programa CAM y del documento.",
    )
    programmer_ok = validation_badge(programmer, "responsable")

    with st.expander("🛠️ Máquina y documento"):
        st.caption("Estos datos no vienen en el export de Fusion 360.")
        machine = st.text_input(
            "Máquina", value="HAAS VF-2 (3 ejes)",
            help="Máquina donde se ejecuta el programa.")
        postprocessor = st.text_input(
            "Postprocesador", value="HAAS Next Generation",
            help="Postprocesador usado al generar el código CNC.")
        variant = st.text_input(
            "Variante de la pieza", value="",
            placeholder="Ej.: REPARADA",
            help="Etiqueta entre paréntesis tras la referencia. Déjalo vacío para omitirla.")
        revision = st.text_input(
            "Revisión", value="00",
            help="Revisión del documento; forma parte del Nº de documento.")

    st.markdown("---")
    node_ok = node_ready()
    if node_ok:
        st.markdown("🟢 **Motor Node.js:** listo")
    else:
        st.markdown("🔴 **Motor Node.js:** no disponible")
        st.caption("Instala Node.js y ejecuta `npm install` en la carpeta del proyecto.")

# Paso actual del flujo
has_data = 'fusion_data' in st.session_state
current_step = 1 if not has_data else (3 if st.session_state['history'] else 2)
render_steps(current_step)

# ============== Pestañas ==============

tab1, tab2, tab3, tab4 = st.tabs(
    ["📤 Cargar Datos", "✏️ Revisar y Editar", "⚡ Generar", "🗂️ Historial"]
)

# ---------- 1. Cargar ----------
with tab1:
    st.subheader("1 · Carga el Setup Sheet de Fusion 360")

    uploaded_file = st.file_uploader(
        "Selecciona el archivo HTML",
        type=['html', 'htm'],
        help="En Fusion 360: pestaña Manufacture → Setup Sheet → Export → HTML.",
    )

    if uploaded_file:
        # Previsualización en vivo del proceso de extracción
        with st.status("Procesando Setup Sheet…", expanded=True) as status:
            st.write("📄 Leyendo archivo HTML…")
            html_content = uploaded_file.getvalue().decode('utf-8', errors='replace')
            st.write(f"✅ {len(html_content):,} caracteres leídos")

            st.write("🔍 Extrayendo datos de mecanizado…")
            data, error = extract_fusion_data(html_content)

            if error:
                status.update(label="Error al procesar el archivo", state="error")
                st.error(error)
            elif data:
                found = sum(1 for v in data.values() if v)
                st.write(f"✅ {found} campos extraídos correctamente")
                status.update(
                    label=f"Setup Sheet procesado · {uploaded_file.name}",
                    state="complete",
                    expanded=False,
                )

        if data and not error:
            # Solo reiniciar la edición si es un archivo nuevo
            if st.session_state.get('source_file') != uploaded_file.name:
                st.session_state['edited_data'] = dict(data)
                st.session_state['source_file'] = uploaded_file.name
            st.session_state['fusion_data'] = data
            st.session_state['html_content'] = html_content

            st.markdown("#### 📊 Resumen de datos extraídos")
            render_dashboard(st.session_state['edited_data'])

            col_a, col_b = st.columns([3, 2])
            with col_a:
                if data.get('project_ref'):
                    st.info(f"**Proyecto:** {data['project_ref']}")
                st.success("Datos listos. Continúa en la pestaña **✏️ Revisar y Editar**.")
            with col_b:
                if data.get('pieza_image_base64'):
                    try:
                        img = base64.b64decode(data['pieza_image_base64'])
                        st.image(img, caption="Vista previa de la pieza",
                                 use_container_width=True)
                    except Exception:
                        pass
    else:
        st.markdown(
            """
            > **💡 Cómo exportar el Setup Sheet**
            > 1. En Fusion 360, abre el espacio **Manufacture**.
            > 2. Clic derecho sobre el *Setup* → **Setup Sheet**.
            > 3. Guarda el HTML y súbelo aquí.
            """
        )

# ---------- 2. Revisar y editar ----------
with tab2:
    st.subheader("2 · Revisa y edita los datos extraídos")

    if 'fusion_data' not in st.session_state:
        st.warning("👆 Primero carga un archivo en la pestaña **📤 Cargar Datos**.")
    else:
        edited = st.session_state.get(
            'edited_data', dict(st.session_state['fusion_data']))

        st.caption(
            "Puedes corregir cualquier valor antes de generar el documento. "
            "Los cambios solo afectan a esta sesión, no al archivo original."
        )

        with st.form("edit_form", border=True):
            cols = st.columns(2)
            new_values = {}
            for i, (key, label, help_text) in enumerate(EDITABLE_FIELDS):
                with cols[i % 2]:
                    new_values[key] = st.text_input(
                        label,
                        value=edited.get(key) or "",
                        help=help_text,
                        key=f"edit_{key}",
                    )
            submitted = st.form_submit_button(
                "💾 Guardar cambios", use_container_width=True, type="primary")

        if submitted:
            for key, value in new_values.items():
                edited[key] = value.strip() or None
            st.session_state['edited_data'] = edited
            st.success("✅ Cambios guardados. El documento usará estos valores.")

        st.markdown("#### 📊 Vista previa con tus cambios")
        render_dashboard(st.session_state.get('edited_data', edited))

        data = st.session_state['fusion_data']
        with st.expander("🖼️ Imagen de la pieza"):
            if data.get('pieza_image_base64'):
                try:
                    img = base64.b64decode(data['pieza_image_base64'])
                    st.image(img, use_container_width=True)
                except Exception:
                    st.caption("No se pudo decodificar la imagen incluida en el HTML.")
            else:
                st.caption("El Setup Sheet no incluye imagen de la pieza.")

        tools = data.get('tools') or []
        with st.expander(f"🧰 Herramientas detectadas ({len(tools)})", expanded=bool(tools)):
            if tools:
                st.dataframe(
                    [{
                        'Hta': t.get('label'),
                        'Descripción': t.get('description'),
                        'Ø (mm)': t.get('diameter'),
                        'R. esq. (mm)': t.get('corner_radius'),
                        'Long. (mm)': t.get('length'),
                        'Flutes': t.get('flutes'),
                        'Refrigerante': t.get('coolant'),
                        'Tiempo': t.get('cycle_time'),
                        '% del total': t.get('percentage'),
                    } for t in tools],
                    use_container_width=True, hide_index=True,
                )
            else:
                st.caption("No se detectaron herramientas en el Setup Sheet.")

        ops = data.get('operations') or []
        with st.expander(f"⚙️ Operaciones detectadas ({len(ops)})", expanded=bool(ops)):
            if ops:
                st.dataframe(
                    [{
                        'Nº': o.get('number'),
                        'Descripción': o.get('description'),
                        'Estrategia': o.get('strategy'),
                        'Hta': o.get('tool'),
                        'RPM': o.get('rpm'),
                        'Avance': o.get('feedrate'),
                        'Z máx': o.get('z_max'),
                        'Z mín': o.get('z_min'),
                        'Refrigerante': o.get('coolant'),
                        'Tiempo': o.get('cycle_time'),
                    } for o in ops],
                    use_container_width=True, hide_index=True,
                )
            else:
                st.caption("No se detectaron operaciones en el Setup Sheet.")

# ---------- 3. Generar ----------
with tab3:
    st.subheader("3 · Genera el documento")

    if 'fusion_data' not in st.session_state:
        st.warning("⚠️ Primero carga un Setup Sheet en la pestaña **📤 Cargar Datos**.")
    else:
        edited = st.session_state.get(
            'edited_data', st.session_state['fusion_data'])

        col1, col2 = st.columns([3, 2])
        with col1:
            st.markdown("#### Resumen de generación")
            st.markdown(
                f"""
| | |
|---|---|
| **Documento** | {doc_type} |
| **Cliente** | {client_name or '—'} |
| **Material** | {material or '—'} |
| **Responsable** | {programmer or '—'} |
| **Operaciones** | {edited.get('total_operations') or '—'} |
| **Tiempo de ciclo** | {edited.get('cycle_time') or '—'} |
"""
            )
        with col2:
            st.markdown("#### Estado")
            all_ok = client_ok and material_ok and programmer_ok
            if not all_ok:
                st.warning("Faltan datos del proyecto en la barra lateral. "
                           "Puedes generar igualmente, pero el documento quedará incompleto.")
            else:
                st.success("Todos los datos del proyecto están completos.")
            if not node_ok:
                st.error("Node.js no está disponible: no se puede generar.")

            generate_btn = st.button(
                "⚡ GENERAR DOCUMENTO",
                use_container_width=True,
                type="primary",
                disabled=not node_ok,
            )

        if generate_btn:
            progress = st.progress(0, text="Preparando datos…")
            stages = [
                (20, "Preparando datos del proyecto…"),
                (45, f"Ejecutando generador {SCRIPT_MAP[doc_type][0]}…"),
                (75, "Componiendo documento Word…"),
            ]
            for pct, label in stages[:1]:
                progress.progress(pct, text=label)
                time.sleep(0.2)

            progress.progress(45, text=stages[1][1])
            docx_bytes, filename, error = generate_document(
                doc_type,
                edited,
                client_name,
                material,
                programmer,
                extra={
                    'machine': machine,
                    'postprocessor': postprocessor,
                    'variant': variant,
                    'revision': revision,
                },
            )
            progress.progress(90, text="Finalizando…")
            time.sleep(0.15)
            progress.progress(100, text="¡Listo!")
            time.sleep(0.2)
            progress.empty()

            if error:
                st.error(f"❌ {error}")
            elif docx_bytes:
                st.session_state['history'].append({
                    'doc_type': doc_type,
                    'filename': filename,
                    'bytes': docx_bytes,
                    'timestamp': datetime.now().strftime("%H:%M:%S"),
                })
                st.success(f"✅ Documento generado: **{filename}** "
                           f"({len(docx_bytes) / 1024:.0f} KB)")
                st.balloons()
                st.download_button(
                    label=f"📥 Descargar {filename}",
                    data=docx_bytes,
                    file_name=filename,
                    mime="application/vnd.openxmlformats-officedocument"
                         ".wordprocessingml.document",
                    use_container_width=True,
                )
            else:
                st.error("❌ No se pudo generar el documento")

# ---------- 4. Historial ----------
with tab4:
    st.subheader("🗂️ Documentos generados en esta sesión")
    st.caption("El historial se vacía al cerrar o recargar la aplicación.")
    render_history(st.session_state['history'])

st.divider()
st.caption("MAG Industries © 2026 · Document Generator v2.0 · "
           "Motor de documentos: Node.js + docx")
