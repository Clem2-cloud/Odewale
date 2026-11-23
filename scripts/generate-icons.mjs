import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createIconPng(size, maskable = false) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const cx = size / 2;
  const cy = size / 2;
  const scale = maskable ? 0.72 : 0.88;
  const outerR = (size * 0.32) * scale;
  const strokeHalf = (size * 0.042) * scale;
  const innerR = (size * 0.11) * scale;
  const cornerR = maskable ? 0 : size * 0.22;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      let alpha = 255;
      if (!maskable && cornerR > 0) {
        const dx = Math.max(cornerR - x, 0, x - (size - 1 - cornerR));
        const dy = Math.max(cornerR - y, 0, y - (size - 1 - cornerR));
        const cornerDist = Math.hypot(dx, dy);
        if (cornerDist > cornerR + 0.5) alpha = 0;
        else if (cornerDist > cornerR - 0.5) alpha = Math.round(255 * (cornerR + 0.5 - cornerDist));
      }

      // Background teal (#0f766e)
      let r = 15, g = 118, b = 110;
      const dist = Math.hypot(x - cx, y - cy);
      const angle = Math.atan2(y - cy, x - cx);
      // Open gap at top-right (-0.75 to -0.15 rad) for "Open Circle" motif
      const inGap = angle > -0.78 && angle < -0.18;

      const ringDiff = Math.abs(dist - outerR);
      if (!inGap && ringDiff <= strokeHalf + 0.8) {
        const mix = Math.min(1, Math.max(0, strokeHalf + 0.8 - ringDiff));
        r = Math.round(r * (1 - mix) + 255 * mix);
        g = Math.round(g * (1 - mix) + 255 * mix);
        b = Math.round(b * (1 - mix) + 255 * mix);
      } else if (dist <= innerR + 0.8) {
        const mix = Math.min(1, Math.max(0, innerR + 0.8 - dist));
        r = Math.round(r * (1 - mix) + 204 * mix);
        g = Math.round(g * (1 - mix) + 251 * mix);
        b = Math.round(b * (1 - mix) + 241 * mix);
      }

      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = alpha;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', idat), makeChunk('IEND', Buffer.alloc(0))]);
}

const outDir = path.resolve(process.cwd(), 'public');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), createIconPng(192, false));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), createIconPng(512, false));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), createIconPng(512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), createIconPng(180, true));
console.log('Generated PWA PNG icons in public/');
