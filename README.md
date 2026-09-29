# 成都门客文化传播有限公司 · 企业门户官网（H5）

一个以「文旅数字化」为核心业务的科技蓝企业门户 H5，采用小程序式「四 Tab」结构，中英文双语，面向手机端与桌面端自适应展示。

## 一、项目概览

成都门客文化传播有限公司成立于 2014 年，专注**文旅数字化建设**，并以文旅为支点向教育、农业等行业延伸信息化与数字化服务。本官网以「门客」这一战国养士传统为品牌叙事内核，传递「以数字为笔、为产业立传」的专业精神。

- **核心业务**：文旅数字化（让山水会说话，让景区会思考）
- **延伸行业**：教育信息化、农业数字化、房地产与信息化建设运营
- **十二年沉淀**：300+ 标杆项目落地 · 200+ 家合作伙伴 · 4 大行业纵深

## 二、页面结构（四 Tab · 中英双语）

采用移动端「底部 Tab」与桌面端「顶部导航」双形态，四个 Tab 各对应独立页面，中英文各一套，共 **8 个 HTML 文件**：

| Tab | 中文页 | 英文页 | 内容 |
| --- | --- | --- | --- |
| 首页 | `首页.html` | `首页-en.html` | Hero 主视觉、品牌口号、数据指标（12年/4行业/300+/200+）、四业务宫格入口 |
| 业务 | `业务.html` | `业务-en.html` | 核心业务导语、门客之道、四大业务卡片（文旅数字化/教育信息化/农业数字化/建设与运营）、方法论闭环（壹-肆） |
| 案例 | `案例.html` | `案例-en.html` | 文旅/教育/农业/房地产四大赛道项目案例 |
| 我的 | `我的.html` | `我的-en.html` | 品牌故事、使命·愿景·价值观、十二年时间轴、团队、联系方式 |

每页顶部导航右侧提供 **EN / 中文** 语言切换按钮，桌面与移动端均可切换。

## 三、视觉体系（科技蓝）

- 品牌主色 `#1677FF`，亮蓝青 `#00B4FF`，深底 `#0A1E4A`，浅底 `#F5F9FF`
- 渐变 `linear-gradient(120deg,#1677FF 0%,#1677FF 38%,#00B4FF 100%)`
- 卡片渐变发光描边（mask 手法）、Hero 光带、案例图统一蓝调
- 顶栏内联 SVG 渐变 M 徽章 + 「门客 MENKE」品牌组合（英文版为 `MENKE · CULTURE · TECH`）

## 四、联系信息与域名

- 电话：1898008681
- 邮箱：676020400@qq.com
- 官网：www.mk-cd.cn
- 地址：成都市高新区梓州大道 4111 号易上创客中心
- 英文版地址：Yishang Maker Center, 4111 Zizhou Avenue, Chengdu Hi-Tech Zone

## 五、安全加固

- **页面级**：CSP meta、禁止复制（`user-select:none` + contextmenu/copy/cut/dragstart 拦截），联系区单独放行可复制
- **服务器级**（Nginx `/etc/nginx/conf.d/menke.conf`）：`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy`、`Permissions-Policy`、`server_tokens off`、assets 缓存、gzip
- 代码零风险：无 `eval` / `innerHTML` / 内联事件

## 六、响应式与兼容

- `viewport-fit=cover` + `safe-area-inset-bottom` 适配刘海屏
- `min-height:100dvh` 适配移动端动态视口
- 断点：桌面（>860px）顶部导航 / 移动端（≤860px）底部 Tab
- 各区块在不同尺寸下自动栅格化（2×2 / 单列等），无横向溢出

## 七、目录结构

```
门客官网h5/
├── 首页.html / 业务.html / 案例.html / 我的.html      # 中文四页
├── 首页-en.html / 业务-en.html / 案例-en.html / 我的-en.html  # 英文四页
├── assets/                                          # Hero/案例图、logo
├── deploy.sh                                        # 一键部署脚本
├── README.md
├── _backup/                                         # 历史版本备份（不入库）
└── _shots/                                          # 自检截图（.gitignore 排除）
```

## 八、部署与访问

**阿里云服务器**（Nginx，域名 www.mk-cd.cn）已部署 8 页 + assets：

```bash
./deploy.sh        # SSH 免密一键部署（上传→入口 index.html→Nginx reload→线上校验）
```

**手机端在线预览**（doubao-html）：

https://4m5hv6dtk2c64.doubaoapps.com/app/app_17f2d936eut

## 九、版本控制（GitHub）

- 仓库：`676020400yingchun/menke-website`（分支 `main`）
- 本机因代理环境 SSH 22 不通，推送走 **SSH-over-443**：

```bash
GIT_SSH_COMMAND="ssh -o HostName=ssh.github.com -o Port=443 \
  -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 \
  -o StrictHostKeyChecking=accept-new" git push -u origin main
```

## 十、本地自检

每次改动后运行（桌面 + 移动全页截图 + JSON lint）：

```bash
python3 <html-skill>/scripts/shot.py 首页.html
```

---

© 2026 成都门客文化传播有限公司 · 门客 MENKE · www.mk-cd.cn
