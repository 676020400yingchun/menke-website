#!/usr/bin/env node
// 门客官网 · 内容管理后台后端（menke-admin）
// 用途: 提供登录认证 + 内容 CRUD API + 托管 /admin 管理页
// 运行: ADMIN_USER=menke ADMIN_PASS=xxx PORT=3200 DATA_DIR=/www/wwwroot/menke-admin/data node menke-admin.js
// 说明: 纯 Node 无第三方依赖; 内容存 JSON 文件; token 存内存。
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = parseInt(process.env.PORT || "3200", 10);
const ADMIN_USER = process.env.ADMIN_USER || "menke";
const ADMIN_PASS = process.env.ADMIN_PASS || "menke@2026";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "content.json");
const PUBLIC_DIR = path.join(__dirname, "public");

// ---------- 默认内容（初始值，对应官网当前文案） ----------
const DEFAULT_CONTENT = {
  meta: { updatedAt: null },
  stats: {
    title: "数字见证实力",
    subtitle: "十二年深耕 · 从现场到产业的每一步",
    items: [
      { num: "12", unit: "", cap: "年专注深耕" },
      { num: "4", unit: "", cap: "大行业纵深" },
      { num: "300", unit: "+", cap: "标杆项目落地" },
      { num: "200", unit: "+", cap: "家合作伙伴" }
    ]
  },
  biz: {
    heroKicker: "业务介绍 · 我们能为您做什么",
    heroLine1: "以文旅为支点",
    heroLine2: "向产业纵深延伸",
    heroSub: "门客的核心业务是文旅智慧化，并以文旅为支点，向教育、农业等行业延伸信息化与数字化服务。十二年里，我们交付的不只是系统，更是运营；打通的不仅是数据，更是体验。",
    statement: "我们始终相信，好的数字化，应该让人感觉不到技术，只感觉到被照顾。它不打扰任何一种美好，却在每一个需要被接住的地方，稳稳地托住。",
    items: [
      { no: "01", title: "文旅智慧化", view: "文旅的本质不是卖门票，而是卖“一场值得被记住的相遇”。", desc: "数字化要做的，不是给景区装一排屏幕，而是让游客踏入大门的那一刻起，就被一场精心编排的数字叙事温柔地接住——山水成为舞台，故事成为向导，数据成为贴心管家。", services: ["智慧景区一体化平台", "沉浸式体验与光影夜游", "AR / VR 数字导览", "文旅私域运营与会员体系", "数字化营销与流量运营", "文旅大数据与经营决策"] },
      { no: "02", title: "教育智慧化", view: "让知识跨越山海，让课堂触手可及。", desc: "让偏远山区的孩子，与城市孩子拥有同一条起跑线——这是信息化最朴素、也最动人的意义。", services: ["智慧校园综合平台", "在线教学与资源共享体系", "教育数据治理与学情分析", "数字化教学资源开发"] },
      { no: "03", title: "农业智慧化", view: "让土地长出数据，让丰收有据可依。", desc: "让每一株作物的长势、每一寸土壤的脾气、每一茬市场的脉动，都化作屏上清晰的数据。农业智慧化，是把不确定交给系统，把确定还给农民。", services: ["农业产业数字化平台", "产销一体化与溯源体系", "农业大数据与产销决策", "乡村文旅与农旅融合数字化"] },
      { no: "04", title: "建设与运营", view: "从蓝图到落地，从上线到生长。", desc: "十二年的建设与运营经验，让我们相信：系统上线只是开始。真正的价值，在于日复一日的陪跑，在于把交付变成生长。", services: ["信息化顶层设计", "系统落地实施", "长期运营陪跑", "项目运营经验沉淀"] }
    ]
  },
  cases: {
    kicker: "案例介绍 · 用作品说话",
    title: "让每一个项目\n都成为行业的一次进阶",
    sub: "十二年，我们与房地产、文旅、教育、农业等行业深度合作。以下案例覆盖门客服务的四大赛道，皆以真实交付为底色。",
    items: [
      { tag: "文旅", title: "让一座古城，重新开口说话", slogan: "技术不是目的，让山水拥有记忆，才是目的。", desc: "【项目名称】，一座有千年底色的【古城 / 景区】。游客来了又走，故事却一直沉默。门客以数字光影为笔，把沉睡的历史编排成一场沉浸式叙事——夜游不再是“看灯”，而是一段可以走进的历史。上线后，夜间客流与二次消费显著提升，游客从“半天逛完就走”，变成留下来、慢下来。", foot: "文旅智慧化 · 【项目落地年份】" },
      { tag: "教育", title: "让城乡孩子，共上一堂课", slogan: "数字化的温度，藏在不该有差距的地方。", desc: "【项目名称】覆盖【N】所学校，连接城市与乡镇课堂。门客搭起一张资源共享的网络，让优质师资跨越山海，让乡村孩子在家门口听见最好的课。真正打动人心的，不是设备有多先进，而是一节节被共享的课，一次次被抹平的差距。", foot: "教育智慧化 · 【项目落地年份】" },
      { tag: "农业", title: "让一片果园，不再赌天气", slogan: "把不确定交给系统，把确定还给农民。", desc: "【项目名称】从种到销，一条数据链贯穿始终。门客为【N】亩基地建立产销一体化平台，让收成、价格、订单都清清楚楚、有据可依。农民第一次可以看着数据做决定，丰收不再是一场和老天爷的豪赌。", foot: "农业智慧化 · 【项目落地年份】" },
      { tag: "房地产", title: "让一方社区，住成“家”", slogan: "房子是容器，运营才是让人留下来的理由。", desc: "【项目名称】是门客十二年征程的起点。我们协助【开发商 / 物业】完成数字化运营体系建设，让一个楼盘，从交付钢筋水泥，到交付一种生活方式——活动有人组织，诉求有人回应，邻里有人连接。", foot: "房地产信息化 · 门客起点" }
    ]
  },
  contact: {
    address: "成都市高新区梓州大道4111号易上创客中心",
    website: "www.mk-cd.cn",
    email: "676020400@qq.com",
    phone: "1898008681",
    ctaText: "约一次上门拜访 · 我们聊聊",
    hint: "电话 ",
    ctaMailTo: "mailto:676020400@qq.com"
  },
  ai: {
    welcome: "您好，我是门客的 AI 智客服。我可以为您介绍文旅智慧化、教育智慧化、农业智慧化等业务，以及我们的合作案例与联系方式。请问有什么可以帮您？",
    subtitle: "门客 · 7×24 小时智能应答"
  }
};

