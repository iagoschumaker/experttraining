# 🚀 Instalação do Puppeteer na VPS Ubuntu

Este guia mostra como instalar o Puppeteer e suas dependências na VPS para geração de PDFs.

## 📋 Pré-requisitos

- VPS Ubuntu 24.04 LTS
- Node.js 18+ instalado
- Acesso root via SSH

---

## 🔧 Instalação

### 1. Conectar na VPS

```bash
ssh root@147.79.110.203
```

### 2. Instalar Dependências do Sistema

O Puppeteer precisa de várias bibliotecas do sistema para funcionar:

```bash
# Atualizar repositórios
apt update

# Instalar dependências do Chromium
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
  xdg-utils

# Instalar fontes adicionais (para melhor renderização)
apt install -y fonts-noto fonts-noto-cjk fonts-noto-color-emoji
```

### 3. Instalar Puppeteer no Projeto

```bash
cd /var/www/experttraining

# Instalar Puppeteer
npm install puppeteer

# Verificar instalação
npx puppeteer --version
```

### 4. Configurar Variáveis de Ambiente (Opcional)

Se necessário, adicione ao `.env`:

```bash
# Desabilitar sandbox do Chromium (apenas se necessário)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### 5. Testar Puppeteer

Crie um script de teste:

```bash
cat > test-puppeteer.js << 'EOF'
const puppeteer = require('puppeteer');

(async () => {
  console.log('Iniciando Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent('<h1>Teste Puppeteer</h1><p>Funcionando!</p>');
  
  const pdf = await page.pdf({ format: 'A4' });
  console.log('PDF gerado com sucesso! Tamanho:', pdf.length, 'bytes');
  
  await browser.close();
  console.log('Teste concluído!');
})();
EOF

# Executar teste
node test-puppeteer.js

# Remover arquivo de teste
rm test-puppeteer.js
```

### 6. Rebuild e Restart da Aplicação

```bash
cd /var/www/experttraining

# Build da aplicação
npm run build

# Restart do PM2
pm2 restart all

# Verificar logs
pm2 logs --lines 50
```

---

## 🐛 Troubleshooting

### Erro: "Failed to launch the browser process"

**Solução:** Adicione flags de sandbox ao launch do Puppeteer:

```javascript
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
});
```

### Erro: "libX11-xcb.so.1: cannot open shared object file"

**Solução:** Instale as dependências faltantes:

```bash
apt install -y libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0
```

### Erro: "Running as root without --no-sandbox is not supported"

**Solução:** Adicione `--no-sandbox` aos args do Puppeteer (já incluído acima).

### Memória insuficiente

Se o servidor tiver pouca RAM, configure swap:

```bash
# Criar arquivo swap de 2GB
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Tornar permanente
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## ✅ Verificação Final

Teste a geração de PDF pela aplicação:

1. Acesse a aplicação
2. Vá em um treino
3. Clique em "Baixar PDF"
4. Verifique se o PDF é gerado corretamente

---

## 📊 Monitoramento

Verificar uso de recursos:

```bash
# Uso de memória
free -h

# Processos do Chromium
ps aux | grep chromium

# Logs do PM2
pm2 logs
```

---

## 🔄 Atualização

Para atualizar o Puppeteer:

```bash
cd /var/www/experttraining
npm update puppeteer
npm run build
pm2 restart all
```

---

## 📝 Notas Importantes

- O Puppeteer baixa automaticamente uma versão do Chromium (~170-300MB)
- O primeiro launch pode demorar alguns segundos
- Certifique-se de ter pelo menos 1GB de RAM livre
- Use `--no-sandbox` apenas em ambientes confiáveis
- Feche sempre o browser após uso para liberar memória

---

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs: `pm2 logs`
2. Teste o Puppeteer isoladamente com o script de teste
3. Verifique se todas as dependências foram instaladas
4. Consulte: https://pptr.dev/troubleshooting
