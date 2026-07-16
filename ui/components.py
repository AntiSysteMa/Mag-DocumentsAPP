"""Componentes visuales reutilizables de la interfaz MAG Industries."""

import html

import streamlit as st

from ui.theme import MAG_CSS


def inject_theme():
    st.markdown(MAG_CSS, unsafe_allow_html=True)


def render_header():
    st.markdown(
        """
        <div class="mag-header">
            <span class="mag-badge">CNC · CAM · Documentación</span>
            <h1>🔧 MAG INDUSTRIES — Document Generator</h1>
            <div class="mag-tagline">
                Generación automática de documentos técnicos desde Setup Sheets de Fusion 360
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_steps(current: int):
    """Indicador de progreso del flujo: 1 Cargar → 2 Revisar → 3 Generar."""
    labels = ["Cargar datos", "Revisar y editar", "Generar documento"]
    parts = []
    for i, label in enumerate(labels, start=1):
        if i < current:
            cls, dot = "done", "✓"
        elif i == current:
            cls, dot = "active", str(i)
        else:
            cls, dot = "", str(i)
        parts.append(
            f'<div class="mag-step {cls}">'
            f'<span class="mag-step-dot">{dot}</span><span>{label}</span></div>'
        )
        if i < len(labels):
            parts.append('<div class="mag-step-sep"></div>')
    st.markdown(f'<div class="mag-steps">{"".join(parts)}</div>', unsafe_allow_html=True)


def metric_card(label, value, unit=""):
    value = value if value not in (None, "") else "—"
    unit_html = f'<span class="mag-card-unit"> {html.escape(unit)}</span>' if unit else ""
    return (
        f'<div class="mag-card">'
        f'<div class="mag-card-label">{html.escape(label)}</div>'
        f'<div class="mag-card-value">{html.escape(str(value))}{unit_html}</div>'
        f'</div>'
    )


def render_dashboard(data):
    """Dashboard visual con las métricas clave extraídas del Setup Sheet."""
    bruto = None
    if data.get('bruto_dx') and data.get('bruto_dy') and data.get('bruto_dz'):
        bruto = f"{data['bruto_dx']} × {data['bruto_dy']} × {data['bruto_dz']}"

    cards = [
        metric_card("Operaciones", data.get('total_operations')),
        metric_card("Herramientas", data.get('total_tools')),
        metric_card("Tiempo de ciclo", data.get('cycle_time')),
        metric_card("RPM máx.", data.get('rpm_max')),
        metric_card("Avance máx.", data.get('feedrate_max')),
        metric_card("Bruto", bruto, "mm"),
    ]
    st.markdown(f'<div class="mag-grid">{"".join(cards)}</div>', unsafe_allow_html=True)


def validation_badge(value, field_label):
    """Insignia de validación en tiempo real bajo un campo de formulario."""
    is_placeholder = (
        not value
        or not str(value).strip()
        or (str(value).strip().startswith('[') and str(value).strip().endswith(']'))
    )
    if is_placeholder:
        st.markdown(
            f'<span class="mag-invalid">✗ Completa «{html.escape(field_label)}»</span>',
            unsafe_allow_html=True,
        )
        return False
    st.markdown('<span class="mag-valid">✓ Válido</span>', unsafe_allow_html=True)
    return True


def render_history(history):
    """Historial de documentos generados en la sesión, con re-descarga."""
    if not history:
        st.caption("Todavía no se ha generado ningún documento en esta sesión.")
        return
    for i, item in enumerate(reversed(history)):
        st.markdown(
            f"""
            <div class="mag-history-item">
                <span class="mag-doc-type">{html.escape(item['doc_type'])}</span>
                <span class="mag-doc-name">{html.escape(item['filename'])}</span>
                <span class="mag-doc-time">🕓 {html.escape(item['timestamp'])}</span>
            </div>
            """,
            unsafe_allow_html=True,
        )
        st.download_button(
            label="📥 Volver a descargar",
            data=item['bytes'],
            file_name=item['filename'],
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            key=f"history_dl_{len(history) - 1 - i}",
        )
