using MetaQuotes.MT5ManagerAPI;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace MftBridge {

    class Program {

        // ── Config ────────────────────────────────────────────────────────────
        const string MGR_SERVER   = "190.2.155.207:443";
        const ulong  MGR_LOGIN    = 10007;
        const string MGR_PASSWORD = "Noman@2026";
        const int    HPORT        = 5099;
        const string SECRET       = "mft_bridge_secret_2024";
        const string DEFAULT_GROUP = "demo\\MFT_Battles"; // update after checking Groups in MT5 Manager

        // ── Manager API state ─────────────────────────────────────────────────
        static CIMTManagerAPI ManagerFactory = null;
        static CIMTManager    Manager        = null;
        static bool           Connected      = false;
        static readonly object MgrLock       = new object();
        static DateTime       LastConnect    = DateTime.MinValue;

        // ── Account trading lock state ────────────────────────────────────────
        // login → trading enabled (true) / locked (false)
        static readonly Dictionary<ulong, bool> TradingState = new Dictionary<ulong, bool>();

        // ── Entry point ───────────────────────────────────────────────────────
        static void Main(string[] args) {
            Console.WriteLine("[MFT] Manager Bridge v2.0 starting on port " + HPORT);
            Console.WriteLine("[MFT] Server: " + MGR_SERVER + " | Login: " + MGR_LOGIN);

            // Connect to broker server via Manager API
            ConnectManager();

            // Start HTTP server
            var srv = new TcpListener(IPAddress.Any, HPORT);
            srv.Start();
            Console.WriteLine("[MFT] Listening on port " + HPORT + "...");

            // Keep-alive thread — reconnect if dropped
            var keepAlive = new Thread(() => {
                while (true) {
                    Thread.Sleep(60000);
                    if (!Connected && (DateTime.UtcNow - LastConnect).TotalSeconds > 55)
                        ConnectManager();
                }
            }) { IsBackground = true };
            keepAlive.Start();

            while (true) {
                var c = srv.AcceptTcpClient();
                ThreadPool.QueueUserWorkItem(_ => Handle(c));
            }
        }

        // ── Connect to MT5 Manager server ─────────────────────────────────────
        static void ConnectManager() {
            lock (MgrLock) {
                try {
                    LastConnect = DateTime.UtcNow;
                    Console.WriteLine("[Manager] Connecting to " + MGR_SERVER + "...");

                    // Create factory and manager instance
                    if (ManagerFactory == null)
                        ManagerFactory = CIMTManagerAPI.CreateManagerAPI();

                    if (ManagerFactory == null) {
                        Console.WriteLine("[Manager] ERROR: CreateManagerAPI() failed — check MetaQuotes.MT5ManagerAPI64.dll is present");
                        return;
                    }

                    uint retCode;
                    Manager = ManagerFactory.CreateManager(ManagerFactory.Version, out retCode);
                    if (Manager == null || retCode != CIMTManagerAPI.MT_RET_OK) {
                        Console.WriteLine("[Manager] ERROR: CreateManager failed code=" + retCode);
                        return;
                    }

                    // Connect
                    retCode = Manager.Connect(MGR_SERVER);
                    if (retCode != CIMTManagerAPI.MT_RET_OK) {
                        Console.WriteLine("[Manager] ERROR: Connect failed code=" + retCode);
                        return;
                    }

                    // Authorize
                    retCode = Manager.Authorize(MGR_LOGIN, MGR_PASSWORD);
                    if (retCode != CIMTManagerAPI.MT_RET_OK) {
                        Console.WriteLine("[Manager] ERROR: Authorize failed code=" + retCode);
                        return;
                    }

                    Connected = true;
                    Console.WriteLine("[Manager] Connected and authorized to " + MGR_SERVER);

                } catch (Exception ex) {
                    Console.WriteLine("[Manager] Exception: " + ex.Message);
                    Connected = false;
                }
            }
        }

        static void EnsureConnected() {
            if (!Connected && (DateTime.UtcNow - LastConnect).TotalSeconds > 30)
                ConnectManager();
        }

        // ── JSON helpers ──────────────────────────────────────────────────────
        static string Esc(string s) {
            if (s == null) return "";
            return s.Replace("\\","\\\\").Replace("\"","\\\"").Replace("\n","\\n").Replace("\r","");
        }
        static string GetJV(string json, string key) {
            if (string.IsNullOrEmpty(json)) return null;
            int i = json.IndexOf("\"" + key + "\""); if (i < 0) return null;
            int co = json.IndexOf(':', i); if (co < 0) return null;
            int st = json.IndexOf('"', co); if (st < 0) return null;
            int en = json.IndexOf('"', st + 1); if (en < 0) return null;
            return json.Substring(st + 1, en - st - 1);
        }
        static string GetJVArr(string json, string key) {
            // Get array value like "logins":["123","456"]
            if (string.IsNullOrEmpty(json)) return null;
            int i = json.IndexOf("\"" + key + "\""); if (i < 0) return null;
            int co = json.IndexOf(':', i); if (co < 0) return null;
            int st = json.IndexOf('[', co); if (st < 0) return null;
            int en = json.IndexOf(']', st); if (en < 0) return null;
            return json.Substring(st + 1, en - st - 1);
        }
        static Dictionary<string, string> ParseQS(string q) {
            var d = new Dictionary<string, string>();
            if (string.IsNullOrEmpty(q)) return d;
            foreach (var kv in q.Split('&')) { var x = kv.Split(new[]{'='}, 2); if (x.Length == 2) d[x[0]] = Uri.UnescapeDataString(x[1]); }
            return d;
        }
        static string Password() {
            const string upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
            const string lower = "abcdefghjkmnpqrstuvwxyz";
            const string digit = "23456789";
            const string spec  = "!@#$";
            const string all   = upper + lower + digit + spec;
            var rng = new Random(); var pw = new char[12];
            pw[0] = upper[rng.Next(upper.Length)]; pw[1] = lower[rng.Next(lower.Length)];
            pw[2] = digit[rng.Next(digit.Length)]; pw[3] = spec[rng.Next(spec.Length)];
            for (int i = 4; i < 12; i++) pw[i] = all[rng.Next(all.Length)];
            for (int i = pw.Length-1; i > 0; i--) { int j = rng.Next(i+1); var t = pw[i]; pw[i] = pw[j]; pw[j] = t; }
            return new string(pw);
        }

        // ── HTTP handler ──────────────────────────────────────────────────────
        static void Handle(TcpClient c) {
            try {
                var s   = c.GetStream();
                var rdr = new StreamReader(s, Encoding.UTF8);
                var req = rdr.ReadLine();
                if (string.IsNullOrEmpty(req)) { c.Close(); return; }
                int clen = 0; string ln;
                while (!string.IsNullOrEmpty(ln = rdr.ReadLine()))
                    if (ln.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase))
                        int.TryParse(ln.Substring(15).Trim(), out clen);
                string body = "";
                if (clen > 0) { var buf = new char[clen]; rdr.Read(buf, 0, clen); body = new string(buf); }

                var pts  = req.Split(' '); if (pts.Length < 2) { c.Close(); return; }
                var mth  = pts[0]; var full = pts[1];
                var qi   = full.IndexOf('?');
                var path = (qi >= 0 ? full.Substring(0, qi) : full).TrimEnd('/');
                var qs   = ParseQS(qi >= 0 ? full.Substring(qi + 1) : "");

                // Handle CORS preflight
                if (mth == "OPTIONS") { Send(c, s, 200, "{\"ok\":true}"); return; }

                string resp = ""; int code = 200;

                try {
                    EnsureConnected();

                    // ── GET /health ──────────────────────────────────────────
                    if (path == "/health") {
                        resp = "{\"status\":\"ok\",\"connected\":" + (Connected ? "true" : "false") +
                               ",\"server\":\"" + MGR_SERVER + "\"" +
                               ",\"version\":\"2.0-manager-api\"" +
                               ",\"mode\":\"MT5 Manager API (direct)\"}";

                    // ── GET /account ─────────────────────────────────────────
                    } else if (path == "/account" && mth == "GET") {
                        if (!qs.ContainsKey("login")) { code=400; resp="{\"error\":\"login required\"}"; }
                        else {
                            ulong lg = ulong.Parse(qs["login"]);
                            var info = GetAccount(lg);
                            if (info == null) { code=404; resp="{\"error\":\"account not found\"}"; }
                            else resp = info;
                        }

                    // ── GET /trades/open ─────────────────────────────────────
                    } else if (path == "/trades/open" && mth == "GET") {
                        if (!qs.ContainsKey("login")) { code=400; resp="{\"error\":\"login required\"}"; }
                        else { ulong lg = ulong.Parse(qs["login"]); resp = GetOpenTrades(lg); }

                    // ── GET /trades/history ──────────────────────────────────
                    } else if (path == "/trades/history" && mth == "GET") {
                        if (!qs.ContainsKey("login")) { code=400; resp="{\"error\":\"login required\"}"; }
                        else {
                            ulong lg   = ulong.Parse(qs["login"]);
                            int   days = qs.ContainsKey("days") ? int.Parse(qs["days"]) : 90;
                            resp = GetTradeHistory(lg, days);
                        }

                    // ── POST /verify-account ─────────────────────────────────
                    // With Manager API: just check account exists on our server
                    } else if (path == "/verify-account" && mth == "POST") {
                        string sec = GetJV(body,"secret") ?? "";
                        if (sec != SECRET) { code=403; resp="{\"error\":\"Unauthorized\"}"; }
                        else {
                            string ls = GetJV(body,"login") ?? "";
                            if (string.IsNullOrEmpty(ls)) { code=400; resp="{\"error\":\"login required\"}"; }
                            else {
                                ulong lg = ulong.Parse(ls);
                                var info = GetAccount(lg);
                                if (info == null) { code=400; resp="{\"valid\":false,\"error\":\"Account not found on FizmoFxMarkets server\"}"; }
                                else {
                                    // Parse balance from the account JSON
                                    double bal = 0; try { bal = double.Parse(GetJVNum(info,"balance")); } catch {}
                                    resp = "{\"valid\":true,\"login\":" + lg + ",\"balance\":" + bal.ToString("F2") + "," + info.Substring(1);
                                    Console.WriteLine("[Verify] OK login=" + lg + " balance=" + bal);
                                }
                            }
                        }

                    // ── POST /connect-account ────────────────────────────────
                    } else if (path == "/connect-account" && mth == "POST") {
                        string sec = GetJV(body,"secret") ?? "";
                        if (sec != SECRET) { code=403; resp="{\"error\":\"Unauthorized\"}"; }
                        else {
                            string ls = GetJV(body,"login") ?? "";
                            if (string.IsNullOrEmpty(ls)) { code=400; resp="{\"error\":\"login required\"}"; }
                            else {
                                ulong lg   = ulong.Parse(ls);
                                var   info = GetAccount(lg);
                                if (info != null) { lock(MgrLock) { TradingState[lg] = true; } }
                                resp = "{\"connected\":" + (info!=null?"true":"false") + ",\"login\":" + lg + "}";
                            }
                        }

                    // ── POST /disconnect-account ─────────────────────────────
                    } else if (path == "/disconnect-account" && mth == "POST") {
                        string sec = GetJV(body,"secret") ?? "";
                        if (sec != SECRET) { code=403; resp="{\"error\":\"Unauthorized\"}"; }
                        else {
                            string ls = GetJV(body,"login") ?? "";
                            ulong lg  = ulong.Parse(ls);
                            lock(MgrLock) { TradingState.Remove(lg); }
                            resp = "{\"disconnected\":true,\"login\":" + lg + "}";
                        }

                    // ── POST /close-all ──────────────────────────────────────
                    } else if (path == "/close-all" && mth == "POST") {
                        string ls = GetJV(body,"login") ?? (qs.ContainsKey("login") ? qs["login"] : "");
                        if (string.IsNullOrEmpty(ls)) { code=400; resp="{\"error\":\"login required\"}"; }
                        else {
                            ulong lg = ulong.Parse(ls);
                            var result = CloseAllTrades(lg);
                            resp = result;
                        }

                    // ── POST /create-account ─────────────────────────────────
                    // NEW: Creates fresh MT5 account locked for trading
                    } else if (path == "/create-account" && mth == "POST") {
                        string sec = GetJV(body,"secret") ?? "";
                        if (sec != SECRET) { code=403; resp="{\"error\":\"Unauthorized\"}"; }
                        else {
                            string name  = GetJV(body,"name")  ?? "MFT Trader";
                            string email = GetJV(body,"email") ?? "";
                            string grp   = GetJV(body,"group") ?? DEFAULT_GROUP;
                            double bal   = 1000.0; try { bal = double.Parse(GetJVNum(body,"balance")); } catch {}
                            int    lev   = 100;    try { lev = int.Parse(GetJVNum(body,"leverage")); }    catch {}
                            resp = CreateAccount(name, email, grp, bal, lev);
                            if (resp.Contains("\"error\"")) code = 500;
                        }

                    // ── POST /enable-trading ─────────────────────────────────
                    // NEW: Unlocks trading — call when battle starts
                    } else if (path == "/enable-trading" && mth == "POST") {
                        string sec = GetJV(body,"secret") ?? "";
                        if (sec != SECRET) { code=403; resp="{\"error\":\"Unauthorized\"}"; }
                        else {
                            string ls2 = GetJV(body,"login") ?? "";
                            ulong  lg2 = ulong.Parse(ls2);
                            bool   ok  = SetTrading(lg2, true);
                            if (ok) { lock(MgrLock) { TradingState[lg2] = true; } }
                            resp = "{\"success\":" + (ok?"true":"false") + ",\"login\":" + lg2 +
                                   ",\"message\":\"" + (ok ? "Trading ENABLED — battle started!" : "Failed to enable trading") + "\"}";
                        }

                    // ── POST /disable-trading ────────────────────────────────
                    // NEW: Locks trading — call when battle ends
                    } else if (path == "/disable-trading" && mth == "POST") {
                        string sec = GetJV(body,"secret") ?? "";
                        if (sec != SECRET) { code=403; resp="{\"error\":\"Unauthorized\"}"; }
                        else {
                            string ls2 = GetJV(body,"login") ?? "";
                            ulong  lg2 = ulong.Parse(ls2);
                            bool   ok  = SetTrading(lg2, false);
                            if (ok) { lock(MgrLock) { TradingState[lg2] = false; } }
                            resp = "{\"success\":" + (ok?"true":"false") + ",\"login\":" + lg2 +
                                   ",\"message\":\"" + (ok ? "Trading DISABLED — battle ended" : "Failed to disable trading") + "\"}";
                        }

                    // ── POST /enable-battle ──────────────────────────────────
                    // NEW: Batch unlock ALL accounts when battle starts
                    } else if (path == "/enable-battle" && mth == "POST") {
                        string sec = GetJV(body,"secret") ?? "";
                        if (sec != SECRET) { code=403; resp="{\"error\":\"Unauthorized\"}"; }
                        else {
                            string arr = GetJVArr(body,"logins") ?? "";
                            var sb2 = new StringBuilder(); sb2.Append("[");
                            int enabled = 0, total = 0; bool firstL = true;
                            foreach (var part in arr.Split(',')) {
                                string ls3 = part.Trim().Trim('"');
                                if (string.IsNullOrEmpty(ls3) || !ulong.TryParse(ls3, out ulong lg3)) continue;
                                total++;
                                bool ok = SetTrading(lg3, true);
                                if (ok) { enabled++; lock(MgrLock) { TradingState[lg3] = true; } }
                                if (!firstL) sb2.Append(","); firstL = false;
                                sb2.Append("{\"login\":" + lg3 + ",\"enabled\":" + (ok?"true":"false") + "}");
                            }
                            sb2.Append("]");
                            resp = "{\"success\":true,\"enabled\":" + enabled + ",\"total\":" + total +
                                   ",\"results\":" + sb2.ToString() +
                                   ",\"message\":\"Trading enabled for " + enabled + " of " + total + " accounts. Battle is LIVE!\"}";
                            Console.WriteLine("[EnableBattle] " + enabled + "/" + total + " accounts unlocked");
                        }

                    // ── POST /deposit ────────────────────────────────────────
                    // NEW: Add funds to an account
                    } else if (path == "/deposit" && mth == "POST") {
                        string sec = GetJV(body,"secret") ?? "";
                        if (sec != SECRET) { code=403; resp="{\"error\":\"Unauthorized\"}"; }
                        else {
                            string ls2 = GetJV(body,"login")   ?? "";
                            string cmt = GetJV(body,"comment") ?? "MFT Deposit";
                            double amt = 0; try { amt = double.Parse(GetJVNum(body,"amount")); } catch {}
                            ulong lg2  = ulong.Parse(ls2);
                            bool  ok   = Deposit(lg2, amt, cmt);
                            resp = "{\"success\":" + (ok?"true":"false") + ",\"login\":" + lg2 + ",\"amount\":" + amt + "}";
                        }

                    } else { code=404; resp="{\"error\":\"not found\",\"path\":\"" + Esc(path) + "\"}"; }

                } catch (Exception ex) {
                    code=500; resp="{\"error\":\"" + Esc(ex.Message) + "\"}";
                    Console.WriteLine("[ERR] " + path + ": " + ex.Message);
                }

                Send(c, s, code, resp);

            } catch (Exception e) { Console.WriteLine("[TCP] " + e.Message); }
            finally { try { c.Close(); } catch {} }
        }

        static void Send(TcpClient c, Stream s, int code, string body) {
            try {
                var bb  = Encoding.UTF8.GetBytes(body);
                var hdr = "HTTP/1.1 " + code + " OK\r\n" +
                          "Content-Type: application/json\r\n" +
                          "Access-Control-Allow-Origin: *\r\n" +
                          "Access-Control-Allow-Headers: Content-Type\r\n" +
                          "Content-Length: " + bb.Length + "\r\n" +
                          "Connection: close\r\n\r\n";
                var hb = Encoding.UTF8.GetBytes(hdr);
                s.Write(hb, 0, hb.Length); s.Write(bb, 0, bb.Length); s.Flush();
            } catch {}
        }

        // ── Manager API operations ────────────────────────────────────────────

        static string GetAccount(ulong login) {
            lock (MgrLock) {
                if (!Connected || Manager == null) return null;
                try {
                    var user = Manager.UserCreate();
                    if (user == null) return null;
                    uint ret = Manager.UserGet(login, user);
                    if (ret != CIMTManagerAPI.MT_RET_OK) { user.Dispose(); return null; }

                    var acc = Manager.AccountCreate();
                    if (acc == null) { user.Dispose(); return null; }
                    ret = Manager.AccountGet(login, acc);
                    if (ret != CIMTManagerAPI.MT_RET_OK) { user.Dispose(); acc.Dispose(); return null; }

                    string result = "{\"login\":" + login +
                                    ",\"name\":\"" + Esc(user.Name()) + "\"" +
                                    ",\"balance\":" + acc.Balance().ToString("F2") +
                                    ",\"equity\":"  + acc.Equity().ToString("F2") +
                                    ",\"margin\":"  + acc.Margin().ToString("F2") +
                                    ",\"free_margin\":" + acc.MarginFree().ToString("F2") +
                                    ",\"leverage\":" + user.Leverage() +
                                    ",\"currency\":\"" + Esc(acc.Currency()) + "\"" +
                                    ",\"group\":\"" + Esc(user.Group()) + "\"" +
                                    ",\"trade_allowed\":" + user.TradeAllowed() + "}";
                    user.Dispose(); acc.Dispose();
                    return result;
                } catch (Exception ex) { Console.WriteLine("[GetAccount] " + ex.Message); return null; }
            }
        }

        static string GetOpenTrades(ulong login) {
            lock (MgrLock) {
                if (!Connected || Manager == null) return "[]";
                try {
                    var positions = Manager.PositionCreateArray();
                    if (positions == null) return "[]";
                    Manager.PositionGetByLogin(login, positions);

                    var sb = new StringBuilder(); sb.Append("[");
                    bool first = true;
                    for (uint i = 0; i < positions.Total(); i++) {
                        var p = positions.Next(i); if (p == null) continue;
                        if (!first) sb.Append(","); first = false;
                        string side = p.Action() == CIMTPosition.EnPositionAction.POSITION_BUY ? "Buy" : "Sell";
                        sb.Append("{\"ticket\":"     + p.Position() +
                                  ",\"symbol\":\""   + Esc(p.Symbol()) + "\"" +
                                  ",\"type\":\""     + side + "\"" +
                                  ",\"lots\":"       + (p.Volume()/10000.0).ToString("F2") +
                                  ",\"open_price\":" + p.PriceOpen().ToString("F5") +
                                  ",\"close_price\":"+ p.PriceCurrent().ToString("F5") +
                                  ",\"profit\":"     + p.Profit().ToString("F2") +
                                  ",\"open_time\":\"" + DateTimeOffset.FromUnixTimeSeconds((long)p.TimeCreate()).DateTime.ToString("yyyy-MM-dd HH:mm:ss") + "\"" +
                                  ",\"account\":"    + login + "}");
                    }
                    sb.Append("]"); positions.Dispose(); return sb.ToString();
                } catch (Exception ex) { Console.WriteLine("[GetOpenTrades] " + ex.Message); return "[]"; }
            }
        }

        static string GetTradeHistory(ulong login, int days) {
            lock (MgrLock) {
                if (!Connected || Manager == null) return "[]";
                try {
                    ulong from = (ulong)DateTimeOffset.UtcNow.AddDays(-days).ToUnixTimeSeconds();
                    ulong to   = (ulong)DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                    var deals  = Manager.DealCreateArray();
                    if (deals == null) return "[]";
                    Manager.DealGetByLogin(login, from, to, deals);

                    var sb = new StringBuilder(); sb.Append("[");
                    bool first = true;
                    for (uint i = 0; i < deals.Total(); i++) {
                        var d = deals.Next(i); if (d == null) continue;
                        if (!first) sb.Append(","); first = false;
                        string type;
                        switch (d.Action()) {
                            case CIMTDeal.EnDealAction.DEAL_BUY:     type="Buy";     break;
                            case CIMTDeal.EnDealAction.DEAL_SELL:    type="Sell";    break;
                            case CIMTDeal.EnDealAction.DEAL_BALANCE: type="Balance"; break;
                            case CIMTDeal.EnDealAction.DEAL_CREDIT:  type="Credit";  break;
                            default:                                  type="Other";   break;
                        }
                        sb.Append("{\"ticket\":"       + d.Deal() +
                                  ",\"symbol\":\""     + Esc(d.Symbol()) + "\"" +
                                  ",\"type\":\""       + type + "\"" +
                                  ",\"lots\":"         + (d.Volume()/10000.0).ToString("F2") +
                                  ",\"open_price\":"   + d.Price().ToString("F5") +
                                  ",\"profit\":"       + d.Profit().ToString("F2") +
                                  ",\"open_time\":\""  + DateTimeOffset.FromUnixTimeSeconds((long)d.Time()).DateTime.ToString("yyyy-MM-dd HH:mm:ss") + "\"" +
                                  ",\"comment\":\""    + Esc(d.Comment()) + "\"" +
                                  ",\"account\":"      + login + "}");
                    }
                    sb.Append("]"); deals.Dispose(); return sb.ToString();
                } catch (Exception ex) { Console.WriteLine("[GetTradeHistory] " + ex.Message); return "[]"; }
            }
        }

        static string CreateAccount(string name, string email, string group, double balance, int leverage) {
            lock (MgrLock) {
                if (!Connected || Manager == null)
                    return "{\"error\":\"Manager not connected to MT5 server\"}";
                try {
                    var user = Manager.UserCreate();
                    if (user == null) return "{\"error\":\"UserCreate() failed\"}";

                    user.Name(name);
                    user.Email(email);
                    user.Group(group);
                    user.Leverage((uint)leverage);
                    user.TradeAllowed(0);    // LOCKED until battle starts
                    user.SendReports(0);
                    user.Comment("MFT Battle - " + DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"));

                    uint ret = Manager.UserAdd(user);
                    if (ret != CIMTManagerAPI.MT_RET_OK) {
                        user.Dispose();
                        Console.WriteLine("[CreateAccount] UserAdd failed code=" + ret);
                        return "{\"error\":\"UserAdd failed code " + ret + " — check group name '" + Esc(group) + "' exists in MT5 Manager Groups\"}";
                    }

                    ulong newLogin = user.Login();
                    user.Dispose();

                    // Set password
                    string pw = Password();
                    Manager.UserPasswordSet(newLogin, pw, CIMTUser.EnPasswords.PASSWORD_MAIN, false);

                    // Deposit starting balance
                    var deal = Manager.DealerCreate();
                    if (deal != null) {
                        deal.Login(newLogin);
                        deal.Action(CIMTDeal.EnDealAction.DEAL_BALANCE);
                        deal.Profit(balance);
                        deal.Comment("MFT Battle Starting Balance $" + balance.ToString("F0"));
                        Manager.DealerBalance(deal);
                        deal.Dispose();
                    }

                    // Register as locked
                    TradingState[newLogin] = false;

                    Console.WriteLine("[CreateAccount] Created login=" + newLogin + " name=" + name + " balance=" + balance + " TRADING LOCKED");

                    return "{\"success\":true" +
                           ",\"login\":"    + newLogin +
                           ",\"password\":\"" + Esc(pw) + "\"" +
                           ",\"server\":\"" + MGR_SERVER + "\"" +
                           ",\"balance\":"  + balance.ToString("F2") +
                           ",\"trading_locked\":true" +
                           ",\"message\":\"Account created and funded. Trading locked until battle starts.\"}";

                } catch (Exception ex) {
                    Console.WriteLine("[CreateAccount] Exception: " + ex.Message);
                    return "{\"error\":\"" + Esc(ex.Message) + "\"}";
                }
            }
        }

        static bool SetTrading(ulong login, bool enable) {
            lock (MgrLock) {
                if (!Connected || Manager == null) return false;
                try {
                    var user = Manager.UserCreate();
                    if (user == null) return false;
                    uint ret = Manager.UserGet(login, user);
                    if (ret != CIMTManagerAPI.MT_RET_OK) { user.Dispose(); return false; }
                    user.TradeAllowed(enable ? 1u : 0u);
                    ret = Manager.UserUpdate(user);
                    user.Dispose();
                    Console.WriteLine("[SetTrading] login=" + login + " enabled=" + enable + " ret=" + ret);
                    return ret == CIMTManagerAPI.MT_RET_OK;
                } catch (Exception ex) { Console.WriteLine("[SetTrading] " + ex.Message); return false; }
            }
        }

        static string CloseAllTrades(ulong login) {
            lock (MgrLock) {
                if (!Connected || Manager == null)
                    return "{\"error\":\"Manager not connected\",\"closed\":0,\"failed\":0}";
                try {
                    var positions = Manager.PositionCreateArray();
                    if (positions == null) return "{\"closed\":0,\"failed\":0,\"message\":\"PositionCreateArray failed\"}";
                    Manager.PositionGetByLogin(login, positions);
                    uint total = positions.Total();

                    if (total == 0) { positions.Dispose(); return "{\"closed\":0,\"failed\":0,\"message\":\"No open positions\"}"; }

                    int closed = 0, failed = 0;
                    var errors = new StringBuilder();

                    for (uint i = 0; i < total; i++) {
                        var pos = positions.Next(i); if (pos == null) continue;
                        try {
                            var req = Manager.TradeRequestCreate();
                            if (req == null) { failed++; continue; }

                            req.Action(CIMTRequest.EnTradeActions.TA_CLOSE_BY);
                            req.Login(login);
                            req.Symbol(pos.Symbol());
                            req.Volume(pos.Volume());
                            req.Position(pos.Position());
                            // Reverse direction to close
                            req.Type(pos.Action() == CIMTPosition.EnPositionAction.POSITION_BUY
                                ? CIMTOrder.EnOrderType.OP_SELL
                                : CIMTOrder.EnOrderType.OP_BUY);
                            req.Comment("MFT Battle End - Force Close");

                            var result = Manager.DealerResultCreate();
                            uint ret   = Manager.DealerDeal(req, result);

                            if (ret == CIMTManagerAPI.MT_RET_OK) closed++;
                            else {
                                failed++;
                                if (errors.Length > 0) errors.Append(",");
                                errors.Append("\"Pos " + pos.Position() + " (" + pos.Symbol() + "): err " + ret + "\"");
                                Console.WriteLine("[CloseAll] Failed pos=" + pos.Position() + " ret=" + ret);
                            }

                            req.Dispose(); if (result != null) result.Dispose();
                        } catch (Exception ex) { failed++; Console.WriteLine("[CloseAll] " + ex.Message); }
                    }

                    positions.Dispose();
                    Console.WriteLine("[CloseAll] login=" + login + " closed=" + closed + "/" + total);

                    return "{\"closed\":"  + closed +
                           ",\"failed\":"  + failed +
                           ",\"total\":"   + total +
                           ",\"login\":"   + login +
                           ",\"message\":\"Closed " + closed + " of " + total + " positions\"" +
                           (errors.Length > 0 ? ",\"errors\":[" + errors + "]" : "") + "}";

                } catch (Exception ex) {
                    Console.WriteLine("[CloseAll] Exception: " + ex.Message);
                    return "{\"error\":\"" + Esc(ex.Message) + "\",\"closed\":0,\"failed\":0}";
                }
            }
        }

        static bool Deposit(ulong login, double amount, string comment) {
            lock (MgrLock) {
                if (!Connected || Manager == null) return false;
                try {
                    var deal = Manager.DealerCreate();
                    if (deal == null) return false;
                    deal.Login(login);
                    deal.Action(CIMTDeal.EnDealAction.DEAL_BALANCE);
                    deal.Profit(amount);
                    deal.Comment(comment);
                    uint ret = Manager.DealerBalance(deal);
                    deal.Dispose();
                    return ret == CIMTManagerAPI.MT_RET_OK;
                } catch { return false; }
            }
        }

        // Helper: get numeric value from JSON (handles both "key":123 and "key":"123")
        static string GetJVNum(string json, string key) {
            if (string.IsNullOrEmpty(json)) return "0";
            int i = json.IndexOf("\"" + key + "\""); if (i < 0) return "0";
            int co = json.IndexOf(':', i); if (co < 0) return "0";
            int st = co + 1; while (st < json.Length && json[st] == ' ') st++;
            if (st >= json.Length) return "0";
            if (json[st] == '"') { // string value
                int en = json.IndexOf('"', st+1); if (en < 0) return "0";
                return json.Substring(st+1, en-st-1);
            } else { // numeric value
                int en = st;
                while (en < json.Length && (char.IsDigit(json[en]) || json[en]=='.' || json[en]=='-')) en++;
                return json.Substring(st, en-st);
            }
        }
    }
}
