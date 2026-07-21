"""Presets de material: configuraciones fijas predefinidas.

Son constantes (no necesitan base de datos). Cada preset autocompleta los
campos fijos del formulario (material, dureza, máquina). «Custom» no fuerza
ningún valor: deja todo manual.
"""

PRESETS = {
    "D2 62HRC Estándar": {
        "material": "D2",
        "hardness": "62 HRC",
        "machine": "HAAS VF-2 (3 ejes)",
    },
    "Aluminio 7075": {
        "material": "Al 7075",
        "hardness": "—",
        "machine": "HAAS VF-2 (3 ejes)",
    },
    "Custom": {},  # todo manual, no sobrescribe nada
}

PRESET_NAMES = list(PRESETS.keys())
