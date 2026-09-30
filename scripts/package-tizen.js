import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const workspaceDir = path.resolve(rootDir, '../../..');
const outputsDir = path.resolve(rootDir, '..');
const distDir = path.join(rootDir, 'dist');
const tizenStagingDir = path.join(rootDir, 'dist-tizen');
const samsungTvDir = path.join(rootDir, 'samsung-tv');

// Detect Render URL if provided
let renderUrl = process.argv.slice(2).find(arg => arg.startsWith('http://') || arg.startsWith('https://')) || process.env.RENDER_URL;

const renderUrlFileInRoot = path.join(rootDir, 'render-url.txt');
const renderUrlFileInWorkspace = path.join(workspaceDir, 'render-url.txt');
if (!renderUrl && fs.existsSync(renderUrlFileInRoot)) {
  renderUrl = fs.readFileSync(renderUrlFileInRoot, 'utf-8').trim();
} else if (!renderUrl && fs.existsSync(renderUrlFileInWorkspace)) {
  renderUrl = fs.readFileSync(renderUrlFileInWorkspace, 'utf-8').trim();
}

console.log('🚀 Starting Samsung TV (Tizen OS) App Packaging...');
if (renderUrl) {
  console.log(`🌐 Target Render Cloud URL: ${renderUrl}`);
} else {
  console.log('ℹ️  No Render URL specified. Building local packaged app. (Tip: pass your Render URL as an argument, e.g. npm run package:tv https://your-app.onrender.com)');
}

// 1. Build web application bundle
console.log('📦 Step 1: Building production web bundle with Vite...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

// 2. Prepare staging directory
if (fs.existsSync(tizenStagingDir)) {
  fs.rmSync(tizenStagingDir, { recursive: true, force: true });
}
fs.mkdirSync(tizenStagingDir, { recursive: true });

// 3. Copy dist files to staging
console.log('📂 Step 2: Copying web assets to Tizen staging directory...');
fs.cpSync(distDir, tizenStagingDir, { recursive: true });

// 4. Copy Samsung TV specific files
console.log('📺 Step 3: Copying Tizen TV manifest, icons, and remote scripts...');
let configXml = fs.readFileSync(path.join(samsungTvDir, 'config.xml'), 'utf-8');
if (renderUrl) {
  configXml = configXml.replace(/<content src="[^"]*"\/>/, `<content src="${renderUrl}"/>`);
}
fs.writeFileSync(path.join(tizenStagingDir, 'config.xml'), configXml, 'utf-8');

fs.copyFileSync(path.join(samsungTvDir, 'icon.png'), path.join(tizenStagingDir, 'icon.png'));
if (fs.existsSync(path.join(samsungTvDir, 'icon-117.png'))) {
  fs.copyFileSync(path.join(samsungTvDir, 'icon-117.png'), path.join(tizenStagingDir, 'icon-117.png'));
}
fs.copyFileSync(path.join(samsungTvDir, 'tizen-remote.js'), path.join(tizenStagingDir, 'tizen-remote.js'));
fs.copyFileSync(path.join(samsungTvDir, 'tv-setup.js'), path.join(tizenStagingDir, 'tv-setup.js'));
fs.copyFileSync(path.join(samsungTvDir, 'tv-styles.css'), path.join(tizenStagingDir, 'tv-styles.css'));

// 5. Inject TV scripts and CSS into index.html
console.log('✨ Step 4: Injecting TV remote navigation and UI into index.html...');
const indexPath = path.join(tizenStagingDir, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf-8');

const tvInjections = `
    <!-- Samsung TV Remote Control & UI Navigation -->
    <link rel="stylesheet" href="./tv-styles.css" />
    <script src="./tizen-remote.js"></script>
    <script src="./tv-setup.js"></script>
  </head>`;

indexHtml = indexHtml.replace('</head>', tvInjections);
fs.writeFileSync(indexPath, indexHtml, 'utf-8');

// 6. Create the .wgt package (W3C / Tizen Widget is a zip archive)
console.log('🎁 Step 5: Packaging into Samsung TV Widget (.wgt)...');
const outputWgt = path.join(rootDir, 'lunch-rush.wgt');
if (fs.existsSync(outputWgt)) {
  fs.unlinkSync(outputWgt);
}

try {
  execSync(`cd "${tizenStagingDir}" && zip -r "${outputWgt}" .`, { stdio: 'inherit' });
  console.log(`\n🎉 SUCCESS! Samsung TV App Package created at:\n👉 ${outputWgt}\n`);

  // Prepare USB Pen Drive structure in multiple convenient locations
  const targetDirs = [
    path.join(rootDir, 'usb-pen-drive', 'userwidget'),
    path.join(outputsDir, 'userwidget')
  ];

  for (const dir of targetDirs) {
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(outputWgt, path.join(dir, 'lunch-rush.wgt'));
    fs.copyFileSync(outputWgt, path.join(dir, 'lunch-rush.zip'));
  }

  // Also copy to outputs root
  fs.copyFileSync(outputWgt, path.join(outputsDir, 'lunch-rush.wgt'));

  console.log(`💾 Ready-to-copy USB folder updated at:\n👉 ${path.join(outputsDir, 'userwidget')}\n`);
} catch (err) {
  console.error('Error creating zip package with zip utility:', err);
}
