"""
MFT Sync Daemon - runs as MftSyncDaemon service
Polls C# bridge every 30s, updates SQLite with live balances/stats.
Completely independent of the admin portal server.
"""
import sqlite3, urllib.request, json, time, datetime, threading, logging

logging.basicConfig(level=logging.INFO, format='[SyncDaemon] %(message)s')
log = logging.getLogger('sync')

BRIDGE  = "http://localhost:5099"
DB_PATH = "C:\\mft-bridge\\db\\mft_bridge.db"
STARTING_BALANCE = 1000.0
INTERVAL = 30  # seconds

def get_bridge(path):
    try:
        url = BRIDGE + path
        req = urllib.request.Request(url)
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read())
    except Exception as e:
        log.error("Bridge %s failed: %s" % (path, str(e)))
        return None

def sync_account(conn, login):
    login_str = str(login)

    # Fetch account info
    acc = get_bridge("/account?login=" + login_str)
    if not acc or acc.get("error"):
        log.warning("Account %s not available" % login_str)
        return

    balance  = float(acc.get("balance", STARTING_BALANCE))
    equity   = float(acc.get("equity",  balance))
    profit   = float(acc.get("profit",  0))

    # Fetch open trades
    open_trades = get_bridge("/trades/open?login=" + login_str) or []

    # Fetch history (last 30 days)
    history = get_bridge("/trades/history?login=" + login_str + "&days=30") or []

    # Calculate stats
    closed    = [t for t in history if isinstance(t, dict)]
    wins      = len([t for t in closed if float(t.get("profit", 0)) > 0])
    total     = len(closed)
    open_cnt  = len(open_trades)

    pabs = round(balance - STARTING_BALANCE, 2)
    ppct = round(pabs / STARTING_BALANCE * 100, 2)

    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Check existing
    row = conn.execute(
        "SELECT id FROM accounts WHERE mt5_login=?", [login_str]
    ).fetchone()

    if row:
        conn.execute("""
            UPDATE accounts SET
                balance=?, equity=?, profit_abs=?, profit_pct=?,
                total_trades=?, winning_trades=?,
                status='connected', last_sync=?
            WHERE mt5_login=?
        """, [balance, equity, pabs, ppct, total, wins, now, login_str])
    else:
        conn.execute("""
            INSERT INTO accounts
                (mt5_login, mt5_server, broker, status, balance, equity,
                 profit_abs, profit_pct, starting_balance, total_trades,
                 winning_trades, last_sync)
            VALUES (?, 'Exness-MT5Trial15', 'exness', 'connected',
                    ?, ?, ?, ?, ?, ?, ?, ?)
        """, [login_str, balance, equity, pabs, ppct,
              STARTING_BALANCE, total, wins, now])

    # Upsert open trades
    for t in open_trades:
        ticket = str(t.get("ticket", ""))
        if not ticket:
            continue
        conn.execute("""
            INSERT OR REPLACE INTO trades
                (mt5_login, ticket, symbol, side, volume, open_price, open_time,
                 profit, swap, commission, status, excluded, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'open', 0, 0)
        """, [login_str, ticket,
              t.get("symbol", ""), t.get("type", "").lower()[:4],
              t.get("lots", 0), t.get("open_price", 0),
              t.get("open_time", ""), t.get("profit", 0)])

    # Upsert closed trades
    for t in closed:
        ticket = str(t.get("ticket", ""))
        if not ticket:
            continue
        conn.execute("""
            INSERT OR REPLACE INTO trades
                (mt5_login, ticket, symbol, side, volume, open_price, close_price,
                 open_time, close_time, profit, swap, commission, status, excluded, synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'closed', 0, 0)
        """, [login_str, ticket,
              t.get("symbol", ""), t.get("type", "").lower()[:4],
              t.get("lots", 0), t.get("open_price", 0), t.get("close_price", 0),
              t.get("open_time", ""), t.get("close_time", ""),
              t.get("profit", 0)])

    conn.commit()
    log.info("Synced %s | bal=$%.2f | closed=%d | open=%d" % (login_str, balance, total, open_cnt))

def sync_all():
    health = get_bridge("/health")
    if not health or health.get("status") != "ok":
        log.warning("Bridge not healthy, skipping sync")
        return

    accounts = health.get("accounts", [])
    if not accounts:
        log.warning("No accounts in bridge")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        for acc in accounts:
            login = acc.get("login")
            if login:
                sync_account(conn, login)
        conn.close()
    except Exception as e:
        log.error("DB error: %s" % str(e))

def run():
    log.info("Starting — syncing every %ds" % INTERVAL)
    while True:
        try:
            sync_all()
        except Exception as e:
            log.error("Sync loop error: %s" % str(e))
        time.sleep(INTERVAL)

if __name__ == "__main__":
    run()
