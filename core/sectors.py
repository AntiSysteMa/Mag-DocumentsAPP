"""Catálogo de sectores: el campo maestro del que cuelgan los valores por defecto.

Elegir el sector de un cliente rellena de golpe tolerancias, plan de control,
nivel de detalle de la ficha, refrigeración, anexos exigidos, textos del
one-pager, bloques de alcance, entregables y casos de referencia.

Son constantes: no necesitan base de datos. La ficha de cliente
(``core/clients.py``) guarda solo lo que ese cliente concreto cambia respecto
al sector; ``defaults_for`` devuelve la capa heredada.
"""

# Sector por defecto cuando un cliente no tiene ninguno asignado.
DEFAULT_SECTOR = "general"

SECTORS = {
    "general": {
        "label": "Taller general / subcontratación",
        "tolerance": "Según DIN ISO 2768-mK, salvo indicación específica en plano",
        "ficha_detail": "estandar",
        "coolant": "Emulsión 6 %",
        "qc": {
            "dimension_count": 5,
            "critical_count": 2,
            "instruments": ["Calibre", "Micrómetro", "Reloj comparador"],
        },
        "annexes": ["Ficha de taller", "Informe dimensional"],
        "signatures": ["Programador — MAG Industries", "Responsable de taller", "Cliente"],
        "onepager": {
            "tagline1": "Ingeniería de precisión.",
            "tagline2": "Resultados que se notan.",
            "subhead": (
                "Sumamos capacidad de oficina técnica a tu equipo: rediseños, optimización "
                "de material, programación CNC, documentación técnica y automatización de "
                "tareas repetitivas — con la maquinaria y el equipo que ya tienes."
            ),
            "ribbon": "ENFOQUE 100% EN RESULTADOS MEDIBLES — NO FACTURAMOS HORAS",
            "cards": [
                ("icon_design.png", "INGENIERÍA Y REDISEÑO",
                 "Rediseño de piezas y ensambles, optimización de material y cambios por "
                 "modificaciones internas de producto."),
                ("icon_gear.png", "PROGRAMACIÓN Y PRODUCCIÓN",
                 "Programación CNC y optimización de procesos para cumplir plazos y "
                 "resolver cuellos de botella."),
                ("icon_doc.png", "DOCUMENTACIÓN TÉCNICA",
                 "Documentación de proceso y calidad para proyectos internos o externos, "
                 "lista para auditoría o cliente."),
                ("icon_automation.png", "AUTOMATIZACIÓN Y APPS A MEDIDA",
                 "Automatizamos tareas repetitivas y creamos herramientas propias de "
                 "gestión documental para tu equipo."),
            ],
            "steps": [
                "Nos cuentas la pieza o el proceso que quieres resolver",
                "Diseñamos la solución a medida, con plazos y resultados claros",
                "Tu equipo la aplica sin fricciones — con soporte nuestro si lo necesitas",
            ],
            "cta_title": "¿Hablamos de tu próximo proyecto?",
            "cta_sub": "Hablemos — sin compromiso.",
        },
        "scope_blocks": [
            "Programación CAM completa con simulación de colisiones.",
            "Mecanizado de desbaste y acabado según plano.",
            "Control dimensional final con reporte de calidad.",
        ],
        "deliverables": [
            "Programación CAM completa y verificada (simulación de colisiones incluida)",
            "Mecanizado de desbaste y acabado de las piezas según especificación",
            "Ficha de taller y hoja de herramientas de cada fase",
            "Control dimensional final bajo plano, con reporte de calidad",
            "Piezas terminadas, limpias y embaladas para entrega",
        ],
        "references": [
            ("Serie de bancadas mecanizadas",
             "Reducción del 30 % en tiempo de ciclo tras replantear la estrategia de desbaste."),
            ("Utillaje de amarre a medida",
             "Diseño y fabricación de utillaje que eliminó una segunda sujeción."),
            ("Documentación de proceso para auditoría",
             "Fichas de taller y hojas de punto cero de una familia completa de piezas."),
        ],
    },

    "molde_matriz": {
        "label": "Molde y matricería",
        "tolerance": "±0,02 mm en superficies de cierre; resto según DIN ISO 2768-fH",
        "ficha_detail": "extendida",
        "coolant": "Emulsión 6 %",
        "qc": {
            "dimension_count": 10,
            "critical_count": 4,
            "instruments": ["Micrómetro", "Reloj comparador", "Rugosímetro", "MMC"],
        },
        "annexes": ["Informe dimensional", "Certificado de material", "Informe de rugosidad"],
        "signatures": ["Programador — MAG Industries", "Responsable de matricería",
                       "Calidad del cliente"],
        "onepager": {
            "tagline1": "Precisión de cierre.",
            "tagline2": "Moldes que entran a la primera.",
            "subhead": (
                "Trabajamos con matricerías que buscan que la primera prueba de cierre sea "
                "la definitiva: electrodos, postizos y cavidades programados al detalle "
                "— con tu maquinaria y tu equipo."
            ),
            "ribbon": "TOLERANCIAS DE CIERRE ±0,02 mm — VERIFICADAS ANTES DE ENTREGAR",
            "cards": [
                ("icon_design.png", "REDISEÑO DE POSTIZOS Y CAVIDADES",
                 "Adaptación de postizos, cambios de última hora en cavidad y optimización "
                 "del bruto para acero tratado."),
                ("icon_gear.png", "PROGRAMACIÓN DE ALTA DUREZA",
                 "Estrategias para 54–62 HRC: control de voladizo, entrada suave y "
                 "acabados que evitan el repaso manual."),
                ("icon_quality.png", "CONTROL DE CIERRE Y RUGOSIDAD",
                 "Verificación dimensional de superficies de cierre y control de Ra en "
                 "zonas de acabado, con reporte."),
                ("icon_doc.png", "TRAZABILIDAD DE ELECTRODOS",
                 "Documentación de proceso por electrodo y fase, lista para archivar o "
                 "entregar al cliente final."),
            ],
            "steps": [
                "Nos pasas el molde o el postizo y la tolerancia de cierre que necesitas",
                "Programamos y verificamos en simulación antes de tocar el acero",
                "Recibes la pieza con su informe dimensional de las cotas de cierre",
            ],
            "cta_title": "¿Tienes un cierre entre manos?",
            "cta_sub": "Cuéntanos el cierre que necesitas.",
        },
        "scope_blocks": [
            "Programación CAM para acero tratado (54–62 HRC) con control de voladizo.",
            "Mecanizado de cavidad y postizos con acabado listo para pulido.",
            "Verificación dimensional de superficies de cierre con reporte.",
            "Control de rugosidad Ra en zonas de acabado.",
        ],
        "deliverables": [
            "Programación CAM verificada para acero tratado, con simulación de colisiones",
            "Mecanizado de desbaste y acabado de cavidad y postizos",
            "Informe dimensional de las cotas de cierre críticas",
            "Control de rugosidad Ra en las superficies de acabado",
            "Documentación de proceso por electrodo y fase",
        ],
        "references": [
            ("Postizos de matriz progresiva",
             "Reposición urgente de 4 postizos en D2 62 HRC con cierre verificado a ±0,02 mm."),
            ("Cavidad de molde de inyección",
             "Reprogramación completa del acabado: se eliminó el repaso manual de pulido."),
            ("Familia de electrodos de grafito",
             "Programación y documentación de 18 electrodos con trazabilidad por fase."),
        ],
    },

    "aeronautico": {
        "label": "Aeronáutico",
        "tolerance": "±0,02 mm salvo cota crítica acotada en plano; GD&T según norma del cliente",
        "ficha_detail": "extendida",
        "coolant": "Emulsión 6 %",
        "qc": {
            "dimension_count": 12,
            "critical_count": 5,
            "instruments": ["MMC", "Micrómetro", "Rugosímetro", "Calibre de profundidad",
                            "Durómetro"],
        },
        "annexes": [
            "Certificado de material con colada",
            "Informe dimensional completo",
            "Trazabilidad de lote",
            "Certificado de tratamiento térmico",
        ],
        "signatures": ["Inspector", "Responsable de Calidad — MAG Industries",
                       "Calidad del cliente", "Aprobación final"],
        "onepager": {
            "tagline1": "Trazabilidad completa.",
            "tagline2": "Cota a cota, lote a lote.",
            "subhead": (
                "Programación y documentación para proveedores del sector aeronáutico: "
                "cada pieza sale con su informe dimensional, su trazabilidad de lote y "
                "un expediente listo para auditoría."
            ),
            "ribbon": "DOCUMENTACIÓN LISTA PARA AUDITORÍA — TRAZABILIDAD DE LOTE COMPLETA",
            "cards": [
                ("icon_quality.png", "CONTROL DIMENSIONAL COMPLETO",
                 "Plan de control con cotas críticas identificadas, instrumento declarado "
                 "y resultado por cota."),
                ("icon_doc.png", "EXPEDIENTE PARA AUDITORÍA",
                 "Certificado de material con colada, trazabilidad de lote y registro de "
                 "tratamiento en un único expediente."),
                ("icon_gear.png", "PROGRAMACIÓN DE ALEACIONES EXIGENTES",
                 "Titanio, inconel y aluminio aeronáutico: estrategias que controlan el "
                 "calor y la distorsión de la pieza."),
                ("icon_design.png", "INGENIERÍA DE PROCESO",
                 "Definición de fases, utillaje y secuencia de amarre para mantener la "
                 "cota crítica bajo control."),
            ],
            "steps": [
                "Nos pasas el plano con las cotas críticas y la norma que aplica",
                "Definimos el plan de control y la secuencia de fases antes de mecanizar",
                "Recibes la pieza con su expediente dimensional y de trazabilidad completo",
            ],
            "cta_title": "¿Preparas un expediente de calidad?",
            "cta_sub": "Hablemos de tu plan de control.",
        },
        "scope_blocks": [
            "Definición del plan de control dimensional con cotas críticas del plano.",
            "Programación CAM para aleaciones aeronáuticas con control térmico.",
            "Informe dimensional completo con instrumento declarado por cota.",
            "Trazabilidad de lote y certificado de material con número de colada.",
        ],
        "deliverables": [
            "Plan de control dimensional acordado antes de iniciar fabricación",
            "Programación CAM verificada con simulación de colisiones",
            "Mecanizado por fases con control de distorsión",
            "Informe dimensional completo, cota a cota, con instrumento declarado",
            "Certificado de material con colada y trazabilidad de lote",
        ],
        "references": [
            ("Herrajes estructurales en Ti-6Al-4V",
             "Serie con informe dimensional de 14 cotas y trazabilidad de colada."),
            ("Utillaje de verificación",
             "Diseño y fabricación de utillaje de control para una línea de montaje."),
            ("Soportes en aluminio 7075",
             "Reducción de distorsión reordenando las fases de amarre y el alivio de tensiones."),
        ],
    },

    "automocion": {
        "label": "Automoción",
        "tolerance": "±0,05 mm; cotas funcionales según plano y plan de control",
        "ficha_detail": "estandar",
        "coolant": "Emulsión 6 %",
        "qc": {
            "dimension_count": 8,
            "critical_count": 3,
            "instruments": ["Calibre", "Micrómetro", "MMC", "Galga de verificación"],
        },
        "annexes": ["Informe dimensional", "Certificado de material",
                    "Registro de primera pieza (FAI)"],
        "signatures": ["Inspector", "Responsable de Calidad — MAG Industries",
                       "Calidad del cliente"],
        "onepager": {
            "tagline1": "Series sin sorpresas.",
            "tagline2": "Repetibilidad en cada lote.",
            "subhead": (
                "Programación y utillaje para series de automoción: procesos estables, "
                "tiempos de ciclo optimizados y control de primera pieza — para que el "
                "lote 100 salga igual que el lote 1."
            ),
            "ribbon": "PROCESOS ESTABLES Y REPETIBLES — TIEMPO DE CICLO OPTIMIZADO",
            "cards": [
                ("icon_gear.png", "OPTIMIZACIÓN DE TIEMPO DE CICLO",
                 "Replanteamos estrategia y herramienta para recortar minutos por pieza "
                 "sin perder cota."),
                ("icon_machining.png", "UTILLAJE Y AMARRE PARA SERIE",
                 "Amarres que reducen manipulación y hacen repetible el posicionamiento "
                 "entre piezas."),
                ("icon_quality.png", "CONTROL DE PRIMERA PIEZA",
                 "Registro de primera pieza y plan de control para validar el proceso "
                 "antes de lanzar la serie."),
                ("icon_delivery.png", "CAPACIDAD DE PICO",
                 "Absorbemos picos de demanda con tu maquinaria cuando tu equipo no "
                 "llega al plazo."),
            ],
            "steps": [
                "Nos cuentas la pieza, el volumen y el tiempo de ciclo objetivo",
                "Optimizamos proceso y utillaje, y validamos con primera pieza",
                "Tu equipo lanza la serie con un proceso ya estabilizado",
            ],
            "cta_title": "¿Preparas una nueva serie?",
            "cta_sub": "Hablemos de tu tiempo de ciclo.",
        },
        "scope_blocks": [
            "Optimización de tiempo de ciclo sobre el proceso actual.",
            "Diseño de utillaje de amarre para producción en serie.",
            "Validación con registro de primera pieza (FAI).",
            "Control dimensional de cotas funcionales.",
        ],
        "deliverables": [
            "Programación CAM optimizada para tiempo de ciclo",
            "Utillaje de amarre diseñado para serie",
            "Registro de primera pieza (FAI) con las cotas funcionales",
            "Plan de control dimensional para la serie",
            "Documentación de proceso para el puesto de trabajo",
        ],
        "references": [
            ("Soporte de motor en serie",
             "Recorte de 4 minutos por pieza replanteando desbaste y utillaje."),
            ("Utillaje de amarre múltiple",
             "Amarre de 4 piezas por operación: una sola puesta a punto por lote."),
            ("Validación de primera pieza",
             "Plan de control y FAI para una familia de 6 referencias."),
        ],
    },

    "medico": {
        "label": "Médico / implantes",
        "tolerance": "±0,01 mm en superficies funcionales; acabado Ra ≤ 0,4 µm",
        "ficha_detail": "extendida",
        "coolant": "Emulsión 6 %",
        "qc": {
            "dimension_count": 12,
            "critical_count": 6,
            "instruments": ["MMC", "Micrómetro", "Rugosímetro", "Proyector de perfiles"],
        },
        "annexes": [
            "Certificado de material con colada",
            "Informe dimensional completo",
            "Trazabilidad de lote",
            "Registro de limpieza y acabado superficial",
        ],
        "signatures": ["Inspector", "Responsable de Calidad — MAG Industries",
                       "Calidad del cliente", "Aprobación final"],
        "onepager": {
            "tagline1": "Acabado que se mide.",
            "tagline2": "Trazabilidad que se demuestra.",
            "subhead": (
                "Mecanizado y documentación para instrumental e implantes: superficies "
                "funcionales bajo micra, acabado controlado y trazabilidad completa de "
                "material y lote."
            ),
            "ribbon": "SUPERFICIES FUNCIONALES ±0,01 mm — ACABADO Ra ≤ 0,4 µm",
            "cards": [
                ("icon_quality.png", "CONTROL BAJO MICRA",
                 "Verificación de superficies funcionales con MMC y proyector, cota a "
                 "cota y con instrumento declarado."),
                ("icon_machining.png", "ACABADO SUPERFICIAL CONTROLADO",
                 "Estrategias de acabado para Ra ≤ 0,4 µm en titanio y aceros "
                 "inoxidables de grado médico."),
                ("icon_doc.png", "TRAZABILIDAD DE MATERIAL Y LOTE",
                 "Certificado con colada, registro de lote y expediente completo por "
                 "número de serie."),
                ("icon_design.png", "INGENIERÍA DE INSTRUMENTAL",
                 "Rediseño de instrumental y utillaje para hacer fabricable lo que el "
                 "plano pide."),
            ],
            "steps": [
                "Nos pasas el plano con las superficies funcionales y el acabado exigido",
                "Definimos proceso, acabado y plan de control antes de mecanizar",
                "Recibes la pieza con su expediente dimensional y de trazabilidad",
            ],
            "cta_title": "¿Instrumental con acabado exigente?",
            "cta_sub": "Hablemos de tus superficies funcionales.",
        },
        "scope_blocks": [
            "Definición de proceso para superficies funcionales bajo micra.",
            "Estrategia de acabado para Ra ≤ 0,4 µm.",
            "Informe dimensional completo con MMC.",
            "Trazabilidad de material y lote por número de serie.",
        ],
        "deliverables": [
            "Plan de control dimensional de superficies funcionales",
            "Programación CAM con estrategia de acabado controlado",
            "Informe dimensional completo verificado en MMC",
            "Registro de rugosidad de las superficies de acabado",
            "Certificado de material con colada y trazabilidad de lote",
        ],
        "references": [
            ("Instrumental quirúrgico en inox",
             "Serie con acabado Ra 0,3 µm verificado y trazabilidad por número de serie."),
            ("Guías de corte a medida",
             "Rediseño para hacer fabricable la geometría original del plano."),
            ("Componentes en titanio grado 5",
             "Proceso con control de distorsión y expediente dimensional completo."),
        ],
    },

    "prototipado": {
        "label": "Prototipado e I+D",
        "tolerance": "Según DIN ISO 2768-m; cota crítica acordada por pieza",
        "ficha_detail": "compacta",
        "coolant": "Emulsión 6 %",
        "qc": {
            "dimension_count": 4,
            "critical_count": 1,
            "instruments": ["Calibre", "Micrómetro"],
        },
        "annexes": ["Informe dimensional básico"],
        "signatures": ["Programador — MAG Industries", "Cliente"],
        "onepager": {
            "tagline1": "De la idea a la pieza.",
            "tagline2": "En días, no en semanas.",
            "subhead": (
                "Prototipos y series cortas para equipos de I+D: convertimos el modelo "
                "en pieza fabricable, iteramos contigo y te devolvemos el cambio en "
                "días — sin montar un proyecto para cada iteración."
            ),
            "ribbon": "ITERACIÓN RÁPIDA — DE MODELO A PIEZA EN DÍAS",
            "cards": [
                ("icon_design.png", "HACEMOS FABRICABLE TU MODELO",
                 "Revisión del diseño para producción: radios, salidas, espesores y "
                 "accesos de herramienta."),
                ("icon_delivery.png", "ITERACIÓN RÁPIDA",
                 "Cambios de una versión a la siguiente sin rehacer la programación "
                 "desde cero."),
                ("icon_receive.png", "SERIES CORTAS",
                 "De la pieza única a la serie de validación, con el mismo proceso y "
                 "sin utillaje caro."),
                ("icon_automation.png", "AUTOMATIZACIÓN DE TAREAS",
                 "Herramientas a medida para que tu equipo deje de repetir trabajo "
                 "manual entre iteraciones."),
            ],
            "steps": [
                "Nos mandas el modelo, aunque no esté cerrado del todo",
                "Te decimos qué hay que tocar para que sea fabricable, y lo programamos",
                "Recibes la pieza y, si hay cambios, iteramos sobre lo ya hecho",
            ],
            "cta_title": "¿Tienes un modelo listo para probar?",
            "cta_sub": "Mándanos el modelo y lo vemos.",
        },
        "scope_blocks": [
            "Revisión de fabricabilidad del modelo con propuesta de cambios.",
            "Programación CAM y mecanizado de prototipo.",
            "Iteración sobre la versión anterior sin reprogramar desde cero.",
        ],
        "deliverables": [
            "Informe de fabricabilidad con los cambios propuestos",
            "Programación CAM y mecanizado del prototipo",
            "Control dimensional de la cota crítica acordada",
            "Pieza terminada lista para validación funcional",
        ],
        "references": [
            ("Prototipo funcional en 4 días",
             "Del modelo recibido a la pieza validada, con dos iteraciones de diseño."),
            ("Serie corta de validación",
             "20 unidades sin utillaje dedicado, aprovechando el amarre estándar."),
            ("Rediseño para fabricabilidad",
             "Ajuste de radios y accesos que hizo mecanizable el diseño original."),
        ],
    },
}

