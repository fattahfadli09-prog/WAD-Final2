const http = require('http');
const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = 'sk-ant-XXXXXXX'; // ← GANTI dengan API key kamu

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (req.method === 'POST' && req.url === '/api/ai') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { messages, system } = JSON.parse(body);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1000, system, messages })
        });
        const data = await response.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (e) {
        res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Serve static files
  let filePath = '.' + (req.url === '/' ? '/buyer.html' : req.url);
  const ext = path.extname(filePath);
  const mime = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript' };
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(content);
  });
});

server.listen(3000, () => console.log('✅ Server jalan di http://localhost:3000'));