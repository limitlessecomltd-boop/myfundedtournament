import sqlite3, time, urllib.request, json

# Step 1: Wait for C# bridge to be fully ready
print("Waiting for C# bridge...")
for i in range(10):
    try:
        data = json.loads(urllib.request.urlopen("http://localhost:5099/health").read())
        all_connected = all(a.get("connected") for a in data.get("accounts", []))
        if all_connected:
            print("C# bridge ready - all accounts connected")
            break
    except Exception as e:
        print("Not ready yet:", e)
    time.sleep(3)

# Step 2: Reset status to pending so _reconnect picks them up
conn = sqlite3.connect("C:/mft-bridge/db/mft_bridge.db")
conn.execute("UPDATE accounts SET status='pending'")
conn.commit()
rows = conn.execute("SELECT mt5_login, status FROM accounts").fetchall()
for r in rows:
    print("Reset:", r)
conn.close()
print("Done - restart MFTBridge now")
