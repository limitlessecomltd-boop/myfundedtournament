import sqlite3, time, urllib.request, json, subprocess, os

print("[Startup] MFT Bridge Startup Script")

# Step 1: Download latest mt5_connector.py from GitHub
print("[Startup] Downloading latest mt5_connector.py...")
try:
    urllib.request.urlretrieve(
        "https://raw.githubusercontent.com/limitlessecomltd-boop/myfundedtournament/main/bridge/mt5_connector.py",
        "C:/mft-bridge/bridge/mt5_connector.py"
    )
    print("[Startup] mt5_connector.py updated")
except Exception as e:
    print("[Startup] WARNING: Could not update mt5_connector.py:", str(e))

# Step 2: Wait for C# bridge to be ready
print("[Startup] Waiting for C# bridge...")
for i in range(40):
    try:
        data = json.loads(urllib.request.urlopen("http://localhost:5099/health", timeout=5).read())
        accounts = data.get("accounts", [])
        if accounts and all(a.get("connected") for a in accounts):
            print("[Startup] C# bridge ready -", len(accounts), "accounts connected")
            break
    except Exception as e:
        print("[Startup] Not ready yet (" + str(i+1) + "/40):", str(e))
    time.sleep(3)
else:
    print("[Startup] WARNING: C# bridge not ready after 120s")

# Step 3: Sync all C# bridge accounts into SQLite
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
    conn.commit()
    conn.close()
except Exception as e:
    print("[Startup] Sync error:", str(e))

# Step 4: Reset error_login_failed accounts
conn = sqlite3.connect("C:/mft-bridge/db/mft_bridge.db")
n = conn.execute("UPDATE accounts SET status='pending' WHERE status='error_login_failed'").rowcount
conn.commit()
conn.close()
print("[Startup] Reset", n, "error accounts to pending")
print("[Startup] Done")
