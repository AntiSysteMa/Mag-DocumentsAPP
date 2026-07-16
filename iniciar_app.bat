@echo off
title MAG Industries - Document Generator
cd /d "%~dp0"
if not exist node_modules (
    echo Instalando dependencias de Node.js...
    call npm install
)
echo Iniciando MAG Industries Document Generator...
python -m streamlit run streamlit_app.py
pause
