/**
 * Renders the brand assets from SVG so every raster file traces back to one
 * source of truth. Re-run with `node scripts/make-brand.mjs` after any change
 * to the mark, rather than editing PNGs by hand.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const brand = path.join(root, 'public', 'brand');
fs.mkdirSync(brand, { recursive: true });

const GRADIENT = `
  <defs>
    <linearGradient id="j" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop stop-color="#B4A8FF"/>
      <stop offset="1" stop-color="#5A2FE8"/>
    </linearGradient>
  </defs>`;

const BARS = `
  <g fill="url(#j)">
    <rect x="11" y="14" width="42" height="8.5" rx="1.5"/>
    <rect x="11" y="27.75" width="28" height="8.5" rx="1.5"/>
    <rect x="11" y="41.5" width="42" height="8.5" rx="1.5"/>
  </g>`;

/** Mark on the dark app background, rounded. Used for icons and avatars. */
const onDark = (r = 14) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${GRADIENT}
  <rect width="64" height="64" rx="${r}" fill="#0A0A11"/>
  ${BARS}
</svg>`;

/** Mark alone, transparent. Used where the background is already set. */
const transparent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${GRADIENT}
  ${BARS}
</svg>`;

const outputs = [
  ['joppo-mark-1024.png', onDark(), 1024],
  ['joppo-mark-512.png', onDark(), 512],
  ['joppo-mark-256.png', onDark(), 256],
  ['joppo-mark-transparent-1024.png', transparent, 1024],
  // Apple wants a square with no transparency and no rounding of its own.
  ['apple-icon.png', onDark(0), 180],
  ['favicon-32.png', onDark(7), 32],
];

for (const [name, svg, size] of outputs) {
  const target = name === 'apple-icon.png' ? path.join(root, 'src', 'app', name) : path.join(brand, name);
  await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(target);
  const kb = (fs.statSync(target).size / 1024).toFixed(1);
  console.log(`  ${path.relative(root, target).padEnd(42)} ${size}x${size}  ${kb} KB`);
}

fs.writeFileSync(path.join(brand, 'joppo-mark.svg'), transparent.trim() + '\n');
fs.writeFileSync(path.join(brand, 'joppo-mark-on-dark.svg'), onDark().trim() + '\n');
console.log('\n  SVG sources written alongside the PNGs.');
