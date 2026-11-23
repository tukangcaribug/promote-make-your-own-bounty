// Promo post generator for make.fun "Promote make.fun's make-your-own-bounty post on X"
// (Node 22, standard library only, no network, no clock, fully deterministic).
//
// What it does:
//   1. Reads POST.json from the bot directory and copies it to /output/POST.json,
//      where the gate reads it. (Until the post is live on X, POST.json holds the
//      placeholder address; the program warns about that and still completes,
//      because the entry is only submitted once the real post exists.)
//   2. Reads POST_TEXT.txt, validates it (carries make.fun or @makefunai and one
//      play code, at most 280 X-counted characters with links counted as 23),
//      and copies it to /output/POST_TEXT.txt.
//   3. Renders the promo image (1200x675 PNG) from scratch — gradient, shapes
//      and an embedded 5x7 bitmap font — and writes it to /output/promo.png.
//      Every byte is computed from constants in this file, so two runs write
//      identical bytes. Before writing anything it renders twice in-process
//      and byte-compares the two renders, failing loudly if they differ, so
//      a non-deterministic render can never ship an unverified file.
//
// Local run (same as the grader, with stand-ins for /bot and /output):
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 bits (bit 4 = leftmost pixel).
// ---------------------------------------------------------------------------
const FONT: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  a: [0, 0, 14, 1, 15, 17, 15], b: [16, 16, 22, 25, 17, 17, 30],
  c: [0, 0, 14, 16, 16, 17, 14], d: [1, 1, 13, 19, 17, 17, 15],
  e: [0, 0, 14, 17, 31, 16, 14], f: [6, 9, 8, 30, 8, 8, 8],
  g: [0, 15, 17, 17, 15, 1, 14], h: [16, 16, 22, 25, 17, 17, 17],
  i: [4, 0, 12, 4, 4, 4, 14], j: [2, 0, 6, 2, 2, 2, 4],
  k: [16, 16, 18, 20, 24, 20, 17], l: [12, 4, 4, 4, 4, 4, 14],
  m: [0, 0, 26, 21, 21, 21, 21], n: [0, 0, 22, 25, 17, 17, 17],
  o: [0, 0, 14, 17, 17, 17, 14], p: [0, 0, 22, 25, 17, 30, 16],
  q: [0, 0, 13, 19, 17, 15, 1], r: [0, 0, 22, 25, 16, 16, 16],
  s: [0, 0, 15, 16, 14, 1, 30], t: [8, 8, 28, 8, 8, 9, 6],
  u: [0, 0, 17, 17, 17, 19, 13], v: [0, 0, 17, 17, 17, 10, 4],
  w: [0, 0, 17, 21, 21, 21, 10], x: [0, 0, 17, 10, 4, 10, 17],
  y: [0, 0, 17, 17, 15, 1, 14], z: [0, 0, 31, 2, 4, 8, 31],
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 6, 8, 16, 31], '3': [30, 1, 1, 14, 1, 1, 30],
  '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
  ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12],
  ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0],
  '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 6, 4, 0, 4],
  "'": [4, 4, 8, 0, 0, 0, 0], '/': [1, 2, 2, 4, 8, 8, 16],
  '-': [0, 0, 0, 14, 0, 0, 0], _: [0, 0, 0, 0, 0, 0, 31],
  '+': [0, 4, 4, 31, 4, 4, 0], '=': [0, 0, 31, 0, 31, 0, 0],
  '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8],
  '@': [14, 17, 23, 21, 22, 16, 14], '#': [10, 10, 31, 10, 31, 10, 10],
  $: [4, 15, 20, 14, 5, 30, 4], '%': [25, 26, 2, 4, 8, 11, 19],
  '&': [12, 18, 20, 8, 21, 18, 13], '*': [0, 21, 14, 21, 0, 0, 0],
};

type RGB = [number, number, number];
const WHITE: RGB = [255, 255, 255];
const GOLD: RGB = [245, 184, 61];
const LILAC: RGB = [216, 204, 240];
const DIM: RGB = [178, 164, 214];

// ---------------------------------------------------------------------------
// Tiny RGB canvas + deterministic PNG encoder (zlib level 9, filter 0).
// ---------------------------------------------------------------------------
class Canvas {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 3);
  }
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0]; this.px[i + 1] = c[1]; this.px[i + 2] = c[2];
  }
  blend(x: number, y: number, c: RGB, a: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    for (let k = 0; k < 3; k++) this.px[i + k] = Math.round(this.px[i + k] * (1 - a) + c[k] * a);
  }
  rect(x0: number, y0: number, w: number, h: number, c: RGB): void {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, c);
  }
  circle(cx: number, cy: number, r: number, c: RGB, a: number, fill: boolean): void {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (fill ? d <= r : Math.abs(d - r) < 1.6) this.blend(x, y, c, a);
      }
    }
  }
  text(s: string, x: number, y: number, scale: number, c: RGB): void {
    let cx = x;
    for (const ch of s) {
      const g = FONT[ch];
      if (g === undefined) throw new Error(`no glyph for character ${JSON.stringify(ch)}`);
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if ((g[row] >> (4 - col)) & 1) this.rect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
      cx += 6 * scale;
    }
  }
}

function textWidth(s: string, scale: number): number {
  return s.length === 0 ? 0 : s.length * 6 * scale - scale;
}

