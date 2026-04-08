import http.server, subprocess, threading, urllib.request, json, datetime, time, os

PORT   = 9090
SECRET = "mft_deploy_secret_2024"
PYTHON = "C:\\Program Files\\Python313\\python.exe"
LOG    = []
RUNNING = [False]
LOCK   = threading.Lock()

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
            LOG.append("[Deploy] Stopping MftMt5Bridge so .exe is not locked...")
            subprocess.run(["C:\\mft-bridge\\nssm.exe", "stop", "MftMt5Bridge"],
                           capture_output=True, timeout=30)
            time.sleep(3)
            LOG.append("[Deploy] Bridge stopped, running startup.py...")
            r = subprocess.run([PYTHON, "C:\\mft-bridge\\startup.py"],
                               capture_output=True, text=True, timeout=300)
            for line in (r.stdout + r.stderr).splitlines():
                LOG.append(line)
            LOG.append("[Deploy] Done, exit=" + str(r.returncode))
        except Exception as e:
            LOG.append("[Deploy] ERROR: " + str(e))
        finally:
            RUNNING[0] = False
    threading.Thread(target=_do, daemon=True).start()
    return {"status": "started"}

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _json(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
    def do_GET(self):
        if self.path == "/health":
            self._json(200, b'{"status":"ok"}')
        elif self.path == "/deploy/status":
            self._json(200, json.dumps({"running": RUNNING[0], "log": LOG[-100:]}).encode())
        else:
            self.send_response(404); self.end_headers()
    def do_POST(self):
        if self.path == "/deploy":
            n = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(n).decode() if n else "{}"
            try: data = json.loads(raw)
            except: data = {}
            if data.get("secret") != SECRET:
                self._json(403, b'{"error":"Unauthorized"}'); return
            self._json(200, json.dumps(run_deploy()).encode())
        else:
            self.send_response(404); self.end_headers()

http.server.HTTPServer.allow_reuse_address = True
while True:
    try:
        print("[DeployServer] Starting on port " + str(PORT), flush=True)
        srv = http.server.HTTPServer(("0.0.0.0", PORT), Handler)
        srv.serve_forever()
    except KeyboardInterrupt:
        print("[DeployServer] KeyboardInterrupt caught, restarting...", flush=True)
        time.sleep(2)
    except OSError as e:
        print("[DeployServer] OSError: " + str(e) + ", retrying in 5s...", flush=True)
        time.sleep(5)
    except Exception as e:
        print("[DeployServer] Error: " + str(e) + ", retrying in 5s...", flush=True)
        time.sleep(5)
