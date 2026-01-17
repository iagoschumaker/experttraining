#!/bin/bash

# Script de Setup Inicial VPS - Expert Training
# Execute com: bash setup-vps.sh

set -e  # Parar em caso de erro

echo "🚀 Setup Inicial VPS - Expert Training"
echo "======================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Execute este script como root: sudo bash setup-vps.sh${NC}"
    exit 1
fi

echo -e "${BLUE}1️⃣  Atualizando sistema...${NC}"
apt update && apt upgrade -y

echo -e "${BLUE}2️⃣  Instalando dependências básicas...${NC}"
apt install -y curl wget git build-essential

echo -e "${BLUE}3️⃣  Instalando Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo -e "${GREEN}✅ Node.js instalado:${NC}"
node -v
npm -v

echo -e "${BLUE}4️⃣  Instalando PostgreSQL 15...${NC}"
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install -y postgresql-15 postgresql-contrib-15

echo -e "${GREEN}✅ PostgreSQL instalado${NC}"
systemctl status postgresql --no-pager

echo -e "${BLUE}5️⃣  Instalando PM2...${NC}"
npm install -g pm2

echo -e "${GREEN}✅ PM2 instalado:${NC}"
pm2 -v

echo -e "${BLUE}6️⃣  Instalando dependências do Puppeteer...${NC}"
apt install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils \
  chromium-browser

echo -e "${GREEN}✅ Dependências do Puppeteer instaladas${NC}"

echo -e "${BLUE}7️⃣  Instalando Nginx...${NC}"
apt install -y nginx

echo -e "${GREEN}✅ Nginx instalado${NC}"
systemctl status nginx --no-pager

echo -e "${BLUE}8️⃣  Configurando Firewall...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
echo "y" | ufw enable

echo -e "${GREEN}✅ Firewall configurado${NC}"
ufw status

echo ""
echo -e "${GREEN}🎉 Setup inicial concluído!${NC}"
echo ""
echo -e "${YELLOW}📋 Próximos passos:${NC}"
echo "1. Configure o PostgreSQL (veja DEPLOY.md seção 4)"
echo "2. Clone o repositório em /var/www"
echo "3. Configure o arquivo .env"
echo "4. Execute npm install e npm run build"
echo "5. Configure PM2 e Nginx"
echo ""
echo -e "${BLUE}📖 Consulte DEPLOY.md para instruções detalhadas${NC}"
