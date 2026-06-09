const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

app.use(express.json());
app.use(express.static(__dirname));

function getFriendlyError(statusCode) {
  if (statusCode === 401 || statusCode === 403) {
    return '小歪暂时无法连接服务，请稍后再试。';
  }

  if (statusCode === 402) {
    return '小歪今天的对话额度用完啦，请稍后再来找我玩吧。';
  }

  if (statusCode === 429) {
    return '来找小歪聊天的人有点多，请稍后再试。';
  }

  return '小歪现在有点忙，请稍后再试。';
}

app.post('/api/chat', (req, res) => {
  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({
      error: { message: '服务器未配置 DEEPSEEK_API_KEY' }
    });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: { message: 'messages 参数无效' } });
  }

  const payload = JSON.stringify({
    model: 'deepseek-v4-flash',
    messages: messages,
    stream: false,
    temperature: 0.85,
    max_completion_tokens: 1024
  });

  const url = new URL(DEEPSEEK_API_URL);

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let body = '';
    apiRes.setEncoding('utf-8');
    apiRes.on('data', (chunk) => { body += chunk; });
    apiRes.on('end', () => {
      console.log('[DeepSeek] status:', apiRes.statusCode);
      console.log('[DeepSeek] body:', body.substring(0, 500));

      try {
        const data = JSON.parse(body);
        if (apiRes.statusCode >= 200 && apiRes.statusCode < 300 && data.choices) {
          return res.json(data);
        }

        return res.status(502).json({
          error: {
            message: getFriendlyError(apiRes.statusCode),
            upstreamStatus: apiRes.statusCode
          }
        });
      } catch (e) {
        res.status(502).json({ error: { message: 'API 响应解析失败' } });
      }
    });
  });

  apiReq.on('error', (e) => {
    console.error('DeepSeek API 请求失败:', e.message);
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
