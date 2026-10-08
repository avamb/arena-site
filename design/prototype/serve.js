// Tiny static server for the design prototypes. Wraps each direction-*.html in a
// doctype skeleton (the Artifact host does the same), so file:// quirks don't skew the check.
const http = require('http'); const fs = require('fs'); const path = require('path');
const dir = __dirname; const port = process.env.PORT || 4330;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  const f = path.join(dir, u);
  if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    const list = fs.readdirSync(dir).filter(n => n.endsWith('.html')).map(n => `<li><a href="/${n}">${n}</a> · <a href="/${n}?theme=dark">dark</a></li>`).join('');
    res.writeHead(u === '/index.html' ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(`<!doctype html><meta charset="utf-8"><title>Prototypes</title><ul>${list}</ul>`);
  }
  const ext = path.extname(f); let body = fs.readFileSync(f);
  if (ext === '.html' && /^(direction-|moodboard)/.test(path.basename(f))) {
    const theme = /theme=dark/.test(req.url) ? ' data-theme="dark"' : (/theme=light/.test(req.url) ? ' data-theme="light"' : '');
    body = Buffer.from(`<!doctype html><html lang="en"${theme}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body.toString('utf8')}</body></html>`);
  }
  res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body);
}).listen(port, '127.0.0.1', () => console.log('prototypes on http://127.0.0.1:' + port));
