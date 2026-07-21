"""Ejecución de los generadores Node.js (build4.js … build8.js).

Los scripts Node son la única fuente de verdad de los documentos Word: aquí
solo se orquesta su ejecución. Cada script lee sus imágenes con rutas
relativas y escribe un .docx con nombre fijo, por eso se ejecutan con
``cwd=GENERATORS_DIR`` y luego se recoge el archivo por su nombre conocido.
"""

import base64
import binascii
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import UnidentifiedImageError

from core import images

ROOT_DIR = Path(__file__).resolve().parent.parent
GENERATORS_DIR = ROOT_DIR / "generators"
NODE_MODULES = ROOT_DIR / "node_modules"

# doc_type -> (script, nombre de archivo que escribe el script)
SCRIPT_MAP = {
    'FICHA TALLER': ('build4.js', 'Ficha_Taller_Herramientas_MAG_Industries_v2.docx'),
    'PROPUESTA': ('build5.js', 'Propuesta_Comercial_MAG_Industries_EJEMPLO.docx'),
    'CALIDAD': ('build6.js', 'Reporte_Control_Calidad_MAG_Industries_PLANTILLA.docx'),
    'ONE-PAGER': ('build7.js', 'OnePager_Propuesta_Valor_MAG_Industries.docx'),
    'INFOGRAFÍA': ('build8.js', 'Infografia_Proceso_MAG_Industries.docx'),
    'HOJA G54': ('build_g54.js', 'Hoja_Punto_Cero_G54_MAG_Industries_PLANTILLA.docx'),
}

DOC_DESCRIPTIONS = {
    'FICHA TALLER': 'Ficha técnica de taller con herramientas, operaciones y parámetros de mecanizado.',
    'PROPUESTA': 'Propuesta comercial con alcance, condiciones y presentación de MAG Industries.',
    'CALIDAD': 'Plantilla de reporte de control de calidad dimensional.',
    'ONE-PAGER': 'Resumen de propuesta de valor en una página, con iconografía y contacto.',
    'INFOGRAFÍA': 'Infografía del proceso productivo de principio a fin.',
    'HOJA G54': 'Hoja de punto cero / origen G54: formulario manual, sin Setup Sheet.',
}


def find_node():
    """Localiza el ejecutable de Node.js (Windows, macOS, Linux)."""
    return shutil.which("node") or shutil.which("nodejs")


def node_ready():
    """True si Node.js y las dependencias npm están disponibles."""
    return find_node() is not None and (NODE_MODULES / "docx").exists()


def ensure_node_modules():
    """Instala las dependencias npm si faltan (necesario en Streamlit Cloud).

    Devuelve (ok, mensaje).
    """
    if (NODE_MODULES / "docx").exists():
        return True, "Dependencias Node ya instaladas"
    npm = shutil.which("npm")
    if not npm:
        return False, "npm no está disponible en este entorno"
    result = subprocess.run(
        [npm, "install", "--omit=dev", "--no-audit", "--no-fund"],
        cwd=str(ROOT_DIR), capture_output=True, text=True, timeout=300,
    )
    if result.returncode != 0:
        return False, f"npm install falló: {result.stderr[-500:]}"
    return True, "Dependencias Node instaladas"


def generate_document(doc_type, data, client_name, material, programmer,
                      extra=None, tool_images=None):
    """Ejecuta el script Node.js correspondiente y devuelve el documento.

    Devuelve (docx_bytes, filename, None) en éxito o (None, None, error).
    Los datos del proyecto se exponen al script vía el archivo JSON apuntado
    por la variable de entorno GENERATOR_DATA. ``extra`` son los campos que
    no vienen en el export de Fusion (máquina, variante, revisión…) y
    ``tool_images`` un dict {etiqueta de herramienta: bytes de imagen} con los
    renders que el usuario haya pegado.
    """
    entry = SCRIPT_MAP.get(doc_type)
    if not entry:
        return None, None, f"Tipo de documento no reconocido: {doc_type}"
    script, output_name = entry

    node = find_node()
    if not node:
        return None, None, "Node.js no está instalado o no se encuentra en el PATH"

    temp_data_file = tempfile.NamedTemporaryFile(
        mode='w', suffix='.json', delete=False, encoding='utf-8')
    temp_img_path = None
    tool_img_paths = []
    try:
        payload = {k: v for k, v in data.items() if k != 'pieza_image_base64'}
        payload.update({
            'client_name': client_name,
            'material': material,
            'programmer': programmer,
        })
        payload.update(extra or {})

        # Renders de herramienta: se reescalan aquí para que su tamaño
        # original no pueda descuadrar la tarjeta, y se pasan ya medidos.
        if tool_images:
            tools = [dict(t) for t in (payload.get('tools') or [])]
            box_w, box_h = images.box_for(len(tools))
            for tool in tools:
                raw = tool_images.get(tool.get('label'))
                if not raw:
                    continue
                try:
                    png, w, h = images.prepare(raw, box_w, box_h)
                    tmp = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
                    tmp.write(png)
                    tmp.close()
                    tool_img_paths.append(tmp.name)
                    tool['image_path'] = tmp.name
                    tool['image_w'] = w
                    tool['image_h'] = h
                except (OSError, ValueError, UnidentifiedImageError):
                    pass  # imagen ilegible: la tarjeta mantiene su texto
            payload['tools'] = tools

        # El render de la pieza viaja incrustado en el HTML; los scripts Node
        # necesitan un archivo en disco.
        b64 = data.get('pieza_image_base64')
        if b64:
            try:
                img = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
                img.write(base64.b64decode(b64))
                img.close()
                temp_img_path = img.name
                payload['pieza_image_path'] = temp_img_path
            except (binascii.Error, ValueError, OSError):
                pass  # sin imagen extraída, el script usa su render de ejemplo

        json.dump(payload, temp_data_file, ensure_ascii=False)
        temp_data_file.close()

        output_path = GENERATORS_DIR / output_name
        if output_path.exists():
            output_path.unlink()

        result = subprocess.run(
            [node, script],
            cwd=str(GENERATORS_DIR),
            env={**os.environ, 'GENERATOR_DATA': temp_data_file.name},
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            return None, None, f"Error en generación: {result.stderr[-800:]}"

        if not output_path.exists():
            return None, None, f"El script terminó pero no se encontró {output_name}"

        docx_bytes = output_path.read_bytes()
        output_path.unlink()  # no dejar residuos en el repo
        return docx_bytes, output_name, None

    except subprocess.TimeoutExpired:
        return None, None, "Timeout: la generación tardó demasiado"
    except Exception as e:  # noqa: BLE001 — el error se muestra en la UI
        return None, None, f"Error durante generación: {e}"
    finally:
        for path in [temp_data_file.name, temp_img_path, *tool_img_paths]:
            if path:
                try:
                    os.unlink(path)
                except OSError:
                    pass
