/**
 * Generates the PWA icons as PNGs with no image dependencies — raw pixels,
 * zlib-deflated into a minimal PNG. Run: node scripts/make-icons.mjs
 *
 * The mark is three descending bars on the accent colour: a debt balance
 * shrinking month over month.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const BG = [59, 91, 219]; // --accent #3b5bdb
const FG = [255, 255, 255];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Signed distance to a rounded rectangle; <= 0 means inside. */
function roundedRectDist(px, py, x, y, w, h, r) {
  const cx = Math.abs(px - (x + w / 2)) - (w / 2 - r);
  const cy = Math.abs(py - (y + h / 2)) - (h / 2 - r);
  const dx = Math.max(cx, 0);
  const dy = Math.max(cy, 0);
  return Math.min(Math.max(cx, cy), 0) + Math.hypot(dx, dy) - r;
}

function render(size) {
  // 3 descending bars, left-aligned, inside the maskable safe zone.
  const barH = size * 0.1;
  const gap = size * 0.07;
  const x0 = size * 0.24;
  const widths = [0.52, 0.36, 0.2].map((w) => w * size);
  const blockH = barH * 3 + gap * 2;
  const y0 = (size - blockH) / 2;

  const raw = Buffer.alloc(size * (size * 3 + 1));

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 3 + 1);
    raw[rowStart] = 0; // PNG filter type: none

    for (let x = 0; x < size; x++) {
      // Antialias by taking the softest (most inside) distance across the bars.
      let dist = Infinity;
      for (let i = 0; i < 3; i++) {
        const by = y0 + i * (barH + gap);
        dist = Math.min(
          dist,
          roundedRectDist(x + 0.5, y + 0.5, x0, by, widths[i], barH, barH / 2),
        );
      }
      const coverage = Math.min(1, Math.max(0, 0.5 - dist));
      const o = rowStart + 1 + x * 3;
      for (let c = 0; c < 3; c++) {
        raw[o + c] = Math.round(BG[c] + (FG[c] - BG[c]) * coverage);
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });

for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(join(OUT, name), render(size));
  console.log(`wrote ${name} (${size}×${size})`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#3b5bdb"/>
  <g fill="#fff">
    <rect x="24" y="26" width="52" height="10" rx="5"/>
    <rect x="24" y="43" width="36" height="10" rx="5"/>
    <rect x="24" y="60" width="20" height="10" rx="5"/>
  </g>
</svg>
`;
writeFileSync(join(OUT, 'favicon.svg'), svg);
console.log('wrote favicon.svg');
