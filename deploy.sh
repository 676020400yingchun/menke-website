#!/usr/bin/env bash
# ============================================================
# 门客官网一键部署脚本（阿里云 Nginx）
# 用法：
#   1) 密钥免密（推荐）:  ./deploy.sh [ssh别名, 默认 menke-aliyun]
#   2) 密码认证(备用):     ./deploy.sh <IP> '<root密码>'
# 效果：上传四页+素材 → 首页设为入口 → 权限 → nginx -t/reload → curl 验证
# ============================================================
set -euo pipefail

PROJ_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE_USER="root"
REMOTE_HOST="1.14.103.209"
REMOTE_PORT="22"
REMOTE_DIR="/www/wwwroot/menke-web"
SSH_ALIAS="${1:-menke-aliyun}"
PASS="${2:-}"

PAGES="首页.html 业务.html 案例.html 我的.html 首页-en.html 业务-en.html 案例-en.html 我的-en.html"

SCP_FLAGS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)
SSH_FLAGS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10)

echo "==> 检测认证方式…"
SCP_CMD=()
SSH_CMD=()

if [ -n "$PASS" ]; then
  if ! command -v sshpass >/dev/null 2>&1; then
    echo "需要 sshpass：brew install hudochenkov/sshpass/sshpass（或改用密钥认证）"; exit 1
  fi
  SCP_CMD=(sshpass -p "$PASS" scp "${SCP_FLAGS[@]}" -P "$REMOTE_PORT")
  SSH_CMD=(sshpass -p "$PASS" ssh "${SSH_FLAGS[@]}" -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST")
elif ssh -o BatchMode=yes -o ConnectTimeout=8 "$SSH_ALIAS" true 2>/dev/null; then
  SCP_CMD=(scp "${SCP_FLAGS[@]}")
  SSH_CMD=(ssh "${SSH_FLAGS[@]}" "$SSH_ALIAS")
elif [ -f "$HOME/.ssh/menke_deploy" ]; then
  SCP_CMD=(scp "${SCP_FLAGS[@]}" -i "$HOME/.ssh/menke_deploy")
  SSH_CMD=(ssh "${SSH_FLAGS[@]}" -i "$HOME/.ssh/menke_deploy" -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST")
else
  echo "认证失败。用法：./deploy.sh [ssh别名]   或   ./deploy.sh <IP> '<root密码>'"
  exit 1
fi

echo "==> 1/4 上传页面与素材…"
"${SSH_CMD[@]}" "mkdir -p '$REMOTE_DIR/assets'"
"${SCP_CMD[@]}" "$PROJ_DIR/首页.html" "$PROJ_DIR/业务.html" "$PROJ_DIR/案例.html" "$PROJ_DIR/我的.html" "$PROJ_DIR/首页-en.html" "$PROJ_DIR/业务-en.html" "$PROJ_DIR/案例-en.html" "$PROJ_DIR/我的-en.html" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"
"${SCP_CMD[@]}" -r "$PROJ_DIR/assets/." "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/assets/"

echo "==> 2/4 设置入口(index.html)与权限…"
"${SSH_CMD[@]}" "cd $REMOTE_DIR && cp -f 首页.html index.html && chmod 644 *.html && find assets -type d -exec chmod 755 {} + && find assets -type f -exec chmod 644 {} + && echo files-ok"

echo "==> 3/4 Nginx 校验并 reload…"
"${SSH_CMD[@]}" "nginx -t && systemctl reload nginx && echo nginx-ok"

echo "==> 4/4 验证线上访问…"
"${SSH_CMD[@]}" "for p in '' 业务.html 案例.html 我的.html; do code=\$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: mkwh.work' \"http://127.0.0.1/\$p\"); echo \"/\$p -> \$code\"; done"

echo "==> 部署完成"
