"""MAG Industries — Document Generator.

Interfaz Streamlit para generar documentos Word técnicos a partir de
Setup Sheets exportados desde Fusion 360. Los documentos se generan con
los scripts Node.js originales (generators/build4.js … build8.js).
"""

import base64
import io
import re
import time
from datetime import datetime

import streamlit as st
from streamlit_paste_button import paste_image_button

from core.images import box_for, box_for_g54_view, thumbnail
from core.generator import (
    DOC_DESCRIPTIONS,
    SCRIPT_MAP,
    ensure_node_modules,
    find_node,
    generate_document,
    node_ready,
)
from core.parser import EDITABLE_FIELDS, extract_fusion_data
from core.presets import PRESETS, PRESET_NAMES
from core import clients, memory, sectors
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

# Método de origen G54 aprobado: default editable del formulario. Debe
# coincidir con el ORIGIN_DEFAULT de generators/build_g54.js.
G54_ORIGIN_DEFAULT = (
    "Eje X (centro de la pieza): Palpar las dos caras laterales opuestas en el "
    "eje X y establecer el cero en el punto medio entre ambas. El origen X queda "
    "en el centro geométrico de la pieza final.\n\n"
    "Eje Y (centro de la pieza): Palpar los cantos opuestos (superior e inferior) "
    "en el eje Y y establecer el cero en el punto medio. El origen Y queda en el "
    "centro geométrico de la pieza final.\n\n"
    "Eje Z (base de la pieza): Establecer el cero en la cara inferior de la pieza "
    "final (Z mínimo). Verificar con una altura o distancia medible y conocida, de "
    "modo que el cero sea comprobable y trazable para mantener las tolerancias bajo "
    "control.\n\n"
    "Verificación con comparador de carátula: Antes de mecanizar, comprobar el "
    "origen en X e Y apoyándose en referencias verificables —agujeros de referencia "
    "o caras perfectamente paralelas— usando el comparador de carátula. Confirmar "
    "que la desviación esté dentro de tolerancia antes de dar inicio al programa."
)

# ============== Utilidades ==============

def _clean_filename(text):
    """Quita los caracteres prohibidos en nombres de archivo y colapsa espacios."""
    text = re.sub(r'[\\/:*?"<>|\r\n\t]+', " ", str(text or ""))
    return re.sub(r"\s+", " ", text).strip(" .")


def build_download_name(doc_type, project_ref, client=None, revision="", doc_code=""):
    """Nombre del archivo a descargar.

    Si la ficha del cliente define una plantilla de nombre (idea 15), manda
    esa, para que el archivo entre en su gestor documental sin renombrarlo.
    Si no, se usa «Tipo de documento + Pieza/Referencia» de siempre. En ambos
    casos se sanean los caracteres no válidos y se recorta la longitud.
    """
    custom = clients.render_filename(client, doc_type, project_ref, revision, doc_code)
    if custom:
        base = _clean_filename(custom)
        if base:
            return f"{base[:120]}.docx"

    ref = _clean_filename(project_ref)
    # Placeholders típicos que no deben acabar en el nombre del archivo.
    if ref.startswith("[") or ref in ("—", "-"):
        ref = ""
    base = f"{_clean_filename(doc_type)} - {ref}".rstrip(" -") if ref else _clean_filename(doc_type)
    return f"{(base or 'Documento')[:120]}.docx"


# ============== Estado de sesión ==============

if 'history' not in st.session_state:
    st.session_state['history'] = []

# Renders pegados por el usuario: {etiqueta de herramienta: bytes PNG}
if 'tool_images' not in st.session_state:
    st.session_state['tool_images'] = {}

# Capturas de vista pegadas para la Hoja G54: {'frontal'|'superior'|
# 'lateral'|'isometrica': bytes PNG}
if 'g54_view_images' not in st.session_state:
    st.session_state['g54_view_images'] = {}

G54_VIEWS = [
    ('frontal', 'Vista Frontal (XZ)'),
    ('superior', 'Vista Superior (XY) — Origen G54'),
    ('lateral', 'Vista Lateral (YZ)'),
    ('isometrica', 'Vista Isométrica — Sujeción'),
]

# Valores por defecto de los campos con estado (presets y memoria escriben
# sobre estas claves antes de crear los widgets).
FIELD_DEFAULTS = {
    'client_field': '',
    'material_field': '',
    'programmer_field': '',
    'machine_field': 'HAAS VF-2 (3 ejes)',
    'postprocessor_field': 'HAAS Next Generation',
    'variant_field': '',
    'revision_field': '00',
    'g54_phase_field': '',
    'g54_program_field': '',
    'g54_stock_field': '',
    'g54_operator_field': '',
    'g54_material_field': 'D2',
    'g54_hardness_field': '62 HRC',
    # Campos de la propuesta que la ficha del cliente precarga.
    'prop_tolerances_field': '',
    'prop_valid_until_field': '',
    'prop_scope_field': '',
    'prop_deliverables_field': '',
    'prop_doc_number_field': '',
}
for _k, _dv in FIELD_DEFAULTS.items():
    st.session_state.setdefault(_k, _dv)

# Campos que la memoria de último uso precarga (clave de widget → clave en la
# memoria). Los campos fijos (material/dureza/máquina) los gobiernan los
# presets, así que la memoria solo precarga los variables del proyecto.
MEMORY_FIELDS = {
    'client_field': 'client_name',
    'programmer_field': 'programmer',
    'project_ref_field': 'project_ref',
    'g54_phase_field': 'phase_op',
    'g54_program_field': 'cnc_program',
    'g54_stock_field': 'stock_dims',
    'g54_operator_field': 'operator',
}

