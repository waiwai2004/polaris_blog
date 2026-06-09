# Polairs's Blog

这是一个带 DeepSeek 对话接口的个人博客站点。

## 本地运行

1. 安装依赖：

```bash
npm install
```

2. 配置环境变量：

- 复制 `.env.example` 为 `.env`
- 填入你自己的 `DEEPSEEK_API_KEY`

3. 启动服务：

```bash
npm start
```

4. 打开 `http://localhost:3000`

## 环境变量

服务端需要以下环境变量：

- `DEEPSEEK_API_KEY`：DeepSeek API Key

注意：

- 不要把真实 key 写进代码
- 不要把 `.env` 提交到 Gitee / GitHub
- 前端只调用你自己的 `/api/chat`，不要直接调用 DeepSeek

## 部署到帽子云

部署时保留代码仓库，但不要上传真实密钥到仓库。

在帽子云后台给应用配置环境变量：

- `DEEPSEEK_API_KEY=你的真实 DeepSeek Key`

然后用 Node 启动：

```bash
npm start
```

## 文件说明

- `index.html`：前端页面
- `server.js`：Node/Express 服务端，负责代理 AI 对话请求
- `.env.example`：环境变量示例
