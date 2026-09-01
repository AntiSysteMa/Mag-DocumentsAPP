"""Fichas de cliente: la pieza de la que cuelga toda la personalización.

Cada cliente guarda su sector y solo aquello en lo que se desvía de los valores
del sector (``core/sectors.py``). ``effective()`` fusiona ambas capas y es lo
que consumen la UI y los generadores.

Persistencia en dos capas, igual de tolerante a fallos que ``core/memory.py``:

1. **Supabase** (tabla ``clients``) si hay credenciales y la tabla responde.
   Es lo que permite tener las mismas fichas desde otro dispositivo.
2. **Archivo local** ``data/clients.json`` como respaldo. La app sigue siendo
   plenamente utilizable sin conexión; solo se pierde la sincronización.

La tabla ``clients`` contiene nombres reales de clientes, así que en Supabase
tiene RLS activo y cero políticas: solo se puede leer y escribir con una clave
de servicio (``sb_secret_…``). Con la clave publicable (``sb_publishable_…``)
las operaciones fallan y el módulo cae al archivo local, sin romper nada.
"""

import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import streamlit as st

from core import sectors

TABLE = "clients"

ROOT_DIR = Path(__file__).resolve().parent.parent
LOCAL_DIR = ROOT_DIR / "data"
LOCAL_FILE = LOCAL_DIR / "clients.json"

# Cliente implícito cuando no hay ninguno seleccionado. Mantiene funcionando
# la memoria de último uso y los valores por defecto sin obligar a crear ficha.
NO_CLIENT_ID = "_default"

# Campos propios del cliente (los que NO hereda del sector).
CLIENT_FIELDS = {
    "contact_name": "",
    "contact_email": "",
    # Idea 8 — parque de máquinas: [{"name","taper","postprocessor"}]
    "machines": [],
    # Idea 10 — convenciones de origen y programa
    "work_offset": "G54",
    "program_range": "",
    "fixture_naming": "",
    # Idea 11 — co-branding: PNG del cliente en base64
    "logo_b64": "",
    # Idea 12 — numeración documental
    "doc_code_template": "",
    "doc_code_seq": 0,
    # Idea 15 — nombre de archivo
    "filename_template": "",
    # Idea 16 — tarifa y condiciones
    "rate_hour": "",
    "discount_pct": "",
    "payment_terms": "",
    "offer_validity": "",
}


def _now():
    return datetime.now(timezone.utc).isoformat()


def slugify(text):
    """'Talleres Norte S.A.' → 'talleres-norte-s-a' (id estable y legible)."""
    norm = unicodedata.normalize("NFKD", str(text or ""))
    norm = "".join(c for c in norm if not unicodedata.combining(c))
    norm = re.sub(r"[^a-zA-Z0-9]+", "-", norm).strip("-").lower()
    return norm[:60] or "cliente"


def blank_profile(sector_key=sectors.DEFAULT_SECTOR):
    """Perfil nuevo: valores del sector + campos propios vacíos."""
    profile = sectors.defaults_for(sector_key)
    for key, default in CLIENT_FIELDS.items():
        profile[key] = list(default) if isinstance(default, list) else default
    return profile


def effective(client):
    """Perfil final del cliente: sector por debajo, ficha del cliente encima.

    Acepta ``None`` (sin cliente seleccionado) y devuelve entonces los valores
    del sector genérico, para que la app funcione igual sin ficha.
    """
    sector_key = (client or {}).get("sector") or sectors.DEFAULT_SECTOR
    merged = blank_profile(sector_key)
    stored = (client or {}).get("profile") or {}
    for key, value in stored.items():
        # Un valor vacío en la ficha no debe pisar el del sector.
        if value in (None, "", [], {}):
            continue
        merged[key] = value
    merged["sector"] = sector_key
    merged["sector_label"] = sectors.label(sector_key)
    merged["client_id"] = (client or {}).get("id") or NO_CLIENT_ID
    merged["client_name"] = (client or {}).get("name") or ""
    return merged


# ---------------------------------------------------------------- Supabase

