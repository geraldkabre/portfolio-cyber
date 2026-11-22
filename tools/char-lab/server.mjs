// Static server + result sink for the character lab. No dependencies.
// Usage: node server.mjs <port> <assetsRoot> <labDir> <outDir> [repoRoot]
//   GET  /assets/*  -> assetsRoot (read-only, original downloads)
//   GET  /lab/*     -> labDir (tool pages)
//   GET  /repo/*    -> repoRoot (read-only: public/, src/ ... to test production files and runtime modules)
//   GET  /out/*     -> outDir
//   POST /result?name=  JSON {images:{k:dataURL}, ...} -> outDir/<name>.json + <name>_<k>.png
//   POST /save?rel=     raw bytes -> outDir/<rel>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [port, assetsRoot, labDir, outDir, repoArg] = process.argv.slice(2);
const repoRoot = repoArg || path.resolve(assetsRoot, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.vrm': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ktx2': 'image/ktx2' };

function safeJoin(root, rel) {
  const base = path.resolve(root);
  const p = path.resolve(base, decodeURIComponent(rel));
  if (p !== base && !p.startsWith(base + path.sep)) throw new Error('path escape');
  return p;
}
const readBody = (req) => new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'POST' && url.pathname === '/result') {
      const name = (url.searchParams.get('name') || 'result').replace(/[^\w.-]/g, '_');
      const body = JSON.parse((await readBody(req)).toString('utf8'));
      fs.mkdirSync(outDir, { recursive: true });
      for (const [k, dataUrl] of Object.entries(body.images || {})) {
        fs.writeFileSync(path.join(outDir, `${name}_${k}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
      }
      delete body.images;
      fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(body, null, 1));
      res.end('ok');
      console.log('RESULT_SAVED', name);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/save') {
      const dest = safeJoin(outDir, url.searchParams.get('rel') || 'out.bin');
      const buf = await readBody(req);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      res.end('ok');
      console.log('FILE_SAVED', path.relative(outDir, dest), buf.length);
      return;
    }
    let file;
    if (url.pathname.startsWith('/assets/')) file = safeJoin(assetsRoot, url.pathname.slice(8));
    else if (url.pathname.startsWith('/lab/')) file = safeJoin(labDir, url.pathname.slice(5));
    else if (url.pathname.startsWith('/repo/')) file = safeJoin(repoRoot, url.pathname.slice(6));
    else if (url.pathname.startsWith('/out/')) file = safeJoin(outDir, url.pathname.slice(5));
    else { res.statusCode = 404; return res.end(); }
    const st = fs.statSync(file);
    res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Content-Length', st.size);
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.statusCode = 404; res.end(String(e));
  }
}).listen(Number(port), '127.0.0.1', () => console.log('SERVER_READY', port));
