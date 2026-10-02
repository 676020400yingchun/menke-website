#!/usr/bin/env bash
# ============================================================
# 门客官网一键部署脚本（腾讯云 1.14.103.209，绑定域名 mkwh.work）
# 用法：
#   1) 密钥免密:  ./deploy-tencent.sh [私钥路径, 默认 ~/.ssh/id_ed25519]
#   2) 密码认证:  ./deploy-tencent.sh --pass <root密码>
# 效果：装/检测 Nginx → 上传8页+素材 → 入口index → 权限 → 写 menke.conf(server_name mkwh.work)
#       → nginx -t/reload → curl 验证
# ============================================================
set -euo pipefail

PROJ_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE_USER="root"
REMOTE_HOST="1.14.103.209"
REMOTE_PORT="22"
REMOTE_DIR="/www/wwwroot/menke-web"
CONF="/etc/nginx/conf.d/menke.conf"
DOMAIN="mkwh.work"

PAGES="首页.html 业务.html 案例.html 我的.html 首页-en.html 业务-en.html 案例-en.html 我的-en.html"

SCP_FLAGS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)
SSH_FLAGS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10)

KEY=""
PASS=""
if [ "${1:-}" = "--pass" ]; then PASS="${2:-}"; fi
if [ -n "${1:-}" ] && [ "${1:-}" != "--pass" ]; then KEY="${1}"; fi

echo "==> 检测认证方式…"
SCP_CMD=()
SSH_CMD=()

if [ -n "$PASS" ]; then
  if ! command -v sshpass >/dev/null 2>&1; then
    echo "需要 sshpass（brew install sshpass 或改密钥认证）"; exit 1
  fi
  SCP_CMD=(sshpass -p "$PASS" scp "${SCP_FLAGS[@]}" -P "$REMOTE_PORT")
  SSH_CMD=(sshpass -p "$PASS" ssh "${SSH_FLAGS[@]}" -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST")
else
  [ -n "$KEY" ] || KEY="$HOME/.ssh/id_ed25519"
  [ -f "$KEY" ] || KEY="$HOME/.ssh/menke_deploy"
  SCP_CMD=(scp "${SCP_FLAGS[@]}" -i "$KEY" -P "$REMOTE_PORT")
  SSH_CMD=(ssh "${SSH_FLAGS[@]}" -i "$KEY" -P "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST")
fi

echo "==> 1/6 检查并安装 Nginx…"
"${SSH_CMD[@]}" "command -v nginx >/dev/null 2>&1 || { \
  (command -v dnf >/dev/null 2>&1 && dnf install -y nginx --setopt=exclude=) || \
  (command -v yum >/dev/null 2>&1 && yum install -y nginx --setopt=exclude=) || \
  (command -v apt-get >/dev/null 2>&1 && { apt-get update -y && apt-get install -y nginx; }) ; } && echo nginx-ready:\$(nginx -v 2>&1)"

echo "==> 2/6 创建站点目录并上传…"
"${SSH_CMD[@]}" "mkdir -p '$REMOTE_DIR/assets'"
"${SCP_CMD[@]}" "$PROJ_DIR/首页.html" "$PROJ_DIR/业务.html" "$PROJ_DIR/案例.html" "$PROJ_DIR/我的.html" "$PROJ_DIR/首页-en.html" "$PROJ_DIR/业务-en.html" "$PROJ_DIR/案例-en.html" "$PROJ_DIR/我的-en.html" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"
"${SCP_CMD[@]}" -r "$PROJ_DIR/assets/." "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/assets/"

echo "==> 3/6 设置入口与权限…"
"${SSH_CMD[@]}" "cd $REMOTE_DIR && cp -f 首页.html index.html && chmod 644 *.html && find assets -type d -exec chmod 755 {} + && find assets -type f -exec chmod 644 {} + && echo files-ok"

echo "==> 4/6 写入 Nginx 配置（${DOMAIN}）…"
LOCAL_CONF="/tmp/menke-tencent.conf"
cat > "$LOCAL_CONF" <<NEOF
# HTTP 80 → HTTPS 跳转
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

# HTTPS 443
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name $DOMAIN;
    root $REMOTE_DIR;
    index index.html;

    ssl_certificate /etc/nginx/ssl/$DOMAIN/fullchain.cer;
    ssl_certificate_key /etc/nginx/ssl/$DOMAIN/$DOMAIN.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    server_tokens off;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
    location /api/chat {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 90s;
        proxy_send_timeout 90s;
    }
    location /api/health {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
    location /admin {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    location /api/admin/ {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    location = /api/content {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
    location ~* \.(jpg|jpeg|png|gif|webp|svg|ico|css|js)$ {
        expires 7d;
        add_header Cache-Control 'public';
    }
}
NEOF
"${SCP_CMD[@]}" "$LOCAL_CONF" "$REMOTE_USER@$REMOTE_HOST:/tmp/menke-tencent.conf"
"${SSH_CMD[@]}" "cat /tmp/menke-tencent.conf > $CONF && rm -f /tmp/menke-tencent.conf && nginx -t && systemctl enable nginx && systemctl restart nginx && echo conf-ok"

echo "==> 5/6 验证线上访问…"
"${SSH_CMD[@]}" "for p in '' 业务.html 案例.html 我的.html 首页-en.html; do code=\$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: $DOMAIN' \"http://127.0.0.1/\$p\"); echo \"/\$p -> \$code\"; done"

echo "==> 部署完成（域名 ${DOMAIN} 已绑定；公网访问需腾讯云放行80端口 + ICP备案）"
