#!/usr/bin/env node
// Genere tous les PNG logos a partir du SVG source.
// Usage : node scripts/gen-logo-pngs.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'public', 'logo.svg');
const OUT = path.join(__dirname, '..', 'public');

const TARGETS = [
  { file: 'favicon-32x32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
];

(async () => {
  const svg = fs.readFileSync(SRC);
  for (const t of TARGETS) {
    await sharp(svg, { density: Math.round(t.size * 3) })
      .resize(t.size, t.size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, t.file));
    console.log('OK', t.file, t.size + 'x' + t.size);
  }
})().catch((e) => { console.error(e); process.exit(1); });
