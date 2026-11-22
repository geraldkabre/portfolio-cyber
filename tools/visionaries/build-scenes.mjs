// Builds the nine Visionaries scene images (Recruiter Mode hero) from real renders of the 3D campus.
//
//   node tools/visionaries/build-scenes.mjs --render   # renders the shots with the world viewer (needs `npm run dev`)
//   node tools/visionaries/build-scenes.mjs            # converts the last renders only
//
// Output: public/assets/visionaries/<id>.jpg (backdrop, 1920 px) and <id>-thumb.jpg (disc, 800 px),
// plus the accent colour sampled from the brightest pixels of each render (printed, pasted into scenes.ts).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/** Camera shots of the world viewer: name:camera:target:active district. */
export const SHOTS = {
  profile: '0,4.5,38:0,9,0:command',
  education: '125,25,25:150,-2,0:academy',
  experience: '-77.8,4.5,-134.8:-85.3,2.5,-147.8:missions',
  projects: '-139,9,0:-156,5.5,0:research',
  certifications: '-102.2,3.5,121.8:-112.2,1.5,133.7:vault',
  rootme: '-88,22,112:-109.3,-4,130.2:vault',
  skills: '80.0,8.5,-138.5:87.6,4.5,-151.7:soc',
  languages: '0,70,150:0,0,-40:command',
  contact: '99.6,9,118.7:109.4,10,130.4:comms',
};

const raw = 'test-results/visionaries/raw';
const out = 'public/assets/visionaries';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const only = arg('--only', '');

if (process.argv.includes('--render')) {
  const entries = Object.entries(SHOTS).filter(([id]) => !only || only.split(',').includes(id));
  const spec = entries.map(([id, s]) => `${id}:${s}`).join(';');
  execFileSync('node', ['tools/e2e/shots.mjs', raw, spec, '--w', '1920', '--h', '1080', '--quality', arg('--quality', 'high')], { stdio: 'inherit' });
}

fs.mkdirSync(out, { recursive: true });
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
let total = 0;
for (const id of Object.keys(SHOTS)) {
  const src = path.join(raw, `${id}.png`);
  if (!fs.existsSync(src)) { console.log('missing', src); continue; }
  await sharp(src).resize({ width: 1920 }).jpeg({ quality: 78, mozjpeg: true, chromaSubsampling: '4:2:0' }).toFile(path.join(out, `${id}.jpg`));
  await sharp(src).resize({ width: 800 }).jpeg({ quality: 74, mozjpeg: true }).toFile(path.join(out, `${id}-thumb.jpg`));
  // Accent: mean colour of the brightest 3 % of a downscaled copy (the glowing element of the scene).
  const { data, info } = await sharp(src).resize(160, 90).raw().toBuffer({ resolveWithObject: true });
  const px = [];
  for (let i = 0; i < data.length; i += info.channels) px.push([data[i], data[i + 1], data[i + 2], 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]]);
  px.sort((a, b) => b[3] - a[3]);
  const top = px.slice(0, Math.max(1, Math.round(px.length * 0.03)));
  const m = [0, 1, 2].map((c) => top.reduce((s, p) => s + p[c], 0) / top.length);
  const size = fs.statSync(path.join(out, `${id}.jpg`)).size + fs.statSync(path.join(out, `${id}-thumb.jpg`)).size;
  total += size;
  console.log(`${id.padEnd(15)} accent ${hex(...m)}  ${(size / 1024).toFixed(0)} KB`);
}
console.log(`total ${(total / 1048576).toFixed(2)} MB`);
