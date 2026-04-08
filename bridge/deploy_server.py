"""
MFT Deploy Webhook Server - port 9090
POST /deploy         -> downloads latest startup.py + runs it
GET  /deploy/status  -> returns last deploy log
Install once as service: nssm install MftDeployServer
"""
import http.server, subprocess, threading, urllib.request, os, json, datetime

PORT   = 9090
SECRET = "mft_deploy_secret_2024"
LOG    = []
LOCK   = threading.Lock()
RUNNING = [False]

def run_deploy():
    with LOCK:
        if RUNNING[0]:
            return {"status": "already_running"}
        RUNNING[0] = True
    LOG.clear()
    LOG.append("[Deploy] Started: " + str(datetime.datetime.now()))
    def _do():
        try:
            urllib.request.urlretrieve(
                "https://raw.githubusercontent.com/limitlessecomltd-boop/myfundedtournament/main/bridge/startup.py",
                "C:\\mft-bridge\\startup.py"
            )
            LOG.append("[Deploy] startup.py downloaded from GitHub")
            result = subprocess.run(
                ["python", "C:\\mft-bridge\\startup.py"],
                capture_output=True, text=True, timeout=300
            )
            for line in (result.stdout + result.stderr).splitlines():
                LOG.append(line)
            LOG.append("[Deploy] Exit code: " + str(result.returncode))
        except Exception as e:
            LOG.append("[Deploy] ERROR: " + str(e))
        finally:
            RUNNING[0] = False
            LOG.append("[Deploy] Finished: " + str(datetime.datetime.now()))
    threading.Thread(target=_do, daemon=True).start()
    return {"status": "started"}

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path == "/deploy/status":
            body = json.dumps({"running": RUNNING[0], "log": LOG[-100:]}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/health":
            body = b'{"status":"ok"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/deploy":
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length).decode() if length else "{}"
            try:
                data = json.loads(raw)
            except Exception:
                data = {}
            if data.get("secret") != SECRET:
                resp = json.dumps({"error": "Unauthorized"}).encode()
                self.send_response(403)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp)))
                self.end_headers()
                self.wfile.write(resp)
                return
            result = run_deploy()
            resp = json.dumps(result).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(resp)))
            self.end_headers()
            self.wfile.write(resp)
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

if __name__ == "__main__":
    print("[DeployServer] Listening on port", PORT)
    http.server.HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
