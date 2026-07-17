"""Tema visual MAG Industries: CSS puro inyectado en Streamlit.

Paleta corporativa:
  Navy    #1B2A41   (principal)
  Orange  #E07B39   (acento)
  Steel   #5A6B7A   (secundario)
"""

MAG_CSS = """
<style>
/* ============ Variables de marca ============ */
:root {
    --mag-navy: #1B2A41;
    --mag-navy-light: #2A3F5F;
    --mag-orange: #E07B39;
    --mag-orange-dark: #C4652A;
    --mag-steel: #5A6B7A;
    --mag-bg: #F6F8FA;
    --mag-card: #FFFFFF;
    --mag-ok: #1B6E3C;
    --mag-warn: #B00020;
    --mag-border: #E2E8F0;
}

/* ============ Tipografía y base ============ */
html, body, [class*="css"] {
    font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto,
                 "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { color: var(--mag-navy); letter-spacing: -0.02em; }

.block-container {
    max-width: 1200px;
    padding-top: 1.2rem;
    animation: mag-fade-in 0.45s ease-out;
}

@keyframes mag-fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes mag-slide-in {
    from { opacity: 0; transform: translateX(-14px); }
    to   { opacity: 1; transform: translateX(0); }
}
@keyframes mag-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(224, 123, 57, 0.35); }
    50%      { box-shadow: 0 0 0 8px rgba(224, 123, 57, 0); }
}
@keyframes mag-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
}

/* ============ Header corporativo ============ */
.mag-header {
    background: linear-gradient(120deg, var(--mag-navy) 0%, var(--mag-navy-light) 70%);
    border-radius: 14px;
    padding: 1.6rem 1.8rem;
    margin-bottom: 1.2rem;
    color: #fff;
    position: relative;
    overflow: hidden;
    animation: mag-fade-in 0.5s ease-out;
}
.mag-header::after {
    content: "";
    position: absolute;
    right: -40px; top: -40px;
    width: 180px; height: 180px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(224,123,57,0.35), transparent 70%);
}
.mag-header h1 {
    color: #fff; margin: 0; font-size: 1.6rem; font-weight: 700;
}
.mag-header .mag-tagline {
    color: #C9D4E0; margin-top: 0.3rem; font-size: 0.95rem;
}
.mag-header .mag-badge {
    display: inline-block;
    background: var(--mag-orange);
    color: #fff;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
}

/* ============ Pestañas ============ */
.stTabs [data-baseweb="tab-list"] {
    gap: 6px;
    border-bottom: 2px solid var(--mag-border);
}
.stTabs [data-baseweb="tab"] {
    border-radius: 10px 10px 0 0;
    padding: 0.6rem 1.2rem;
    font-weight: 600;
    color: var(--mag-steel);
    transition: background 0.25s ease, color 0.25s ease;
}
.stTabs [data-baseweb="tab"]:hover {
    background: rgba(27, 42, 65, 0.06);
    color: var(--mag-navy);
}
.stTabs [aria-selected="true"] {
    color: var(--mag-navy) !important;
    background: rgba(224, 123, 57, 0.10);
}
.stTabs [data-baseweb="tab-highlight"] {
    background-color: var(--mag-orange);
    height: 3px;
    border-radius: 3px;
}
.stTabs [data-baseweb="tab-panel"] {
    animation: mag-fade-in 0.4s ease-out;
    padding-top: 1rem;
}

/* ============ Botones ============ */
.stButton > button, .stDownloadButton > button {
    border-radius: 10px;
    font-weight: 700;
    border: none;
    transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s ease;
}
.stButton > button[kind="primary"], .stDownloadButton > button {
    background: linear-gradient(135deg, var(--mag-orange), var(--mag-orange-dark));
    color: #fff;
}
.stButton > button:hover, .stDownloadButton > button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(224, 123, 57, 0.35);
    filter: brightness(1.05);
}
.stButton > button:active { transform: translateY(0); }
.stButton > button[kind="primary"]:focus { animation: mag-pulse 1.2s ease infinite; }

/* ============ Inputs ============ */
.stTextInput input, .stSelectbox [data-baseweb="select"] > div {
    border-radius: 10px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.stTextInput input:focus {
    border-color: var(--mag-orange) !important;
    box-shadow: 0 0 0 3px rgba(224, 123, 57, 0.18) !important;
}

/* Validación visual */
.mag-valid, .mag-invalid {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.12rem 0.55rem;
    border-radius: 999px;
    margin-top: -0.4rem;
    animation: mag-slide-in 0.25s ease-out;
}
.mag-valid   { color: var(--mag-ok);   background: rgba(27, 110, 60, 0.10); }
.mag-invalid { color: var(--mag-warn); background: rgba(176, 0, 32, 0.08); }

/* ============ Tarjetas de métricas (dashboard) ============ */
.mag-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    margin: 0.6rem 0 1rem 0;
}
.mag-card {
    background: var(--mag-card);
    border: 1px solid var(--mag-border);
    border-top: 3px solid var(--mag-orange);
    border-radius: 12px;
    padding: 0.9rem 1rem;
    box-shadow: 0 1px 3px rgba(27, 42, 65, 0.07);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    animation: mag-fade-in 0.5s ease-out both;
}
.mag-card:nth-child(2) { animation-delay: 0.05s; }
.mag-card:nth-child(3) { animation-delay: 0.10s; }
.mag-card:nth-child(4) { animation-delay: 0.15s; }
.mag-card:nth-child(5) { animation-delay: 0.20s; }
.mag-card:nth-child(6) { animation-delay: 0.25s; }
.mag-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(27, 42, 65, 0.12);
}
.mag-card .mag-card-label {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--mag-steel);
}
.mag-card .mag-card-value {
    font-size: 1.35rem;
    font-weight: 800;
    color: var(--mag-navy);
    margin-top: 0.15rem;
    word-break: break-word;
}
.mag-card .mag-card-unit {
    font-size: 0.8rem;
    color: var(--mag-steel);
    font-weight: 600;
}

/* ============ Historial ============ */
.mag-history-item {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    background: var(--mag-card);
    border: 1px solid var(--mag-border);
    border-left: 4px solid var(--mag-navy);
    border-radius: 10px;
    padding: 0.7rem 1rem;
    margin-bottom: 0.5rem;
    animation: mag-slide-in 0.3s ease-out;
}
.mag-history-item .mag-doc-type {
    background: var(--mag-navy);
    color: #fff;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    white-space: nowrap;
}
.mag-history-item .mag-doc-name {
    font-weight: 600;
    color: var(--mag-navy);
    font-size: 0.88rem;
    word-break: break-all;
}
.mag-history-item .mag-doc-time {
    margin-left: auto;
    color: var(--mag-steel);
    font-size: 0.78rem;
    white-space: nowrap;
}

/* ============ Pasos (wizard) ============ */
.mag-steps {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    margin: 0.2rem 0 1rem 0;
    flex-wrap: wrap;
}
.mag-step {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--mag-steel);
}
.mag-step .mag-step-dot {
    width: 26px; height: 26px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: var(--mag-border);
    color: var(--mag-steel);
    font-size: 0.78rem;
    font-weight: 800;
    transition: background 0.3s ease, color 0.3s ease;
}
.mag-step.done .mag-step-dot   { background: var(--mag-ok); color: #fff; }
.mag-step.active .mag-step-dot { background: var(--mag-orange); color: #fff; animation: mag-pulse 1.6s ease infinite; }
.mag-step.active { color: var(--mag-navy); }
.mag-step-sep { flex: 0 0 26px; height: 2px; background: var(--mag-border); border-radius: 2px; }

/* ============ Barra de progreso ============ */
.stProgress > div > div > div {
    background: linear-gradient(90deg, var(--mag-orange), var(--mag-navy), var(--mag-orange));
    background-size: 400px 100%;
    animation: mag-shimmer 1.4s linear infinite;
    border-radius: 999px;
}

/* ============ Sidebar ============ */
section[data-testid="stSidebar"] {
    background: linear-gradient(180deg, var(--mag-navy) 0%, #16233A 100%);
}
section[data-testid="stSidebar"] * { color: #E8EDF3; }
section[data-testid="stSidebar"] h1,
section[data-testid="stSidebar"] h2,
section[data-testid="stSidebar"] h3,
section[data-testid="stSidebar"] label { color: #fff !important; }
section[data-testid="stSidebar"] hr { border-color: rgba(255,255,255,0.15); }

/* Campos de la barra lateral (texto y selector).
   Streamlit pinta el interior del control con el fondo claro del tema aunque
   esté sobre el sidebar navy, así que su texto debe ser oscuro: la regla
   general del sidebar lo dejaría blanco sobre blanco. Las etiquetas, que sí
   van sobre el navy, se mantienen en blanco. */
section[data-testid="stSidebar"] [data-testid="stTextInput"] label,
section[data-testid="stSidebar"] [data-testid="stTextInput"] label *,
section[data-testid="stSidebar"] [data-testid="stSelectbox"] label,
section[data-testid="stSidebar"] [data-testid="stSelectbox"] label * {
    color: #fff !important;
}
section[data-testid="stSidebar"] [data-testid="stTextInput"] input,
section[data-testid="stSidebar"] [data-testid="stSelectbox"] input {
    color: var(--mag-navy) !important;
    -webkit-text-fill-color: var(--mag-navy) !important;
    font-weight: 600;
}
section[data-testid="stSidebar"] [data-testid="stTextInput"] input::placeholder {
    color: var(--mag-steel) !important;
    -webkit-text-fill-color: var(--mag-steel) !important;
    font-weight: 400;
}
section[data-testid="stSidebar"] [data-testid="stSelectbox"] svg {
    fill: var(--mag-navy);
}

[data-baseweb="popover"] [role="listbox"],
[data-baseweb="popover"] ul[role="listbox"] {
    background: #FFFFFF;
}
[data-baseweb="popover"] li[role="option"] {
    color: var(--mag-navy) !important;
    font-weight: 600;
}
[data-baseweb="popover"] li[role="option"] * { color: var(--mag-navy) !important; }
[data-baseweb="popover"] li[role="option"][aria-selected="true"],
[data-baseweb="popover"] li[role="option"]:hover {
    background: rgba(224, 123, 57, 0.14);
}

/* ============ Expander y alerts ============ */
.streamlit-expanderHeader, details summary { font-weight: 600; }
div[data-testid="stAlert"] { border-radius: 10px; animation: mag-fade-in 0.35s ease-out; }

/* ============ Móvil ============ */
@media (max-width: 640px) {
    .block-container { padding-left: 0.8rem; padding-right: 0.8rem; }
    .mag-header { padding: 1.1rem 1.2rem; }
    .mag-header h1 { font-size: 1.15rem; }
    .mag-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .mag-card .mag-card-value { font-size: 1.05rem; }
    .stTabs [data-baseweb="tab"] { padding: 0.5rem 0.7rem; font-size: 0.82rem; }
    .mag-history-item { flex-wrap: wrap; }
    .mag-history-item .mag-doc-time { margin-left: 0; }
    .mag-step span:not(.mag-step-dot) { display: none; }
}

/* Respeta la preferencia de menos movimiento */
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
}
</style>
"""