@st.cache_resource(show_spinner=False)
def _client():
    """Cliente Supabase cacheado, o None si no se puede crear."""
    try:
        from supabase import create_client
    except ImportError:
        return None
    try:
        cfg = st.secrets["supabase"]
        url, key = cfg.get("url", ""), cfg.get("key", "")
    except Exception:
        return None
    if not url or not key:
        return None
    try:
        return create_client(url, key)
    except Exception:
        return None


# Ficha centinela de la prueba de escritura. Se filtra al listar.
_PROBE = "_probe"


@st.cache_data(ttl=300, show_spinner=False)
def _remote_ok():
    """True si de verdad se puede *escribir* en la tabla ``clients``.

    Un SELECT no distingue «tabla vacía» de «RLS me la está bloqueando»: con
    la clave publicable devuelve una lista vacía y código 200. Así que la
    comprobación es escribir y borrar una ficha centinela; si falla, las
    fichas se guardan en el archivo local y la app sigue funcionando.
    """
    sb = _client()
    if not sb:
        return False
    try:
        sb.table(TABLE).upsert(
            {"id": _PROBE, "name": _PROBE, "sector": sectors.DEFAULT_SECTOR,
             "profile": {}},
            on_conflict="id",
        ).execute()
        sb.table(TABLE).delete().eq("id", _PROBE).execute()
        return True
    except Exception:
        return False


def available():
    """True si las fichas se sincronizan contra Supabase."""
    return _remote_ok()


def storage_label():
    """Texto corto para la UI explicando dónde viven las fichas."""
    if _remote_ok():
        return "🟢 Fichas sincronizadas en Supabase (disponibles desde otro dispositivo)."
    if _client():
        return ("🟡 Fichas guardadas solo en este equipo. Supabase responde pero la tabla "
                "`clients` está protegida: añade una clave de servicio "
                "(`sb_secret_…`) en los secrets para sincronizarlas.")
    return "⚪ Fichas guardadas solo en este equipo (sin conexión a Supabase)."


# ------------------------------------------------------------- Local (JSON)

def _local_load():
    try:
        with LOCAL_FILE.open(encoding="utf-8") as fh:
            data = json.load(fh)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def _local_save(store):
    try:
        LOCAL_DIR.mkdir(parents=True, exist_ok=True)
        tmp = LOCAL_FILE.with_suffix(".json.tmp")
        with tmp.open("w", encoding="utf-8") as fh:
            json.dump(store, fh, ensure_ascii=False, indent=2)
        tmp.replace(LOCAL_FILE)
        return True
    except OSError:
        return False


# ------------------------------------------------------------------- CRUD

def list_clients():
    """Todas las fichas ordenadas por nombre. Lista vacía si no hay ninguna."""
    if _remote_ok():
        try:
            res = _client().table(TABLE).select("*").execute()
            rows = [r for r in (res.data or []) if r.get("id") != _PROBE]
            return sorted(rows, key=lambda r: (r.get("name") or "").lower())
        except Exception:
            pass  # cae al respaldo local
    rows = [r for r in _local_load().values() if r.get("id") != _PROBE]
    return sorted(rows, key=lambda r: (r.get("name") or "").lower())


def get_client(client_id):
    """Ficha por id, o None si no existe o no hay id."""
    if not client_id or client_id == NO_CLIENT_ID:
        return None
    for row in list_clients():
        if row.get("id") == client_id:
            return row
    return None


def save_client(client_id, name, sector, profile):
    """Crea o actualiza una ficha. Devuelve (ok, mensaje)."""
    name = (name or "").strip()
    if not name:
        return False, "La ficha necesita un nombre de cliente."
    record = {
        "id": client_id or slugify(name),
        "name": name,
        "sector": sector or sectors.DEFAULT_SECTOR,
        "profile": profile or {},
        "updated_at": _now(),
    }
    if _remote_ok():
        try:
            _client().table(TABLE).upsert(record, on_conflict="id").execute()
            _remote_ok.clear()
            return True, "Ficha guardada y sincronizada."
        except Exception as exc:
            return False, f"No se pudo guardar en Supabase: {exc}"
    store = _local_load()
    store[record["id"]] = record
    if _local_save(store):
        return True, "Ficha guardada en este equipo."
    return False, "No se pudo escribir el archivo de fichas."


