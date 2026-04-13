"""
MFT Sync Daemon - MftSyncDaemon service
Scalable design:
  - Every 5s: bulk balance update via single /health call (handles 5000+ accounts)
  - Every 5s: full trade sync only for accounts in active_accounts.json
  - C# bridge gets max ~10 calls per 5s regardless of total account count
"""
import sqlite3, urllib.request, json, time, datetime, os, logging

# File-based logging so we can debug when running as Windows service
os.makedirs("C:\\mft-bridge\\logs", exist_ok=True)
logging.basicConfig(
    handlers=[
        logging.FileHandler("C:\\mft-bridge\\logs\\sync_daemon.log", encoding="utf-8"),
        logging.StreamHandler()
    ],
    level=logging.INFO,
    format='%(asctime)s [SyncDaemon] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
log = logging.getLogger('sync')

BRIDGE           = "http://localhost:5099"
DB_PATH          = "C:\\mft-bridge\\db\\mft_bridge.db"
ACTIVE_FILE      = "C:\\mft-bridge\\db\\active_accounts.json"
STARTING_BALANCE = 1000.0
BALANCE_INTERVAL = 5    # seconds — bulk balance sync (scales to any account count)
TRADE_INTERVAL   = 10   # seconds — full trade sync (only active tournament accounts)

def bridge_get(path):
    try:
        resp = urllib.request.urlopen(BRIDGE + path, timeout=10)
        return json.loads(resp.read())
    except Exception as e:
        log.warning("Bridge %s: %s" % (path, e))
        return None

def get_active_logins():
    """Read accounts that need full trade sync (in active tournaments)."""
    try:
        if os.path.exists(ACTIVE_FILE):
            return set(json.loads(open(ACTIVE_FILE).read()))
    except Exception:
        pass
    # Fallback: check SQLite for any entry with bridge: prefix
    try:
        conn = sqlite3.connect(DB_PATH)
        rows = conn.execute("""
            SELECT DISTINCT e.mt5_login FROM entries e
            JOIN tournaments t ON t.id = e.tournament_id
            WHERE e.status = 'active' AND t.status = 'active'
              AND e.mt5_login IS NOT NULL
        """).fetchall()
        conn.close()
        return {str(r[0]) for r in rows}
    except Exception:
        return set()

def bulk_balance_sync(conn, accounts):
    """Fast update: balance + equity + profit from /health — O(1) regardless of account count."""
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    updated = 0
    for acc in accounts:
        login   = str(acc.get("login", ""))
        balance = float(acc.get("balance") or STARTING_BALANCE)
        # Use equity from /health (available after bridge update), fallback to balance
        equity  = float(acc.get("equity")  or balance)
        profit  = float(acc.get("profit")  or 0)
        if not login:
            continue
        pabs = round(balance - STARTING_BALANCE, 2)
        ppct = round(pabs / STARTING_BALANCE * 100, 2)
        exists = conn.execute(
            "SELECT id FROM accounts WHERE mt5_login=?", [login]
        ).fetchone()
        if exists:
            conn.execute("""
                UPDATE accounts SET balance=?, equity=?, profit_abs=?, profit_pct=?,
                    status='connected', last_sync=?
                WHERE mt5_login=?
            """, [balance, equity, pabs, ppct, now, login])
        else:
            conn.execute("""
                INSERT INTO accounts
                    (mt5_login, mt5_server, broker, status, balance, equity,
                     profit_abs, profit_pct, starting_balance, last_sync)
                VALUES (?, 'Exness-MT5Trial15', 'exness', 'connected',
                        ?, ?, ?, ?, ?, ?)
            """, [login, balance, equity, pabs, ppct, STARTING_BALANCE, now])
        updated += 1
    conn.commit()
    return updated

def equity_sync(conn, accounts):
    """
    Interim equity fix: fetch /account for each account to get real equity.
    This runs every cycle until /health returns equity (after bridge rebuild).
    Once bridge is rebuilt, /health already has equity — this becomes a no-op fallback.
    """
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    for acc in accounts:
        login = str(acc.get("login", ""))
        # Skip if /health already returned equity
        if acc.get("equity") is not None:
            continue
        detail = bridge_get("/account?login=" + login)
        if not detail or detail.get("error"):
            continue
        equity = float(detail.get("equity") or detail.get("balance") or STARTING_BALANCE)
        profit = float(detail.get("profit") or 0)
        conn.execute(
            "UPDATE accounts SET equity=?, last_sync=? WHERE mt5_login=?",
            [equity, now, login]
        )
    conn.commit()

def full_trade_sync(conn, login):
    """Detailed sync: account info + open trades + history. Only for active accounts."""
    login = str(login)
    acc = bridge_get("/account?login=" + login)
    if not acc or acc.get("error"):
        return

    balance = float(acc.get("balance", STARTING_BALANCE))
    equity  = float(acc.get("equity",  balance))
    now     = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pabs    = round(balance - STARTING_BALANCE, 2)
    ppct    = round(pabs / STARTING_BALANCE * 100, 2)

    open_trades = bridge_get("/trades/open?login="    + login) or []
    history     = bridge_get("/trades/history?login=" + login + "&days=90") or []

    # Real trades only — strip Balance/deposit/credit rows
    def is_real_trade(t):
        if not isinstance(t, dict): return False
        sym  = str(t.get("symbol", "")).strip()
        typ  = str(t.get("type",   "")).lower()
        return sym != "" and typ not in ("balance", "deposit", "credit", "withdrawal")

    closed = [t for t in history if is_real_trade(t)]
    wins   = sum(1 for t in closed if float(t.get("profit", 0)) > 0)
    total  = len(closed)

    conn.execute("""
        UPDATE accounts SET balance=?, equity=?, profit_abs=?, profit_pct=?,
            total_trades=?, winning_trades=?, status='connected', last_sync=?
        WHERE mt5_login=?
    """, [balance, equity, pabs, ppct, total, wins, now, login])

    # Upsert open trades
    for t in open_trades:
        ticket = str(t.get("ticket", ""))
        if not ticket:
            continue
        conn.execute("""
            INSERT OR REPLACE INTO trades
                (mt5_login, ticket, symbol, side, volume, open_price,
                 open_time, profit, swap, commission, status, excluded, synced)
            VALUES (?,?,?,?,?,?,?,?,0,0,'open',0,0)
        """, [login, ticket, t.get("symbol",""),
              t.get("type","").lower()[:4], t.get("lots",0),
              t.get("open_price",0), t.get("open_time",""), t.get("profit",0)])

    # Upsert closed trades
    for t in closed:
        ticket = str(t.get("ticket", ""))
        if not ticket:
            continue
        conn.execute("""
            INSERT OR REPLACE INTO trades
                (mt5_login, ticket, symbol, side, volume, open_price, close_price,
                 open_time, close_time, profit, swap, commission, status, excluded, synced)
            VALUES (?,?,?,?,?,?,?,?,?,?,0,0,'closed',0,0)
        """, [login, ticket, t.get("symbol",""),
              t.get("type","").lower()[:4], t.get("lots",0),
              t.get("open_price",0), t.get("close_price",0),
              t.get("open_time",""), t.get("close_time",""), t.get("profit",0)])

    conn.commit()
    log.info("Full sync %s | bal=$%.2f | closed=%d | open=%d" % (
        login, balance, total, len(open_trades)))

def run():
    log.info("Starting. Balance sync: every %ds | Trade sync: every %ds (active accounts only)" % (
        BALANCE_INTERVAL, TRADE_INTERVAL))

    last_trade_sync = 0

    while True:
        cycle_start = time.time()
        try:
            # 1. Bulk balance sync — single /health call, updates ALL accounts
            health = bridge_get("/health")
            if health and health.get("status") == "ok":
                accounts = health.get("accounts", [])
                conn = sqlite3.connect(DB_PATH)
                conn.row_factory = sqlite3.Row
                n = bulk_balance_sync(conn, accounts)
                # Equity sync (fallback if /health doesn't have equity)
                equity_sync(conn, accounts)

                # Full trade sync for ALL bridge accounts every TRADE_INTERVAL
                # (only 3 accounts so very cheap - ~9 bridge calls per cycle)
                now = time.time()
                if now - last_trade_sync >= TRADE_INTERVAL:
                    log.info("Full trade sync for all %d accounts" % len(accounts))
                    for acc in accounts:
                        login = str(acc.get("login",""))
                        if login:
                            full_trade_sync(conn, login)
                    last_trade_sync = now

                conn.close()
                log.info("Synced %d accounts in %.2fs" % (n, time.time()-cycle_start))
            else:
                log.warning("Bridge unhealthy, skipping")

        except Exception as e:
            log.error("Cycle error: %s" % str(e))

        elapsed = time.time() - cycle_start
        sleep   = max(0, BALANCE_INTERVAL - elapsed)
        time.sleep(sleep)

if __name__ == "__main__":
    run()
