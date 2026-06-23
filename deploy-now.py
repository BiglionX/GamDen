#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
GamDen 一键部署脚本（Python + paramiko 版）
============================================
流程：
  1) 提示输入 SSH 密码（getpass，不回显）
  2) 用 paramiko 连接服务器
  3) 自动推送本地 ~/.ssh/id_ed25519.pub 到服务器 ~/.ssh/authorized_keys
  4) 重新用密钥连接（验证免密可用）
  5) 上传 4 个文件（nginx.conf / .env / frontend/.env.production / redeploy-prod.sh）
  6) 远程执行部署 + 实时回显
  7) 密码变量在使用后立即清零
"""

import getpass
import os
import sys
import time
from pathlib import Path

import paramiko

# ---- 配置 ----
SERVER = "43.160.220.131"
USER = "root"
PROJECT_DIR = "/opt/gamden"
LOCAL_REPO = Path(r"d:\GamDen")
LOCAL_SSH_KEY = Path(os.path.expanduser("~/.ssh/id_ed25519"))
LOCAL_SSH_PUB = Path(os.path.expanduser("~/.ssh/id_ed25519.pub"))

# ---- 颜色（Windows ANSI）----
if sys.platform == "win32":
    os.system("")

C_INFO = "\033[36m"
C_OK = "\033[32m"
C_WARN = "\033[33m"
C_FAIL = "\033[31m"
C_END = "\033[0m"
C_BOLD = "\033[1m"


def log_info(m): print(f"{C_INFO}[INFO]{C_END} {m}", flush=True)
def log_ok(m):   print(f"{C_OK}[ OK ]{C_END} {m}", flush=True)
def log_warn(m): print(f"{C_WARN}[WARN]{C_END} {m}", flush=True)
def log_fail(m): print(f"{C_FAIL}[FAIL]{C_END} {m}", flush=True)
def log_step(m): print(f"\n{C_BOLD}{C_INFO}==== {m} ===={C_END}", flush=True)


def connect_password(password: str) -> paramiko.SSHClient:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(SERVER, username=USER, password=password, timeout=15)
    return c


def connect_key(pkey: paramiko.PKey) -> paramiko.SSHClient:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(SERVER, username=USER, pkey=pkey, timeout=15)
    return c


def run_remote(client: paramiko.SSHClient, cmd: str, timeout: int = 60) -> tuple[str, str, int]:
    """同步执行远程命令，返回 (stdout, stderr, exit_code)"""
    log_info(f"$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.rstrip(), flush=True)
    if err.strip():
        print(err.rstrip(), flush=True)
    return out, err, code


def upload_file(client: paramiko.SSHClient, local_path: Path, remote_path: str):
    log_info(f"上传: {local_path} → {SERVER}:{remote_path}")
    sftp = client.open_sftp()
    try:
        sftp.put(str(local_path), remote_path)
    finally:
        sftp.close()
    log_ok("已上传")


def main():
    print(f"\n{C_BOLD}{'='*50}")
    print(f"  GamDen 一键部署 → 腾讯云 {SERVER}")
    print(f"{'='*50}{C_END}\n")

    # ---- 1) 读密码 ----
    if not LOCAL_SSH_PUB.exists():
        log_fail(f"找不到本地公钥: {LOCAL_SSH_PUB}")
        sys.exit(1)
    pubkey_content = LOCAL_SSH_PUB.read_text().strip()
    log_info(f"本地公钥: {pubkey_content[:60]}...")

    # 支持两种密码输入方式：
    #   a) 交互式 stdin（用户在 PowerShell 里手动输入）
    #   b) 环境变量 GAMDEN_SSH_PWD（用于自动化，从 stdin 管道不可用时）
    if "GAMDEN_SSH_PWD" in os.environ:
        password = os.environ["GAMDEN_SSH_PWD"]
        log_info("从环境变量 GAMDEN_SSH_PWD 读取密码")
    elif not sys.stdin.isatty():
        # stdin 被管道重定向，从 stdin 读第一行
        password = sys.stdin.readline().rstrip("\n").rstrip("\r")
        log_info("从 stdin 管道读取密码")
    else:
        password = getpass.getpass(f"请输入 {USER}@{SERVER} 的 SSH 密码（输入时不显示）: ")
    if not password:
        log_fail("密码不能为空")
        sys.exit(1)
    print()

    # ---- 2) 密码连接 + 推送公钥 ----
    log_step("Step 1/5: 推送公钥到服务器（实现免密登录）")
    try:
        client = connect_password(password)
    except Exception as e:
        log_fail(f"SSH 密码连接失败: {e}")
        password = "\x00" * len(password)  # 立即覆盖
        sys.exit(1)

    try:
        # 推送公钥
        cmd = (
            "mkdir -p ~/.ssh && chmod 700 ~/.ssh && "
            f"grep -qxF '{pubkey_content}' ~/.ssh/authorized_keys 2>/dev/null || "
            f"echo '{pubkey_content}' >> ~/.ssh/authorized_keys; "
            "chmod 600 ~/.ssh/authorized_keys && "
            "echo AUTHORIZED_KEYS_OK"
        )
        out, err, code = run_remote(client, cmd)
        if code != 0 or "AUTHORIZED_KEYS_OK" not in out:
            log_fail("推送公钥失败")
            sys.exit(1)
        log_ok("公钥已推送")
    finally:
        client.close()
        password = "\x00" * len(password)  # 清空密码
        log_info("密码变量已清零")

    # ---- 3) 用密钥连接（验证免密）----
    log_step("Step 2/5: 用密钥重新连接（验证免密可用）")
    try:
        pkey = paramiko.Ed25519Key.from_private_key_file(str(LOCAL_SSH_KEY))
    except Exception as e:
        log_fail(f"读取私钥失败: {e}")
        sys.exit(1)

    try:
        client = connect_key(pkey)
    except Exception as e:
        log_fail(f"密钥连接失败（公钥未生效？请稍后重试）: {e}")
        sys.exit(1)
    log_ok("免密登录验证成功 🎉")

    try:
        # ---- 4) 上传文件 ----
        log_step("Step 3/5: 上传 4 个文件")
        # 确保远端目录存在
        run_remote(
            client,
            f"mkdir -p {PROJECT_DIR}/nginx {PROJECT_DIR}/frontend {PROJECT_DIR}/deploy/scripts",
        )

        upload_file(client, LOCAL_REPO / "nginx" / "nginx.conf",
                    f"{PROJECT_DIR}/nginx/nginx.conf")
        upload_file(client, LOCAL_REPO / ".env",
                    f"{PROJECT_DIR}/.env")
        upload_file(client, LOCAL_REPO / "frontend" / ".env.production",
                    f"{PROJECT_DIR}/frontend/.env.production")
        upload_file(client, LOCAL_REPO / "deploy" / "scripts" / "redeploy-prod.sh",
                    f"{PROJECT_DIR}/deploy/scripts/redeploy-prod.sh")

        # ---- 5) 远程执行部署 ----
        log_step("Step 4/5: 服务器端执行部署（rebuild frontend）")
        deploy_cmd = (
            f"chmod +x {PROJECT_DIR}/deploy/scripts/redeploy-prod.sh; "
            f"{PROJECT_DIR}/deploy/scripts/redeploy-prod.sh "
            f"--rebuild-frontend --project-dir {PROJECT_DIR}"
        )
        # 这个命令耗时较长（2-5 分钟）
        stdin, stdout, stderr = client.exec_command(deploy_cmd, timeout=600)
        # 实时流式回显
        channel = stdout.channel
        while True:
            if channel.recv_ready():
                data = channel.recv(4096).decode("utf-8", errors="replace")
                print(data, end="", flush=True)
            if channel.exit_status_ready() and not channel.recv_ready():
                break
            time.sleep(0.1)
        code = channel.recv_exit_status()

        if code != 0:
            log_fail(f"部署失败，远程脚本退出码: {code}")
            sys.exit(1)

        # ---- 6) 最终健康检查 ----
        log_step("Step 5/5: 最终验证（HTTP 探测）")
        checks = [
            ("主站首页",       f"http://gamden.matux.tech/",                                  "200"),
            ("后端 /health",    "http://gamden.matux.tech/health",                              "status"),
            ("SMS 接口路由",    "http://gamden.matux.tech/api/auth/sms/send",                   "404"),  # POST 应返回 404
            ("领地接口路由",    "http://gamden.matux.tech/api/territory/info",                  "404"),
        ]
        import urllib.request
        for desc, url, expect in checks:
            try:
                req = urllib.request.Request(url, method="HEAD")
                with urllib.request.urlopen(req, timeout=10) as r:
                    body_indicator = ""  # HEAD 没有 body
                    code_str = str(r.status)
            except urllib.error.HTTPError as e:
                code_str = str(e.code)
            except Exception as e:
                code_str = f"ERR({type(e).__name__})"
            # GET 验证内容
            try:
                with urllib.request.urlopen(url, timeout=10) as r:
                    body = r.read().decode("utf-8", errors="replace")
            except urllib.error.HTTPError as e:
                body = e.read().decode("utf-8", errors="replace")
            except Exception:
                body = ""
            if expect in body or expect in code_str:
                log_ok(f"{desc} → {url} (HTTP {code_str})")
            else:
                log_warn(f"{desc} → {url} (HTTP {code_str})，期望匹配 '{expect}'")

    finally:
        client.close()

    print(f"\n{C_BOLD}{C_OK}{'='*50}")
    print(f"  部署完成 🚀")
    print(f"  访问: http://gamden.matux.tech")
    print(f"{'='*50}{C_END}\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log_warn("用户中断")
        sys.exit(130)
