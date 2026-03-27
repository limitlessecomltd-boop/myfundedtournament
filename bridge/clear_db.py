import sqlite3
conn = sqlite3.connect('C:/mft-bridge/db/mft_bridge.db')
conn.execute('DELETE FROM trades')
conn.execute('DELETE FROM violations')
conn.execute('UPDATE accounts SET profit_pct=0, total_trades=0, last_sync=NULL')
conn.commit()
conn.close()
print('DB cleared - fresh data will sync within 30 seconds')
