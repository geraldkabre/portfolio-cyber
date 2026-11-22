// Frame-time profiling of the real app: one reference view, several render configurations.
// Usage: node tools/e2e/perf.mjs [--w 1600 --h 900] [--quality high] [--configs all|presets] [--view spawn|hall|aerial]
import { launch, BASE } from './shoot.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const W = Number(arg('--w', 1600)), H = Number(arg('--h', 900));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { browser, page, logs } = await launch(W, H);
await page.addInitScript((q) => { try { localStorage.setItem('cv.quality', q); } catch {} }, arg('--quality', 'high'));
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__cv && window.__cv.state().phase === 'select', null, { timeout: 180000 });
await page.evaluate(() => window.__cv.confirm('female'));
await page.waitForFunction(() => window.__cv.state().phase === 'play', null, { timeout: 20000 });
const view = arg('--view', 'spawn');
await page.evaluate((v) => {
  if (v === 'hall') { window.__cv.teleport(0, 0.5, 6, Math.PI); window.__cv.setCamera(0, 0.25, 4.6); }
  else { window.__cv.teleport(0, 0, 25, Math.PI); window.__cv.setCamera(0, 0.32, 4.6); }
}, view);
if (!process.argv.includes('--auto')) await page.evaluate(() => window.__cv.autoRes(false));
await sleep(1500);

async function measure(ms = 3000) {
  return page.evaluate((ms) => new Promise((resolve) => {
    const d = []; let last = performance.now(); const end = last + ms;
    const f = (now) => { d.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else {
      d.sort((a, b) => a - b); const avg = d.reduce((s, v) => s + v, 0) / d.length;
      const st = window.__cv.state().stats;
      resolve({ scale: st.renderScale, fps: +(1000 / avg).toFixed(1), avgMs: +avg.toFixed(1), p95: +d[Math.floor(d.length * 0.95)].toFixed(1), cpuMs: +st.cpuMs.toFixed(1), calls: st.drawCalls, tris: st.triangles });
    } };
    requestAnimationFrame(f);
  }), ms);
}

const reset = async () => page.evaluate(() => {
  const c = window.__cv; c.override({ bloom: true, msaa: 4, shadowMapSize: 2048 });
  for (const n of ['sky', 'cloud-sea', 'districts', 'island', 'nexus-static', 'cc-dynamic', 'dest-dynamic', 'props-dynamic']) c.show(n, true);
  c.motes(true); c.pointLights(true);
});
const ALL = ['sky', 'cloud-sea', 'districts', 'island', 'nexus-static', 'cc-dynamic', 'dest-dynamic', 'props-dynamic'];
const floor = [
  ['everything off', (c) => { for (const n of ['sky', 'cloud-sea', 'districts', 'island', 'nexus-static', 'cc-dynamic', 'dest-dynamic', 'props-dynamic']) c.show(n, false); c.motes(false); c.pointLights(false); c.override({ bloom: false, msaa: 0, shadowMapSize: 0 }); }],
  ['post only (bloom+msaa4)', (c) => { for (const n of ['sky', 'cloud-sea', 'districts', 'island', 'nexus-static', 'cc-dynamic', 'dest-dynamic', 'props-dynamic']) c.show(n, false); c.motes(false); c.pointLights(false); c.override({ shadowMapSize: 0 }); }],
  ['world, no post, no shadow', (c) => c.override({ bloom: false, msaa: 0, shadowMapSize: 0 })],
  ['world, bloom, msaa0, no shadow', (c) => c.override({ msaa: 0, shadowMapSize: 0 })],
];
void ALL;
const adaptive = [
  ['high + adaptive (settled)', async (c) => { c.quality('high'); c.autoRes(true); }],
  ['medium + adaptive (settled)', async (c) => { c.quality('medium'); c.autoRes(true); }],
];
const configs = arg('--configs', 'all') === 'adaptive' ? adaptive : arg('--configs', 'all') === 'floor' ? floor : arg('--configs', 'all') === 'presets'
  ? [['preset high', (c) => c.quality('high')], ['preset medium', (c) => c.quality('medium')], ['preset low', (c) => c.quality('low')]]
  : [
    ['baseline (high)', () => {}],
    ['bloom off', (c) => c.override({ bloom: false })],
    ['msaa 0 (+SMAA)', (c) => c.override({ msaa: 0 })],
    ['shadows off', (c) => c.override({ shadowMapSize: 0 })],
    ['sky hidden', (c) => c.show('sky', false)],
    ['clouds hidden', (c) => c.show('cloud-sea', false)],
    ['districts hidden', (c) => c.show('districts', false)],
    ['motes hidden', (c) => c.motes(false)],
    ['point lights off', (c) => c.pointLights(false)],
    ['cc-dynamic hidden', (c) => c.show('cc-dynamic', false)],
    ['static batch hidden', (c) => c.show('nexus-static', false)],
    ['island hidden', (c) => c.show('island', false)],
  ];
const rows = [];
for (const [name, fn] of configs) {
  await reset();
  await page.evaluate(`(${fn.toString()})(window.__cv)`);
  await sleep(name.includes('adaptive') ? 12000 : 800);
  const r = await measure(name.includes('adaptive') ? 5000 : 3000);
  rows.push({ config: name, ...r });
  console.log(name.padEnd(22), JSON.stringify(r));
}
await browser.close();
const errs = logs.filter((l) => /error/i.test(l) && !/favicon|Failed to load/.test(l));
if (errs.length) console.log(errs.slice(0, 5).join('\n'));
