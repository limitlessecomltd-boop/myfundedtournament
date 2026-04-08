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

# Step 4: Wait for bridge to be ready
print("[Startup] Waiting for C# bridge...")
bridge_accounts = []
for i in range(40):
    try:
        data = json.loads(urllib.request.urlopen("http://localhost:5099/health", timeout=5).read())
        bridge_accounts = data.get("accounts", [])
        if bridge_accounts:
            print("[Startup] C# bridge ready -", len(bridge_accounts), "accounts connected")
            break
    except Exception as e:
        print("[Startup] Not ready yet (" + str(i+1) + "/40):", str(e))
    time.sleep(3)
else:
    print("[Startup] WARNING: C# bridge not ready after 120s")

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
