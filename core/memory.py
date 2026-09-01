"""Memoria de último uso, persistente en Supabase.

Guarda los últimos valores usados **por cliente y tipo de documento** y los
recupera para precargar el formulario. Antes la clave era solo el tipo de
documento, así que la ficha de un cliente pisaba la del anterior y cada
proyecto empezaba corrigiendo datos ajenos; ahora cada pareja
(cliente, documento) tiene su propia fila.

Degrada con elegancia: si falta el paquete `supabase`, faltan las credenciales
en `st.secrets`, o la tabla no responde (por ejemplo con una clave publicable,
que RLS bloquea), la memoria queda deshabilitada y la app sigue funcionando con
normalidad. Ninguna operación lanza excepción hacia la UI.

Configuración esperada en `.streamlit/secrets.toml` (local) o en los secrets de
Streamlit Community Cloud:

    [supabase]
    url = "https://<proyecto>.supabase.co"
    key = "sb_secret_..."

La tabla guarda datos reales de clientes, así que tiene RLS activo y cero
políticas: hace falta una clave de servicio (`sb_secret_…`) para leer y
escribir. Con la publicable (`sb_publishable_…`) la memoria queda desactivada.
"""

from datetime import datetime, timezone

import streamlit as st

TABLE = "doc_memory"

# Clave de cliente cuando no hay ninguno seleccionado.
NO_CLIENT_ID = "_default"


@st.cache_resource(show_spinner=False)
def _client():
    """Cliente Supabase cacheado, o None si no se puede crear."""
    try:
        from supabase import create_client
    except ImportError:
        return None
    try:
        cfg = st.secrets["supabase"]
        url = cfg.get("url", "")
        key = cfg.get("key", "")
    except Exception:
        return None
    if not url or not key:
        return None
    try:
        return create_client(url, key)
    except Exception:
        return None


# Fila centinela de la prueba de escritura. Nunca se lee como memoria real.
_PROBE = "_probe"


@st.cache_data(ttl=300, show_spinner=False)
def _table_ok():
    """True si de verdad se puede *escribir* en la tabla.

    Un SELECT no sirve como prueba: con RLS activo y sin políticas devuelve una
    lista vacía y código 200, indistinguible de una tabla vacía. La app diría
    entonces que la memoria funciona mientras cada guardado falla en silencio
    —que es exactamente lo que pasaba—. La única comprobación honesta es
    intentar escribir y borrar una fila centinela.
    """
    sb = _client()
    if not sb:
        return False
    try:
        sb.table(TABLE).upsert(
            {"client_id": _PROBE, "doc_type": _PROBE, "payload": {}},
            on_conflict="client_id,doc_type",
        ).execute()
        sb.table(TABLE).delete().eq("client_id", _PROBE).eq("doc_type", _PROBE).execute()
        return True
    except Exception:
        return False


def available() -> bool:
    """True si la memoria persistente está realmente operativa."""
    return _table_ok()


def storage_label() -> str:
    """Texto para la UI explicando si la memoria se está guardando o no."""
    if _table_ok():
        return "🟢 Memoria sincronizada (se recuerda tu último uso por cliente)."
    if _client():
        return ("🟡 Memoria solo en esta sesión. Supabase responde pero la tabla "
                "`doc_memory` está protegida: hace falta una clave de servicio "
                "(`sb_secret_…`) en los secrets para escribir en ella.")
    return "⚪ Memoria solo en esta sesión (sin conexión a Supabase)."


def load(doc_type: str, client_id: str = NO_CLIENT_ID) -> dict:
    """Últimos valores guardados para (cliente, doc_type).

    Si esa pareja no tiene nada guardado todavía, cae a lo último usado con
    ese tipo de documento sin cliente asignado, para que una ficha nueva no
    arranque completamente en blanco.
    """
    if not _table_ok():
        return {}
    client_id = client_id or NO_CLIENT_ID
    for key in (client_id, NO_CLIENT_ID):
        payload = _fetch(doc_type, key)
        if payload:
            return payload
        if key == NO_CLIENT_ID:
            break
    return {}


def _fetch(doc_type: str, client_id: str) -> dict:
    try:
        res = (
            _client().table(TABLE)
            .select("payload")
            .eq("doc_type", doc_type)
            .eq("client_id", client_id)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        payload = rows[0].get("payload") if rows else None
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def save(doc_type: str, payload: dict, client_id: str = NO_CLIENT_ID) -> bool:
    """Guarda (upsert) los valores usados para (cliente, doc_type)."""
    if not _table_ok():
        return False
    # Solo valores serializables y no vacíos; nunca guardamos bytes de imágenes.
    clean = {
        k: v for k, v in (payload or {}).items()
        if isinstance(v, (str, int, float, bool)) and str(v).strip() != ""
    }
    try:
        _client().table(TABLE).upsert(
            {
                "client_id": client_id or NO_CLIENT_ID,
                "doc_type": doc_type,
                "payload": clean,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="client_id,doc_type",
        ).execute()
        return True
    except Exception:
        return False
