import json, sys
try:
    with open(r'C:\mft-bridge\db\accounts.json', 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
    for a in data:
        if a.get('login') and a.get('password'):
            print(a['login'] + '|' + a['password'] + '|' + a.get('server', 'Exness-MT5Trial15'))
except Exception as e:
    print('ERROR:' + str(e), file=sys.stderr)
