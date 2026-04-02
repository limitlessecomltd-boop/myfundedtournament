import sqlite3, urllib.request, json

conn = sqlite3.connect('C:/mft-bridge/db/mft_bridge.db')
data = json.loads(urllib.request.urlopen('http://localhost:5099/health').read())

for acc in data['accounts']:
    login = str(acc['login'])
    bal = float(acc['balance'])
    pabs = round(bal - 1000.0, 2)
    ppct = round(pabs / 1000.0 * 100, 2)
    conn.execute(
        'UPDATE accounts SET balance=?, equity=?, profit_abs=?, profit_pct=?, starting_balance=1000.0, last_sync=datetime("now") WHERE mt5_login=?',
        [bal, bal, pabs, ppct, login]
    )
    print(login, 'bal=', bal, 'pct=', ppct)

conn.commit()
conn.close()
print('Done - refresh admin portal')
