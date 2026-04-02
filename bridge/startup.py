import sqlite3, time, urllib.request, json, subprocess, sys

print("[Startup] Waiting for C# bridge to be ready...")

# Wait up to 120 seconds for C# bridge
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
    print("[Startup] WARNING: C# bridge not ready after 120s, continuing anyway")

# Reset error_login_failed accounts back to pending so they reconnect
conn = sqlite3.connect("C:/mft-bridge/db/mft_bridge.db")
n = conn.execute("UPDATE accounts SET status='pending' WHERE status='error_login_failed'").rowcount
conn.commit()
conn.close()
print("[Startup] Reset", n, "accounts from error_login_failed to pending")
print("[Startup] Done - MFTBridge will now reconnect accounts")
