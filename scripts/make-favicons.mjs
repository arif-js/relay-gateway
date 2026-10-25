import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Standard CRC32 table
const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  table[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([t, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crcVal]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // Color type 6 (RGBA)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowLen = width * 4;
  const raw = Buffer.alloc(height * (rowLen + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (rowLen + 1)] = 0; // Filter type 0 (None)
    rgba.copy(raw, y * (rowLen + 1) + 1, y * rowLen, (y + 1) * rowLen);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const dirEntries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry[0] = img.width >= 256 ? 0 : img.width;
    entry[1] = img.height >= 256 ? 0 : img.height;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.pngBuffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += img.pngBuffer.length;
  }
  return Buffer.concat([header, ...dirEntries, ...images.map((img) => img.pngBuffer)]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// 1. Read source logo
const logoPath = join(root, 'src', 'ui', 'logo.png');
const srcBuf = readFileSync(logoPath);
let pos = 8;
const idatChunks = [];
let srcW = 0;
let srcH = 0;
let colorType = 2;

while (pos < srcBuf.length) {
  const len = srcBuf.readUInt32BE(pos);
  const type = srcBuf.toString('ascii', pos + 4, pos + 8);
  const data = srcBuf.subarray(pos + 8, pos + 8 + len);
  pos += 12 + len;
  if (type === 'IHDR') {
    srcW = data.readUInt32BE(0);
    srcH = data.readUInt32BE(4);
    colorType = data[9];
  } else if (type === 'IDAT') {
    idatChunks.push(data);
  }
}

const decompressed = inflateSync(Buffer.concat(idatChunks));
const bpp = colorType === 6 ? 4 : 3;
const stride = srcW * bpp;
const srcPixels = Buffer.alloc(srcW * srcH * bpp);

let rawPos = 0;
for (let y = 0; y < srcH; y++) {
  const filter = decompressed[rawPos++];
  const currOffset = y * stride;
  const prevOffset = y > 0 ? (y - 1) * stride : null;

  for (let x = 0; x < stride; x++) {
    const filt = decompressed[rawPos++];
    const left = x >= bpp ? srcPixels[currOffset + x - bpp] : 0;
    const up = prevOffset !== null ? srcPixels[prevOffset + x] : 0;
    const upLeft = prevOffset !== null && x >= bpp ? srcPixels[prevOffset + x - bpp] : 0;

    let val = filt;
    if (filter === 1) val = (filt + left) & 0xff;
    else if (filter === 2) val = (filt + up) & 0xff;
    else if (filter === 3) val = (filt + ((left + up) >> 1)) & 0xff;
    else if (filter === 4) val = (filt + paeth(left, up, upLeft)) & 0xff;
    srcPixels[currOffset + x] = val;
  }
}

// Convert source logo itself to RGBA with transparent background
const logoRgba = Buffer.alloc(srcW * srcH * 4);
for (let i = 0; i < srcW * srcH; i++) {
  const sIdx = i * bpp;
  const r = srcPixels[sIdx];
  const g = srcPixels[sIdx + 1];
  const b = srcPixels[sIdx + 2];
  const origA = bpp === 4 ? srcPixels[sIdx + 3] : 255;

  let a = origA;
  if (r > 240 && g > 240 && b > 240) {
    a = 0;
  } else {
    const brightness = (r + g + b) / 3;
    if (brightness > 218) {
      const fadeA = Math.max(0, Math.min(255, Math.round(255 * ((245 - brightness) / 27))));
      a = Math.min(origA, fadeA);
    }
  }
  const dIdx = i * 4;
  logoRgba[dIdx] = r;
  logoRgba[dIdx + 1] = g;
  logoRgba[dIdx + 2] = b;
  logoRgba[dIdx + 3] = a;
}
writeFileSync(logoPath, encodePng(srcW, srcH, logoRgba));

// 2. Render onto 512x512 square canvas with smooth transparent background
const outSize = 512;
const canvasRgba = Buffer.alloc(outSize * outSize * 4);

const contentW = 448;
const scale = contentW / srcW;
const scaledH = Math.round(srcH * scale);
const xOff = (outSize - contentW) >> 1;
const yOff = (outSize - scaledH) >> 1;

for (let dy = 0; dy < scaledH; dy++) {
  const sy = Math.min(srcH - 1, Math.floor(dy / scale));
  for (let dx = 0; dx < contentW; dx++) {
    const sx = Math.min(srcW - 1, Math.floor(dx / scale));
    const sIdx = (sy * srcW + sx) * 4;
    const tIdx = ((yOff + dy) * outSize + (xOff + dx)) * 4;
    canvasRgba[tIdx] = logoRgba[sIdx];
    canvasRgba[tIdx + 1] = logoRgba[sIdx + 1];
    canvasRgba[tIdx + 2] = logoRgba[sIdx + 2];
    canvasRgba[tIdx + 3] = logoRgba[sIdx + 3];
  }
}

const favicon512Png = encodePng(outSize, outSize, canvasRgba);

// 3. Helper to downscale canvasRgba with box averaging
function downscale(targetSize) {
  const out = Buffer.alloc(targetSize * targetSize * 4);
  const factor = outSize / targetSize;
  for (let ty = 0; ty < targetSize; ty++) {
    for (let tx = 0; tx < targetSize; tx++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      let count = 0;
      const syStart = Math.floor(ty * factor);
      const syEnd = Math.floor((ty + 1) * factor);
      const sxStart = Math.floor(tx * factor);
      const sxEnd = Math.floor((tx + 1) * factor);

      for (let sy = syStart; sy < syEnd; sy++) {
        for (let sx = sxStart; sx < sxEnd; sx++) {
          const idx = (sy * outSize + sx) * 4;
          const a = canvasRgba[idx + 3];
          rSum += (canvasRgba[idx] * a) / 255;
          gSum += (canvasRgba[idx + 1] * a) / 255;
          bSum += (canvasRgba[idx + 2] * a) / 255;
          aSum += a;
          count++;
        }
      }

      const tIdx = (ty * targetSize + tx) * 4;
      if (aSum > 0 && count > 0) {
        const avgA = aSum / count;
        out[tIdx] = Math.min(255, Math.round((rSum / (aSum / 255))));
        out[tIdx + 1] = Math.min(255, Math.round((gSum / (aSum / 255))));
        out[tIdx + 2] = Math.min(255, Math.round((bSum / (aSum / 255))));
        out[tIdx + 3] = Math.min(255, Math.round(avgA));
      } else {
        out[tIdx] = 0;
        out[tIdx + 1] = 0;
        out[tIdx + 2] = 0;
        out[tIdx + 3] = 0;
      }
    }
  }
  return out;
}

const png16 = encodePng(16, 16, downscale(16));
const png32 = encodePng(32, 32, downscale(32));
const png48 = encodePng(48, 48, downscale(48));
const png64 = encodePng(64, 64, downscale(64));

const faviconIco = encodeIco([
  { width: 16, height: 16, pngBuffer: png16 },
  { width: 32, height: 32, pngBuffer: png32 },
  { width: 48, height: 48, pngBuffer: png48 },
  { width: 64, height: 64, pngBuffer: png64 },
]);

// 4. Create SVG wrapper around the high-resolution transparent asset
const base64Data = favicon512Png.toString('base64');
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <title>Relay Gateway</title>
  <image href="data:image/png;base64,${base64Data}" width="512" height="512" />
</svg>
`;

// 5. Write outputs
const uiDir = join(root, 'src', 'ui');
const publicDir = join(root, 'client', 'public');
mkdirSync(publicDir, { recursive: true });

writeFileSync(join(uiDir, 'favicon.png'), favicon512Png);
writeFileSync(join(uiDir, 'favicon.svg'), faviconSvg);

writeFileSync(join(publicDir, 'favicon.ico'), faviconIco);
writeFileSync(join(publicDir, 'favicon.png'), favicon512Png);
writeFileSync(join(publicDir, 'favicon.svg'), faviconSvg);

console.log('Successfully generated square favicons (PNG, SVG, ICO)!');
