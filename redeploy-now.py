#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
GamDen 服务器端重新部署（paramiko 免密版）
========================================
按顺序执行：
  1) 备份服务器上未提交的 package*.json 修改
  2) git pull origin master
  3) npm install + npm run build（marketing-site）
  4) pm2 restart gamden-marketing
  5) 启动 gamden-nginx 容器（如已退出）
  6) 最终 HTTP 健康检查
"""
import os
import sys
import time
from pathlib import Path

import paramiko
import urllib.request

# ---- 配置 ----
SERVER = "43.160.220.131"
USER = "root"
PROJECT_DIR = "/opt/GamDen"
LOCAL_SSH_KEY = Path(os.path.expanduser("~/.ssh/id_ed25519"))

# ---- 颜色 ----
os.system("") if sys.platform == "win32" else None
C_OK = "\033[32m"; C_INFO = "\033[36m"; C_WARN = "\033[33m"; C_FAIL = "\033[31m"; C_BOLD = "\033[1m"; C_END = "\033[0m"
def info(m): print(f"{C_INFO}[INFO]{C_END} {m}", flush=True)
def ok(m):   print(f"{C_OK}[ OK ]{C_END} {m}", flush=True)
def warn(m): print(f"{C_WARN}[WARN]{C_END} {m}", flush=True)
def fail(m): print(f"{C_FAIL}[FAIL]{C_END} {m}", flush=True)
def step(m): print(f"\n{C_BOLD}{C_INFO}{'='*8} {m} {'='*8}{C_END}", flush=True)


def run(client, cmd, timeout=60, check=True):
    info(f"$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip(): print(out.rstrip(), flush=True)
    if err.strip(): print(err.rstrip(), flush=True)
    if check and code != 0:
        fail(f"命令退出码 {code}")
        sys.exit(1)
    return out, err, code


def main():
    print(f"\n{C_BOLD}{'='*60}\n  GamDen 服务器端重新部署 → {SERVER}\n{'='*60}{C_END}\n")

    # ---- 1) 连接 ----
    step("Step 1/6: SSH 免密连接")
    pkey = paramiko.Ed25519Key.from_private_key_file(str(LOCAL_SSH_KEY))
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SERVER, username=USER, pkey=pkey, timeout=15)
    ok("SSH 连接成功")

    try:
        # ---- 2) 备份并丢弃服务器本地修改 ----
        step("Step 2/6: 备份服务器未提交修改 + git pull")
        backup_cmd = (
            f"cd {PROJECT_DIR} && "
            # 备份营销站点的 package 文件
            "if [ -f marketing-site/package.json ]; then "
            "  cp marketing-site/package.json /tmp/marketing-site.package.json.bak; "
            "  cp marketing-site/package-lock.json /tmp/marketing-site.package-lock.json.bak; "
            "fi; "
            # 查看当前修改摘要
            "echo '--- 服务器 git status (修改前) ---'; "
            "git status -s | head -10; "
            # 丢弃本地修改
            "git checkout -- marketing-site/package.json marketing-site/package-lock.json 2>&1; "
            # 移除会与远程冲突的 untracked 文件（这些是 Next.js 自动生成的临时文件）
            "rm -f marketing-site/next-env.d.ts marketing-site/tsconfig.json 2>/dev/null; "
            # 备份并移除 deploy/scripts/redeploy.sh（服务器上之前手动添加的，与远程冲突）
            "if [ -f deploy/scripts/redeploy.sh ]; then "
            "  cp deploy/scripts/redeploy.sh /tmp/server-redeploy.sh.bak; "
            "  rm -f deploy/scripts/redeploy.sh; "
            "fi; "
            # 拉取最新代码
            "echo '--- git pull origin master ---'; "
            "git pull origin master 2>&1; "
            "echo '--- HEAD now ---'; "
            "git log --oneline -3"
        )
        run(client, backup_cmd)

        # ---- 3) 重新构建 marketing-site ----
        step("Step 3/6: 重新构建 marketing-site (npm install + build)")
        build_cmd = (
            f"cd {PROJECT_DIR}/marketing-site && "
            "echo '--- npm install ---' && "
            "npm install --silent --no-audit --no-fund 2>&1 | tail -5 && "
            "echo '--- npm run build ---' && "
            "npm run build 2>&1 | tail -30"
        )
        # build 可能耗时 1-3 分钟
        run(client, build_cmd, timeout=300)

        # ---- 4) PM2 重启 ----
        step("Step 4/6: PM2 重启 gamden-marketing")
        pm2_cmd = (
            "pm2 restart gamden-marketing 2>&1 && "
            "sleep 2 && "
            "pm2 list | head -10 && "
            "echo '--- 3002 端口监听 ---' && "
            "ss -tlnp 2>&1 | grep -E ':3002\\b' || echo 'WARN: 3002 not listening'"
        )
        run(client, pm2_cmd)

        # ---- 5) 启动 gamden-nginx 容器 ----
        step("Step 5/6: 启动 gamden-nginx 容器")
        nginx_cmd = (
            "echo '--- 当前 nginx 容器状态 ---' && "
            "docker ps -a --filter name=gamden-nginx --format '{{.Names}}\\t{{.Status}}' && "
            # 如果已退出则启动
            "docker ps -a --filter name=gamden-nginx --format '{{.Names}}' | grep -q gamden-nginx && "
            "  docker start gamden-nginx 2>&1 || "
            "  echo 'gamden-nginx 容器不存在，跳过 docker start' && "
            "sleep 2 && "
            "echo '--- 启动后状态 ---' && "
            "docker ps --filter name=gamden-nginx --format '{{.Names}}\\t{{.Status}}\\t{{.Ports}}' && "
            "echo '--- 80 端口监听 ---' && "
            "ss -tlnp 2>&1 | grep -E ':80\\b' || echo 'WARN: 80 not listening'"
        )
        run(client, nginx_cmd)

        # ---- 6) HTTP 验证 ----
        step("Step 6/6: HTTP 健康检查")
        # 等待 nginx 完全启动
        time.sleep(3)
        checks = [
            ("主站首页",        "http://gamden.matux.tech/",                        "200"),
            ("本地 80",         "http://localhost/",                                  "200"),
            ("/health 后端",     "http://gamden.matux.tech/health",                    "status"),
        ]
        all_pass = True
        for desc, url, expect in checks:
            try:
                with urllib.request.urlopen(url, timeout=10) as r:
                    body = r.read().decode("utf-8", errors="replace")
                    code_str = str(r.status)
            except urllib.error.HTTPError as e:
                body = e.read().decode("utf-8", errors="replace")
                code_str = str(e.code)
            except Exception as e:
                body = ""
                code_str = f"ERR({type(e).__name__})"
            ok_match = (expect in code_str) or (expect in body)
            marker = "OK" if ok_match else "WARN"
            color = C_OK if ok_match else C_WARN
            print(f"{color}[{marker}]{C_END} {desc}: HTTP {code_str}  (期望匹配 '{expect}')", flush=True)
            if not ok_match:
                all_pass = False

        print()
        if all_pass:
            ok("全部检查通过 ✅")
        else:
            warn("部分检查未通过，请查看上述输出")

    finally:
        client.close()

    print(f"\n{C_BOLD}{C_OK}{'='*60}\n  重新部署完成 🚀\n  访问: http://gamden.matux.tech\n{'='*60}{C_END}\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        warn("用户中断")
        sys.exit(130)
