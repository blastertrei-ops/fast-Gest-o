import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const fullSvgPath = path.join(publicDir, 'fast-gestao-logo.svg');
const symbolSvgPath = path.join(publicDir, 'fast-gestao-symbol.svg');

async function main() {
  console.log('Generating logo PNGs and PWA icons...');

  // Copy SVG aliases
  fs.copyFileSync(fullSvgPath, path.join(publicDir, 'logo.svg'));
  fs.copyFileSync(symbolSvgPath, path.join(publicDir, 'favicon.svg'));

  const fullSvgBuffer = fs.readFileSync(fullSvgPath);
  const symbolSvgBuffer = fs.readFileSync(symbolSvgPath);

  // 1. Full Logos (PNG)
  await sharp(fullSvgBuffer)
    .resize(1200, 840)
    .png()
    .toFile(path.join(publicDir, 'fast-gestao-logo.png'));

  await sharp(fullSvgBuffer)
    .resize(1200, 840)
    .png()
    .toFile(path.join(publicDir, 'logo.png'));

  // 2. Favicons & App Icons (derived from Symbol for maximum clarity)
  const sizes = [
    { name: 'favicon-16x16.png', width: 16, height: 16 },
    { name: 'favicon-32x32.png', width: 32, height: 32 },
    { name: 'apple-touch-icon.png', width: 180, height: 180 },
    { name: 'android-chrome-192.png', width: 192, height: 192 },
    { name: 'android-chrome-512.png', width: 512, height: 512 },
    { name: 'icon-192.png', width: 192, height: 192 },
    { name: 'icon-512.png', width: 512, height: 512 },
  ];

  for (const item of sizes) {
    await sharp(symbolSvgBuffer)
      .resize(item.width, item.height)
      .png()
      .toFile(path.join(publicDir, item.name));
    console.log(`Generated ${item.name}`);
  }

  // Favicon.ico fallback (32x32 PNG)
  await sharp(symbolSvgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('All branding assets generated successfully!');
}

main().catch(console.error);
