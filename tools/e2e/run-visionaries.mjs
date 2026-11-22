// Visionaries (Recruiter Mode hero) — geometry, entrance, rotation physics, every input mode, glass refraction,
// fallbacks, reduced motion and phone touch, in headless Edge with the real GPU.
// Usage: node tools/e2e/run-visionaries.mjs [--out test-results/e2e-vis] [--only desktop,glass,fallback,reduced,phone]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright-core';
import { EDGE, GPU_ARGS, BASE } from './shoot.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const out = arg('--out', 'test-results/e2e-vis');
const only = arg('--only', 'desktop,glass,fallback,reduced,phone').split(',');
fs.mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const browser = await chromium.launch({ executablePath: EDGE, headless: false, args: [...GPU_ARGS, '--window-size=1440,900'] });

async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport ?? { width: 1440, height: 900 }, ...opts.context });
  const page = await ctx.newPage();
  const logs = [];
  const bad = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  if (opts.reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(BASE + '/recruiter/' + (opts.query ?? ''), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__vis && window.__vis.state.entranceStart + window.__vis.state.enter > 0, null, { timeout: 30000 });
  // The recruiter page is now one screen tall: a spacer stands in for content below the stage, so the checks can
  // prove the stage never traps page scrolling and stops its GPU work once scrolled away.
  await page.evaluate(() => { const s = document.createElement('div'); s.id = 'test-spacer'; s.style.height = '2400px'; document.body.appendChild(s); });
  return { ctx, page, logs, bad };
}
const vis = (page) => page.evaluate(() => window.__vis.state);
const hold = (page) => page.evaluate(() => window.__vis.markInput());
const waitSettled = (page, timeout = 4000) => page.waitForFunction(() => { const s = window.__vis.state; return s.entranceDone && !s.tweening && !s.dragging; }, null, { timeout });
/** Records (t, pos, focal) every animation frame for `ms`, after running `action` in the page. */
const record = (page, ms, action = '') => page.evaluate(([ms, action]) => new Promise((res) => {
  const outp = []; const t0 = performance.now();
  if (action) (0, eval)(action);
  const f = () => { const s = window.__vis.state; const tw = window.__vis.tween; outp.push([performance.now() - t0, s.pos, s.focal, performance.now(), tw ? tw.start : null]); if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(outp); };
  requestAnimationFrame(f);
}), [ms, action]);

/** Every disc where §5/§6 say it should be (true circle, focal 1.18× and lifted 7 px). */
async function geometry(page, label) {
  const g = await page.evaluate(() => {
    const root = document.querySelector('.vis-root').getBoundingClientRect();
    const s = window.__vis.state;
    const discs = [...document.querySelectorAll('.vis-med')].map((m) => { const r = m.getBoundingClientRect(); return { x: r.left + r.width / 2 - root.left, y: r.top + r.height / 2 - root.top, w: r.width }; });
    return { W: root.width, H: root.height, s, discs };
  });
  const { W, H, s, discs } = g;
  const L = s.layout;
  const N = 9;
  let maxErr = 0; let maxW = 0;
  const wrap = (d) => { let o = (((d % N) + N + N / 2) % N) - N / 2; if (o === -N / 2) o = N / 2; return o; };
  discs.forEach((d, i) => {
    const off = wrap(i - s.pos);
    const ang = -Math.PI / 2 + off * (2 * Math.PI / N);
    const t = Math.max(0, Math.min(1, 1 - Math.abs(off))); const top = t * t * (3 - 2 * t);
    const ex = W / 2 + Math.cos(ang) * L.ringRadius;
    const ey = H / 2 + L.ringCY + Math.sin(ang) * L.ringRadius - 7 * top;
    const ew = L.d0 * (0.86 + 0.32 * top);
    maxErr = Math.max(maxErr, Math.hypot(d.x - ex, d.y - ey));
    maxW = Math.max(maxW, Math.abs(d.w - ew));
  });
  const S = Math.min(W, H);
  const phone = S < 640;
  check(`${label}: ring sized off min(W,H) (R=${phone ? '0.38' : '0.34'}·S, d0=${phone ? '0.21' : '0.17'}·S, centre +0.055·H)`,
    near(L.ringRadius, S * (phone ? 0.38 : 0.34), 0.01) && L.d0 === Math.round(Math.min(184, Math.max(60, S * (phone ? 0.21 : 0.17)))) && near(L.ringCY, H * 0.055, 0.01),
    `S=${S} R=${L.ringRadius.toFixed(1)} d0=${L.d0} cy=${L.ringCY.toFixed(1)}`);
  check(`${label}: nine discs on the true circle, focal 1.18× and lifted 7 px`, discs.length === 9 && maxErr < 1.5 && maxW < 1.5, `max position error ${maxErr.toFixed(2)} px, size error ${maxW.toFixed(2)} px`);
  const focal = discs[s.focal];
  const other = discs[(s.focal + 1) % 9];
  check(`${label}: focal disc at 12 o'clock and the largest`, near(focal.x, W / 2, 1.5) && focal.y < H / 2 && near(focal.w, L.d0 * 1.18, 1.5) && focal.w > other.w, `w=${focal.w.toFixed(1)} vs d0·1.18=${(L.d0 * 1.18).toFixed(1)}`);
}

