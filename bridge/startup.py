import sqlite3, time, urllib.request, json, subprocess, os

print("[Startup] MFT Bridge Startup Script")

GITHUB = "https://raw.githubusercontent.com/limitlessecomltd-boop/myfundedtournament/main/bridge/"
DOTNET = "C:\\dotnet\\dotnet.exe"
PROJ   = "C:\\mft-bridge\\mt5csharp"
OUTDIR = "C:\\mft-bridge\\mt5csharp\\bin\\"
NSSM   = "C:\\mft-bridge\\nssm.exe"
DB     = "C:\\mft-bridge\\db\\mft_bridge.db"
ACCTS  = "C:\\mft-bridge\\db\\accounts.json"
SECRET = "mft_bridge_secret_2024"

# Step 1: Download latest files from GitHub
for fname, dest in [
    ("mt5_connector.py",   "C:\\mft-bridge\\bridge\\mt5_connector.py"),
    ("Mt5BridgeServer.cs", "C:\\mft-bridge\\mt5csharp\\Mt5BridgeServer.cs"),
]:
    try:
        urllib.request.urlretrieve(GITHUB + fname, dest)
        print("[Startup] Updated:", fname)
    except Exception as e:
        print("[Startup] WARNING: Could not update", fname, "-", str(e))

# Step 2: Stop service before build so the .exe isn't locked
print("[Startup] Stopping MftMt5Bridge for rebuild...")
try:
    subprocess.run([NSSM, "stop", "MftMt5Bridge"], capture_output=True, timeout=30)
    time.sleep(3)
    print("[Startup] Service stopped")
except Exception as e:
    print("[Startup] Stop error:", str(e))

# Step 3: Rebuild C# bridge
print("[Startup] Rebuilding C# bridge...")
try:
    r = subprocess.run([DOTNET, "build", PROJ, "-c", "Release", "-o", OUTDIR],
                       capture_output=True, text=True, timeout=120)
    if r.returncode == 0:
        print("[Startup] Build succeeded")
    else:
        print("[Startup] Build FAILED:", r.stdout[-300:], r.stderr[-300:])
except Exception as e:
    print("[Startup] Build error:", str(e))

# Step 4: Restart service
print("[Startup] Restarting MftMt5Bridge...")
try:
    subprocess.run([NSSM, "start", "MftMt5Bridge"], capture_output=True, timeout=30)
    print("[Startup] Service started, waiting 6s...")
    time.sleep(6)
except Exception as e:
    print("[Startup] Start error:", str(e))

# Step 4: Wait for bridge to be ready (bridge now does warmup history download = slower startup)
print("[Startup] Waiting for C# bridge + account connections...")
bridge_accounts = []
for i in range(60):  # wait up to 180s for accounts to connect with warmup
    try:
        data = json.loads(urllib.request.urlopen("http://localhost:5099/health", timeout=5).read())
        bridge_accounts = data.get("accounts", [])
        if bridge_accounts:
            print("[Startup] C# bridge ready -", len(bridge_accounts), "accounts connected")
            if len(bridge_accounts) >= 1:
                break  # at least one connected, proceed
        else:
            print("[Startup] Bridge up but 0 accounts yet (" + str(i+1) + "/60)...")
    except Exception as e:
        print("[Startup] Not ready yet (" + str(i+1) + "/60):", str(e))
    time.sleep(3)
else:
    print("[Startup] WARNING: C# bridge not ready after 180s")