# La memoria se precarga por pareja (cliente, tipo de documento): antes la
# clave era solo el tipo, así que un cliente pisaba los datos del anterior.
if 'memory_loaded_for' not in st.session_state:
    st.session_state['memory_loaded_for'] = None

# Ficha de cliente aplicada la última vez, para no pisar ediciones manuales.
if 'applied_client' not in st.session_state:
    st.session_state['applied_client'] = None

# Anexos exigidos ya marcados como preparados (idea 20).
if 'annexes_done' not in st.session_state:
    st.session_state['annexes_done'] = {}

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

    # --- Ficha de cliente: la pieza de la que cuelga toda la personalización ---
    client_rows = clients.list_clients()
    client_options = [clients.NO_CLIENT_ID] + [c.get("id") for c in client_rows]
    client_labels = {clients.NO_CLIENT_ID: "— Sin ficha de cliente —"}
    for row in client_rows:
        client_labels[row.get("id")] = (
            f'{row.get("name")}  ·  {sectors.label(row.get("sector"))}')

    active_client_id = st.selectbox(
        "Cliente",
        client_options,
        format_func=lambda i: client_labels.get(i, i),
        key="active_client_id",
        help="La ficha del cliente decide tolerancias, plan de control, nivel de "
             "detalle, firmas, tarifa y textos por sector. Se gestiona en la "
             "pestaña 👤 Clientes.",
    )
    active_client = clients.get_client(active_client_id)
    profile = clients.effective(active_client)

    if active_client:
        st.caption(f'Sector: **{profile["sector_label"]}**  ·  '
                   f'Tolerancia: {profile["tolerance"]}')
    else:
        st.caption("Sin ficha: se usan los valores del sector genérico. "
                   "Crea una en la pestaña **👤 Clientes**.")

    # Al cambiar de cliente se aplican sus valores por defecto. Solo cuando
    # cambia, para no pisar lo que el usuario haya editado a mano después.
    if st.session_state['applied_client'] != active_client_id:
        machines = profile.get("machines") or []
        if machines and isinstance(machines[0], dict):
            st.session_state['machine_field'] = machines[0].get('name') or \
                st.session_state['machine_field']
            if machines[0].get("postprocessor"):
                st.session_state['postprocessor_field'] = machines[0]['postprocessor']
        # Idea 4/16/17 — tolerancia, condiciones y biblioteca de textos del
        # sector, listos en el formulario en lugar de en blanco.
        st.session_state['prop_tolerances_field'] = profile.get('tolerance', '')
        st.session_state['prop_valid_until_field'] = (
            profile.get('offer_validity')
            or '30 días naturales desde la fecha de este documento')
        st.session_state['prop_scope_field'] = '\n'.join(
            profile.get('scope_blocks') or [])
        st.session_state['prop_deliverables_field'] = '\n'.join(
            profile.get('deliverables') or [])
        st.session_state['applied_client'] = active_client_id
        st.session_state['annexes_done'] = {}

    st.markdown("---")

    # --- Memoria de último uso: por cliente Y tipo de documento ---
    memory_key = (active_client_id, doc_type)
    if st.session_state['memory_loaded_for'] != memory_key:
        remembered = memory.load(doc_type, active_client_id)
        for field_key, mem_key in MEMORY_FIELDS.items():
            if remembered.get(mem_key):
                st.session_state[field_key] = remembered[mem_key]
        st.session_state['memory_loaded_for'] = memory_key

    # --- Preset de material ---
    preset = st.selectbox(
        "Preset de material",
        PRESET_NAMES,
        key="preset",
        help="Autocompleta material, dureza y máquina. Elige «Custom» para "
             "rellenar todo a mano.",
    )
    # Aplicar el preset solo cuando cambia, para no pisar ediciones manuales.
    if st.session_state.get('_applied_preset') != preset:
        vals = PRESETS.get(preset) or {}
        if vals:  # «Custom» no fuerza nada
            st.session_state['material_field'] = vals.get('material', '')
            st.session_state['machine_field'] = vals.get('machine', 'HAAS VF-2 (3 ejes)')
            st.session_state['g54_material_field'] = vals.get('material', 'D2')
            st.session_state['g54_hardness_field'] = vals.get('hardness', '62 HRC')
        st.session_state['_applied_preset'] = preset

    st.caption(memory.storage_label())

    st.markdown("---")
    st.markdown("**Datos del proyecto**")

    # Los folletos fijos no usan estos campos: no tiene sentido marcarlos
    # como incompletos.
    show_validation = doc_type not in ("ONE-PAGER", "INFOGRAFÍA")

    if active_client:
        client_name = active_client.get("name", "")
        st.text_input(
            "Nombre del cliente", value=client_name, disabled=True,
            help="Viene de la ficha. Cámbialo en la pestaña 👤 Clientes.",
        )
        client_ok = True
    else:
        client_name = st.text_input(
            "Nombre del cliente",
            key="client_field",
            placeholder="Ej.: Talleres Norte S.A.",
            help="Aparecerá como destinatario del documento.",
        )
        client_ok = validation_badge(client_name, "cliente") if show_validation else True

    material = st.text_input(
        "Material / Dureza",
        key="material_field",
        placeholder="Ej.: Aluminio 7075-T6",
        help="Material de la pieza y su dureza. Fusion 360 no lo incluye en el export, complétalo aquí.",
    )
    material_ok = validation_badge(material, "material") if show_validation else True

    programmer = st.text_input(
        "Programador / Responsable",
        key="programmer_field",
        placeholder="Ej.: A. Torres",
        help="Responsable del programa CAM y del documento.",
    )
    programmer_ok = validation_badge(programmer, "responsable") if show_validation else True

    # Propuesta y Calidad no dependen del Setup Sheet de Fusion 360, así que
    # necesitan la referencia de la pieza como campo propio (se autocompleta
    # si ya se subió un Setup Sheet en esta sesión).
    if doc_type in ("PROPUESTA", "CALIDAD", "HOJA G54"):
        project_ref = st.text_input(
            "Pieza / Referencia",
            key="project_ref_field",
            placeholder="Ej.: 01_216 KERN-RH — 20182855",
            help="Referencia de la pieza o proyecto. Se autocompleta si subes un "
                 "Setup Sheet de Fusion 360 en la pestaña Cargar Datos.",
        )
    else:
        project_ref = st.session_state.get('project_ref_field', '')

    with st.expander("🛠️ Máquina y documento"):
        st.caption("Estos datos no vienen en el export de Fusion 360.")

        # Parque de máquinas del cliente: la ficha debe nombrar SU máquina y
        # SU cono, no los nuestros.
        client_machines = [m for m in (profile.get("machines") or [])
                           if isinstance(m, dict) and m.get("name")]
        machine_taper = ""
        if client_machines:
            names = [m["name"] for m in client_machines]
            picked = st.selectbox(
                "Máquina del cliente", names, key="client_machine_pick",
                help="Máquinas dadas de alta en la ficha de este cliente.")
            chosen = next(m for m in client_machines if m["name"] == picked)
            machine_taper = chosen.get("taper", "") or ""
            if st.button("Usar esta máquina", use_container_width=True):
                st.session_state['machine_field'] = chosen['name']
                if chosen.get("postprocessor"):
                    st.session_state['postprocessor_field'] = chosen['postprocessor']
                st.rerun()
            if machine_taper:
                st.caption(f"Cono / portaherramientas: **{machine_taper}**")

        machine = st.text_input(
            "Máquina", key="machine_field",
            help="Máquina donde se ejecuta el programa.")
        postprocessor = st.text_input(
            "Postprocesador", key="postprocessor_field",
            help="Postprocesador usado al generar el código CNC.")
        variant = st.text_input(
            "Variante de la pieza", key="variant_field",
            placeholder="Ej.: REPARADA",
            help="Etiqueta entre paréntesis tras la referencia. Déjalo vacío para omitirla.")
        revision = st.text_input(
            "Revisión", key="revision_field",
            help="Revisión del documento; forma parte del Nº de documento.")

    # Idea 12 — numeración documental del cliente. Aquí solo se consulta el
    # siguiente código: el contador no avanza hasta que se genera de verdad.
    next_doc_code = clients.peek_doc_code(
        active_client, doc_type, project_ref, revision)
    if next_doc_code:
        st.caption(f"Nº de documento del cliente: **{next_doc_code}**")

    st.markdown("---")
    node_ok = node_ready()
    if node_ok:
        st.markdown("🟢 **Motor Node.js:** listo")
    else:
        st.markdown("🔴 **Motor Node.js:** no disponible")
        st.caption("Instala Node.js y ejecuta `npm install` en la carpeta del proyecto.")