// ---------- 数据读写 ----------
function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const seed = Object.assign({}, DEFAULT_CONTENT);
    seed.meta = { updatedAt: new Date().toISOString() };
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), "utf-8");
  }
}
function readContent() {
  ensureData();
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); }
  catch (e) { return Object.assign({}, DEFAULT_CONTENT); }
}
function writeContent(content) {
  content.meta = content.meta || {};
  content.meta.updatedAt = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(content, null, 2), "utf-8");
}

// ---------- 认证 ----------
const tokens = new Map(); // token -> expiry
function issueToken() {
  const t = crypto.randomBytes(24).toString("hex");
  tokens.set(t, Date.now() + 8 * 3600 * 1000); // 8h
  return t;
}
function validToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const t = authHeader.slice(7).trim();
  const exp = tokens.get(t);
  if (!exp) return false;
  if (Date.now() > exp) { tokens.delete(t); return false; }
  return true;
}

// ---------- 响应辅助 ----------
function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}
function readBody(req, cb) {
  let b = "";
  req.on("data", c => { b += c; if (b.length > 3 * 1024 * 1024) req.destroy(); });
  req.on("end", () => cb(b));
}

const server = http.createServer((req, res) => {
  const url = (req.url || "").split("?")[0];
  const method = req.method || "GET";

  // CORS：允许同源 mkwh.work 及其子域、本地
  const origin = req.headers["origin"] || "";
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (method === "OPTIONS") { res.writeHead(204); return res.end(); }

  // 公开：官网读取内容
  if (method === "GET" && url === "/api/content") {
    const c = readContent();
    return json(res, 200, { ok: true, content: c });
  }

  // 登录
  if (method === "POST" && url === "/api/admin/login") {
    return readBody(req, body => {
      let u = "", p = "";
      try { const d = JSON.parse(body); u = String(d.user || ""); p = String(d.pass || ""); } catch (e) {}
      if (u === ADMIN_USER && p === ADMIN_PASS) {
        return json(res, 200, { ok: true, token: issueToken() });
      }
      return json(res, 401, { ok: false, error: "账号或密码错误" });
    });
  }

  // 管理端受保护接口
  if (url.startsWith("/api/admin/")) {
    if (!validToken(req.headers["authorization"])) {
      return json(res, 401, { ok: false, error: "未登录或登录已过期" });
    }
    if (method === "GET" && url === "/api/admin/content") {
      return json(res, 200, { ok: true, content: readContent() });
    }
    if (method === "PUT" && url === "/api/admin/content") {
      return readBody(req, body => {
        let c = null;
        try { c = JSON.parse(body); } catch (e) { return json(res, 400, { ok: false, error: "JSON 解析失败" }); }
        writeContent(c);
        return json(res, 200, { ok: true, updatedAt: c.meta.updatedAt });
      });
    }
    return json(res, 404, { ok: false, error: "not found" });
  }

  // 托管 admin 静态页
  if (method === "GET" && (url === "/admin" || url === "/admin.html" || url === "/admin/")) {
    const f = path.join(PUBLIC_DIR, "admin.html");
    if (fs.existsSync(f)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(fs.readFileSync(f));
    }
    return json(res, 404, { ok: false, error: "admin.html 缺失" });
  }

  return json(res, 404, { ok: false, error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("menke-admin listening on 127.0.0.1:" + PORT);
});
