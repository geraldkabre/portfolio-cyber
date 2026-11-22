// Opens a page of the running Vite dev server in headless Microsoft Edge (real GPU) and saves a screenshot.
// Usage: node tools/e2e/shoot.mjs <path?query> <out.png> [--w 1600] [--h 1000] [--full] [--timeout 120000]
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';

export const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export const BASE = process.env.CV_BASE || 'http://127.0.0.1:5173';
export const GPU_ARGS = ['--headless=new', '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--enable-webgl', '--no-first-run'];

export async function launch(w = 1600, h = 1000) {
  const browser = await chromium.launch({ executablePath: EDGE, headless: false, args: [...GPU_ARGS, `--window-size=${w},${h}`] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  return { browser, page, logs };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('shoot.mjs')) {
  const [url, out] = process.argv.slice(2);
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const w = Number(arg('--w', 1600)), h = Number(arg('--h', 1000)), timeout = Number(arg('--timeout', 120000));
  const { browser, page, logs } = await launch(w, h);
  try {
    await page.goto(BASE + url, { waitUntil: 'load', timeout });
    await page.waitForFunction(() => window.__ready === true, null, { timeout });
    const info = await page.evaluate(() => window.__info);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, fullPage: process.argv.includes('--full') });
    console.log(JSON.stringify(info));
  } catch (e) {
    console.error('FAILED', e.message);
    process.exitCode = 1;
  } finally {
    const relevant = logs.filter((l) => !/Download the React DevTools|\[vite\]/.test(l));
    if (relevant.length) console.log(relevant.slice(0, 40).join('\n'));
    await browser.close();
  }
}