# Paso actual del flujo: solo Ficha Taller depende de cargar/revisar datos;
# el resto de documentos puede generarse directamente.
if doc_type == "FICHA TALLER":
    has_data = 'fusion_data' in st.session_state
    current_step = 1 if not has_data else (3 if st.session_state['history'] else 2)
else:
    current_step = 3
render_steps(current_step)

# ============== Pestañas ==============

tab1, tab2, tab3, tab4, tab5 = st.tabs(
    ["📤 Cargar Datos", "✏️ Revisar y Editar", "⚡ Generar", "🗂️ Historial",
     "👤 Clientes"]
)

# ---------- 1. Cargar ----------
with tab1:
    st.subheader("1 · Carga el Setup Sheet de Fusion 360")
    if doc_type != "FICHA TALLER":
        st.caption(
            f"Opcional para **{doc_type}**: solo se usa para autocompletar la "
            f"referencia de la pieza en la barra lateral."
        )

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
                # Otro proyecto tiene otras herramientas: los renders del
                # anterior ya no corresponden.
                st.session_state['tool_images'] = {}
                if data.get('project_ref'):
                    st.session_state['project_ref_field'] = data['project_ref']
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
    if doc_type == "FICHA TALLER":
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
            if tools:
                st.markdown("#### 📸 Renders de herramienta")
                box_w, box_h = box_for(len(tools))
                st.caption(
                    f"Captura el utillaje en Fusion 360 (Win+Shift+S) y pégalo con "
                    f"Ctrl+V en la herramienta que corresponda. La imagen sustituye "
                    f"al texto «PEGAR RENDER» en la tarjeta del documento y se "
                    f"reescala sola a {box_w}×{box_h} px, así que no descuadra la "
                    f"tabla ni parte la sección en dos páginas."
                )
                img_cols = st.columns(min(len(tools), 4))
                for i, tool in enumerate(tools):
                    label = tool.get('label') or f"T{i + 1}"
                    with img_cols[i % len(img_cols)]:
                        st.markdown(f"**{label}** · {(tool.get('description') or '')[:28]}")
                        pasted = paste_image_button(
                            label=f"📋 Pegar render {label}",
                            key=f"paste_{label}",
                            errors="ignore",
                        )
                        if pasted is not None and getattr(pasted, 'image_data', None) is not None:
                            buf = io.BytesIO()
                            pasted.image_data.save(buf, format="PNG")
                            st.session_state['tool_images'][label] = buf.getvalue()

                        current = st.session_state['tool_images'].get(label)
                        if current:
                            st.image(thumbnail(current), use_container_width=True)
                            if st.button("🗑️ Quitar", key=f"del_{label}",
                                         use_container_width=True):
                                del st.session_state['tool_images'][label]
                                st.rerun()
                        else:
                            st.caption("Sin render · la tarjeta mantendrá el texto")
                st.markdown("---")

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

    elif doc_type == "PROPUESTA":
        st.subheader("2 · Datos de la propuesta comercial")
        st.caption(
            "Precio, alcance y plazos son criterio comercial tuyo: Fusion 360 no "
            "los tiene. «Nombre del cliente» de la barra lateral se usa como "
            "destinatario («Presentado a»)."
        )

        prop_contact_name = st.text_input(
            "Persona de contacto", placeholder="Ej.: Juan Parente",
            help="Nombre de la persona a la que se dirige la propuesta.")
        prop_project_title = st.text_input(
            "Título del proyecto",
            placeholder="Ej.: Fabricación de insertos de matriz — Ref. 01_216",
        )
        # Idea 17 — biblioteca de bloques de alcance del sector: se eligen y se
        # vuelcan al texto, en vez de escribirlo desde cero cada vez.
        scope_library = profile.get("scope_blocks") or []
        if scope_library:
            lib_cols = st.columns([4, 1])
            with lib_cols[0]:
                picked_scope = st.multiselect(
                    f'Bloques de alcance — {profile["sector_label"]}',
                    scope_library, default=scope_library, key="prop_scope_pick",
                    help="Textos habituales de este sector. Elige los que apliquen "
                         "y pulsa Insertar.")
            with lib_cols[1]:
                st.markdown("<br>", unsafe_allow_html=True)
                if st.button("⬇️ Insertar", use_container_width=True,
                             key="prop_scope_insert"):
                    st.session_state["prop_scope_field"] = "\n".join(picked_scope)
                    st.rerun()

        prop_scope = st.text_area(
            "Alcance del proyecto", height=100, key="prop_scope_field",
            placeholder="Describe el proceso, material y qué incluye el trabajo…",
        )

        c1, c2 = st.columns(2)
        with c1:
            prop_quantity = st.text_input("Cantidad", placeholder="Ej.: 3 unidades")
            prop_machine_process = st.text_input(
                "Máquina / Proceso",
                placeholder="Ej.: HAAS VF-2 (3 ejes) · CAM en Fusion 360",
            )
        with c2:
            prop_tolerances = st.text_input(
                "Tolerancias", key="prop_tolerances_field",
                help="Precargada desde el sector del cliente.")
            prop_doc_number = st.text_input(
                "Nº de documento", key="prop_doc_number_field",
                placeholder=next_doc_code or "Ej.: MAG-PROP-001",
                help="Si la ficha del cliente define plantilla de numeración, se "
                     "genera sola al pulsar Generar.")

        # Idea 17 — entregables típicos del sector, ya escritos.
        deliv_library = profile.get("deliverables") or []
        if deliv_library and st.button("⬇️ Cargar entregables del sector",
                                       key="prop_deliv_insert"):
            st.session_state["prop_deliverables_field"] = "\n".join(deliv_library)
            st.rerun()
        prop_deliverables_raw = st.text_area(
            "Entregables (uno por línea)", height=100,
            key="prop_deliverables_field",
            placeholder="Programación CAM completa y verificada\n"
                        "Mecanizado de desbaste y acabado\n"
                        "Control dimensional final con reporte de calidad",
        )

        st.markdown("**Cronograma**")
        pc1, pc2, pc3 = st.columns(3)
        with pc1:
            prop_phase1 = st.text_input("Fase 1", value="Programación CAM y verificación")
            prop_dur1 = st.text_input("Duración 1", value="1 – 2 días")
        with pc2:
            prop_phase2 = st.text_input("Fase 2", value="Mecanizado (desbaste + acabado)")
            prop_dur2 = st.text_input("Duración 2", value="4 – 5 días")
        with pc3:
            prop_phase3 = st.text_input("Fase 3", value="Control dimensional y documentación")
            prop_dur3 = st.text_input("Duración 3", value="1 día")
        prop_total_duration = st.text_input(
            "Plazo total estimado", placeholder="Ej.: 6 – 8 días laborables")

        c3, c4 = st.columns(2)
        with c3:
            rate = profile.get("rate_hour")
            prop_price = st.text_input(
                "Precio del proyecto (€)", placeholder="Ej.: 600",
                help=(f"Tarifa acordada con este cliente: {rate} €/h."
                      if rate else "Precio cerrado del proyecto."))
            if rate:
                st.caption(f"💶 Tarifa de la ficha: **{rate} €/h**"
                           + (f"  ·  Descuento: {profile['discount_pct']} %"
                              if profile.get("discount_pct") else ""))
        with c4:
            prop_valid_until = st.text_input(
                "Validez de la oferta", key="prop_valid_until_field",
                placeholder="Ej.: 30 días desde la fecha de este documento")
            if profile.get("payment_terms"):
                st.caption(f"🧾 Pago: **{profile['payment_terms']}**")

    elif doc_type == "CALIDAD":
        st.subheader("2 · Datos de la inspección")
        st.caption(
            "Cliente, pieza y material se autocompletan desde la barra lateral. "
            "Las mediciones y el resultado de la inspección se rellenan a mano "
            "en el Word, después de medir la pieza con los instrumentos físicos."
        )
        c1, c2 = st.columns(2)
        with c1:
            qc_inspection_date = st.text_input(
                "Fecha de inspección", placeholder="Ej.: 17/07/2026")
        with c2:
            st.text_input("Revisión", value=revision, disabled=True,
                          help="Se define en «🛠️ Máquina y documento», en la barra lateral.")
        st.info(
            f"Cabecera que se autocompletará: **{client_name or '[cliente]'}** · "
            f"**{project_ref or '[referencia]'}** · **{material or '[material]'}**"
        )

        # Idea 5 — el plan de control lo marca el sector del cliente.
        qc = profile.get("qc") or {}
        st.markdown("**Plan de control de este cliente**")
        q1, q2, q3 = st.columns(3)
        q1.metric("Cotas a controlar", qc.get("dimension_count", "—"))
        q2.metric("De ellas críticas", qc.get("critical_count", "—"))
        q3.metric("Tolerancia general", "")
        q3.caption(profile.get("tolerance", "—"))
        st.caption("Instrumentos declarados: "
                   + " · ".join(qc.get("instruments") or ["—"])
                   + f'  ·  Firmas: {len(profile.get("signatures") or [])}')

    elif doc_type == "HOJA G54":
        st.subheader("2 · Datos de la Hoja de Punto Cero (G54)")
        st.caption(
            "Cliente, referencia y programador se toman de la barra lateral. "
            "Rellena aquí lo específico de esta pieza. Los campos fijos vienen "
            "precargados: cámbialos solo si esta pieza es distinta."
        )

        st.markdown("**Datos variables de la pieza**")
        c1, c2 = st.columns(2)
        with c1:
            g54_phase = st.text_input(
                "Fase / Operación", key="g54_phase_field",
                placeholder="Ej.: Fase 2 — Acabado")
            g54_program = st.text_input(
                "Programa CNC (O-xxxx)", key="g54_program_field",
                placeholder="Ej.: O-1042 / acabado.nc")
        with c2:
            g54_stock = st.text_input(
                "Bruto (X x Y x Z, mm)", key="g54_stock_field",
                placeholder="Ej.: 120 x 80 x 40 mm")
            g54_operator = st.text_input(
                "Operario ejecutor", key="g54_operator_field",
                placeholder="Ej.: J. Parente")

        st.markdown("**Campos fijos (precargados · edítalos si cambian)**")
        f1, f2 = st.columns(2)
        with f1:
            g54_material = st.text_input("Material", key="g54_material_field")
        with f2:
            g54_hardness = st.text_input("Dureza", key="g54_hardness_field")
        st.caption(
            f"Máquina y postprocesador se toman de «🛠️ Máquina y documento» "
            f"(barra lateral): **{machine or '—'}** · **{postprocessor or '—'}**."
        )

        # Idea 10 — convenciones del taller del cliente: qué origen usa, en
        # qué rango numera los programas y cómo llama a los amarres.
        conv = []
        conv.append(f'Origen: **{profile.get("work_offset") or "G54"}**')
        if profile.get("program_range"):
            conv.append(f'Rango de programas: **{profile["program_range"]}**')
        if profile.get("fixture_naming"):
            conv.append(f'Amarre: **{profile["fixture_naming"]}**')
        st.caption("Convenciones de este cliente — " + "  ·  ".join(conv))

        st.markdown("**Vistas de la pieza**")
        g54_box_w, g54_box_h = box_for_g54_view()
        st.caption(
            f"Captura cada vista en Fusion 360 (Win+Shift+S) y pégala con "
            f"Ctrl+V en su recuadro. La imagen se reescala sola al tamaño "
            f"más grande que cabe en la tabla (máx. {g54_box_w}×{g54_box_h} px) "
            f"sin descuadrarla ni partirla entre páginas."
        )
        view_cols = st.columns(4)
        for (view_key, view_label), col in zip(G54_VIEWS, view_cols):
            with col:
                st.markdown(f"**{view_label}**")
                pasted_view = paste_image_button(
                    label="📋 Pegar captura",
                    key=f"paste_g54_{view_key}",
                    errors="ignore",
                )
                if pasted_view is not None and getattr(pasted_view, 'image_data', None) is not None:
                    buf = io.BytesIO()
                    pasted_view.image_data.save(buf, format="PNG")
                    st.session_state['g54_view_images'][view_key] = buf.getvalue()

                current_view = st.session_state['g54_view_images'].get(view_key)
                if current_view:
                    st.image(thumbnail(current_view), use_container_width=True)
                    if st.button("🗑️ Quitar", key=f"del_g54_{view_key}",
                                 use_container_width=True):
                        del st.session_state['g54_view_images'][view_key]
                        st.rerun()
                else:
                    st.caption("Sin captura · queda el hueco de pegado")

        st.markdown("**Método de establecimiento del origen G54**")
        g54_origin = st.text_area(
            "Texto que se imprime en el documento (editable)",
            value=G54_ORIGIN_DEFAULT,
            height=280,
            help="Este texto se inyecta tal cual en la hoja. Ajústalo si esta "
                 "pieza requiere un método de palpado distinto.",
        )

    else:  # ONE-PAGER, INFOGRAFÍA
        st.subheader("2 · Sin datos que revisar")
        st.info(
            f"**{doc_type}** es un folleto fijo de MAG Industries: no depende de "
            f"ningún dato de proyecto ni de Setup Sheet. Se genera igual cada "
            f"vez; ve directamente a la pestaña **⚡ Generar**."
        )

