"""Memoria de último uso, persistente en Supabase.

Guarda los últimos valores usados por tipo de documento y los recupera para
precargar el formulario en la siguiente sesión (incluso desde otro
dispositivo). Así el usuario solo cambia lo que difiera del proyecto anterior.

Degrada con elegancia: si falta el paquete `supabase`, faltan las credenciales
en `st.secrets`, o Supabase no responde, la memoria queda deshabilitada y la
app sigue funcionando con normalidad (presets + valores por defecto). Ninguna
operación lanza excepción hacia la UI.

Configuración esperada en `.streamlit/secrets.toml` (local) o en los secrets de
Streamlit Community Cloud:

    [supabase]
    url = "https://<proyecto>.supabase.co"
    key = "sb_publishable_..."
"""

from datetime import datetime, timezone

import streamlit as st

TABLE = "doc_memory"


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


def available() -> bool:
    """True si la memoria persistente está operativa."""
    return _client() is not None


def load(doc_type: str) -> dict:
    """Últimos valores guardados para ``doc_type`` (dict vacío si no hay)."""
    client = _client()
    if not client:
        return {}
    try:
        res = (
            client.table(TABLE)
            .select("payload")
            .eq("doc_type", doc_type)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        payload = rows[0].get("payload") if rows else None
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def save(doc_type: str, payload: dict) -> bool:
    """Guarda (upsert) los valores usados para ``doc_type``. True si tuvo éxito."""
    client = _client()
    if not client:
        return False
    # Solo valores serializables y no vacíos; nunca guardamos bytes de imágenes.
    clean = {
        k: v for k, v in payload.items()
        if isinstance(v, (str, int, float, bool)) and str(v).strip() != ""
    }
    try:
        client.table(TABLE).upsert(
            {
                "doc_type": doc_type,
                "payload": clean,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="doc_type",
        ).execute()
        return True
    except Exception:
        return False
