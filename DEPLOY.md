# 🚀 Guia de Deploy - Expert Training VPS Ubuntu

## 📋 Pré-requisitos
- VPS Ubuntu 20.04 LTS ou superior
- Acesso root ou sudo
- Domínio configurado (opcional)

---

## 1️⃣ ATUALIZAR SISTEMA E INSTALAR DEPENDÊNCIAS BÁSICAS

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências essenciais
sudo apt install -y curl wget git build-essential
```

---

## 2️⃣ INSTALAR NODE.JS 20.x (LTS)

```bash
# Adicionar repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js e npm
sudo apt install -y nodejs

# Verificar instalação
node -v  # deve mostrar v20.x.x
npm -v   # deve mostrar 10.x.x
```

---

## 3️⃣ INSTALAR POSTGRESQL 15

```bash
# Adicionar repositório PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Atualizar e instalar PostgreSQL
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib-15

# Verificar status
sudo systemctl status postgresql
```

---

## 4️⃣ CONFIGURAR POSTGRESQL

```bash
# Acessar PostgreSQL como usuário postgres
sudo -u postgres psql

# Dentro do psql, executar:
CREATE DATABASE experttraining;
CREATE USER expertuser WITH ENCRYPTED PASSWORD 'SuaSenhaSegura123!';
GRANT ALL PRIVILEGES ON DATABASE experttraining TO expertuser;
ALTER DATABASE experttraining OWNER TO expertuser;
\q

# Habilitar acesso local (editar pg_hba.conf)
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Adicionar/modificar linha (antes das outras):
# local   all             expertuser                              md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Testar conexão
psql -U expertuser -d experttraining -h localhost
# Digite a senha quando solicitado
# Se conectar, digite \q para sair
```

---

## 5️⃣ INSTALAR PM2 (GERENCIADOR DE PROCESSOS)

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Configurar PM2 para iniciar com o sistema
pm2 startup
# Copie e execute o comando que aparecer

# Verificar instalação
pm2 -v
```

---

## 6️⃣ INSTALAR DEPENDÊNCIAS DO PUPPETEER

```bash
# Instalar dependências do Chrome/Chromium para Puppeteer
sudo apt install -y \
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
  xdg-utils
```

---

## 7️⃣ CLONAR REPOSITÓRIO E INSTALAR DEPENDÊNCIAS

```bash
# Criar diretório para aplicação
sudo mkdir -p /var/www
cd /var/www

# Clonar repositório
sudo git clone https://github.com/iagoschumaker/experttraining.git
cd experttraining

# Dar permissões ao usuário atual
sudo chown -R $USER:$USER /var/www/experttraining

# Instalar dependências
npm install

# Instalar Prisma CLI globalmente (opcional)
sudo npm install -g prisma
```

---

## 8️⃣ CONFIGURAR VARIÁVEIS DE AMBIENTE

```bash
# Criar arquivo .env
nano .env
```

**Copie e cole o conteúdo abaixo, ajustando os valores:**

```env
# Database
DATABASE_URL="postgresql://expertuser:SuaSenhaSegura123!@localhost:5432/experttraining?schema=public"

# JWT Secrets (GERE NOVOS VALORES SEGUROS!)
JWT_SECRET="sua-chave-secreta-super-segura-aqui-min-32-chars"
JWT_REFRESH_SECRET="sua-chave-refresh-secreta-super-segura-aqui-min-32-chars"

# App
NODE_ENV="production"
NEXT_PUBLIC_API_URL="https://seudominio.com"

# Upload (ajuste conforme necessário)
UPLOAD_DIR="/var/www/experttraining/public/uploads"
MAX_FILE_SIZE=5242880

# Puppeteer
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

**Salvar:** `Ctrl+O` → Enter → `Ctrl+X`

---

## 9️⃣ CONFIGURAR BANCO DE DADOS (PRISMA + SEED)

```bash
# Gerar Prisma Client
npx prisma generate

# Aplicar migrations (criar tabelas)
npx prisma db push

# Popular banco com dados iniciais (seed)
npm run db:seed

# Verificar se funcionou
npx prisma studio
# Abra no navegador: http://seu-ip:5555
# Verifique se as tabelas foram criadas e populadas
# Ctrl+C para fechar
```

---

## 🔟 BUILD DA APLICAÇÃO

```bash
# Build de produção
npm run build

