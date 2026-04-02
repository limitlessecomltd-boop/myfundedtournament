import sqlite3

# Reset error status so _reconnect picks accounts up again
conn = sqlite3.connect('C:/mft-bridge/db/mft_bridge.db')
conn.execute("UPDATE accounts SET status='connected' WHERE status='error_login_failed'")
conn.commit()
rows = conn.execute("SELECT mt5_login, status FROM accounts").fetchall()
for r in rows:
    print(r)
conn.close()
print('Status reset - restart MFTBridge now')
