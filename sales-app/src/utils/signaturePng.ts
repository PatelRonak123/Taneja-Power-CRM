/**
 * Lightweight pure-JavaScript PNG generator for digital signatures.
 * Requires 0 native modules and 0 external dependencies.
 * Produces standard RFC 2083 / RFC 1950 PNG data URIs supported by:
 * - React Native <Image>
 * - Node.js / PDFKit
 * - Browsers & CRM web client
 */

// Precomputed CRC32 table
const CRC_TABLE: number[] = new Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function crc32(buf: Uint8Array, offset = 0, length = buf.length - offset): number {
  let c = 0xffffffff;
  for (let i = offset; i < offset + length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(buf: Uint8Array): number {
  let s1 = 1;
  let s2 = 0;
  for (let i = 0; i < buf.length; i++) {
    s1 = (s1 + buf[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  return ((s2 << 16) | s1) >>> 0;
}

/**
 * Creates an 8-bit grayscale PNG binary buffer from pixel array (0=black ink, 255=white paper)
 */
export function createGrayscalePng(width: number, height: number, pixels: Uint8Array): Uint8Array {
  const rowBytes = width;
  const rawData = new Uint8Array(height * (1 + rowBytes));
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (1 + rowBytes);
    rawData[rawOffset] = 0; // Filter Type: None
    const pixelOffset = y * width;
    rawData.set(pixels.subarray(pixelOffset, pixelOffset + width), rawOffset + 1);
  }

  // Deflate stream using uncompressed (type 00) blocks of max 65535 bytes
  const maxBlockSize = 65535;
  const numBlocks = Math.ceil(rawData.length / maxBlockSize) || 1;
  const idatDataSize = 2 + numBlocks * 5 + rawData.length + 4;
  const idatData = new Uint8Array(idatDataSize);

  // zlib header
  idatData[0] = 0x78;
  idatData[1] = 0x01;

  let offset = 2;
  let remaining = rawData.length;
  let rawIdx = 0;

  for (let b = 0; b < numBlocks; b++) {
    const blockSize = Math.min(remaining, maxBlockSize);
    const isFinal = b === numBlocks - 1 ? 1 : 0;
    idatData[offset++] = isFinal;
    idatData[offset++] = blockSize & 0xff;
    idatData[offset++] = (blockSize >> 8) & 0xff;
    const nlen = (~blockSize) & 0xffff;
    idatData[offset++] = nlen & 0xff;
    idatData[offset++] = (nlen >> 8) & 0xff;

    idatData.set(rawData.subarray(rawIdx, rawIdx + blockSize), offset);
    offset += blockSize;
    rawIdx += blockSize;
    remaining -= blockSize;
  }

  // Adler32 checksum
  const adler = adler32(rawData);
  idatData[offset++] = (adler >> 24) & 0xff;
  idatData[offset++] = (adler >> 16) & 0xff;
  idatData[offset++] = (adler >> 8) & 0xff;
  idatData[offset++] = adler & 0xff;

  // Build complete PNG (Signature + IHDR + IDAT + IEND)
  const totalLength = 8 + 25 + (12 + idatData.length) + 12;
  const png = new Uint8Array(totalLength);
  let p = 0;

  // PNG Signature
  png.set([137, 80, 78, 71, 13, 10, 26, 10], p);
  p += 8;

  // IHDR chunk
  const ihdrData = new Uint8Array(17);
  ihdrData.set([0x49, 0x48, 0x44, 0x52], 0); // 'IHDR'
  ihdrData[4] = (width >> 24) & 0xff;
  ihdrData[5] = (width >> 16) & 0xff;
  ihdrData[6] = (width >> 8) & 0xff;
  ihdrData[7] = width & 0xff;
  ihdrData[8] = (height >> 24) & 0xff;
  ihdrData[9] = (height >> 16) & 0xff;
  ihdrData[10] = (height >> 8) & 0xff;
  ihdrData[11] = height & 0xff;
  ihdrData[12] = 8; // 8 bits per pixel
  ihdrData[13] = 0; // Grayscale
  ihdrData[14] = 0; // Compression
  ihdrData[15] = 0; // Filter
  ihdrData[16] = 0; // Interlace

  png[p++] = 0; png[p++] = 0; png[p++] = 0; png[p++] = 13;
  png.set(ihdrData, p);
  p += 17;
  const ihdrCrc = crc32(ihdrData);
  png[p++] = (ihdrCrc >> 24) & 0xff;
  png[p++] = (ihdrCrc >> 16) & 0xff;
  png[p++] = (ihdrCrc >> 8) & 0xff;
  png[p++] = ihdrCrc & 0xff;

  // IDAT chunk
  const idatLen = idatData.length;
  png[p++] = (idatLen >> 24) & 0xff;
  png[p++] = (idatLen >> 16) & 0xff;
  png[p++] = (idatLen >> 8) & 0xff;
  png[p++] = idatLen & 0xff;
  const idatChunk = new Uint8Array(4 + idatLen);
  idatChunk.set([0x49, 0x44, 0x41, 0x54], 0); // 'IDAT'
  idatChunk.set(idatData, 4);
  png.set(idatChunk, p);
  p += 4 + idatLen;
  const idatCrc = crc32(idatChunk);
  png[p++] = (idatCrc >> 24) & 0xff;
  png[p++] = (idatCrc >> 16) & 0xff;
  png[p++] = (idatCrc >> 8) & 0xff;
  png[p++] = idatCrc & 0xff;

  // IEND chunk
  png[p++] = 0; png[p++] = 0; png[p++] = 0; png[p++] = 0;
  const iendData = new Uint8Array([0x49, 0x45, 0x4e, 0x44]); // 'IEND'
  png.set(iendData, p);
  p += 4;
  const iendCrc = crc32(iendData);
  png[p++] = (iendCrc >> 24) & 0xff;
  png[p++] = (iendCrc >> 16) & 0xff;
  png[p++] = (iendCrc >> 8) & 0xff;
  png[p++] = iendCrc & 0xff;

  return png;
}

/**
 * Encodes Uint8Array binary into standard base64 string in pure JS
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    base64 += chars[b1 >> 2];
    base64 += chars[((b1 & 3) << 4) | (b2 >> 4)];
    base64 += i + 1 < len ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    base64 += i + 2 < len ? chars[b3 & 63] : '=';
  }
  return base64;
}

/**
 * Draws a line segment between (x0, y0) and (x1, y1) with thickness into a grayscale pixel buffer.
 */
function drawThickLine(
  pixels: Uint8Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number = 3
) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let curX = x0;
  let curY = y0;
  const radius = Math.floor(thickness / 2);

  while (true) {
    // Draw brush disc at (curX, curY)
    for (let rY = -radius; rY <= radius; rY++) {
      for (let rX = -radius; rX <= radius; rX++) {
        if (rX * rX + rY * rY <= radius * radius + 1) {
          const px = Math.round(curX + rX);
          const py = Math.round(curY + rY);
          if (px >= 0 && px < width && py >= 0 && py < height) {
            pixels[py * width + px] = 15; // Dark ink
          }
        }
      }
    }

    if (Math.abs(curX - x1) < 1 && Math.abs(curY - y1) < 1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      curX += sx;
    }
    if (e2 < dx) {
      err += dx;
      curY += sy;
    }
  }
}

/**
 * Converts SVG path strings (M x y L x y ...) into a valid PNG Data URI:
 * "data:image/png;base64,..."
 */
export function convertPathsToPngDataUrl(
  paths: string[],
  width = 350,
  height = 180,
  lineThickness = 3
): string {
  const pixels = new Uint8Array(width * height);
  pixels.fill(255); // Crisp clean white background

  for (const pathStr of paths) {
    if (!pathStr || typeof pathStr !== 'string') continue;

    // Tokens: e.g. ["M", "10", "20", "L", "15", "25", "L", ...]
    const tokens = pathStr.trim().split(/\s+/);
    let lastX = -1;
    let lastY = -1;
    let i = 0;

    while (i < tokens.length) {
      const cmd = tokens[i];
      if (cmd === 'M' && i + 2 < tokens.length) {
        lastX = parseFloat(tokens[i + 1]);
        lastY = parseFloat(tokens[i + 2]);
        i += 3;
      } else if (cmd === 'L' && i + 2 < tokens.length) {
        const nextX = parseFloat(tokens[i + 1]);
        const nextY = parseFloat(tokens[i + 2]);
        if (lastX >= 0 && lastY >= 0) {
          drawThickLine(pixels, width, height, lastX, lastY, nextX, nextY, lineThickness);
        }
        lastX = nextX;
        lastY = nextY;
        i += 3;
      } else {
        i++;
      }
    }
  }

  const pngBytes = createGrayscalePng(width, height, pixels);
  const base64 = uint8ArrayToBase64(pngBytes);
  return `data:image/png;base64,${base64}`;
}
