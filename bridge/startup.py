import sqlite3, time, urllib.request, json, subprocess, os, shutil

print("[Startup] MFT Bridge Startup Script")

# Step 1: Download latest files from GitHub
FILES = [
    ("mt5_connector.py",   "C:/mft-bridge/bridge/mt5_connector.py"),
    ("Mt5BridgeServer.cs", "C:/mft-bridge/mt5csharp/Mt5BridgeServer.cs"),
]
BASE = "https://raw.githubusercontent.com/limitlessecomltd-boop/myfundedtournament/main/bridge/"
for fname, dest in FILES:
    try:
        urllib.request.urlretrieve(BASE + fname, dest)
        print("[Startup] Updated:", fname)
    except Exception as e:
        print("[Startup] WARNING: Could not update", fname, ":", str(e))

# Step 2: Rebuild C# bridge
print("[Startup] Rebuilding C# bridge...")
try:
    result = subprocess.run(
        [r"C:\dotnet\dotnet.exe", "build", r"C:\mft-bridge\mt5csharp",
         "-c", "Release", "-o", r"C:\mft-bridge\mt5csharp\bin\"],
        capture_output=True, text=True, timeout=120
    )
    if result.returncode == 0:
        print("[Startup] Build succeeded")
    else:
        print("[Startup] Build FAILED:\n" + result.stdout[-500:] + result.stderr[-500:])
except Exception as e:
    print("[Startup] Build error:", str(e))

# Step 3: Restart the C# bridge service
print("[Startup] Restarting MftMt5Bridge service...")
try:
    subprocess.run([r"C:\mft-bridge\nssm.exe", "restart", "MftMt5Bridge"],
                   capture_output=True, timeout=30)
    print("[Startup] Service restarted")
    time.sleep(5)
except Exception as e:
    print("[Startup] Service restart error:", str(e))

# Step 4: Wait for C# bridge to be ready
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

# Step 5: Retry any accounts in accounts.json that aren't connected yet
print("[Startup] Checking for unconnected accounts...")
try:
    accounts_path = r"C:\mft-bridge\db\accounts.json"
    if os.path.exists(accounts_path):
        with open(accounts_path, "r") as f:
            content = f.read()
        # Parse JSON array manually (safe simple approach)
        file_accounts = json.loads(content)
        connected_logins = {str(a.get("login")) for a in bridge_accounts}
        for acc in file_accounts:
            login = str(acc.get("login", ""))
            password = acc.get("password", "")
            server = acc.get("server", "Exness-MT5Trial15")
            if login and login not in connected_logins:
                print("[Startup] Retrying connection for", login)
                try:
                    payload = json.dumps({
                        "login": login, "password": password,
                        "server": server, "secret": "mft_bridge_secret_2024"
                    }).encode()
                    req = urllib.request.Request(
                        "http://localhost:5099/connect-account",
                        data=payload,
                        headers={"Content-Type": "application/json"},
                        method="POST"
                    )
                    resp = json.loads(urllib.request.urlopen(req, timeout=10).read())
                    print("[Startup] Retry result for", login, ":", resp.get("msg", resp))
                except Exception as e:
                    print("[Startup] Retry failed for", login, ":", str(e))
            else:
                print("[Startup]", login, "already connected - OK")
    else:
        print("[Startup] accounts.json not found - skipping retry")
except Exception as e:
    print("[Startup] Retry loop error:", str(e))

# Step 6: Sync all C# bridge accounts into SQLite
print("[Startup] Syncing C# bridge accounts to SQLite...")
try:
    data = json.loads(urllib.request.urlopen("http://localhost:5099/health").read())
    conn = sqlite3.connect("C:/mft-bridge/db/mft_bridge.db")
    for acc in data.get("accounts", []):
        login = str(acc.get("login", ""))
        balance = float(acc.get("balance") or 0)
        if not login:
            continue
        existing = conn.execute("SELECT id FROM accounts WHERE mt5_login=?", [login]).fetchone()
        if not existing:
            pabs = round(balance - 1000.0, 2)
            ppct = round(pabs / 1000.0 * 100, 2)
            conn.execute("""INSERT INTO accounts (mt5_login,mt5_server,broker,status,balance,equity,profit_abs,profit_pct,starting_balance,last_sync)
                VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))""",
                [login, "Exness-MT5Trial15", "exness", "pending", balance, balance, pabs, ppct, 1000.0])
            print("[Startup] Inserted new account:", login)
        else:
            pabs = round(balance - 1000.0, 2)
            ppct = round(pabs / 1000.0 * 100, 2)
            conn.execute("""UPDATE accounts SET balance=?,equity=?,profit_abs=?,profit_pct=?,
                status='connected',last_sync=datetime('now') WHERE mt5_login=?""",
                [balance, balance, pabs, ppct, login])
    conn.commit()
    conn.close()
    print("[Startup] SQLite sync complete")
except Exception as e:
    print("[Startup] Sync error:", str(e))

# Step 7: Reset error accounts
conn = sqlite3.connect("C:/mft-bridge/db/mft_bridge.db")
n = conn.execute("UPDATE accounts SET status='pending' WHERE status='error_login_failed'").rowcount
conn.commit()
conn.close()
print("[Startup] Reset", n, "error accounts to pending")
print("[Startup] Done")
