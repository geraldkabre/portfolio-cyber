// Captures several named camera shots from the world viewer (one page load, one screenshot per shot).
// Usage: node tools/e2e/shots.mjs <outDir> "<shots spec>" [--quality high] [--w 1600 --h 900] [--extra "&colliders"]
import fs from 'node:fs';
import path from 'node:path';
import { launch, BASE } from './shoot.mjs';

const [outDir, spec] = process.argv.slice(2);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const w = Number(arg('--w', 1600)), h = Number(arg('--h', 900));
const url = `${BASE}/tools/world-viewer/index.html?shots=${encodeURIComponent(spec)}&quality=${arg('--quality', 'high')}${arg('--extra', '')}`;
const { browser, page, logs } = await launch(w, h);
try {
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  const info = await page.evaluate(() => window.__info);
  console.log(JSON.stringify(info));
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of info.shots) {
    await page.evaluate((n) => window.__shot(n), name);
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  }
} catch (e) {
  console.error('FAILED', e.message);
  process.exitCode = 1;
} finally {
  const relevant = logs.filter((l) => !/\[vite\]|DevTools|favicon|Failed to load resource/.test(l));
  if (relevant.length) console.log(relevant.slice(0, 30).join('\n'));
  await browser.close();
}
