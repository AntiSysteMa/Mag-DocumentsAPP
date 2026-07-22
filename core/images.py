"""Preparación de los renders de herramienta para incrustarlos en el Word.

Una imagen pegada por el usuario puede tener cualquier tamaño y proporción.
Aquí se calcula el encaje dentro de la caja reservada en la tarjeta y se
reescala el archivo, de modo que el script Node solo tenga que colocarla:
así el tamaño original nunca altera la maquetación de la tabla.
"""

import io

from PIL import Image

# Ancho útil de la celda de imagen de la tarjeta (CARD_IMG_W = 2450 DXA menos
# los márgenes de 80 DXA a cada lado; 1440 DXA = 1 pulgada = 96 px).
BOX_W = 150

# La altura de la caja se ajusta al número de filas de la rejilla (2 tarjetas
# por fila) para que la sección de herramientas quepa en una sola página.
# 110 px es lo que ocupa hoy el texto del hueco, así que hasta 4 herramientas
# la maquetación queda idéntica a la actual.
_BOX_H_BY_ROWS = {1: 110, 2: 110, 3: 88}
_BOX_H_MIN = 70


def box_for(tool_count):
    """Caja (ancho, alto) en px según cuántas herramientas tenga el proyecto."""
    rows = max(1, (max(1, tool_count) + 1) // 2)
    return BOX_W, _BOX_H_BY_ROWS.get(rows, _BOX_H_MIN)


# Caja de imagen para las 4 vistas de la Hoja G54 (frontal/superior/lateral/
# isométrica). Calculada a partir del ancho de columna real de la tabla en
# generators/build_g54.js (columna de imagen = 7403 DXA, fila = 3200 DXA,
# márgenes de celda de 60 DXA por lado; conversión 1 DXA = 1/15 px, la misma
# que usa el resto de esta app). Si se cambia el layout de la tabla en el
# script Node, este valor debe recalcularse a la par para que la imagen
# siga cabiendo exacta en la celda sin descuadrar la tabla.
G54_VIEW_BOX = (485, 205)


def box_for_g54_view():
    """Caja (ancho, alto) en px para cada una de las 4 vistas de la Hoja G54."""
    return G54_VIEW_BOX


def fit(img_w, img_h, box_w, box_h):
    """Mayor tamaño que cabe en la caja conservando la proporción."""
    if img_w <= 0 or img_h <= 0:
        return box_w, box_h
    scale = min(box_w / img_w, box_h / img_h)
    return max(1, round(img_w * scale)), max(1, round(img_h * scale))


def prepare(image_bytes, box_w, box_h):
    """Normaliza una imagen para el documento.

    Devuelve ``(png_bytes, width, height)`` donde width/height son las medidas
    finales en px dentro del Word. La imagen se guarda al doble de esas
    medidas para que no se vea pixelada al imprimir, y siempre como PNG.
    """
    with Image.open(io.BytesIO(image_bytes)) as im:
        im = im.convert("RGBA")

        # Un pantallazo suele traer un fondo transparente o negro; sobre el
        # gris de la tarjeta queda mejor componerlo sobre blanco.
        if im.mode == "RGBA":
            bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
            im = Image.alpha_composite(bg, im)
        im = im.convert("RGB")

        w, h = fit(im.width, im.height, box_w, box_h)
        im = im.resize((w * 2, h * 2), Image.LANCZOS)

        out = io.BytesIO()
        im.save(out, format="PNG", optimize=True)
        return out.getvalue(), w, h


def thumbnail(image_bytes, max_w=260):
    """Miniatura para la vista previa en la app."""
    with Image.open(io.BytesIO(image_bytes)) as im:
        im = im.convert("RGB")
        if im.width > max_w:
            h = round(im.height * max_w / im.width)
            im = im.resize((max_w, h), Image.LANCZOS)
        out = io.BytesIO()
        im.save(out, format="PNG")
        return out.getvalue()
