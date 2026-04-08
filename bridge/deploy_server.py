import http.server, subprocess, threading, urllib.request, os, json, datetime, signal, sys, time

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
            LOG.append("[Deploy] startup.py downloaded")
            result = subprocess.run(
                ["C:\\Program Files\\Python313\\python.exe", "C:\\mft-bridge\\startup.py"],
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
            self._respond(200, body)
        elif self.path == "/health":
            self._respond(200, b'{"status":"ok"}')
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
                self._respond(403, json.dumps({"error": "Unauthorized"}).encode())
                return
            result = run_deploy()
            self._respond(200, json.dumps(result).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

if __name__ == "__main__":
    signal.signal(signal.SIGINT,  signal.SIG_IGN)
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    server = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
    print("[DeployServer] Listening on port " + str(PORT), flush=True)
    server.serve_forever()