/** Mean absolute RGB difference of two PNG buffers inside an annulus (r0..r1 in px, centred). */
async function ringDiff(a, b, r0, r1) {
  const A = await sharp(a).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(b).raw().toBuffer();
  const { width: w, height: h, channels: c } = A.info;
  let sum = 0; let n = 0; let sumIn = 0; let nIn = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2);
    const o = (y * w + x) * c;
    const d = (Math.abs(A.data[o] - B[o]) + Math.abs(A.data[o + 1] - B[o + 1]) + Math.abs(A.data[o + 2] - B[o + 2])) / 3;
    if (r > r0 && r < r1) { sum += d; n++; } else if (r < r0 - 4) { sumIn += d; nIn++; }
  }
  return { ring: sum / n, face: sumIn / nIn };
}

try {
  // ------------------------------------------------------------------ desktop 1440×900
  if (only.includes('desktop')) {
    const { ctx, page, logs, bad } = await open();
    // Entrance timeline, sampled from its own start.
    const trace = await page.evaluate(() => new Promise((res) => {
      const out = [];
      const f = () => {
        const v = window.__vis; const s = v.state;
        const disc0 = document.querySelectorAll('.vis-med')[0];
        if (s.entranceStart > 0) out.push({ t: performance.now() - s.entranceStart, enter: s.enter, done: s.entranceDone, title: !!document.querySelector('.vis-title-name'), bg: Number(getComputedStyle(document.querySelector('.vis-bgwrap')).opacity), vis0: disc0.style.visibility, tr0: disc0.style.transform });
        if (!out.length || out[out.length - 1].t < 3300) requestAnimationFrame(f); else res(out);
      };
      requestAnimationFrame(f);
    }));
    const at = (ms) => trace.reduce((best, s) => (Math.abs(s.t - ms) < Math.abs(best.t - ms) ? s : best), trace[0]);
    const early = at(500);
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(early.tr0);
    check('entrance: discs start contracted, pre-rotated and blooming (t = 0.5 s)', early.enter > 0 && early.enter < 0.97 && m && Math.abs(Number(m[1])) > 20, `enter=${early.enter} disc0 x=${m?.[1]}`);
    check('entrance: backdrop bloom done by 2.15 s (0.15 s delay + 2.0 s)', at(2200).bg > 0.98 && at(1000).bg < 0.98, `bg@1.0s=${at(1000).bg.toFixed(2)} bg@2.2s=${at(2200).bg.toFixed(2)}`);
    check('entrance: title rises in during the wind-up', !at(700).title && at(1300).title, `title@0.7s=${at(700).title} @1.3s=${at(1300).title}`);
    const settled = trace.find((s) => s.done);
    check('entrance: fully settled by about 3.05 s', settled && settled.t <= 3100 && at(3100).enter === 1, `done at ${settled?.t.toFixed(0)} ms`);
    await hold(page);
    await waitSettled(page);
    await geometry(page, 'desktop 1440×900');
    await page.screenshot({ path: path.join(out, 'desktop-rest.png') });
    const kb = await page.evaluate(() => getComputedStyle(document.querySelector('.vis-bg')).animationName + ' ' + getComputedStyle(document.querySelector('.vis-bg')).animationDuration);
    check('Ken Burns drift on the backdrop (34 s)', kb === 'vis-kenburns 34s', kb);

    // Chevron → one slot, easeInOutExpo over 1.0 s, cross-fade without a dark dip, title remount.
    await hold(page);
    const p0 = (await vis(page)).pos;
    const tr = await record(page, 1150, `document.querySelector('.vis-chev-right').click()`);
    // Compare every rendered frame with the curve, on the tween's own clock.
    const start = tr.find((s) => s[4] !== null)?.[4];
    const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3)); // responsive step, 0.75 s
    const errs = tr.filter((s) => start && s[3] >= start).map((s) => Math.abs(s[1] - p0 - ease((s[3] - start) / 750)));
    errs.splice(0, errs.length, Math.max(...errs), errs.reduce((a, b) => a + b, 0) / errs.length);
    const moved = tr.find((s) => start && s[3] >= start + 30);
    check('rotation: one slot in 0.75 s, moving from the first frame and landing softly (ease-out)', near(tr[tr.length - 1][1] - p0, 1, 1e-6) && errs[0] < 0.01 && moved && moved[1] - p0 > 0.05, `max error ${errs[0].toFixed(4)}, mean ${errs[1].toFixed(4)} slot, +${moved ? (moved[1] - p0).toFixed(3) : '?'} after 30 ms`);
    const mono = tr.every((s, i) => i === 0 || s[1] >= tr[i - 1][1] - 1e-9);
    check('rotation: monotonic, no jitter', mono);
    const flip = tr.find((s) => s[2] !== tr[0][2]);
    check('rotation: focal index flips at the half-way mark (≈ 155 ms with the ease-out)', flip && near(flip[0], 155, 50), `flip at ${flip?.[0].toFixed(0)} ms`);
    await page.click('.vis-chev-left');
    await sleep(140); // mid-way through the 0.75 s ease-out step
    const fade = await page.evaluate(() => [...document.querySelectorAll('.vis-bg')].map((b) => Number(b.style.opacity)).filter((o) => o > 0));
    check('backdrop cross-fades (layers sum to ≈ 1 mid-way, no dark dip)', fade.length >= 2 && fade.reduce((a, b) => a + b, 0) > 0.95, fade.map((v) => v.toFixed(2)).join(' + '));
    await waitSettled(page);
    const title = await page.evaluate(() => { const h = document.querySelector('.vis-title-name'); return { text: h.textContent, anim: getComputedStyle(h).animationName, sub: getComputedStyle(document.querySelector('.vis-title-sub')).animationName }; });
    check('title and caption replay on each scene change', title.anim === 'vis-rise' && title.sub === 'vis-fade', JSON.stringify(title));

    // Rapid inputs accumulate smoothly (velocity-continuous re-targeting).
    await hold(page);
    const r0 = (await vis(page)).pos;
    const rapid = await record(page, 1500, `const b=document.querySelector('.vis-chev-right'); b.click(); setTimeout(()=>b.click(),120); setTimeout(()=>b.click(),240);`);
    const rmono = rapid.every((s, i) => i === 0 || s[1] >= rapid[i - 1][1] - 1e-9);
    const maxJump = Math.max(...rapid.slice(1).map((s, i) => s[1] - rapid[i][1]));
    check('rapid triple click: +3 slots, monotonic, no jumps', near(rapid[rapid.length - 1][1] - r0, 3, 1e-6) && rmono && maxJump < 0.35, `end ${(rapid[rapid.length - 1][1] - r0).toFixed(3)} max/frame ${maxJump.toFixed(3)}`);

    // Keyboard: ←/→ while hovered; ↑/↓ only with focus inside (hover alone leaves page scrolling alone).
    await page.mouse.move(300, 700);
    await hold(page);
    let k0 = (await vis(page)).pos;
    await page.keyboard.press('ArrowLeft');
    await waitSettled(page);
    check('keyboard ← (hovered) rotates one slot left', near((await vis(page)).pos - k0, -1, 1e-6));
    await page.keyboard.press('ArrowRight');
    await waitSettled(page);
    k0 = (await vis(page)).pos;
    // A mouse click leaves focus on the chevron: it must not capture ↑/↓ (only keyboard focus does).
    await page.click('.vis-chev-right');
    await waitSettled(page);
    await page.click('.vis-chev-left');
    await waitSettled(page);
    await page.mouse.move(300, 700);
    await page.keyboard.press('ArrowDown');
    await sleep(400);
    const afterDown = await page.evaluate(() => ({ pos: window.__vis.state.pos, y: scrollY }));
    check('keyboard ↓ while only hovered scrolls the page instead of the ring', afterDown.pos === k0 && afterDown.y > 0, JSON.stringify(afterDown));
    await page.evaluate(() => scrollTo(0, 0));
    await sleep(300);
    await page.focus('.vis-chev-left');
    await page.keyboard.press('Tab'); // keyboard focus on the right chevron
    await page.keyboard.press('ArrowDown');
    await waitSettled(page);
    check('keyboard ↓ with focus inside the stage rotates', near((await vis(page)).pos - k0, 1, 1e-6));
    await page.evaluate(() => document.activeElement.blur());

    // Wheel: vertical scroll passes through, horizontal / Shift+wheel rotate, one step per trackpad flick.
    await page.mouse.move(300, 700);
    await hold(page);
    let w0 = (await vis(page)).pos;
    await page.mouse.wheel(0, 400);
    await sleep(500);
    const vScroll = await page.evaluate(() => ({ pos: window.__vis.state.pos, y: scrollY }));
    check('vertical wheel scrolls the page (stage never traps scroll)', vScroll.pos === w0 && vScroll.y > 100, JSON.stringify(vScroll));
    await page.evaluate(() => scrollTo(0, 0));
    await sleep(400);
    await page.mouse.move(300, 700);
    await page.mouse.wheel(140, 0);
    await waitSettled(page);
    const hw = await page.evaluate(() => ({ pos: window.__vis.state.pos, y: scrollY }));
    check('horizontal wheel rotates one slot (page does not scroll)', near(hw.pos - w0, 1, 1e-6) && hw.y === 0, JSON.stringify(hw));
    w0 = hw.pos;
    const flick = async (deltas, opts = {}) => page.evaluate(([deltas, opts]) => new Promise((res) => {
      const root = document.querySelector('.vis-root'); let i = 0;
      const id = setInterval(() => { root.dispatchEvent(new WheelEvent('wheel', { deltaX: opts.shift ? 0 : deltas[i], deltaY: opts.shift ? deltas[i] : 0, shiftKey: !!opts.shift, bubbles: true, cancelable: true })); if (++i >= deltas.length) { clearInterval(id); res(); } }, 16);
    }), [deltas, opts]);
    await flick([4, 12, 30, 52, 64, 60, 52, 44, 37, 31, 26, 21, 17, 14, 11, 9, 7, 5, 4, 3, 2, 2, 1, 1, 1]);
    await waitSettled(page);
    check('trackpad flick with momentum tail = exactly one step', near((await vis(page)).pos - w0, 1, 1e-6), `pos ${(await vis(page)).pos}`);
    w0 = (await vis(page)).pos;
    await flick([10, 40, 70, 60, 40, 25, 15, 9, 6, 4, 30, 70, 90, 70, 40, 20, 10, 5, 2, 1]);
    await waitSettled(page);
    check('a new flick inside the momentum tail re-arms (two flicks = two steps)', near((await vis(page)).pos - w0, 2, 1e-6), `pos ${(await vis(page)).pos}`);
    w0 = (await vis(page)).pos;
    await flick([-120], {});
    await waitSettled(page);
    await sleep(200);
    await flick([100], { shift: true });
    await waitSettled(page);
    check('negative horizontal delta steps back; Shift+wheel steps forward', near((await vis(page)).pos - w0, 0, 1e-6), `pos ${(await vis(page)).pos}`);

    // Pointer drag (mouse), pointer capture, slow drag vs flick projection.
    await hold(page);
    let d0 = (await vis(page)).pos;
    await page.mouse.move(1100, 450);
    await page.mouse.down();
    for (let k = 1; k <= 10; k++) { await page.mouse.move(1100 - 30 * k, 450 + (k === 10 ? 520 : 0)); await sleep(16); }
    const cap = await page.evaluate(() => ({ captured: document.querySelector('.vis-root').classList.contains('is-dragging'), pos: window.__vis.state.pos }));
    await sleep(220); // hold still: no flick velocity
    await page.mouse.up();
    await waitSettled(page);
    check('drag left by 300 px (one slot = 260 px) snaps to +1, pointer captured outside the stage', cap.captured && near(cap.pos - d0, 300 / 260, 0.02) && near((await vis(page)).pos - d0, 1, 1e-6), `during ${(cap.pos - d0).toFixed(3)} → ${((await vis(page)).pos - d0)}`);
    d0 = (await vis(page)).pos;
    await page.mouse.move(400, 450);
    await page.mouse.down();
    for (let k = 1; k <= 5; k++) { await page.mouse.move(400 + 30 * k, 450); await sleep(12); }
    await page.mouse.up();
    await waitSettled(page);
    const flickD = (await vis(page)).pos - d0;
    check('quick 150 px flick to the right projects past the drag distance (velocity projection)', flickD <= -1 && flickD >= -2, `Δ=${flickD}`);

    // Tap a disc → it rotates to the top; tap the focal disc → its section opens.
    await hold(page);
    const before = await vis(page);
    const target = (before.focal + 2) % 9;
    const box = await page.locator(`.vis-med[data-index="${target}"]`).boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await waitSettled(page);
    check('tap a disc → it rotates to the top', (await vis(page)).focal === target, `focal ${(await vis(page)).focal} target ${target}`);
    const fb = await page.locator(`.vis-med[data-index="${target}"]`).boundingBox();
    await page.mouse.click(fb.x + fb.width / 2, fb.y + fb.height / 2);
    await sleep(2600);
    const opened = await page.evaluate(() => ({ hash: location.hash, layer: !!document.querySelector('.w-layer'), suspended: window.__vis.state.suspended, ticking: window.__vis.state.ticking }));
    check('tap the focal disc → its world page opens (the ring pauses behind it)', opened.hash === `#/${['profile','education','experience','projects','certifications','rootme','skills','languages','contact'][target]}` && opened.layer && opened.suspended && !opened.ticking, JSON.stringify(opened));
    await page.keyboard.press('Escape');
    await sleep(1600);
    const closed = await page.evaluate(() => ({ hash: location.hash, layer: !!document.querySelector('.w-layer'), ticking: window.__vis.state.ticking, focal: window.__vis.state.focal }));
    check('closing the world returns to the same disc at the top of the ring', closed.hash === '' && !closed.layer && closed.ticking && closed.focal === target, JSON.stringify(closed));

    // Auto-rotate: waits USER_IDLE (4.4 s) after the last input, then dwells AUTO_INTERVAL (3.6 s) per scene.
    // (A mouse reader clicks the stage background: keyboard focus left by Esc no longer holds the ring.)
    await page.mouse.click(8, 450);
    await hold(page);
    const auto = await record(page, 9800);
    const steps = auto.filter((s, i) => i > 0 && s[2] !== auto[i - 1][2]).map((s) => s[0]);
    check('auto-rotate pauses 4.4 s after input, then advances one scene every ~3.6 s (focal flips mid-rotation)', steps.length === 2 && steps[0] > 4400 + 500 && steps[0] < 4400 + 360 + 500 + 150 && near(steps[1] - steps[0], 3600, 400), `focal changes at ${steps.map((t) => t.toFixed(0)).join(', ')} ms`);

    // Off screen: no frame loop, no live lens.
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await sleep(600);
    const off = await page.evaluate(() => ({ ticking: window.__vis.state.ticking, bf: getComputedStyle(document.querySelector('.vis-med')).backdropFilter }));
    check('off screen: frame loop stopped and backdrop filter removed', off.ticking === false && off.bf === 'none', JSON.stringify(off));
    await page.evaluate(() => scrollTo(0, 0));
    await sleep(600);
    check('back on screen: frame loop resumes', (await vis(page)).ticking === true);
    const imgs = await page.evaluate(() => [...document.querySelectorAll('.vis-med-img')].filter((i) => !i.complete || i.naturalWidth === 0).length);
    check('no broken assets (thumbnails decoded, no HTTP errors)', imgs === 0 && bad.length === 0, bad.slice(0, 3).join(' | '));
    check('no console errors or warnings', logs.length === 0, logs.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ------------------------------------------------------------------ glass refraction actually renders
  if (only.includes('glass')) {
    const { ctx, page } = await open();
    await page.waitForFunction(() => window.__vis.state.entranceDone, null, { timeout: 8000 });
    await hold(page);
    const st = await vis(page);
    check('Chromium / Edge uses live refraction (SVG displacement filter)', st.glass === 'native' && (await page.locator('#vis-glass feDisplacementMap').count()) === 3);
    const sc = [];
    for (let k = 0; k < 6; k++) { sc.push((await vis(page)).scales); await sleep(180); }
    const g = sc.map((s) => s[1]);
    const ratio = sc[0][0] / sc[0][1];
    check('liquid wobble: displacement scale breathes; R/B split by 5 % × chroma 2.2', Math.max(...g) - Math.min(...g) > 0.3 && near(ratio, 1.11, 0.005) && near(sc[0][2] / sc[0][1], 0.89, 0.005), `G scales ${g.map((v) => v.toFixed(1)).join(' ')}`);
    const fb = await page.locator(`.vis-med[data-index="${st.focal}"]`).boundingBox();
    const clip = { x: Math.round(fb.x), y: Math.round(fb.y), width: Math.round(fb.width), height: Math.round(fb.height) };
    await page.evaluate(() => { window.__vis.wobbleOverride = 1; });
    await sleep(250);
    const A = await page.screenshot({ clip });
    await page.evaluate(() => { window.__vis.wobbleOverride = 0; });
    await sleep(250);
    const B = await page.screenshot({ clip });
    await page.evaluate(() => { window.__vis.wobbleOverride = null; });
    fs.writeFileSync(path.join(out, 'glass-on.png'), A);
    fs.writeFileSync(path.join(out, 'glass-off.png'), B);
    const w = clip.width;
    const diff = await ringDiff(A, B, w * 0.34 + 2, w * 0.5 - 3);
    check('refraction is really rendered: the rim bends the backdrop, the face is untouched', diff.ring > 3 && diff.face < 1, `mean Δ rim ${diff.ring.toFixed(2)} / face ${diff.face.toFixed(2)} (0–255)`);
    const map = await page.evaluate(() => { const im = document.querySelector('#vis-glass feImage'); return { w: Number(im.getAttribute('width')), d0: window.__vis.state.d0 }; });
    await page.setViewportSize({ width: 1100, height: 700 });
    await sleep(600);
    const map2 = await page.evaluate(() => { const im = document.querySelector('#vis-glass feImage'); return { w: Number(im.getAttribute('width')), d0: window.__vis.state.d0 }; });
    check('glass map re-baked on resize (one map for the d0 box)', map.w === map.d0 && map2.w === map2.d0 && map2.d0 !== map.d0, `${map.w} → ${map2.w}`);
    await ctx.close();
  }

  // ------------------------------------------------------------------ fallbacks
  if (only.includes('fallback')) {
    for (const [label, opts] of [
      ['?glass=frost', { query: '?glass=frost' }],
      ['Firefox user agent', { context: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0' } }],
      ['Safari user agent', { context: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15' } }],
    ]) {
      const { ctx, page, logs } = await open(opts);
      await page.waitForFunction(() => window.__vis.state.entranceDone, null, { timeout: 8000 });
      const r = await page.evaluate(() => ({ glass: window.__vis.state.glass, bf: getComputedStyle(document.querySelector('.vis-med')).backdropFilter, svg: document.querySelectorAll('#vis-glass').length }));
      check(`fallback (${label}): clean frosted glass, no SVG filter`, r.glass === 'frost' && /blur\(3px\)/.test(r.bf) && r.svg === 0 && logs.length === 0, JSON.stringify(r));
      if (label.startsWith('?')) await page.screenshot({ path: path.join(out, 'frost.png') });
      await ctx.close();
    }
  }

  // ------------------------------------------------------------------ reduced motion
  if (only.includes('reduced')) {
    const { ctx, page } = await open({ reduced: true });
    await page.waitForFunction(() => window.__vis.state.entranceDone, null, { timeout: 3000 });
    const s0 = await vis(page);
    const st = await page.evaluate(() => ({ kb: getComputedStyle(document.querySelector('.vis-bg')).animationName, title: !!document.querySelector('.vis-title-name') }));
    const sc1 = (await vis(page)).scales[1];
    await sleep(800);
    const sc2 = (await vis(page)).scales[1];
    check('reduced motion: settled instantly, no Ken Burns, no wobble', s0.enter === 1 && st.kb === 'none' && st.title && sc1 === sc2, JSON.stringify({ ...st, sc1, sc2 }));
    await page.click('.vis-chev-right');
    await sleep(60);
    check('reduced motion: rotation is instant', (await vis(page)).pos === s0.pos + 1);
    await sleep(5600);
    check('reduced motion: no auto-rotate', (await vis(page)).pos === s0.pos + 1);
    await ctx.close();
  }

  // ------------------------------------------------------------------ phone 390×844 (touch)
  if (only.includes('phone')) {
    const { ctx, page, logs } = await open({ viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } });
    await page.waitForFunction(() => window.__vis.state.entranceDone, null, { timeout: 8000 });
    await hold(page);
    await geometry(page, 'phone 390×844');
    const chev = await page.evaluate(() => getComputedStyle(document.querySelector('.vis-chev')).display);
    check('phone: chevrons hidden', chev === 'none');
    await page.screenshot({ path: path.join(out, 'phone-rest.png') });
    const cdp = await ctx.newCDPSession(page);
    const swipe = async (x0, y0, x1, y1, ms = 220, steps = 12) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
      for (let k = 1; k <= steps; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * k) / steps, y: y0 + ((y1 - y0) * k) / steps }] }); await sleep(ms / steps); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const L = (await vis(page)).layout;
    let p0 = (await vis(page)).pos;
    await swipe(300, 640, 300 - L.perStep, 640);
    await waitSettled(page);
    const one = (await vis(page)).pos - p0;
    p0 = (await vis(page)).pos;
    await swipe(80, 640, 80 + L.perStep, 640);
    await waitSettled(page);
    const back = (await vis(page)).pos - p0;
    check('phone: one thumb-swipe (~⅓ screen) = exactly one card, both directions', one === 1 && back === -1, `left swipe ${one}, right swipe ${back} (perStep ${L.perStep.toFixed(0)} px)`);
    p0 = (await vis(page)).pos;
    await swipe(195, 700, 195, 300, 260);
    await sleep(700);
    const vs = await page.evaluate(() => ({ pos: window.__vis.state.pos, y: scrollY }));
    check('phone: vertical swipe scrolls the page, the ring stays', vs.pos === p0 && vs.y > 100, JSON.stringify(vs));
    await page.evaluate(() => scrollTo(0, 0));
    await sleep(500);
    await hold(page);
    const tgt = ((await vis(page)).focal + 1) % 9;
    const tb = await page.locator(`.vis-med[data-index="${tgt}"]`).boundingBox();
    await page.touchscreen.tap(tb.x + tb.width / 2, tb.y + tb.height / 2);
    await waitSettled(page);
    check('phone: tap a disc → it rotates to the top', (await vis(page)).focal === tgt);
    const hz = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    check('phone: no horizontal page overflow', hz);
    check('phone: no console errors', logs.length === 0, logs.slice(0, 3).join(' | '));
    await page.screenshot({ path: path.join(out, 'phone-after.png') });
    await ctx.close();
  }
} catch (e) {
  check('scenario completed', false, e.stack?.split('\n').slice(0, 3).join(' '));
} finally {
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exitCode = failed ? 1 : 0;
}
