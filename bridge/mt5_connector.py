"""
MFT Bridge — MT5 Connector (Session 10 Rewrite)
=================================================
NO longer uses Python MetaTrader5 library.
Calls the C# Mt5BridgeServer.exe running on localhost:5099
which uses mt5api.dll to connect accounts simultaneously.

C# bridge runs as Windows Service: MftMt5Bridge
Endpoints: http://localhost:5099/health
           http://localhost:5099/account?login=XXXXXXXX
           http://localhost:5099/trades/open?login=XXXXXXXX
           http://localhost:5099/trades/history?login=XXXXXXXX&days=30
"""

import requests
import logging
import threading
import time
from datetime import datetime

log = logging.getLogger('mt5')

# C# bridge URL
BRIDGE_URL = "http://localhost:5099"
BRIDGE_TIMEOUT = 15

# MT5_AVAILABLE is always True since we use the C# bridge
MT5_AVAILABLE = True


def _get(path, params=None):
    """Call the C# bridge HTTP API."""
    try:
        url = f"{BRIDGE_URL}{path}"
        resp = requests.get(url, params=params, timeout=BRIDGE_TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.ConnectionError:
        log.error("[C# Bridge] Cannot connect to localhost:5099 — is MftMt5Bridge service running?")
        return None
    except Exception as e:
        log.error(f"[C# Bridge] Error calling {path}: {e}")
        return None


def bridge_health():
    """Check if C# bridge is running and both accounts are connected."""
    data = _get("/health")
    if not data:
        return False
    a1 = data.get("account1", {}).get("connected", False)
    a2 = data.get("account2", {}).get("connected", False)
    return a1 and a2


class MT5AccountManager:
    """
    Manages MT5 account connections via C# bridge.
    Compatible with the original interface so server.py doesn't need changes.
    """

    def __init__(self, db_factory, rules_engine, sync_callback):
        self.db_factory  = db_factory
        self.check_rules = rules_engine
        self.sync_to_mft = sync_callback
        self._threads    = {}
        self._stop       = {}
        self._lock       = threading.Lock()

        log.info("[MT5] Using C# bridge on localhost:5099 (mt5api.dll)")

    def connect_account(self, mt5_login, mt5_password, mt5_server, broker='', entry_id='', tournament_id=''):
        """Start polling an MT5 account via the C# bridge."""
        login_str = str(mt5_login)

        with self._lock:
            if login_str in self._stop:
                self._stop[login_str].set()
                time.sleep(0.3)

            stop_event = threading.Event()
            self._stop[login_str] = stop_event

            t = threading.Thread(
                target=self._poll_account,
                args=(login_str, mt5_server, broker, entry_id, tournament_id, stop_event),
                daemon=True,
                name=f"mt5-{login_str}"
            )
            self._threads[login_str] = t
            t.start()
            log.info(f"[MT5] Started polling thread for {login_str} via C# bridge")
            return True

    def disconnect_account(self, mt5_login):
        """Stop polling an account."""
        login_str = str(mt5_login)
        with self._lock:
            if login_str in self._stop:
                self._stop[login_str].set()
                del self._stop[login_str]
                del self._threads[login_str]
                log.info(f"[MT5] Stopped polling {login_str}")

    def disconnect_all(self):
        """Stop all polling threads."""
        with self._lock:
            for event in self._stop.values():
                event.set()
            self._stop.clear()
            self._threads.clear()

    def _poll_account(self, login, server, broker, entry_id, tournament_id, stop_event):
        """Background thread: polls C# bridge every 30 seconds."""
        log.info(f"[MT5] Connecting to {login} via C# bridge...")

        # Get account info from C# bridge
        info = _get("/account", params={"login": login})
        if not info:
            log.error(f"[MT5] Cannot get account info for {login} from C# bridge")
            self._update_status(login, 'error_login_failed')
            return

        balance = info.get("balance", 0)
        self._init_account(login, server, broker, entry_id, tournament_id, balance)
        log.info(f"[MT5] Connected: {login} — Balance: ${balance:.2f}")

        # Poll loop
        while not stop_event.is_set():
            try:
                self._sync_account(login, entry_id)
            except Exception as e:
                log.error(f"[MT5] Poll error for {login}: {e}")
            stop_event.wait(timeout=30)

        log.info(f"[MT5] Stopped polling: {login}")

    def _init_account(self, login, server, broker, entry_id, tournament_id, balance):
        """Initialize or update account in DB."""
        db = self.db_factory()
        try:
            existing = db.execute(
                "SELECT id FROM accounts WHERE mt5_login=?", [login]
            ).fetchone()

            if existing:
                db.execute("""
                    UPDATE accounts SET
                        mt5_server=?, broker=?, entry_id=?, tournament_id=?,
                        balance=?, equity=?, starting_balance=?,
                        status='connected', last_sync=datetime('now')
                    WHERE mt5_login=?
                """, [server, broker, entry_id, tournament_id,
                      balance, balance, balance, login])
            else:
                db.execute("""
                    INSERT INTO accounts
                        (mt5_login, mt5_server, broker, entry_id, tournament_id,
                         balance, equity, starting_balance, status)
                    VALUES (?,?,?,?,?,?,?,=,'connected')
                """, [login, server, broker, entry_id, tournament_id,
                      balance, balance, balance])
            db.commit()
        finally:
            db.close()

    def _update_status(self, login, status):
        """Update account status in DB."""
        db = self.db_factory()
        try:
            db.execute(
                "UPDATE accounts SET status=? WHERE mt5_login=?", [status, login]
            )
            db.commit()
        finally:
            db.close()

    def _sync_account(self, login, entry_id):
        """Pull latest data from C# bridge and update DB."""
        db = self.db_factory()
        try:
            # Get account info
            info = _get("/account", params={"login": login})
            if not info:
                log.warning(f"[MT5] No account info for {login}")
                return

            balance = info.get("balance", 0)
            equity  = info.get("equity", 0)

            db.execute("""
                UPDATE accounts
                SET balance=?, equity=?, status='connected', last_sync=datetime('now')
                WHERE mt5_login=?
            """, [balance, equity, login])
            db.commit()

            # Get open positions
            positions = _get("/trades/open", params={"login": login})
            if positions:
                for pos in positions:
                    ticket     = str(pos.get("ticket", ""))
                    symbol     = pos.get("symbol", "")
                    order_type = pos.get("type", "").lower()
                    side       = "buy" if "buy" in order_type else "sell"
                    volume     = pos.get("lots", 0)
                    open_price = pos.get("open_price", 0)
                    open_time  = pos.get("open_time", "")
                    profit     = pos.get("profit", 0)

                    db.execute("""
                        INSERT INTO trades
                            (mt5_login, ticket, symbol, side, volume, open_price,
                             open_time, profit, swap, commission, status)
                        VALUES (?,?,?,?,?,?,?,?,0,0,'open')
                        ON CONFLICT(mt5_login, ticket) DO UPDATE SET
                            profit=excluded.profit,
                            status='open', synced=0
                    """, [login, ticket, symbol, side, volume,
                          open_price, open_time, profit])

            # Get closed trade history (last 7 days)
            history = _get("/trades/history", params={"login": login, "days": 7})
            if history:
                for deal in history:
                    ticket      = str(deal.get("ticket", ""))
                    symbol      = deal.get("symbol", "")
                    order_type  = deal.get("type", "").lower()
                    side        = "buy" if "buy" in order_type else "sell"
                    volume      = deal.get("lots", 0)
                    open_price  = deal.get("open_price", 0)
                    close_price = deal.get("close_price", 0)
                    profit      = deal.get("profit", 0)
                    open_time   = deal.get("open_time", "")
                    close_time  = deal.get("close_time", "")

                    db.execute("""
                        INSERT INTO trades
                            (mt5_login, ticket, symbol, side, volume, open_price,
                             open_time, profit, swap, commission, status)
                        VALUES (?,?,?,?,?,?,?,?,0,0,'closed')
                        ON CONFLICT(mt5_login, ticket) DOUPDATE SET
                            profit=excluded.profit,
                            close_time=?,
                            status='closed', synced=0
                    """, [login, ticket, symbol, side, volume,
                          open_price, open_time, profit, close_time])

            db.commit()

            # Run rules engine
            account = db.execute(
                "SELECT * FROM accounts WHERE mt5_login=?", [login]
            ).fetchone()
            if account:
                self.check_rules(db, login, dict(account))

            # Recalculate stats
            try:
                from bridge.server import recalculate_stats
                recalculate_stats(db, login)
            except Exception:
                pass

            # Sync to MFT backend
            self.sync_to_mft(db, login)

            log.debug(
                f"[MT5] Synced {login} — Balance: ${balance:.2f} Equity: ${equity:.2f}"
            )

        finally:
            db.close()


# ── Global instance ‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐‐—�
manager = None


def init_manager(db_factory, rules_engine, sync_callback):
    """Initialize the global MT5 account manager."""
    global manager
    manager = MT5AccountManager(db_factory, rules_engine, sync_callback)
    log.info("[MT5] Account manager initialized (C# bridge mode)")

    # Check bridge health
    if bridge_health():
        log.info("[MT5] C# bridge healthy — both accounts connected")
    else:
        log.warning("[MT5] C# bridge not responding — check MftMt5Bridge service")

    # Auto-reconnect existing accounts
    _reconnect_existing(db_factory)


def _reconnect_existing(db_factory):
    """On startup, reconnect all accounts that were previously connected."""
    if not manager:
        return
    db = db_factory()
    try:
        accounts = db.execute("""
            SELECT mt5_login, mt5_server, broker, entry_id, tournament_id
            FROM accounts
            WHERE status IN ('connected', 'pending')
            AND entry_id IS NOT NULL
        """).fetchall()
    finally:
        db.close()

    for acc in accounts:
        login = acc['mt5_login']
        log.info(f"[MT5] Auto-reconnecting {login} via C# bridge...")
        manager.connect_account(
            mt5_login=login,
            mt5_password="",        # Not needed — C# bridge handles auth
            mt5_server=acc['mt5_server'],
            broker=acc['broker'] or '',
            entry_id=acc['entry_id'] or '',
            tournament_id=acc['tournament_id'] or ''
        )
