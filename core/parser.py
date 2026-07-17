"""Extracción de datos del Setup Sheet HTML exportado desde Fusion 360.

Estructura real del export de Fusion 360:
  - table.jobhead      → Job Description y Document Path
  - table.sheet[0]     → resumen global del programa
  - table.sheet[1]     → herramientas, una por cada <tr class="info">
  - table.sheet[2]     → operaciones, una por cada <tr class="info">

Dentro de cada bloque, los datos son pares de elementos hermanos
``.description`` (etiqueta) y ``.value`` (valor).
"""

import re

from bs4 import BeautifulSoup


def _pairs(node):
    """Pares (etiqueta, valor) de un bloque, en orden de documento.

    Las etiquetas se devuelven sin los dos puntos finales.
    """
    out = []
    for desc in node.find_all(class_='description'):
        val = desc.find_next_sibling(class_='value')
        if val is None:
            continue
        label = desc.get_text(strip=True).rstrip(':').strip()
        out.append((label, val.get_text(strip=True)))
    return out


def _get(pairs, label, default=None):
    """Primer valor cuya etiqueta coincide exactamente."""
    for k, v in pairs:
        if k == label:
            return v or default
    return default


def _split_time_pct(raw):
    """'3h:2m:56s(51.1%)' → ('3h 2m 56s', '51.1%')."""
    if not raw:
        return None, None
    m = re.search(r'\(([\d.,]+\s*%)\)', raw)
    pct = m.group(1).replace(' ', '') if m else None
    time = re.sub(r'\([^)]*\)', '', raw).strip()
    time = time.replace(':', ' ').strip()
    return (time or None), pct


def _num(raw):
    """'12mm' → '12' · '636.62mm/min' → '636.62' · '-78.92mm' → '-78.92'."""
    if not raw:
        return None
    m = re.search(r'-?[\d]+(?:\.[\d]+)?', raw.replace(',', '.'))
    return m.group(0) if m else None


def _parse_stock(soup):
    """Dimensiones del bruto: bloque 'Material' con DX/DY/DZ."""
    dims = {}
    for desc in soup.find_all(class_='description'):
        if desc.get_text(strip=True).rstrip(':').strip() != 'Material':
            continue
        # El bloque Material contiene las medidas del bruto en su contenedor
        container = desc.find_parent('table') or desc.parent
        text = container.get_text(' ', strip=True)
        for axis in ('DX', 'DY', 'DZ'):
            m = re.search(rf'{axis}:\s*(-?[\d.]+)\s*mm', text)
            if m:
                dims[f'bruto_{axis.lower()}'] = m.group(1)
        if dims:
            break
    if not dims:  # respaldo: buscar en todo el texto
        text = soup.get_text(' ', strip=True)
        idx = text.find('Material')
        if idx >= 0:
            excerpt = text[idx:idx + 900]
            for axis in ('DX', 'DY', 'DZ'):
                m = re.search(rf'{axis}:\s*(-?[\d.]+)\s*mm', excerpt)
                if m:
                    dims[f'bruto_{axis.lower()}'] = m.group(1)
    return dims


def _parse_tools(sheet):
    """Lista de herramientas desde table.sheet[1]."""
    tools = []
    blocks = [tr for tr in sheet.find_all('tr') if tr.get('class') == ['info']]
    for block in blocks:
        pairs = _pairs(block)
        text = block.get_text(' ', strip=True)

        m = re.search(r'\bT(\d+)\b', text)
        number = m.group(1) if m else str(len(tools) + 1)

        time, pct = _split_time_pct(_get(pairs, 'Estimated Cycle Time'))

        holder = _get(pairs, 'Soporte')
        vendor = _get(pairs, 'Proveedor')
        product = _get(pairs, 'Product')
        holder_full = holder or ''
        if holder and vendor:
            holder_full = f"{holder} ({vendor}"
            holder_full += f", ref. {product})" if product else ")"

        tools.append({
            'number': number,
            'label': f"T{number}",
            'type': _get(pairs, 'Tipo'),
            'diameter': _num(_get(pairs, 'Diámetro')),
            'corner_radius': _num(_get(pairs, 'Radio de esquina')),
            'length': _num(_get(pairs, 'Longitud')),
            'flutes': _get(pairs, 'Flutes'),
            'description': _get(pairs, 'Descripción'),
            'holder': holder,
            'vendor': vendor,
            'product': product,
            'holder_full': holder_full or None,
            'cycle_time': time,
            'percentage': pct,
            'rpm_max': _num(_get(pairs, 'Velocidad máxima de husillo')),
            'feedrate_max': _num(_get(pairs, 'Maximum Feedrate')),
            'z_min': _num(_get(pairs, 'Minimum Z')),
        })
    return tools


