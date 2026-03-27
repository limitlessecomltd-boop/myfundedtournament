import sqlite3

# Fix DB stats from balance
conn = sqlite3.connect('C:/mft-bridge/db/mft_bridge.db')
rows = conn.execute('SELECT mt5_login, balance FROM accounts').fetchall()
for row in rows:
    login = row[0]
    bal = float(row[1])
    start = 1000.0
    pabs = round(bal - start, 2)
    ppct = round(pabs / start * 100, 2)
    conn.execute('UPDATE accounts SET starting_balance=1000.0, profit_abs=?, profit_pct=? WHERE mt5_login=?', [pabs, ppct, login])
    total = conn.execute('SELECT COUNT(*) FROM trades WHERE mt5_login=?', [login]).fetchone()[0]
    wins = conn.execute('SELECT COUNT(*) FROM trades WHERE mt5_login=? AND profit>0', [login]).fetchone()[0]
    conn.execute('UPDATE accounts SET total_trades=?, winning_trades=? WHERE mt5_login=?', [total, wins, login])
    print(str(login)+': bal='+str(bal)+' pnl='+str(pabs)+' pct='+str(ppct)+'% trades='+str(total))
conn.commit()
conn.close()
print('Done!')