# ---------- 3. Generar ----------
with tab3:
    st.subheader("3 · Genera el documento")

    if doc_type == "FICHA TALLER" and 'fusion_data' not in st.session_state:
        st.warning("⚠️ Primero carga un Setup Sheet en la pestaña **📤 Cargar Datos**.")
    else:
        # Datos y extras propios de cada tipo de documento
        tool_images_arg = None
        view_images_arg = None
        if doc_type == "FICHA TALLER":
            edited = st.session_state.get('edited_data', st.session_state['fusion_data'])
            extra = {
                'machine': machine, 'postprocessor': postprocessor,
                'variant': variant, 'revision': revision,
                'machine_taper': machine_taper,
                'doc_number': next_doc_code,
            }
            tool_images_arg = st.session_state['tool_images']
        elif doc_type == "PROPUESTA":
            edited = {}
            extra = {
                'project_ref': project_ref,
                'contact_name': prop_contact_name,
                'project_title': prop_project_title,
                'scope_text': prop_scope,
                'quantity': prop_quantity,
                'machine_process': prop_machine_process,
                'tolerances': prop_tolerances,
                'doc_number': prop_doc_number or next_doc_code,
                'deliverables': [l.strip() for l in prop_deliverables_raw.splitlines() if l.strip()],
                'timeline_phases': [
                    {'fase': prop_phase1, 'duracion': prop_dur1},
                    {'fase': prop_phase2, 'duracion': prop_dur2},
                    {'fase': prop_phase3, 'duracion': prop_dur3},
                ],
                'total_duration': prop_total_duration,
                'price': prop_price,
                'valid_until': prop_valid_until,
            }
        elif doc_type == "CALIDAD":
            edited = {}
            extra = {
                'project_ref': project_ref,
                'inspection_date': qc_inspection_date,
                'revision': revision,
                'doc_number': next_doc_code,
            }
        elif doc_type == "HOJA G54":
            edited = {}
            extra = {
                'project_ref': project_ref,
                'phase_op': g54_phase,
                'cnc_program': g54_program,
                'stock_dims': g54_stock,
                'operator': g54_operator,
                'machine': machine,
                'postprocessor': postprocessor,
                'material': g54_material,
                'hardness': g54_hardness,
                'origin_text': g54_origin,
                'revision': revision,
                'doc_number': next_doc_code,
            }
            view_images_arg = st.session_state['g54_view_images']
        else:  # ONE-PAGER, INFOGRAFÍA: folletos fijos, sin datos de proyecto
            edited = {}
            extra = {}

        col1, col2 = st.columns([3, 2])
        with col1:
            st.markdown("#### Resumen de generación")
            if doc_type == "FICHA TALLER":
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
                n_tools = len(edited.get('tools') or [])
                n_imgs = len(st.session_state['tool_images'])
                if n_tools:
                    if n_imgs == n_tools:
                        st.caption(f"📸 {n_imgs}/{n_tools} renders de herramienta pegados.")
                    else:
                        st.caption(
                            f"📸 {n_imgs}/{n_tools} renders pegados · las herramientas "
                            f"sin render mantendrán el texto «PEGAR RENDER»."
                        )
            elif doc_type == "PROPUESTA":
                st.markdown(
                    f"""
| | |
|---|---|
| **Documento** | {doc_type} |
| **Presentado a** | {client_name or '—'} |
| **Proyecto** | {prop_project_title or '—'} |
| **Precio** | {(prop_price + ' €') if prop_price else '—'} |
| **Plazo total** | {prop_total_duration or '—'} |
"""
                )
            elif doc_type == "CALIDAD":
                st.markdown(
                    f"""
| | |
|---|---|
| **Documento** | {doc_type} |
| **Cliente** | {client_name or '—'} |
| **Pieza / Referencia** | {project_ref or '—'} |
| **Material** | {material or '—'} |
| **Fecha inspección** | {qc_inspection_date or '—'} |
"""
                )
            elif doc_type == "HOJA G54":
                st.markdown(
                    f"""
| | |
|---|---|
| **Documento** | {doc_type} |
| **Cliente** | {client_name or '—'} |
| **Pieza / Referencia** | {project_ref or '—'} |
| **Fase / Operación** | {g54_phase or '—'} |
| **Programa CNC** | {g54_program or '—'} |
| **Material / Dureza** | {(g54_material + ' · ' + g54_hardness) if g54_material else '—'} |
"""
                )
                n_views = len(st.session_state['g54_view_images'])
                if n_views == 4:
                    st.caption("📸 4/4 vistas pegadas.")
                else:
                    st.caption(
                        f"📸 {n_views}/4 vistas pegadas · las que falten mantendrán "
                        f"el hueco «PEGAR CAPTURA FUSION 360»."
                    )
            else:
                st.markdown(f"| | |\n|---|---|\n| **Documento** | {doc_type} |\n")
                st.caption("Folleto fijo de MAG Industries: no requiere datos de proyecto.")
        # Idea 20 — lista de lo que este cliente exige en cada entrega. La app
        # avisa antes de generar, en vez de descubrirlo el cliente al recibirlo.
        required_annexes = profile.get("annexes") or []
        missing_annexes = []
        if required_annexes and show_validation:
            with st.expander(
                    f"📎 Anexos exigidos por este cliente ({len(required_annexes)})",
                    expanded=True):
                st.caption(
                    "Marca lo que ya tienes preparado. La app no los genera: te "
                    "avisa para que no se te olvide adjuntarlos.")
                for annex in required_annexes:
                    done = st.checkbox(
                        annex, key=f"annex_{active_client_id}_{annex}",
                        value=st.session_state["annexes_done"].get(annex, False))
                    st.session_state["annexes_done"][annex] = done
                    if not done:
                        missing_annexes.append(annex)

        with col2:
            st.markdown("#### Estado")
            all_ok = client_ok and material_ok and programmer_ok
            if missing_annexes:
                st.warning(
                    "Faltan anexos por preparar: **"
                    + "**, **".join(missing_annexes)
                    + "**. Puedes generar igualmente.")
            if show_validation and not all_ok:
                st.warning("Faltan datos del proyecto en la barra lateral. "
                           "Puedes generar igualmente, pero el documento quedará incompleto.")
            elif show_validation:
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
                extra=extra,
                tool_images=tool_images_arg,
                view_images=view_images_arg,
                profile=profile,
            )
            progress.progress(90, text="Finalizando…")
            time.sleep(0.15)
            progress.progress(100, text="¡Listo!")
            time.sleep(0.2)
            progress.empty()

            if error:
                st.error(f"❌ {error}")
            elif docx_bytes:
                # El contador de numeración solo avanza si el documento se ha
                # generado de verdad.
                used_code = clients.consume_doc_code(
                    active_client, doc_type, project_ref, revision)
                # Nombre de descarga: plantilla del cliente si la tiene, y si no
                # «Tipo de documento + Pieza/Referencia».
                download_name = build_download_name(
                    doc_type, project_ref, active_client, revision, used_code)
                st.session_state['history'].append({
                    'doc_type': doc_type,
                    'filename': download_name,
                    'bytes': docx_bytes,
                    'timestamp': datetime.now().strftime("%H:%M:%S"),
                })

                # Memoria de último uso: recordar los valores del proyecto para
                # precargarlos la próxima vez (también desde otro dispositivo).
                mem_payload = {
                    'client_name': client_name,
                    'programmer': programmer,
                    'project_ref': project_ref,
                }
                if doc_type == "HOJA G54":
                    mem_payload.update({
                        'phase_op': g54_phase,
                        'cnc_program': g54_program,
                        'stock_dims': g54_stock,
                        'operator': g54_operator,
                    })
                memory.save(doc_type, mem_payload, active_client_id)

                st.success(f"✅ Documento generado: **{download_name}** "
                           f"({len(docx_bytes) / 1024:.0f} KB)")
                st.balloons()
                st.download_button(
                    label=f"📥 Descargar {download_name}",
                    data=docx_bytes,
                    file_name=download_name,
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

# ---------- 5. Clientes ----------
def _lines(text):
    """Convierte un textarea en lista, ignorando líneas en blanco."""
    return [l.strip() for l in (text or "").splitlines() if l.strip()]


def _parse_machines(text):
    """«HAAS VF-2 | BT40 | HAAS NGC» por línea → lista de diccionarios."""
    out = []
    for line in _lines(text):
        parts = [p.strip() for p in line.split("|")]
        if parts and parts[0]:
            out.append({
                "name": parts[0],
                "taper": parts[1] if len(parts) > 1 else "",
                "postprocessor": parts[2] if len(parts) > 2 else "",
            })
    return out


def _format_machines(machines):
    return "\n".join(
        " | ".join([m.get("name", ""), m.get("taper", ""), m.get("postprocessor", "")]).rstrip(" |")
        for m in (machines or []) if isinstance(m, dict))


with tab5:
    st.subheader("👤 Fichas de cliente")
    st.caption(clients.storage_label())

    edit_options = ["➕ Cliente nuevo"] + [c.get("id") for c in client_rows]
    edit_labels = {"➕ Cliente nuevo": "➕ Cliente nuevo"}
    edit_labels.update({c.get("id"): c.get("name") for c in client_rows})
    editing = st.selectbox(
        "Ficha a editar", edit_options,
        format_func=lambda i: edit_labels.get(i, i), key="cf_pick")

    is_new = editing == "➕ Cliente nuevo"
    record = None if is_new else clients.get_client(editing)
    prof = clients.effective(record)
    qc_prof = prof.get("qc") or {}

    with st.form("client_form", border=True):
        c1, c2 = st.columns(2)
        with c1:
            f_name = st.text_input(
                "Nombre del cliente *", value=(record or {}).get("name", ""),
                placeholder="Ej.: Talleres Norte S.A.")
            f_contact = st.text_input(
                "Persona de contacto", value=prof.get("contact_name", ""))
        with c2:
            sector_keys = sectors.SECTOR_KEYS
            current_sector = (record or {}).get("sector") or sectors.DEFAULT_SECTOR
            f_sector = st.selectbox(
                "Sector *", sector_keys,
                index=sector_keys.index(current_sector)
                if current_sector in sector_keys else 0,
                format_func=lambda k: sectors.SECTOR_LABELS[k],
                help="Fija de golpe tolerancias, plan de control, nivel de "
                     "detalle, anexos y los textos del one-pager.")
            f_email = st.text_input(
                "Email de contacto", value=prof.get("contact_email", ""))

        st.markdown("**Técnico**")
        t1, t2 = st.columns(2)
        with t1:
            f_tolerance = st.text_input(
                "Tolerancia general", value=prof.get("tolerance", ""),
                help="Rellena sola la propuesta y el reporte de calidad.")
            detail_keys = list(sectors.FICHA_DETAIL_LEVELS.keys())
            f_detail = st.selectbox(
                "Detalle de la ficha de taller", detail_keys,
                index=detail_keys.index(prof.get("ficha_detail", "estandar"))
                if prof.get("ficha_detail") in detail_keys else 1,
                format_func=lambda k: sectors.FICHA_DETAIL_LEVELS[k])
            f_coolant = st.text_input(
                "Refrigeración del taller", value=prof.get("coolant", ""),
                help="Ej.: «Emulsión 6 %», «Seco», «MQL». Si el taller trabaja "
                     "en seco, la ficha deja de imprimir emulsión.")
        with t2:
            f_qc_n = st.number_input(
                "Cotas a controlar", min_value=1, max_value=30,
                value=int(qc_prof.get("dimension_count", 5) or 5))
            f_qc_crit = st.number_input(
                "De ellas críticas", min_value=0, max_value=30,
                value=int(qc_prof.get("critical_count", 2) or 0))
            f_qc_instr = st.text_input(
                "Instrumentos (separados por coma)",
                value=", ".join(qc_prof.get("instruments") or []))

        f_machines = st.text_area(
            "Parque de máquinas — una por línea: Nombre | Cono | Postprocesador",
            value=_format_machines(prof.get("machines")), height=90,
            placeholder="HAAS VF-2 (3 ejes) | BT40 | HAAS Next Generation")

        o1, o2, o3 = st.columns(3)
        with o1:
            f_offset = st.text_input(
                "Origen de trabajo", value=prof.get("work_offset", "G54"),
                help="G54 a G59. Aparece en toda la Hoja de Punto Cero.")
        with o2:
            f_range = st.text_input(
                "Rango de programas", value=prof.get("program_range", ""),
                placeholder="Ej.: O1000-O1999")
        with o3:
            f_fixture = st.text_input(
                "Nomenclatura de amarre", value=prof.get("fixture_naming", ""),
                placeholder="Ej.: Mordaza Lang Makro-Grip 125")

        st.markdown("**Comercial**")
        m1, m2, m3, m4 = st.columns(4)
        with m1:
            f_rate = st.text_input("Tarifa (€/h)", value=str(prof.get("rate_hour", "")))
        with m2:
            f_discount = st.text_input("Descuento (%)", value=str(prof.get("discount_pct", "")))
        with m3:
            f_payment = st.text_input("Plazo de pago", value=prof.get("payment_terms", ""),
                                      placeholder="Ej.: 30 días")
        with m4:
            f_validity = st.text_input("Validez de oferta", value=prof.get("offer_validity", ""),
                                       placeholder="Ej.: 30 días naturales")

        st.markdown("**Documentación**")
        d1, d2 = st.columns(2)
        with d1:
            f_doc_tpl = st.text_input(
                "Plantilla de nº de documento", value=prof.get("doc_code_template", ""),
                placeholder="PROV-{year}-{seq:03d}",
                help=f"Marcadores: {clients.DOC_CODE_TOKENS}")
            f_doc_seq = st.number_input(
                "Contador actual", min_value=0,
                value=int(prof.get("doc_code_seq", 0) or 0),
                help="El siguiente documento usará este número + 1.")
        with d2:
            f_file_tpl = st.text_input(
                "Plantilla de nombre de archivo", value=prof.get("filename_template", ""),
                placeholder="{cliente}_{ref}_{rev}_{fecha}",
                help=f"Marcadores: {clients.FILENAME_TOKENS}")
            f_logo = st.file_uploader(
                "Logo del cliente (PNG, para co-branding)", type=["png"])

        a1, a2 = st.columns(2)
        with a1:
            f_annexes = st.text_area(
                "Anexos exigidos (uno por línea)",
                value="\n".join(prof.get("annexes") or []), height=110)
        with a2:
            f_signatures = st.text_area(
                "Firmas del documento (una por línea, máx. 4)",
                value="\n".join(prof.get("signatures") or []), height=110)

        saved = st.form_submit_button(
            "💾 Guardar ficha", use_container_width=True, type="primary")

    if saved:
        new_profile = {
            "contact_name": f_contact,
            "contact_email": f_email,
            "tolerance": f_tolerance,
            "ficha_detail": f_detail,
            "coolant": f_coolant,
            "qc": {
                "dimension_count": int(f_qc_n),
                "critical_count": min(int(f_qc_crit), int(f_qc_n)),
                "instruments": [i.strip() for i in f_qc_instr.split(",") if i.strip()],
            },
            "machines": _parse_machines(f_machines),
            "work_offset": f_offset,
            "program_range": f_range,
            "fixture_naming": f_fixture,
            "rate_hour": f_rate,
            "discount_pct": f_discount,
            "payment_terms": f_payment,
            "offer_validity": f_validity,
            "doc_code_template": f_doc_tpl,
            "doc_code_seq": int(f_doc_seq),
            "filename_template": f_file_tpl,
            "annexes": _lines(f_annexes),
            "signatures": _lines(f_signatures)[:4],
        }
        # El logo solo se sustituye si se sube uno nuevo.
        if f_logo is not None:
            new_profile["logo_b64"] = base64.b64encode(f_logo.getvalue()).decode()
        elif prof.get("logo_b64"):
            new_profile["logo_b64"] = prof["logo_b64"]

        ok, msg = clients.save_client(
            None if is_new else editing, f_name, f_sector, new_profile)
        if ok:
            st.success(f"✅ {msg}")
            st.rerun()
        else:
            st.error(f"❌ {msg}")

    if not is_new and record:
        with st.expander("🗑️ Borrar esta ficha"):
            st.caption("La ficha se borra, pero los documentos ya generados no "
                       "cambian.")
            if st.button(f"Borrar «{record.get('name')}» definitivamente",
                         type="secondary"):
                ok, msg = clients.delete_client(editing)
                (st.success if ok else st.error)(msg)
                if ok:
                    st.rerun()

st.divider()
st.caption("MAG Industries © 2026 · Document Generator v2.0 · "
           "Motor de documentos: Node.js + docx")
