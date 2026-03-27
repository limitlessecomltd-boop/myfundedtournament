import sqlite3
conn = sqlite3.connect('C:/mft-bridge/db/mft_bridge.db')
rows = conn.execute('SELECT mt5_login, balance FROM accounts').fetchall()
for login, balance in rows:
    start = 1000.0
    profit_abs = round(balance - start, 2)
    profit_pct = round((balance - start) / start * 100, 2)
    conn.execute(
        'UPDATE accounts SET starting_balance=?, profit_abs=?, profit_pct=?, total_trades=0 WHERE mt5_login=?',
        [start, profit_abs, profit_pct, login]
    )
    print(str(login) + ': profit_abs=' + str(profit_abs) + ' profit_pct=' + str(profit_pct))
conn.commit()
conn.close()
print('All fixed!')
