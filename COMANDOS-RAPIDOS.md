# ⚡ Comandos Rápidos - Deploy VPS Ubuntu

## 🚀 SETUP INICIAL AUTOMATIZADO (EXECUTE PRIMEIRO)

```bash
# 1. Conectar na VPS via SSH
ssh root@seu-ip-vps

# 2. Baixar e executar script de setup
wget https://raw.githubusercontent.com/iagoschumaker/experttraining/main/setup-vps.sh
chmod +x setup-vps.sh
sudo bash setup-vps.sh
```

---

## 🗄️ CONFIGURAR POSTGRESQL (MANUAL)

```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Executar dentro do psql:
CREATE DATABASE experttraining;
CREATE USER expertuser WITH ENCRYPTED PASSWORD 'SuaSenhaSegura123!';
GRANT ALL PRIVILEGES ON DATABASE experttraining TO expertuser;
ALTER DATABASE experttraining OWNER TO expertuser;
\q

# Configurar autenticação
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Adicionar antes das outras linhas:
# local   all             expertuser                              md5

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Testar conexão
psql -U expertuser -d experttraining -h localhost
# Digite a senha, depois \q para sair
```

---

## 📦 CLONAR E CONFIGURAR APLICAÇÃO

```bash
# Criar diretório e clonar
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/iagoschumaker/experttraining.git
cd experttraining
sudo chown -R $USER:$USER /var/www/experttraining

# Instalar dependências
npm install

# Criar arquivo .env
nano .env
```

**Cole no .env:**
```env
DATABASE_URL="postgresql://expertuser:SuaSenhaSegura123!@localhost:5432/experttraining?schema=public"
JWT_ACCESS_SECRET="gere-uma-chave-segura-aqui-min-32-caracteres"
JWT_REFRESH_SECRET="gere-outra-chave-segura-aqui-min-32-caracteres"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
NEXT_PUBLIC_APP_URL="https://seudominio.com"
NODE_ENV="production"
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

**Salvar:** `Ctrl+O` → Enter → `Ctrl+X`

---

## 🗃️ SETUP BANCO DE DADOS

```bash
# Gerar Prisma Client
npx prisma generate

# Criar tabelas
npx prisma db push

# Popular com dados iniciais (SEED)
npm run db:seed

# Verificar (opcional)
npx prisma studio
# Abrir no navegador: http://seu-ip:5555
# Ctrl+C para fechar
```

---

## 🏗️ BUILD E INICIAR APLICAÇÃO

```bash
# Build
npm run build

# Iniciar com PM2
pm2 start ecosystem.config.js

# Verificar status
pm2 status

# Ver logs
pm2 logs experttraining

# Salvar configuração
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
# Copie e execute o comando que aparecer
```

---

## 🌐 CONFIGURAR NGINX

```bash
# Copiar configuração
sudo cp nginx.conf /etc/nginx/sites-available/experttraining

# Editar domínio
sudo nano /etc/nginx/sites-available/experttraining
# Alterar: seudominio.com para seu domínio real

# Ativar site
sudo ln -s /etc/nginx/sites-available/experttraining /etc/nginx/sites-enabled/

# Remover site padrão
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 🔒 CONFIGURAR SSL (HTTPS)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# Seguir instruções na tela
# Escolher opção 2 (redirect HTTP para HTTPS)
```

---

## ✅ VERIFICAR SE ESTÁ FUNCIONANDO

```bash
# Status dos serviços
sudo systemctl status postgresql
sudo systemctl status nginx
pm2 status

# Logs da aplicação
pm2 logs experttraining --lines 50

# Testar localmente
curl http://localhost:3000

# Acessar no navegador
# http://seudominio.com
```

---

## 🔄 ATUALIZAR APLICAÇÃO (DEPLOY)

```bash
cd /var/www/experttraining

# Opção 1: Script automatizado
bash deploy.sh

# Opção 2: Manual
git pull origin main
npm install
npm run build
pm2 restart experttraining
```

---

## 🛠️ COMANDOS ÚTEIS

```bash
# Ver logs em tempo real
pm2 logs experttraining --lines 0

# Reiniciar aplicação
pm2 restart experttraining

# Parar aplicação
pm2 stop experttraining

# Monitorar recursos
pm2 monit

# Backup do banco
pg_dump -U expertuser -h localhost experttraining > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -U expertuser -h localhost experttraining < backup_20240117.sql

# Limpar cache Next.js
rm -rf .next
npm run build
pm2 restart experttraining

# Ver uso de disco
df -h

# Ver uso de memória
free -h

# Ver processos
htop
```

---

## 🐛 TROUBLESHOOTING RÁPIDO

### Aplicação não inicia
```bash
pm2 logs experttraining --lines 100
# Verificar erros
```

### Erro de conexão com banco
```bash
sudo systemctl status postgresql
psql -U expertuser -d experttraining -h localhost
```

### Nginx 502 Bad Gateway
```bash
pm2 status
pm2 restart experttraining
sudo systemctl restart nginx
```

### PDF não funciona
```bash
# Verificar Chromium
which chromium-browser
# Atualizar .env se necessário
```

---

## 📋 CREDENCIAIS PADRÃO (SEED)

Após o seed, você pode fazer login com:

**Superadmin:**
- Email: admin@experttraining.com
- Senha: admin123

**Studio:**
- Email: studio@example.com
- Senha: studio123

**⚠️ ALTERE AS SENHAS IMEDIATAMENTE!**

---

## 🎯 SEQUÊNCIA COMPLETA (COPY/PASTE)

```bash
# 1. Setup inicial
wget https://raw.githubusercontent.com/iagoschumaker/experttraining/main/setup-vps.sh
chmod +x setup-vps.sh
sudo bash setup-vps.sh

# 2. PostgreSQL (executar dentro do psql)
sudo -u postgres psql
CREATE DATABASE experttraining;
CREATE USER expertuser WITH ENCRYPTED PASSWORD 'SuaSenhaSegura123!';
GRANT ALL PRIVILEGES ON DATABASE experttraining TO expertuser;
ALTER DATABASE experttraining OWNER TO expertuser;
\q

# 3. Configurar pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Adicionar: local   all             expertuser                              md5
sudo systemctl restart postgresql

# 4. Clonar e configurar
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/iagoschumaker/experttraining.git
cd experttraining
sudo chown -R $USER:$USER /var/www/experttraining
npm install

# 5. Criar .env (cole o conteúdo)
nano .env

# 6. Setup banco
npx prisma generate
npx prisma db push
npm run db:seed

# 7. Build e iniciar
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 8. Nginx
sudo cp nginx.conf /etc/nginx/sites-available/experttraining
sudo nano /etc/nginx/sites-available/experttraining  # Editar domínio
sudo ln -s /etc/nginx/sites-available/experttraining /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 9. SSL (opcional)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# 10. Verificar
pm2 status
sudo systemctl status nginx
curl http://localhost:3000
```

---

## 🎉 PRONTO!

Acesse: **https://seudominio.com**

Login: **admin@experttraining.com** / **admin123**