def _parse_operations(sheet):
    """Lista de operaciones desde table.sheet[2]."""
    ops = []
    blocks = [tr for tr in sheet.find_all('tr') if tr.get('class') == ['info']]
    for i, block in enumerate(blocks, start=1):
        pairs = _pairs(block)
        text = block.get_text(' ', strip=True)

        # La herramienta de la operación aparece como 'T1 D1 L1' dentro del bloque
        m = re.search(r'\bT(\d+)\s+D\d+', text) or re.search(r'\bT(\d+)\b', text)
        tool = f"T{m.group(1)}" if m else ""

        time, pct = _split_time_pct(_get(pairs, 'Estimated Cycle Time'))

        # 'Descripción' aparece dos veces: la primera es la operación,
        # la segunda pertenece a la herramienta.
        descs = [v for k, v in pairs if k == 'Descripción']

        ops.append({
            'number': i,
            'description': descs[0] if descs else None,
            'strategy': _get(pairs, 'Estrategia'),
            'tool': tool,
            'work_plane': _get(pairs, 'Plano de trabajo'),
            'tolerance': _get(pairs, 'Tolerancia'),
            'stock_to_leave': _get(pairs, 'Sobrematerial'),
            'rpm': _num(_get(pairs, 'Velocidad máxima de husillo')),
            'feedrate': _num(_get(pairs, 'Maximum Feedrate')),
            'z_max': _num(_get(pairs, 'Maximum Z')),
            'z_min': _num(_get(pairs, 'Minimum Z')),
            'coolant': _get(pairs, 'Refrigerante'),
            'cycle_time': time,
            'percentage': pct,
        })
    return ops


def extract_fusion_data(html_content):
    """Extrae los datos del Setup Sheet de Fusion 360.

    Devuelve ``(data, error)``: si el parseo falla, ``data`` es None y
    ``error`` contiene el mensaje.
    """
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        data = {}

        # ---- Cabecera: Job Description y Document Path ----
        jobhead = soup.find('table', class_='jobhead')
        if jobhead:
            jh = _pairs(jobhead)
            data['job_description'] = _get(jh, 'Job Description')
            data['project_ref'] = _get(jh, 'Document Path')

        # Nº de programa: 'Setup Sheet for Program 1001'
        m = re.search(r'Setup Sheet for Program\s+(\S+)', soup.get_text(' ', strip=True))
        if m:
            data['program_number'] = m.group(1)

        sheets = soup.find_all('table', class_='sheet')

        # ---- Resumen global ----
        if sheets:
            s = _pairs(sheets[0])
            data['total_operations'] = _get(s, 'Number Of Operations')
            data['total_tools'] = _get(s, 'Number Of Tools')
            data['z_max'] = _get(s, 'Maximum Z')
            data['z_min'] = _get(s, 'Minimum Z')
            data['feedrate_max'] = _get(s, 'Maximum Feedrate')
            data['rpm_max'] = _get(s, 'Velocidad máxima de husillo')
            data['cutting_distance'] = _get(s, 'Cutting Distance')
            data['rapid_distance'] = _get(s, 'Distancia rápida')
            cycle, _ = _split_time_pct(_get(s, 'Estimated Cycle Time'))
            data['cycle_time'] = cycle

        # ---- Bruto ----
        data.update(_parse_stock(soup))

        # ---- Herramientas y operaciones ----
        data['tools'] = _parse_tools(sheets[1]) if len(sheets) > 1 else []
        data['operations'] = _parse_operations(sheets[2]) if len(sheets) > 2 else []

        # Refrigerante por herramienta: se deduce de las operaciones que la usan
        coolants = {}
        for op in data['operations']:
            if op['tool'] and op['coolant']:
                coolants.setdefault(op['tool'], op['coolant'])
        for tool in data['tools']:
            tool['coolant'] = coolants.get(tool['label'])

        # ---- Imagen de la pieza ----
        img = re.search(r'data:image/png;base64,([A-Za-z0-9+/=]+)', html_content)
        if img:
            data['pieza_image_base64'] = img.group(1)

        return data, None

    except Exception as e:  # noqa: BLE001 — cualquier fallo se reporta a la UI
        return None, f"Error al parsear el Setup Sheet: {e}"


# Campos editables en la pestaña de revisión: (clave, etiqueta, ayuda)
EDITABLE_FIELDS = [
    ('project_ref', 'Referencia del proyecto', 'Ruta del documento en Fusion 360'),
    ('job_description', 'Fase / Configuración', 'Job Description del setup de Fusion 360'),
    ('program_number', 'Nº de programa CNC', 'Número de programa del Setup Sheet'),
    ('total_operations', 'Nº de operaciones', 'Número total de operaciones CAM'),
    ('total_tools', 'Nº de herramientas', 'Herramientas distintas usadas en el programa'),
    ('cycle_time', 'Tiempo de ciclo estimado', 'Tiempo total estimado por Fusion 360'),
    ('rpm_max', 'RPM máx. de husillo', 'Velocidad máxima del husillo'),
    ('feedrate_max', 'Avance máximo', 'Avance máximo programado'),
    ('cutting_distance', 'Distancia de corte', 'Recorrido total en corte'),
    ('rapid_distance', 'Distancia en rápido', 'Recorrido total en movimientos rápidos'),
    ('bruto_dx', 'Bruto DX (mm)', 'Dimensión X del material en bruto'),
    ('bruto_dy', 'Bruto DY (mm)', 'Dimensión Y del material en bruto'),
    ('bruto_dz', 'Bruto DZ (mm)', 'Dimensión Z del material en bruto'),
    ('z_max', 'Z máximo', 'Cota Z superior del programa'),
    ('z_min', 'Z mínimo', 'Cota Z inferior del programa'),
]
