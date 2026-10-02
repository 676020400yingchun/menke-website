#!/usr/bin/env node
// 门客官网 · AI 智客服后端代理
// 用法: ARK_API_KEY=xxx ARK_MODEL=xxx PORT=3100 node ai-proxy.js
// 说明: 仅作为同源转发层, 豆包(火山方舟) API Key 只存在于本机环境变量, 绝不暴露给前端。
const http = require("http");
const https = require("https");

const PORT = parseInt(process.env.PORT || "3100", 10);
const ARK_KEY = process.env.ARK_API_KEY || "";
const ARK_APP_ID = process.env.ARK_APP_ID || "";
const MODEL = process.env.ARK_MODEL || "doubao-seed-1-6-250615";
const ARK_HOST = "ark.cn-beijing.volces.com";
// App ID 模式: 走 bots 端点, 无需指定模型; 否则 base 端点 + model
const ARK_PATH = ARK_APP_ID ? "/api/v3/bots/chat/completions" : "/api/v3/chat/completions";

const SYS = [
  "你是「成都门客文化传播有限公司」的官方 AI 智客服，公司简称门客 / MENKE。",
  "回答要专业、亲切、简洁，使用简体中文；用尊称「您」。",
  "公司核心业务：文旅智慧化（让山水会说话、让景区会思考），并延伸至教育智慧化、农业智慧化、以及建设与运营一体化服务。",
  "公司成立十二年，与房地产、文旅、教育、农业等行业深度合作，累计落地 300+ 标杆项目，服务 200+ 家合作伙伴。",
  "联系信息：电话 1898008681；邮箱 676020400@qq.com；官网 mkwh.work；地址：成都市高新区梓州大道 4111 号易上创客中心。",
  "若被问到联系方式、业务范围、合作意向，可直接引用上述信息；被问到不清楚或超出范围的问题，可建议用户致电或发邮件详询，不要编造事实。",
  "回复保持礼貌、热情、克制，不做夸大承诺。"
].join(" ");

function callArk(messages, cb) {
  const payload = JSON.stringify({
    model: MODEL,
    messages: messages,
    max_tokens: 800,
    temperature: 0.6,
    stream: false,
  });
  const appPayload = JSON.stringify({
    app_id: ARK_APP_ID,
    messages: messages,
    max_tokens: 800,
    temperature: 0.6,
    stream: false,
  });
  const body = ARK_APP_ID ? appPayload : payload;
  const req = https.request({
    host: ARK_HOST,
    path: ARK_PATH,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + ARK_KEY,
      "Content-Length": Buffer.byteLength(body),
    },
    timeout: 300000,
  }, (res) => {
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      let parsed = null, err = null;
      try { parsed = JSON.parse(raw); } catch (e) { err = e; }
      if (res.statusCode === 200 && parsed && parsed.choices && parsed.choices[0]) {
        cb(null, (parsed.choices[0].message && parsed.choices[0].message.content) || "");
      } else {
        cb(new Error("ARK " + res.statusCode + " " + (parsed ? (parsed.error && parsed.error.message) || JSON.stringify(parsed).slice(0,300) : raw.slice(0,300))));
      }
    });
  });
  req.on("error", cb);
  req.on("timeout", () => { req.destroy(new Error("ARK timeout")); });
  req.write(body);
  req.end();
}

const server = http.createServer((req, res) => {
  const cors = (req.headers["origin"] || "").replace(/^https?:\/\//, "").replace(/:\d+$/, "").toLowerCase();
  const allowed = cors === "" || cors === "mk-cd.cn" || cors === "www.mk-cd.cn" ||
    cors === "mkwh.work" || cors === "www.mkwh.work" || cors.endsWith(".mkwh.work") ||
    cors.endsWith(".doubaoapps.com") || cors.endsWith(".aiforce.cloud");
  res.setHeader("Access-Control-Allow-Origin", req.headers["origin"] || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  if (req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, model: MODEL }));
  }

  if (req.method !== "POST" || req.url !== "/api/chat") {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "not found" }));
  }

  if (!allowed) {
    res.writeHead(403, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "forbidden origin" }));
  }
  if (!ARK_KEY) {
    res.writeHead(503, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "server not configured" }));
  }

  let body = "";
  req.on("data", (c) => { body += c; if (body.length > 8192) req.destroy(); });
  req.on("end", () => {
    let msg = "";
    try { msg = String((JSON.parse(body) || {}).message || "").slice(0, 500); } catch (e) {}
    if (!msg.trim()) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "empty message" }));
    }
    const messages = [
      { role: "system", content: SYS },
      { role: "user", content: msg },
    ];
    callArk(messages, (err, reply) => {
      if (err) {
        res.writeHead(502, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: String(err.message) }));
      }
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ reply: reply }));
    });
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("menke-ai listening on 127.0.0.1:" + PORT);
});
