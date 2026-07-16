"""Extracción de datos del Setup Sheet HTML exportado desde Fusion 360.

La lógica de extracción se mantiene igual que en la versión original de la app:
solo se separó de la interfaz para poder testearla y reutilizarla.
"""

import re

from bs4 import BeautifulSoup


def extract_value(text, key, delimiter='|'):
    """Extrae valor después de una clave."""
    if key not in text:
        return None
    idx = text.find(key) + len(key)
    end_idx = text.find(delimiter, idx) if delimiter in text[idx:] else len(text)
    return text[idx:end_idx].strip()


def extract_between(text, start_key, end_key, suffix=''):
    """Extrae valor entre dos claves."""
    if start_key not in text or end_key not in text[text.find(start_key):]:
        return None
    start_idx = text.find(start_key) + len(start_key)
    end_idx = text.find(end_key, start_idx)
    val = text[start_idx:end_idx].strip()
    if suffix:
        val = val.replace(suffix, '').strip()
    return val


def extract_fusion_data(html_content):
    """Extrae datos del Setup Sheet de Fusion 360.

    Devuelve una tupla ``(data, error)``: si el parseo falla, ``data`` es None
    y ``error`` contiene el mensaje.
    """
    try:
        soup = BeautifulSoup(html_content, 'html.parser')

        # Job description
        jobhead = soup.find('table', class_='jobhead')
        job_text = jobhead.get_text(' | ', strip=True) if jobhead else ""

        # Tablas de datos
        tables = soup.find_all('table', class_='sheet')

        data = {}

        # Tabla 0: Resumen global
        if len(tables) > 0:
            summary_text = tables[0].get_text(' | ', strip=True)
            data['total_operations'] = extract_value(summary_text, 'Number Of Operations:', '|')
            data['total_tools'] = extract_value(summary_text, 'Number Of Tools:', '|')
            data['z_max'] = extract_value(summary_text, 'Maximum Z:', '|')
            data['z_min'] = extract_value(summary_text, 'Minimum Z:', '|')
            data['feedrate_max'] = extract_value(summary_text, 'Maximum Feedrate:', '|')
            data['rpm_max'] = extract_value(summary_text, 'Velocidad máxima de husillo:', '|')
            data['cutting_distance'] = extract_value(summary_text, 'Cutting Distance:', '|')
            data['rapid_distance'] = extract_value(summary_text, 'Distancia rápida:', '|')
            data['cycle_time'] = extract_value(summary_text, 'Estimated Cycle Time:', '|')

        # Datos de material/bruto (extraer del body text)
        body_text = soup.get_text('\n', strip=True)
        material_idx = body_text.find('Material')
        if material_idx > 0:
            excerpt = body_text[material_idx:material_idx + 800]
            data['bruto_dx'] = extract_between(excerpt, 'DX:', 'mm')
            data['bruto_dy'] = extract_between(excerpt, 'DY:', 'mm')
            data['bruto_dz'] = extract_between(excerpt, 'DZ:', 'mm')
            data['pieza_dx'] = extract_between(excerpt, 'Pieza', 'DX:', 'mm')

        # Referencia del proyecto del jobhead
        if 'Document Path:' in job_text:
            ref = job_text.split('Document Path:')[1].split('|')[0].strip()
            data['project_ref'] = ref

        # Imagen de pieza (base64)
        img_match = re.search(r'data:image/png;base64,([A-Za-z0-9+/=]+)', html_content)
        if img_match:
            data['pieza_image_base64'] = img_match.group(1)

        # Tabla 1: Herramientas
        if len(tables) > 1:
            tools_text = tables[1].get_text(' | ', strip=True)
            data['tools_raw'] = tools_text

        # Tabla 2: Operaciones
        if len(tables) > 2:
            ops_text = tables[2].get_text(' | ', strip=True)
            data['operations_raw'] = ops_text

        return data, None

    except Exception as e:  # noqa: BLE001 — cualquier fallo de parseo se reporta a la UI
        return None, f"Error al parsear Fusion 360 HTML: {e}"


# Campos editables en la pestaña de revisión: (clave, etiqueta, ayuda)
EDITABLE_FIELDS = [
    ('project_ref', 'Referencia del proyecto', 'Ruta del documento en Fusion 360'),
    ('total_operations', 'Nº de operaciones', 'Número total de operaciones CAM del setup'),
    ('total_tools', 'Nº de herramientas', 'Herramientas distintas usadas en el programa'),
    ('cycle_time', 'Tiempo de ciclo estimado', 'Tiempo total estimado por Fusion 360'),
    ('rpm_max', 'RPM máx. de husillo', 'Velocidad máxima del husillo en el programa'),
    ('feedrate_max', 'Avance máximo', 'Avance máximo programado (mm/min)'),
    ('cutting_distance', 'Distancia de corte', 'Recorrido total en corte'),
    ('rapid_distance', 'Distancia en rápido', 'Recorrido total en movimientos rápidos'),
    ('bruto_dx', 'Bruto DX (mm)', 'Dimensión X del material en bruto'),
    ('bruto_dy', 'Bruto DY (mm)', 'Dimensión Y del material en bruto'),
    ('bruto_dz', 'Bruto DZ (mm)', 'Dimensión Z del material en bruto'),
    ('z_max', 'Z máximo (mm)', 'Cota Z superior del programa'),
    ('z_min', 'Z mínimo (mm)', 'Cota Z inferior del programa'),
]