def delete_client(client_id):
    """Borra una ficha. Devuelve (ok, mensaje)."""
    if not client_id or client_id == NO_CLIENT_ID:
        return False, "No hay ficha que borrar."
    if _remote_ok():
        try:
            _client().table(TABLE).delete().eq("id", client_id).execute()
            return True, "Ficha borrada."
        except Exception as exc:
            return False, f"No se pudo borrar en Supabase: {exc}"
    store = _local_load()
    if store.pop(client_id, None) is None:
        return False, "Esa ficha ya no existe."
    if _local_save(store):
        return True, "Ficha borrada."
    return False, "No se pudo escribir el archivo de fichas."


# ------------------------------------- Idea 12: numeración documental propia

# Marcadores admitidos en las plantillas de código y de nombre de archivo.
_TOKEN_RE = re.compile(r"\{(\w+)(?::(\d+)d)?\}")


def _render_template(template, values):
    """Sustituye solo los marcadores conocidos; deja intacto lo que no reconoce.

    Admite relleno con ceros al estilo ``{seq:03d}``. No usa ``str.format``
    para que una plantilla escrita a mano no pueda provocar una excepción ni
    alcanzar atributos de los objetos.
    """
    def repl(match):
        key, width = match.group(1), match.group(2)
        if key not in values:
            return match.group(0)
        value = values[key]
        if width:
            try:
                return str(int(value)).zfill(int(width))
            except (TypeError, ValueError):
                return str(value)
        return str(value)

    return _TOKEN_RE.sub(repl, str(template or "")).strip()


DOC_CODE_TOKENS = "{year} {month} {day} {seq} {seq:03d} {cliente} {doc} {ref} {rev}"


def peek_doc_code(client, doc_type, project_ref="", revision=""):
    """Siguiente código documental del cliente, sin consumir el contador."""
    profile = effective(client)
    template = profile.get("doc_code_template") or ""
    if not template:
        return ""
    now = datetime.now()
    seq = int(profile.get("doc_code_seq") or 0) + 1
    return _render_template(template, {
        "year": now.year,
        "month": f"{now.month:02d}",
        "day": f"{now.day:02d}",
        "seq": seq,
        "cliente": slugify((client or {}).get("name", "")).upper()[:12],
        "doc": slugify(doc_type).upper()[:12],
        "ref": project_ref or "",
        "rev": revision or "",
    })


def consume_doc_code(client, doc_type, project_ref="", revision=""):
    """Devuelve el código y avanza el contador de la ficha.

    Si la ficha no define plantilla, devuelve "" y no toca nada.
    """
    if not client:
        return ""
    code = peek_doc_code(client, doc_type, project_ref, revision)
    if not code:
        return ""
    profile = dict(client.get("profile") or {})
    profile["doc_code_seq"] = int(effective(client).get("doc_code_seq") or 0) + 1
    save_client(client.get("id"), client.get("name"), client.get("sector"), profile)
    client["profile"] = profile  # que el objeto en memoria no quede desfasado
    return code


# ------------------------------ Idea 15: nombre de archivo propio del cliente

FILENAME_TOKENS = "{doc} {cliente} {ref} {rev} {codigo} {fecha} {sector}"


def render_filename(client, doc_type, project_ref="", revision="", doc_code=""):
    """Nombre de archivo según la plantilla del cliente, o "" si no tiene."""
    profile = effective(client)
    template = profile.get("filename_template") or ""
    if not template:
        return ""
    now = datetime.now()
    return _render_template(template, {
        "doc": doc_type or "",
        "cliente": (client or {}).get("name", ""),
        "ref": project_ref or "",
        "rev": revision or "",
        "codigo": doc_code or "",
        "fecha": now.strftime("%Y-%m-%d"),
        "sector": profile.get("sector_label", ""),
    })
