const fs = require('fs');
const path = require('path');

// Criar SVG otimizado para conversão
const createSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00C2D1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0099A8;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background com gradiente -->
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#0F1215"/>
  
  <!-- Container interno -->
  <rect x="${size * 0.08}" y="${size * 0.08}" width="${size * 0.84}" height="${size * 0.84}" rx="${size * 0.12}" fill="url(#grad)"/>
  
  <!-- Texto ET -->
  <text 
    x="${size / 2}" 
    y="${size * 0.62}" 
    font-family="Arial, Helvetica, sans-serif" 
    font-size="${size * 0.35}" 
    font-weight="900" 
    fill="#0F1215" 
    text-anchor="middle"
    letter-spacing="${size * -0.02}">ET</text>
  
  <!-- Subtexto -->
  <text 
    x="${size / 2}" 
    y="${size * 0.82}" 
    font-family="Arial, Helvetica, sans-serif" 
    font-size="${size * 0.08}" 
    font-weight="600" 
    fill="#0F1215" 
    text-anchor="middle"
    opacity="0.8">EXPERT TRAINING</text>
</svg>
`;

// Criar diretório public se não existir
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Gerar ícones
const sizes = [192, 512];

sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = `icon-${size}.svg`;
  const filepath = path.join(publicDir, filename);
  
  fs.writeFileSync(filepath, svg.trim());
  console.log(`✅ Criado: ${filename}`);
});

console.log('\n📱 Ícones SVG criados com sucesso!');
console.log('\n💡 Para converter para PNG, use uma ferramenta online:');
console.log('   - https://cloudconvert.com/svg-to-png');
console.log('   - https://www.svgtopng.com/');
console.log('\nOu instale sharp: npm install sharp');
