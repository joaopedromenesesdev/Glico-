const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(distDir)) {
  console.error('Diretório dist não encontrado!');
  process.exit(1);
}

// 1. Criar .nojekyll no dist
fs.writeFileSync(path.join(distDir, '.nojekyll'), '# disable jekyll');
console.log('✓ .nojekyll criado com sucesso');

// 2. Copiar fonte Ionicons para uma pasta acessível (fora de node_modules para não ser ignorada pelo git)
const fontsDir = path.join(distDir, 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const ioniconsSrc = path.join(
  __dirname,
  '..',
  'node_modules',
  '@expo',
  'vector-icons',
  'build',
  'vendor',
  'react-native-vector-icons',
  'Fonts',
  'Ionicons.ttf'
);

if (fs.existsSync(ioniconsSrc)) {
  fs.copyFileSync(ioniconsSrc, path.join(fontsDir, 'Ionicons.ttf'));
  console.log('✓ Fonte Ionicons copiada para dist/fonts/Ionicons.ttf');
}

// 3. Copiar ícones de alta resolução para web e iPhone
const assetsDir = path.join(__dirname, '..', 'assets');
const appleTouchSrc = path.join(assetsDir, 'apple-touch-icon.png');
const faviconSrc = path.join(assetsDir, 'favicon.png');

if (fs.existsSync(appleTouchSrc)) {
  fs.copyFileSync(appleTouchSrc, path.join(distDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png copiado para dist');
}

if (fs.existsSync(faviconSrc)) {
  fs.copyFileSync(faviconSrc, path.join(distDir, 'favicon.png'));
  console.log('✓ favicon.png copiado para dist');
}

// 4. Injetar @font-face e meta tags de otimização para iPhone no index.html
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');

  // Adicionar meta tags para iPhone / PWA
  const mobileMeta = `
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Glico+" />
    <link rel="apple-touch-icon" href="./apple-touch-icon.png" />
    <link rel="icon" type="image/png" href="./favicon.png" />
    <meta name="theme-color" content="#FFFFFF" />
    <style id="glico-native-mobile-styles">
      @font-face {
        font-family: 'Ionicons';
        src: url('./fonts/Ionicons.ttf') format('truetype'),
             url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
        font-display: swap;
      }
      html, body {
        height: 100%;
        overflow-x: hidden;
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        user-select: none;
        -webkit-user-select: none;
      }
      #root {
        min-height: 100%;
        min-height: -webkit-fill-available;
      }
    </style>
  `;

  // Substituir viewport padrão pelo otimizado
  html = html.replace(/<meta name="viewport"[^>]*>/, '');
  html = html.replace('</head>', `${mobileMeta}\n</head>`);

  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('✓ index.html atualizado com estilos nativos de mobile, ícones e fontes');
}
