"""MFT Bridge MT5 Connector - Session 10 - Uses C# bridge on port 5099"""
import requests, logging, threading, time
log = logging.getLogger("mt5")
BRIDGE = "http://localhost:5099"
MT5_AVAILABLE = True
STARTING_BALANCE = 1000.0

def _get(path, params=None):
    try:
        r = requests.get(BRIDGE + path, params=params, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log.error("[Bridge] " + path + " failed: " + str(e))
        return None

class MT5AccountManager:
    def __init__(self, db_factory, rules_engine, sync_callback):
        self.db_factory = db_factory
        self.check_rules = rules_engine
        self.sync_to_mft = sync_callback
        self._threads = {}
        self._stop = {}
        self._lock = threading.Lock()
        log.info("[MT5] C# bridge mode - localhost:5099")

    def connect_account(self, mt5_login, mt5_password, mt5_server, broker="", entry_id="", tournament_id=""):
        login_str = str(mt5_login)
        with self._lock:
            if login_str in self._stop:
                self._stop[login_str].set()
                time.sleep(0.3)
            stop_event = threading.Event()
            self._stop[login_str] = stop_event
            t = threading.Thread(target=self._poll, args=(login_str, mt5_server, broker, entry_id, tournament_id, stop_event), daemon=True)
            self._threads[login_str] = t
            t.start()
            log.info("[MT5] Started polling " + login_str)
            return True

    def disconnect_account(self, mt5_login):
        login_str = str(mt5_login)
        with self._lock:
            if login_str in self._stop:
                self._stop[login_str].set()
                del self._stop[login_str]
                del self._threads[login_str]

    def disconnect_all(self):
        with self._lock:
            for e in self._stop.values(): e.set()
            self._stop.clear()
            self._threads.clear()

    def _poll(self, login, server, broker, entry_id, tournament_id, stop_event):
        log.info("[MT5] Connecting " + login + " via C# bridge")
        info = _get("/account", {"login": login})
        if not info:
            self._set_status(login, "error_login_failed")
            return
        self._init_db(login, server, broker, entry_id, tournament_id)
        log.info("[MT5] Connected " + login)
        while not stop_event.is_set():
            try: self._sync(login, entry_id)
            except Exception as e: log.error("[MT5] Sync error " + login + ": " + str(e))
            try: _sync_from_bridge(self.db_factory)
            except Exception as e: log.error("[MT5] Bridge sync error: " + str(e))
            stop_event.wait(timeout=30)

    def _init_db(self, login, server, broker, entry_id, tournament_id):
        db = self.db_factory()
        try:
            ex = db.execute("SELECT id FROM accounts WHERE mt5_login=?", [login]).fetchone()
            if ex:
                db.execute("UPDATE accounts SET mt5_server=?, broker=?, entry_id=?, tournament_id=?, status='connected', last_sync=datetime('now') WHERE mt5_login=?",
                           [server, broker, entry_id, tournament_id, login])
            else:
                db.execute("INSERT INTO accounts (mt5_login,mt5_server,broker,entry_id,tournament_id,balance,equity,starting_balance,status) VALUES (?,?,?,?,?,?,?,?,'connected')",
                           [login, server, broker, entry_id, tournament_id, STARTING_BALANCE, STARTING_BALANCE, STARTING_BALANCE])
            db.commit()
        finally: db.close()

    def _set_status(self, login, status):
        db = self.db_factory()
        try:
            db.execute("UPDATE accounts SET status=? WHERE mt5_login=?", [status, login])
            db.commit()
        finally: db.close()

    def _sync(self, login, entry_id):
        db = self.db_factory()
        try:
            info = _get("/account", {"login": login})
            if not info: return
            balance = float(info.get("balance", 0))
            equity = float(info.get("equity", 0))
            profit_abs = round(balance - STARTING_BALANCE, 2)
            profit_pct = round(profit_abs / STARTING_BALANCE * 100, 2)
            db.execute("UPDATE accounts SET balance=?, equity=?, profit_abs=?, profit_pct=?, starting_balance=?, status='connected', last_sync=datetime('now') WHERE mt5_login=?",
                       [balance, equity, profit_abs, profit_pct, STARTING_BALANCE, login])
            db.commit()
            positions = _get("/trades/open", {"login": login})
            if positions:
                for p in positions:
                    db.execute("INSERT OR REPLACE INTO trades (mt5_login,ticket,symbol,side,volume,open_price,open_time,profit,swap,commission,status,excluded,synced) VALUES (?,?,?,?,?,?,?,?,0,0,'open',0,0)",
                               [login, str(p.get("ticket","")), p.get("symbol",""), p.get("type","").lower()[:4], p.get("lots",0), p.get("open_price",0), p.get("open_time",""), p.get("profit",0)])
            history = _get("/trades/history", {"login": login, "days": 30})
            if history:
                for h in history:
                    db.execute("INSERT OR REPLACE INTO trades (mt5_login,ticket,symbol,side,volume,open_price,close_price,open_time,close_time,profit,swap,commission,status,excluded,synced) VALUES (?,?,?,?,?,?,?,?,?,?,0,0,'closed',0,0)",
                               [login, str(h.get("ticket","")), h.get("symbol",""), h.get("type","").lower()[:4], h.get("lots",0), h.get("open_price",0), h.get("close_price",0), h.get("open_time",""), h.get("close_time",""), h.get("profit",0)])
            db.commit()
            total = db.execute("SELECT COUNT(*) FROM trades WHERE mt5_login=? AND excluded=0", [login]).fetchone()[0]
            wins = db.execute("SELECT COUNT(*) FROM trades WHERE mt5_login=? AND excluded=0 AND profit>0", [login]).fetchone()[0]
            db.execute("UPDATE accounts SET total_trades=?, winning_trades=? WHERE mt5_login=?", [total, wins, login])
            db.commit()
            acc = db.execute("SELECT * FROM accounts WHERE mt5_login=?", [login]).fetchone()
            if acc: self.check_rules(db, login, dict(acc))
            try:
                from bridge.server import recalculate_stats
                recalculate_stats(db, login)
            except: pass
            self.sync_to_mft(db, login)
            log.debug("[MT5] Synced " + login + " bal=" + str(balance) + " pnl=" + str(profit_abs))
        finally: db.close()

manager = None

def init_manager(db_factory, rules_engine, sync_callback):
    global manager
    manager = MT5AccountManager(db_factory, rules_engine, sync_callback)
    log.info("[MT5] Manager initialized")
    _reconnect(db_factory)
    _sync_from_bridge(db_factory)
    # Background thread: sync bridge every 30s regardless of connected accounts
    def _bridge_poll_loop():
        while True:
            try:
                _sync_from_bridge(db_factory)
            except Exception as e:
                log.error("[BridgePoll] " + str(e))
            time.sleep(30)
    t = threading.Thread(target=_bridge_poll_loop, daemon=True)
    t.start()
    log.info("[MT5] Bridge sync thread started (30s interval)")


def _sync_from_bridge(db_factory):
    """Auto-sync all C# bridge accounts into SQLite DB."""
    try:
        data = _get("/health")
        if not data or "accounts" not in data:
            return
        db = db_factory()
        try:
            for acc in data["accounts"]:
                login = str(acc.get("login", ""))
                balance = float(acc.get("balance") or 0)
                if not login:
                    continue
                existing = db.execute(
                    "SELECT id, balance FROM accounts WHERE mt5_login=?", [login]
                ).fetchone()
                if not existing:
                    # New account - insert it
                    db.execute("""
                        INSERT INTO accounts (mt5_login, mt5_server, broker, status, balance, equity,
                            profit_abs, profit_pct, starting_balance, last_sync)
                        VALUES (?, 'Exness-MT5Trial15', 'exness', 'connected', ?, ?, ?, ?, 1000.0, datetime('now'))
                    """, [
                        login, balance, balance,
                        round(balance - 1000.0, 2),
                        round((balance - 1000.0) / 1000.0 * 100, 2)
                    ])
                    log.info("[Sync] Added new account from bridge: " + login)
                else:
                    # Existing - update balance
                    db.execute("""
                        UPDATE accounts SET balance=?, equity=?, profit_abs=?, profit_pct=?,
                            status='connected', last_sync=datetime('now')
                        WHERE mt5_login=?
                    """, [
                        balance, balance,
                        round(balance - 1000.0, 2),
                        round((balance - 1000.0) / 1000.0 * 100, 2),
                        login
                    ])
            db.commit()
        finally:
            db.close()
    except Exception as e:
        log.error("[Sync] sync_from_bridge error: " + str(e))

def _reconnect(db_factory):
    _sync_from_bridge(db_factory)
    if not manager: return
    db = db_factory()
    try:
        rows = db.execute("SELECT mt5_login,mt5_server,broker,entry_id,tournament_id FROM accounts WHERE status IN ('connected','pending')").fetchall()
    finally: db.close()
    for r in rows:
        log.info("[MT5] Reconnecting " + str(r["mt5_login"]))
        manager.connect_account(r["mt5_login"], "", r["mt5_server"], r["broker"] or "", r["entry_id"] or "", r["tournament_id"] or "")