# Verificar se build foi bem-sucedido
ls -la .next
```

---

## 1️⃣1️⃣ CONFIGURAR PM2 PARA RODAR A APLICAÇÃO

```bash
# Criar arquivo de configuração PM2
nano ecosystem.config.js
```

**Copie e cole:**

```javascript
module.exports = {
  apps: [{
    name: 'experttraining',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/experttraining',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

**Salvar:** `Ctrl+O` → Enter → `Ctrl+X`

```bash
# Iniciar aplicação com PM2
pm2 start ecosystem.config.js

# Verificar status
pm2 status

# Ver logs
pm2 logs experttraining

# Salvar configuração PM2
pm2 save
```

---

## 1️⃣2️⃣ INSTALAR E CONFIGURAR NGINX (REVERSE PROXY)

```bash
# Instalar Nginx
sudo apt install -y nginx

# Criar configuração do site
sudo nano /etc/nginx/sites-available/experttraining
```

**Copie e cole (ajuste o domínio):**

```nginx
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

**Salvar:** `Ctrl+O` → Enter → `Ctrl+X`

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/experttraining /etc/nginx/sites-enabled/

# Remover site padrão
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Habilitar Nginx no boot
sudo systemctl enable nginx
```

---

## 1️⃣3️⃣ CONFIGURAR FIREWALL (UFW)

```bash
# Habilitar firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verificar status
sudo ufw status
```

---

## 1️⃣4️⃣ INSTALAR CERTIFICADO SSL (HTTPS) - OPCIONAL MAS RECOMENDADO

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# Renovação automática já está configurada
# Testar renovação
sudo certbot renew --dry-run
```

---

## 1️⃣5️⃣ VERIFICAR SE TUDO ESTÁ FUNCIONANDO

```bash
# Verificar status dos serviços
sudo systemctl status postgresql
sudo systemctl status nginx
pm2 status

# Verificar logs da aplicação
pm2 logs experttraining --lines 50

# Testar aplicação
curl http://localhost:3000
# Deve retornar HTML da aplicação

# Acessar no navegador
# http://seudominio.com (ou http://seu-ip)
```

---

## 🔄 COMANDOS ÚTEIS DE MANUTENÇÃO

```bash
# Atualizar aplicação
cd /var/www/experttraining
git pull
npm install
npm run build
pm2 restart experttraining

# Ver logs
pm2 logs experttraining
pm2 logs experttraining --lines 100

# Reiniciar aplicação
pm2 restart experttraining

# Parar aplicação
pm2 stop experttraining

# Backup do banco
pg_dump -U expertuser -h localhost experttraining > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -U expertuser -h localhost experttraining < backup_20240117.sql

# Monitorar recursos
pm2 monit

# Limpar cache do Next.js
rm -rf .next
npm run build
pm2 restart experttraining
```

---

## 🐛 TROUBLESHOOTING

### Aplicação não inicia
```bash
pm2 logs experttraining --lines 100
# Verifique erros de conexão com banco ou variáveis de ambiente
```

### Erro de conexão com PostgreSQL
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão manual
psql -U expertuser -d experttraining -h localhost

# Verificar logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Puppeteer não funciona (PDF)
```bash
# Instalar dependências faltantes
sudo apt install -y chromium-browser

# Verificar path do Chromium
which chromium-browser

# Atualizar .env com o path correto
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Nginx retorna 502 Bad Gateway
```bash
# Verificar se aplicação está rodando
pm2 status

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Reiniciar serviços
pm2 restart experttraining
sudo systemctl restart nginx
```

---

## 📊 MONITORAMENTO

```bash
# Instalar htop para monitorar recursos
sudo apt install -y htop
htop

# Monitorar logs em tempo real
pm2 logs experttraining --lines 0

# Ver uso de memória
pm2 monit
```

---

## ✅ CHECKLIST FINAL

- [ ] Node.js 20.x instalado
- [ ] PostgreSQL 15 instalado e rodando
- [ ] Banco de dados criado e seed executado
- [ ] Dependências npm instaladas
- [ ] Arquivo .env configurado
- [ ] Build da aplicação concluído
- [ ] PM2 configurado e aplicação rodando
- [ ] Nginx instalado e configurado
- [ ] Firewall configurado
- [ ] SSL/HTTPS configurado (opcional)
- [ ] Aplicação acessível via navegador
- [ ] PDF funcionando (Puppeteer)

---

## 🎉 DEPLOY CONCLUÍDO!

Sua aplicação Expert Training está rodando em produção!

**Acesse:** https://seudominio.com

**Credenciais padrão (seed):**
- Superadmin: admin@experttraining.com / admin123
- Studio: studio@example.com / studio123

**⚠️ IMPORTANTE:** Altere as senhas padrão imediatamente após o primeiro login!
