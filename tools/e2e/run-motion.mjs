// Character motion quality in the real browser, at several frame rates: S-curve acceleration, frame-rate
// independent distance, smooth rendered trajectory, continuous blend weights (no pops), smooth turning and lean.
// Usage: node tools/e2e/run-motion.mjs [--fps native,30,20] [--operator male|female]
import { chromium } from 'playwright-core';
import { EDGE, GPU_ARGS, BASE } from './shoot.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const rates = arg('--fps', 'native,30,20').split(',');
const operator = arg('--operator', 'male');
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: EDGE, headless: false, args: [...GPU_ARGS, '--window-size=1280,720'] });

/** Records __cv.motion() on every rendered frame for `ms`. */
const record = (page, ms) => page.evaluate((ms) => new Promise((res) => {
  // Samples are stamped with the frame timestamp (the clock the engine integrates with), not performance.now().
  const out = []; let t0 = null;
  const f = (ts) => { if (t0 === null) t0 = ts; const m = window.__cv.motion(); if (m) out.push({ ...m, t: ts - t0 }); if (ts - t0 < ms) requestAnimationFrame(f); else res(out); };
  requestAnimationFrame(f);
}), ms);

const summary = {};
try {
  for (const fps of rates) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => { try { localStorage.setItem('cv.quality', 'low'); } catch { /* private mode */ } });
    if (fps !== 'native') {
      // Throttle requestAnimationFrame to the target rate (the engine and the recorder both use it).
      await page.addInitScript((target) => {
        // Every callback of an admitted frame runs (engine, recorder, UI); the frames in between are skipped.
        const raf = window.requestAnimationFrame.bind(window);
        const interval = 1000 / target;
        let next = 0; let admitted = -1;
        window.requestAnimationFrame = (cb) => raf(function wait(t) {
          if (t === admitted) { cb(t); return; }
          if (t >= next - 1) { admitted = t; next = Math.max(next + interval, t); cb(t); } else raf(wait);
        });
      }, Number(fps));
    }
    await page.goto(BASE + '/?mode=immersive', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__cv && window.__cv.state().phase === 'select', null, { timeout: 180000 });
    await page.evaluate((op) => window.__cv.confirm(op), operator);
    await page.waitForFunction(() => window.__cv.state().phase === 'play', null, { timeout: 30000 });
    const label = fps === 'native' ? 'native' : `${fps} fps`;

    // --- Straight run: rest -> W for 2.0 s -> release.
    await page.evaluate(() => { window.__cv.teleport(0, 0.5, 13, 0); window.__cv.setCamera(Math.PI, 0.26); });
    await sleep(900);
    await page.evaluate(() => window.__cv.speedTrace(true));
    const recP = record(page, 3700);
    await sleep(250);
    await page.keyboard.down('KeyW');
    await sleep(2000);
    await page.keyboard.up('KeyW');
    const run = await recP;
    const steps = await page.evaluate(() => window.__cv.speedTrace(false));
    const dts = run.slice(1).map((s, i) => s.t - run[i].t);
    const avgDt = dts.reduce((a, b) => a + b, 0) / dts.length;
    const press = run.find((s) => s.speed > 0.001);
    const dist = Math.hypot(run[run.length - 1].x - run[0].x, run[run.length - 1].z - run[0].z);
    // S-curve, on the fixed 60 Hz physics steps: the first step's acceleration is well below the later peak.
    const first = steps.findIndex((v) => v > 1e-4);
    const acc = steps.slice(1).map((v, i) => (v - steps[i]) * 60);
    const peak = Math.max(...acc);
    const early = first > 0 ? (steps[first] - steps[first - 1]) * 60 : NaN;
    // Rendered trajectory during steady running: speed measured from the drawn positions stays even.
    const steady = run.filter((s) => press && s.t > press.t + 1100 && s.t < press.t + 1900);
    const vr = steady.slice(1).map((s, i) => Math.hypot(s.x - steady[i].x, s.z - steady[i].z) / ((s.t - steady[i].t) / 1000));
    const mean = vr.reduce((a, b) => a + b, 0) / vr.length;
    const cv = Math.sqrt(vr.reduce((a, b) => a + (b - mean) ** 2, 0) / vr.length) / mean;
    // Blend weights: always sum to 1 and change gradually (rate per second).
    const sums = run.map((s) => Object.values(s.weights).reduce((a, b) => a + b, 0));
    const wRate = Math.max(...run.slice(1).map((s, i) => Math.max(...Object.keys(s.weights).map((k) => Math.abs(s.weights[k] - run[i].weights[k]))) / ((s.t - run[i].t) / 1000)));
    summary[label] = { fps: +(1000 / avgDt).toFixed(1), dist: +dist.toFixed(3) };
    check(`${label}: renders at the target rate`, fps === 'native' || Math.abs(1000 / avgDt - Number(fps)) < Number(fps) * 0.25, `${(1000 / avgDt).toFixed(1)} fps`);
    check(`${label}: smooth start (S-curve: early acceleration ≪ peak)`, early < peak * 0.5 && peak < 25, `first step ${early.toFixed(1)} m/s² vs peak ${peak.toFixed(1)} m/s²`);
    check(`${label}: even rendered speed while running (no jitter)`, cv < 0.06 && Math.abs(mean - 4.3) < 0.25, `mean ${mean.toFixed(2)} m/s, variation ${(cv * 100).toFixed(1)} %`);
    check(`${label}: blend weights sum to 1 and never pop`, sums.every((v) => Math.abs(v - 1) < 0.01) && wRate < 9, `max weight change ${wRate.toFixed(2)}/s`);
    check(`${label}: natural stop (decelerates, then idles)`, run[run.length - 1].speed < 0.05 && run[run.length - 1].gait === 'idle', `final speed ${run[run.length - 1].speed.toFixed(3)}`);

    // --- Speeds: walk (C), run, sprint (Shift) -> the matching loop dominates the blend.
    const dominant = (w) => Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
    const gaits = {};
    for (const [name, keys] of [['walk', ['KeyW']], ['run', ['KeyW']], ['sprint', ['ShiftLeft', 'KeyW']]]) {
      await page.evaluate(() => { window.__cv.teleport(0, 0.5, 13, 0); window.__cv.setCamera(Math.PI, 0.26); });
      if (name === 'walk') await page.keyboard.press('KeyC');
      await sleep(500);
      for (const k of keys) await page.keyboard.down(k);
      await sleep(name === 'walk' ? 1500 : 1700);
      const m = await page.evaluate(() => window.__cv.motion());
      for (const k of [...keys].reverse()) await page.keyboard.up(k);
      if (name === 'walk') await page.keyboard.press('KeyC');
      gaits[name] = { speed: +m.speed.toFixed(2), dominant: dominant(m.weights), w: +Math.max(...Object.values(m.weights)).toFixed(2) };
      await sleep(900);
    }
    check(`${label}: walk / run / sprint each drive their own loop`, gaits.walk.dominant === 'walk' && gaits.run.dominant === 'run' && gaits.sprint.dominant === 'sprint' && gaits.sprint.speed > 6, JSON.stringify(gaits));

    // --- Turning: run forward, then hold A (camera-relative left) -> smooth yaw, lean into the turn.
    await page.evaluate(() => { window.__cv.teleport(0, 0.5, 0, 0); window.__cv.setCamera(Math.PI, 0.26); });
    await sleep(600);
    await page.evaluate(() => window.__cv.teleport(-12, 0.5, 4, 0));
    await page.evaluate(() => window.__cv.setCamera(Math.PI, 0.26));
    await sleep(500);
    const recT = record(page, 2600);
    await page.keyboard.down('KeyW');
    await sleep(900);
    await page.keyboard.down('KeyA');
    await sleep(900);
    await page.keyboard.up('KeyA');
    await page.keyboard.up('KeyW');
    const turn = await recT;
    const dyaw = turn.slice(1).map((s, i) => { let d = s.yaw - turn[i].yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); return Math.abs(d) / ((s.t - turn[i].t) / 1000); });
    const maxLean = Math.max(...turn.map((s) => Math.abs(s.lean)));
    const signed = turn.reduce((best, s) => (Math.abs(s.lean) > Math.abs(best) ? s.lean : best), 0);
    check(`${label}: smooth turning (bounded yaw rate) with a capped lean into the turn`, Math.max(...dyaw) < 7 && maxLean > 0.02 && maxLean <= 0.141 && signed < 0, `max yaw rate ${Math.max(...dyaw).toFixed(2)} rad/s, max lean ${(maxLean * 57.3).toFixed(1)}° (${signed < 0 ? 'into the left turn' : 'wrong side'})`);
    check(`${label}: no errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
  const d = Object.values(summary).map((s) => s.dist);
  const spread = (Math.max(...d) - Math.min(...d)) / Math.max(...d);
  check('frame-rate independence: same distance for the same 2 s input at every frame rate', spread < 0.04, JSON.stringify(summary));
} catch (e) {
  check('scenario completed', false, e.stack?.split('\n').slice(0, 3).join(' '));
} finally {
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exitCode = failed ? 1 : 0;
}
