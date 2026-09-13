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

// 4. Injetar fonte Ionicons (base64 embutida para carregamento 100% garantido e sem falha de rede/CORS) e meta tags
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');

  let fontFacesCss = '';
  if (fs.existsSync(ioniconsSrc)) {
    const ttfBuffer = fs.readFileSync(ioniconsSrc);
    const ttfBase64 = ttfBuffer.toString('base64');
    fontFacesCss = `
      @font-face {
        font-family: 'ionicons';
        src: url('data:font/truetype;charset=utf-8;base64,${ttfBase64}') format('truetype'),
             url('./fonts/Ionicons.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: block;
      }
      @font-face {
        font-family: 'Ionicons';
        src: url('data:font/truetype;charset=utf-8;base64,${ttfBase64}') format('truetype'),
             url('./fonts/Ionicons.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: block;
      }
    `;
  }

  // Adicionar meta tags para iPhone / PWA
  const mobileMeta = `
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Glico+" />
    <link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="48x48" href="./favicon.png" />
    <meta name="theme-color" content="#FFFFFF" />
    <style id="glico-native-mobile-styles">
      ${fontFacesCss}
      html, body {
        height: 100%;
        overflow-x: hidden;
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        user-select: none;
        -webkit-user-select: none;
        background-color: #FFFFFF;
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
