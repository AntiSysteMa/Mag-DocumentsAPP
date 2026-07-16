#!/usr/bin/env bash
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
streamlit run streamlit_app.py