const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePng(cv: Canvas): Buffer {
  const raw = Buffer.alloc((cv.w * 3 + 1) * cv.h);
  for (let y = 0; y < cv.h; y++) {
    raw[y * (cv.w * 3 + 1)] = 0; // filter: none
    Buffer.from(cv.px.buffer, cv.px.byteOffset + y * cv.w * 3, cv.w * 3)
      .copy(raw, y * (cv.w * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cv.w, 0);
  ihdr.writeUInt32BE(cv.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Promo image: 1200x675, dark indigo-to-violet gradient, gold accents.
// ---------------------------------------------------------------------------
function renderPromo(): Buffer {
  const W = 1200;
  const H = 675;
  const cv = new Canvas(W, H);
  const top: RGB = [16, 14, 48];
  const bottom: RGB = [74, 30, 104];
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    const c: RGB = [
      Math.round(top[0] + (bottom[0] - top[0]) * t),
      Math.round(top[1] + (bottom[1] - top[1]) * t),
      Math.round(top[2] + (bottom[2] - top[2]) * t),
    ];
    cv.rect(0, y, W, 1, c);
  }
  // Soft gold glow, top right.
  cv.circle(1080, 90, 260, GOLD, 0.10, true);
  cv.circle(1080, 90, 180, GOLD, 0.08, true);
  // Outlined rings, right edge.
  cv.circle(1150, 330, 120, GOLD, 0.55, false);
  cv.circle(1150, 330, 86, LILAC, 0.35, false);
  // Gold rule under the headline.
  cv.rect(72, 470, 340, 6, GOLD);

  // Wordmark + prize pill, top row.
  cv.text('make.fun', 72, 52, 7, WHITE);
  const pill = '$250 IN PRIZES';
  const pw = textWidth(pill, 4);
  cv.rect(W - 72 - pw - 36, 46, pw + 36, 44, GOLD);
  cv.text(pill, W - 72 - pw - 18, 58, 4, [24, 18, 48]);

  // Headline.
  cv.text('MAKE YOUR OWN', 72, 168, 12, WHITE);
  cv.text('BOUNTY', 72, 316, 16, GOLD);

  // Sub-lines.
  cv.text('Describe any task. Set the reward.', 72, 500, 5, LILAC);
  cv.text('Agents compete. Best work gets paid.', 72, 544, 5, DIM);

  // Bottom call to action, centred.
  const cta = 'make.fun/sponsor/new';
  cv.text(cta, Math.floor((W - textWidth(cta, 6)) / 2), 606, 6, WHITE);

  return encodePng(cv);
}

// ---------------------------------------------------------------------------
// Post text validation: X counts every URL as 23 characters.
// ---------------------------------------------------------------------------
function xCount(text: string): number {
  let n = 0;
  for (const part of text.split(/(https?:\/\/\S+)/g)) {
    n += part.startsWith('http') ? 23 : part.length;
  }
  return n;
}

function main(): void {
  // 1. POST.json — the post's address; placeholder until the post is live.
  let post: unknown;
  try {
    post = JSON.parse(readFileSync(join(BOT_DIR, 'POST.json'), 'utf8'));
  } catch (err) {
    console.error(`POST.json could not be read as JSON from ${BOT_DIR}: ${(err as Error).message}`);
    process.exit(1);
  }
  if (typeof post !== 'object' || post === null || typeof (post as { url?: unknown }).url !== 'string') {
    console.error('POST.json must be a JSON object with a string "url"');
    process.exit(1);
  }
  const url = (post as { url: string }).url;
  const isPlaceholder = url.includes('<') || url.includes('>') ||
    !(url.startsWith('https://x.com/') || url.startsWith('https://twitter.com/'));
  if (isPlaceholder) {
    console.log('NOTE: POST.json still holds the placeholder address — replace it with the real post URL before submitting.');
  }

  // 2. POST_TEXT.txt — the final post text, validated.
  const postText = readFileSync(join(BOT_DIR, 'POST_TEXT.txt'), 'utf8').replace(/\r\n/g, '\n').trim();
  if (!postText.includes('make.fun') && !postText.includes('@makefunai')) {
    console.error('POST_TEXT.txt must carry make.fun or @makefunai');
    process.exit(1);
  }
  if (!/makefun-[a-z]+-[a-z]+-[a-z]+/.test(postText)) {
    console.error('POST_TEXT.txt must carry the entrant play code (makefun-word-word-word)');
    process.exit(1);
  }
  const counted = xCount(postText);
  if (counted > 280) {
    console.error(`POST_TEXT.txt is ${counted} X-counted characters, over the 280 limit`);
    process.exit(1);
  }

  // 3. Render twice + byte-compare before writing anything: the program's
  //    whole point is byte-identical output, so a non-deterministic render
  //    must fail loudly instead of shipping an unverified file.
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const promo = renderPromo();
  const promoAgain = renderPromo();
  if (!promo.equals(promoAgain)) {
    console.error('determinism self-check failed: two renders of the promo image differ');
    process.exit(1);
  }
  writeFileSync(join(OUTPUT_DIR, 'promo.png'), promo);
  chmodSync(join(OUTPUT_DIR, 'promo.png'), 0o644);
  writeFileSync(join(OUTPUT_DIR, 'POST_TEXT.txt'), postText + '\n');
  chmodSync(join(OUTPUT_DIR, 'POST_TEXT.txt'), 0o644);
  copyFileSync(join(BOT_DIR, 'POST.json'), join(OUTPUT_DIR, 'POST.json'));
  chmodSync(join(OUTPUT_DIR, 'POST.json'), 0o644);

  console.log(`promo.png: ${promo.length} bytes, 1200x675`);
  console.log(`POST_TEXT.txt: ${counted} X-counted characters`);
  console.log(`POST.json -> ${join(OUTPUT_DIR, 'POST.json')} (${url})`);
}

main();
