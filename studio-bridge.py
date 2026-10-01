#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
studio-bridge.py —— 白板工作台「一键出片」本地桥接服务

工作台(whiteboard.html)点「一键出片」按钮时，把 scenes.js POST 到本服务：
  POST /render  {code, title?}
服务把 scenes.js 落地到期目录，再后台跑 one_shot.py 出片，轮询返回成片路径。

用法：
  python studio-bridge.py [--port 8790]
端口默认 8790（与画廊站 8765、qwen 7860 错开）。
"""
import os
import re
import sys
import json
import queue
import shutil
import datetime
import threading
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# 强制 UTF-8 输出
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

SKILL = r"C:/Users/ADMIN/.workbuddy/skills/whiteboard-video"
ONE_SHOT = r"C:/Users/ADMIN/WorkBuddy/2026-09-26-17-10-23/one_shot.py"
PY = r"C:/Users/ADMIN/.workbuddy/binaries/python/versions/3.13.12/python.exe"

PORT = 8790

# 任务表：id -> {status, title, project, final, log}
JOBS = {}
JOBS_LOCK = threading.Lock()
SEQ = 0


def log(msg):
    print("[studio-bridge] " + msg, flush=True)


def parse_title(code, explicit):
    if explicit and explicit.strip():
        return explicit.strip()
    m = re.search(r"new Scene\(['\"]01-intro['\"]\s*,\s*(['\"`])(.*?)\1", code, re.S)
    if m:
        seg = m.group(2).split("|")[0]
        seg = re.sub(r"[^\u4e00-\u9fa5A-Za-z0-9]", "", seg)
        if seg:
            return seg[:8]
    return "未命名"


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/health"):
            return self._json({"ok": True, "jobs": len(JOBS)})
        if self.path.startswith("/job/"):
            jid = self.path.split("/")[-1]
            with JOBS_LOCK:
                job = JOBS.get(jid)
            if not job:
                return self._json({"error": "no such job"}, 404)
            return self._json(job)
        return self._json({"error": "not found"}, 404)

    def do_POST(self):
        if self.path != "/render":
            return self._json({"error": "not found"}, 404)
        try:
            n = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception as e:
            return self._json({"error": "bad json: %s" % e}, 400)
        code = (data or {}).get("code", "")
        title = (data or {}).get("title", "")
        if not code or not code.strip():
            return self._json({"error": "empty code"}, 400)

        global SEQ
        with JOBS_LOCK:
            SEQ += 1
            jid = str(SEQ)
            JOBS[jid] = {"status": "queued", "title": "", "project": "", "final": "", "log": ""}
        t = threading.Thread(target=self._run_job, args=(jid, code, title), daemon=True)
        t.start()
        return self._json({"job": jid})

    def _run_job(self, jid, code, title):
        def setj(**kw):
            with JOBS_LOCK:
                JOBS[jid].update(kw)

        title = parse_title(code, title)
        today = datetime.date.today().isoformat()
        proj_name = f"{today} {title}"
        proj_dir = os.path.join(SKILL, "episodes", proj_name)
        os.makedirs(proj_dir, exist_ok=True)
        dst = os.path.join(proj_dir, "scenes.js")
        with open(dst, "w", encoding="utf-8") as f:
            f.write(code)

        setj(status="running", title=title, project=proj_name,
             log="scenes.js 已落地：%s\n开始出片…" % dst)

        # 后台跑 one_shot.py（其内部会再落地一次，幂等）
        cmd = [PY, ONE_SHOT, "--title", title, dst]
        try:
            r = subprocess.run(cmd, cwd=os.path.dirname(ONE_SHOT), shell=False,
                               stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                               encoding="utf-8", errors="replace")
            out = r.stdout or ""
            setj(log=out[-4000:])
            final = os.path.join(SKILL, "build", proj_name, "outputs", "final.mp4")
            if r.returncode == 0 and os.path.exists(final):
                setj(status="done", final=final)
                log("job %s done -> %s" % (jid, final))
            else:
                setj(status="error", log=out[-4000:] or ("exit %d" % r.returncode))
        except Exception as e:
            setj(status="error", log=str(e))

    def log_message(self, *a):
        pass


def main():
    global PORT
    if "--port" in sys.argv:
        PORT = int(sys.argv[sys.argv.index("--port") + 1])
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    log("listening on http://127.0.0.1:%d" % PORT)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