SECTOR_KEYS = list(SECTORS.keys())
SECTOR_LABELS = {k: s["label"] for k, s in SECTORS.items()}

# Niveles de detalle de la FICHA TALLER (idea 6).
FICHA_DETAIL_LEVELS = {
    "compacta": "Compacta — una hoja, solo parámetros",
    "estandar": "Estándar — como hasta ahora",
    "extendida": "Extendida — con renders, voladizos y avisos",
}


def get(sector_key):
    """Definición del sector, cayendo al genérico si la clave no existe."""
    return SECTORS.get(sector_key) or SECTORS[DEFAULT_SECTOR]


def label(sector_key):
    """Nombre legible del sector."""
    return get(sector_key)["label"]


# Campos del perfil de cliente que el sector precarga. La ficha del cliente
# solo guarda lo que se desvía de estos valores.
INHERITED_FIELDS = (
    "tolerance", "ficha_detail", "coolant", "qc", "annexes", "signatures",
    "scope_blocks", "deliverables", "onepager", "references",
)


def _copy(value):
    if isinstance(value, list):
        return list(value)
    if isinstance(value, dict):
        return {k: _copy(v) for k, v in value.items()}
    return value


def defaults_for(sector_key):
    """Valores por defecto que hereda un cliente de este sector.

    Devuelve copias, así que quien lo reciba puede editarlas sin tocar las
    constantes del módulo.
    """
    s = get(sector_key)
    return {field: _copy(s.get(field)) for field in INHERITED_FIELDS}
