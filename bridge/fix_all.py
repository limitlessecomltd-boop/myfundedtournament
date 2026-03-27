import sqlite3

# Step 1: Fix mt5_connector.py - add excluded column to trade inserts
with open('C:/mft-bridge/bridge/mt5_connector.py', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    "(mt5_login, ticket, symbol, side, volume, open_price,
                             open_time, profit, swap, commission, status)
                        VALUES (?,?,?,?,?,?,?,?,0,0,'open')",
    "(mt5_login, ticket, symbol, side, volume, open_price,
                             open_time, profit, swap, commission, status, excluded)
                        VALUES (?,?,?,?,?,?,?,?,0,0,'open',0)"
)
c = c.replace(
    "(mt5_login, ticket, symbol, side, volume, open_price,
                             open_time, profit, swap, commission, status)
                        VALUES (?,?,?,?,?,?,?,?,0,0,'closed')",
    "(mt5_login, ticket, symbol, side, volume, open_price,
                             open_time, profit, swap, commission, status, excluded)
                        VALUES (?,?,?,?,?,?,?,?,0,0,'closed',0)"
)
c = c.replace(
    "balance=?, equity=?, starting_balance=?,",
    "balance=?, equity=?,"
)
c = c.replace(
    "balance, balance, balance, login",
    "balance, balance, login"
)
c = c.replace(
    "balance=?, equity=?, starting_balance=?,
                        status='connected'",
    "balance=?, equity=?,
                        status='connected'"
)

with open('C:/mft-bridge/bridge/mt5_connector.py', 'w', encoding='utf-8') as f:
    f.write(c)
print("mt5_connector.py fixed")

# Step 2: Fix DB - set starting_balance=1000 and recalculate stats
conn = sqlite3.connect('C:/mft-bridge/db/mft_bridge.db')
rows = conn.execute('SELECT mt5_login, balance FROM accounts').fetchall()
for login, balance in rows:
    start = 1000.0
    pabs = round(float(balance) - start, 2)
    ppct = round(pabs / start * 100, 2)
    conn.execute('UPDATE accounts SET starting_balance=1000.0, profit_abs=?, profit_pct=? WHERE mt5_login=?', [pabs, ppct, login])
    print(str(login) + ': balance=' + str(balance) + ' pnl=' + str(pabs) + ' pct=' + str(ppct) + '%')
conn.commit()
conn.close()
print("DB fixed")

# Step 3: Also count ALL trades (open+closed) for total_trades
conn = sqlite3.connect('C:/mft-bridge/db/mft_bridge.db')
logins = [r[0] for r in conn.execute('SELECT mt5_login FROM accounts').fetchall()]
for login in logins:
    total = conn.execute('SELECT COUNT(*) FROM trades WHERE mt5_login=?', [login]).fetchone()[0]
    wins = conn.execute('SELECT COUNT(*) FROM trades WHERE mt5_login=? AND profit>0', [login]).fetchone()[0]
    conn.execute('UPDATE accounts SET total_trades=?, winning_trades=? WHERE mt5_login=?', [total, wins, login])
    print(str(login) + ': total_trades=' + str(total) + ' wins=' + str(wins))
conn.commit()
conn.close()
print("All done!")
