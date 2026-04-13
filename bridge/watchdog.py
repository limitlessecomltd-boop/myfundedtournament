"""
MFT Bridge Watchdog — runs as MftWatchdog service
Monitors the C# bridge and sync daemon, auto-heals everything.

Checks every 60s:
1. C# bridge (port 5099) alive? → restart MftMt5Bridge if dead
2. All accounts connected? → reconnect any dropped accounts
3. Trade history fresh? → force reconnect if newest trade > 6h old
4. Sync daemon alive? → restart MftSyncDaemon if dead
"""
import subprocess, urllib.request, json, time, datetime, logging, os, sqlite3

logging.basicConfig(
    filename='C:\\mft-bridge\\watchdog.log',
    level=logging.INFO,
    format='%(asctime)s [Watchdog] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
log = logging.getLogger('watchdog')

BRIDGE   = 'http://localhost:5099'
DB       = 'C:\\mft-bridge\\db\\mft_bridge.db'
ACCTS    = 'C:\\mft-bridge\\db\\accounts.json'
NSSM     = 'C:\\mft-bridge\\nssm.exe'
SECRET   = 'mft_bridge_secret_2024'
CHECK_INTERVAL = 60  # seconds

def nssm(action, service):
    try:
        r = subprocess.run([NSSM, action, service], capture_output=True, text=True, timeout=30)
        return r.returncode == 0
    except Exception as e:
        log.error(f"NSSM {action} {service}: {e}")
        return False

def bridge_get(path, timeout=10):
    try:
        r = urllib.request.urlopen(BRIDGE + path, timeout=timeout)
        return json.loads(r.read())
    except Exception as e:
        return None

def bridge_post(path, data):
    try:
        payload = json.dumps(data).encode()
        req = urllib.request.Request(
            BRIDGE + path, data=payload,
            headers={'Content-Type': 'application/json'}, method='POST'
        )
        r = urllib.request.urlopen(req, timeout=15)
        return json.loads(r.read())
    except Exception as e:
        log.warning(f"POST {path}: {e}")
        return None

def restart_bridge():
    log.info("Restarting MftMt5Bridge...")
    nssm('stop', 'MftMt5Bridge')
    time.sleep(4)
    nssm('start', 'MftMt5Bridge')
    # Wait for bridge to come up
    for i in range(30):
        time.sleep(2)
        h = bridge_get('/health')
        if h and h.get('status') == 'ok':
            log.info(f"Bridge back up with {len(h.get('accounts',[]))} accounts after {(i+1)*2}s")
            return True
    log.error("Bridge failed to restart after 60s")
    return False

def reconnect_account(login, password, server):
    log.info(f"Reconnecting account {login}...")
    result = bridge_post('/connect-account', {
        'login': str(login),
        'password': password,
        'server': server,
        'secret': SECRET
    })
    if result and result.get('connected'):
        log.info(f"Account {login} reconnected: {result.get('msg','ok')}")
        return True
    log.warning(f"Account {login} reconnect failed: {result}")
    return False

def load_accounts():
    try:
        if os.path.exists(ACCTS):
            return json.loads(open(ACCTS).read())
    except Exception as e:
        log.error(f"Load accounts: {e}")
    return []

def get_newest_trade_age_hours(login):
    """Returns hours since the newest trade for this login. None if no trades."""
    try:
        conn = sqlite3.connect(DB)
        row = conn.execute(
            "SELECT MAX(close_time) FROM trades WHERE mt5_login=? AND symbol!='' AND side NOT IN ('bala','cred','depo','with')",
            [str(login)]
        ).fetchone()
        conn.close()
        if row and row[0]:
            newest = datetime.datetime.strptime(row[0][:19], '%Y-%m-%d %H:%M:%S')
            age = (datetime.datetime.now() - newest).total_seconds() / 3600
            return age
    except Exception as e:
        log.warning(f"Trade age check {login}: {e}")
    return None

def check_and_heal():
    log.info("--- Health check ---")

    # 1. Is the C# bridge alive?
    health = bridge_get('/health', timeout=8)
    if not health or health.get('status') != 'ok':
        log.warning("Bridge is DOWN — restarting")
        if not restart_bridge():
            return
        health = bridge_get('/health')

    connected_logins = {str(a['login']) for a in health.get('accounts', [])}
    log.info(f"Bridge alive — {len(connected_logins)} accounts connected: {connected_logins}")

    # 2. Check all accounts from accounts.json are connected
    file_accounts = load_accounts()
    for acc in file_accounts:
        login = str(acc.get('login', ''))
        if not login:
            continue
        if login not in connected_logins:
            log.warning(f"Account {login} NOT connected — reconnecting")
            reconnect_account(login, acc.get('password',''), acc.get('server','Exness-MT5Trial15'))
        else:
            # 3. Check if trade history is stale (no trades in last 6 hours during trading hours)
            age = get_newest_trade_age_hours(login)
            now_hour = datetime.datetime.now().hour
            is_trading_hours = 0 <= now_hour <= 23  # always check for now
            if age is not None and age > 6 and is_trading_hours:
                log.warning(f"Account {login} history stale ({age:.1f}h old) — force reconnecting")
                reconnect_account(login, acc.get('password',''), acc.get('server','Exness-MT5Trial15'))
            else:
                if age is not None:
                    log.info(f"Account {login}: newest trade {age:.1f}h ago — OK")
                else:
                    log.info(f"Account {login}: no trades yet — OK")

    # 4. Is sync daemon alive?
    try:
        r = subprocess.run([NSSM, 'status', 'MftSyncDaemon'], capture_output=True, text=True, timeout=10)
        if 'SERVICE_RUNNING' not in r.stdout:
            log.warning(f"MftSyncDaemon not running ({r.stdout.strip()}) — restarting")
            nssm('restart', 'MftSyncDaemon')
        else:
            log.info("MftSyncDaemon running OK")
    except Exception as e:
        log.error(f"Sync daemon check: {e}")

    log.info("--- Health check done ---")

def main():
    log.info("MFT Watchdog starting")
    while True:
        try:
            check_and_heal()
        except Exception as e:
            log.error(f"Watchdog cycle error: {e}")
        time.sleep(CHECK_INTERVAL)

if __name__ == '__main__':
    main()