# Step 5: Retry unconnected accounts from accounts.json
print("[Startup] Checking for unconnected accounts...")
try:
    if os.path.exists(ACCTS):
        file_accounts = json.loads(open(ACCTS).read())
        connected = {str(a.get("login")) for a in bridge_accounts}
        for acc in file_accounts:
            login    = str(acc.get("login", ""))
            password = acc.get("password", "")
            server   = acc.get("server", "Exness-MT5Trial15")
            if not login:
                continue
            if login in connected:
                print("[Startup]", login, "already connected")
                continue
            print("[Startup] Retrying:", login)
            try:
                payload = json.dumps({"login": login, "password": password,
                                      "server": server, "secret": SECRET}).encode()
                req = urllib.request.Request(
                    "http://localhost:5099/connect-account",
                    data=payload,
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                resp = json.loads(urllib.request.urlopen(req, timeout=15).read())
                print("[Startup] Retry result:", login, "-", resp.get("msg", resp))
            except Exception as e:
                print("[Startup] Retry failed:", login, "-", str(e))
    else:
        print("[Startup] accounts.json not found, skipping retry")
except Exception as e:
    print("[Startup] Retry loop error:", str(e))

# Step 6: Sync bridge accounts into SQLite
print("[Startup] Syncing to SQLite...")
try:
    data = json.loads(urllib.request.urlopen("http://localhost:5099/health").read())
    conn = sqlite3.connect(DB)
    for acc in data.get("accounts", []):
        login   = str(acc.get("login", ""))
        balance = float(acc.get("balance") or 0)
        if not login:
            continue
        pabs = round(balance - 1000.0, 2)
        ppct = round(pabs / 1000.0 * 100, 2)
        exists = conn.execute("SELECT id FROM accounts WHERE mt5_login=?", [login]).fetchone()
        if exists:
            conn.execute(
                "UPDATE accounts SET balance=?,equity=?,profit_abs=?,profit_pct=?,"
                "status='connected',last_sync=datetime('now') WHERE mt5_login=?",
                [balance, balance, pabs, ppct, login])
        else:
            conn.execute(
                "INSERT INTO accounts (mt5_login,mt5_server,broker,status,balance,equity,"
                "profit_abs,profit_pct,starting_balance,last_sync) "
                "VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))",
                [login, "Exness-MT5Trial15", "exness", "connected",
                 balance, balance, pabs, ppct, 1000.0])
            print("[Startup] Inserted:", login)
    conn.commit()
    conn.close()
    print("[Startup] SQLite sync complete")
except Exception as e:
    print("[Startup] Sync error:", str(e))

# Step 7: Reset error accounts
conn = sqlite3.connect(DB)
n = conn.execute("UPDATE accounts SET status='pending' WHERE status='error_login_failed'").rowcount
conn.commit()
conn.close()
print("[Startup] Reset", n, "error accounts to pending")
print("[Startup] Done")

# Step 8: Install and start MftWatchdog if not already running
print("[Startup] Setting up watchdog...")
try:
    WATCHDOG_FILE = "C:\\mft-bridge\\watchdog.py"
    WD_PYTHON = "C:\\Program Files\\Python313\\python.exe"
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/limitlessecomltd-boop/myfundedtournament/main/bridge/watchdog.py",
        WATCHDOG_FILE
    )
    print("[Startup] watchdog.py downloaded")
    wcheck = subprocess.run([NSSM, "status", "MftWatchdog"], capture_output=True, text=True, timeout=10)
    if "No such service" in wcheck.stdout or "No such service" in wcheck.stderr or wcheck.returncode != 0:
        subprocess.run([NSSM, "install", "MftWatchdog", WD_PYTHON, WATCHDOG_FILE], capture_output=True, timeout=15)
        subprocess.run([NSSM, "set", "MftWatchdog", "AppStdout", "C:\\mft-bridge\\watchdog-stdout.log"], capture_output=True, timeout=10)
        subprocess.run([NSSM, "set", "MftWatchdog", "AppStderr", "C:\\mft-bridge\\watchdog-stderr.log"], capture_output=True, timeout=10)
        subprocess.run([NSSM, "start", "MftWatchdog"], capture_output=True, timeout=15)
        print("[Startup] MftWatchdog installed and started")
    else:
        subprocess.run([NSSM, "restart", "MftWatchdog"], capture_output=True, timeout=20)
        print("[Startup] MftWatchdog restarted")
except Exception as e:
    print("[Startup] Watchdog setup error:", str(e))

# Step 9: Install and start MftSyncDaemon if not already running
print("[Startup] Setting up sync daemon...")
try:
    import subprocess, os

    PYTHON = "C:\\Program Files\\Python313\\python.exe"
    NSSM   = "C:\\mft-bridge\\nssm.exe"
    DAEMON = "C:\\mft-bridge\\sync_daemon.py"

    # Download latest sync_daemon.py
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/limitlessecomltd-boop/myfundedtournament/main/bridge/sync_daemon.py",
        DAEMON
    )
    print("[Startup] sync_daemon.py downloaded")

    # Check if service exists
    check = subprocess.run([NSSM, "status", "MftSyncDaemon"],
                           capture_output=True, text=True, timeout=10)

    if "No such service" in check.stdout or "No such service" in check.stderr or check.returncode != 0:
        # Install service
        subprocess.run([NSSM, "install", "MftSyncDaemon", PYTHON, DAEMON],
                       capture_output=True, timeout=15)
        subprocess.run([NSSM, "set", "MftSyncDaemon", "AppStdout",
                        "C:\\mft-bridge\\sync-stdout.log"],
                       capture_output=True, timeout=10)
        subprocess.run([NSSM, "set", "MftSyncDaemon", "AppStderr",
                        "C:\\mft-bridge\\sync-stderr.log"],
                       capture_output=True, timeout=10)
        subprocess.run([NSSM, "start", "MftSyncDaemon"],
                       capture_output=True, timeout=15)
        print("[Startup] MftSyncDaemon installed and started")
    else:
        # Already exists — restart to pick up new code
        subprocess.run([NSSM, "restart", "MftSyncDaemon"],
                       capture_output=True, timeout=20)
        print("[Startup] MftSyncDaemon restarted")

except Exception as e:
    print("[Startup] Sync daemon setup error:", str(e))
