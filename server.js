const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-dwDKMp2Tm5_OofMuSsqo-8Zz0-jmAZT_3mJo7ugNuL6EUAoNDnrVV4ocBIzRAqIIlbOa18VHRlbtEd0Sod4f8UTEgVutG61l3McJKFd20SGxLLTlGqh_-0g';
const MINIMAX_API_URL = 'https://api.minimaxi.com/v1/chat/completions';

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/chat', (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: { message: 'messages 参数无效' } });
  }

  const payload = JSON.stringify({
    model: 'MiniMax-M2.1',
    messages: messages,
    stream: false,
    temperature: 0.85,
    max_completion_tokens: 1024
  });

  const url = new URL(MINIMAX_API_URL);

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let body = '';
    apiRes.setEncoding('utf-8');
    apiRes.on('data', (chunk) => { body += chunk; });
    apiRes.on('end', () => {
      try {
        const data = JSON.parse(body);
        res.json(data);
      } catch (e) {
        res.status(502).json({ error: { message: 'API 响应解析失败' } });
      }
    });
  });

  apiReq.on('error', (e) => {
    console.error('MiniMax API 请求失败:', e.message);
    res.status(502).json({ error: { message: '无法连接到 AI 服务' } });
  });

  apiReq.write(payload);
  apiReq.end();
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🐾 小歪已上线！服务器运行在 http://localhost:${PORT}`);
});
