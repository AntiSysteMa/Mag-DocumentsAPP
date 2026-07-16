#!/bin/bash

# MAG INDUSTRIES — Document Generator Setup Script
# Ejecutar una sola vez para configurar todo

echo "🔧 MAG INDUSTRIES — Document Generator Setup"
echo "============================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "app.py" ]; then
    echo -e "${RED}❌ Error: app.py no encontrado. Ejecuta este script desde /home/claude/mag_g54${NC}"
    exit 1
fi

echo -e "${BLUE}1️⃣  Verificando Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 no instalado${NC}"
    exit 1
fi
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✅ Python $python_version encontrado${NC}"

echo ""
echo -e "${BLUE}2️⃣  Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no instalado. Instálalo desde https://nodejs.org/${NC}"
    exit 1
fi
node_version=$(node --version)
echo -e "${GREEN}✅ Node.js $node_version encontrado${NC}"

echo ""
echo -e "${BLUE}3️⃣  Instalando dependencias Python...${NC}"
pip install -q streamlit beautifulsoup4 lxml --break-system-packages 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencias Python instaladas${NC}"
else
    echo -e "${RED}❌ Error instalando dependencias Python${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}4️⃣  Verificando node_modules...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Ejecutando npm install..."
    npm install -q 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ npm módulos instalados${NC}"
    else
        echo -e "${RED}⚠️  npm install terminó con advertencias (es normal)${NC}"
    fi
else
    echo -e "${GREEN}✅ node_modules ya existe${NC}"
fi

echo ""
echo -e "${BLUE}5️⃣  Verificando scripts de generación...${NC}"
required_scripts=("build4.js" "build5.js" "build6.js" "build7.js" "build8.js")
missing_scripts=()

for script in "${required_scripts[@]}"; do
    if [ -f "$script" ]; then
        echo -e "${GREEN}✅${NC} $script"
    else
        echo -e "${RED}❌${NC} $script NO ENCONTRADO"
        missing_scripts+=("$script")
    fi
done

if [ ${#missing_scripts[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Faltan scripts: ${missing_scripts[@]}${NC}"
    echo "Asegúrate de tener todos los build*.js en este directorio"
    exit 1
fi

echo ""
echo -e "${BLUE}6️⃣  Verificando recursos adicionales...${NC}"
if [ ! -f "logo_claro.png" ]; then
    echo -e "${RED}⚠️  logo_claro.png no encontrado (se necesita para documentos)${NC}"
fi

if [ ! -f "qr_whatsapp.png" ]; then
    echo -e "${RED}⚠️  qr_whatsapp.png no encontrado (se necesita para one-pager)${NC}"
fi

echo ""
echo -e "${BLUE}7️⃣  Verificando íconos...${NC}"
icon_files=("icon_gear.png" "icon_chart.png" "icon_doc.png" "icon_design.png" "icon_automation.png" "icon_receive.png" "icon_machining.png" "icon_quality.png" "icon_delivery.png")
missing_icons=()

for icon in "${icon_files[@]}"; do
    if [ ! -f "$icon" ]; then
        missing_icons+=("$icon")
    fi
done

if [ ${#missing_icons[@]} -gt 0 ]; then
    echo -e "${RED}⚠️  Faltan ${#missing_icons[@]} íconos (la app funcionará pero los documentos tendrán espacios en blanco)${NC}"
else
    echo -e "${GREEN}✅ Todos los íconos presentes${NC}"
fi

echo ""
echo "============================================="
echo -e "${GREEN}✅ SETUP COMPLETADO${NC}"
echo ""
echo -e "${BLUE}Para ejecutar la app:${NC}"
echo "  streamlit run app.py"
echo ""
echo "La app se abrirá en: http://localhost:8501"
echo ""
