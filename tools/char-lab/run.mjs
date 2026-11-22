// Runs a lab page in headless Edge (real GPU) and waits for its POST /result.
// Usage: node run.mjs <name> <model> [yawDeg] [map]
//   <model>: path under assets-source/, or lab:<path>, repo:<path> (repo root), out:<path> (LAB_OUT)
// Env: LAB_OUT (output dir), LAB_PAGE (default lab.html), LAB_EXTRA (extra query string, starts with &), LAB_TIMEOUT (ms)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [name, model = '', yaw = '0', map = 'auto'] = process.argv.slice(2);
const REPO = path.resolve(here, '..', '..');
const ASSETS = path.join(REPO, 'assets-source');
const OUT = process.env.LAB_OUT || path.join(here, 'out');
const PAGE = process.env.LAB_PAGE || 'lab.html';
const port = 8700 + Math.floor(Math.random() * 200);
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const modelUrl = (m) => {
  for (const [pre, mount] of [['lab:', '/lab/'], ['repo:', '/repo/'], ['out:', '/out/']]) if (m.startsWith(pre)) return mount + m.slice(pre.length);
  return '/assets/' + m;
};

const server = spawn(process.execPath, [path.join(here, 'server.mjs'), String(port), ASSETS, here, OUT, REPO]);
let browser;
const finish = (code) => { try { browser && browser.kill(); } catch {} try { server.kill(); } catch {} process.exit(code); };
const timer = setTimeout(() => { console.log('TIMEOUT'); finish(2); }, Number(process.env.LAB_TIMEOUT || 600000));
server.stdout.on('data', (d) => {
  const s = String(d); process.stdout.write(s);
  if (s.includes('SERVER_READY')) {
    const url = `http://127.0.0.1:${port}/lab/${PAGE}?name=${encodeURIComponent(name)}&model=${encodeURIComponent(modelUrl(model))}&yaw=${yaw}&map=${map}${process.env.LAB_EXTRA || ''}`;
    const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'charlab-'));
    browser = spawn(EDGE, ['--headless=new', `--user-data-dir=${prof}`, '--no-first-run', '--ignore-gpu-blocklist', '--enable-webgl',
      '--enable-unsafe-swiftshader', '--window-size=1600,1000', '--enable-logging=stderr', '--v=0', url], { stdio: ['ignore', 'ignore', 'pipe'] });
    browser.stderr.on('data', (d) => {
      const s = String(d);
      if (/CONSOLE|Uncaught/i.test(s) && !/ProtocolLaunch|chrome-extension/.test(s)) process.stderr.write(s);
    });
  }
  if (s.includes('RESULT_SAVED')) { clearTimeout(timer); setTimeout(() => finish(0), 300); }
});
server.stderr.on('data', (d) => process.stderr.write(d));
