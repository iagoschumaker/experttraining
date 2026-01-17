#!/bin/bash

# Script de Deploy Automatizado - Expert Training
# Execute com: bash deploy.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy do Expert Training..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está rodando como root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Não execute este script como root!${NC}"
    exit 1
fi

# Diretório da aplicação
APP_DIR="/var/www/experttraining"

echo -e "${YELLOW}📦 Atualizando código...${NC}"
cd $APP_DIR
git pull origin main

echo -e "${YELLOW}📚 Instalando dependências...${NC}"
npm install --production=false

echo -e "${YELLOW}🗄️  Atualizando banco de dados...${NC}"
npx prisma generate
npx prisma db push

echo -e "${YELLOW}🏗️  Fazendo build da aplicação...${NC}"
npm run build

echo -e "${YELLOW}🔄 Reiniciando aplicação...${NC}"
pm2 restart experttraining

echo -e "${YELLOW}💾 Salvando configuração PM2...${NC}"
pm2 save

echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo "📊 Status da aplicação:"
pm2 status

echo ""
echo "📝 Para ver os logs:"
echo "   pm2 logs experttraining"
