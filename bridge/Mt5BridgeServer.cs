using mtapi.mt5;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace MftBridge {
    class Program {
        const int    MPORT         = 443;
        const int    HPORT         = 5099;
        const string SECRET        = "mft_bridge_secret_2024";
        const string ACCOUNTS_FILE = @"C:\mft-bridge\db\accounts.json";

        static readonly Dictionary<ulong, MT5API> Accounts = new Dictionary<ulong, MT5API>();
        static readonly object Lock = new object();

        // ── Server IP resolver ──────────────────────────────────────────────
        static string ServerToIP(string server) {
            if (string.IsNullOrEmpty(server)) return "47.91.105.29";
            var map = new Dictionary<string, string> {
                // Exness Trial (Trial1-Trial30 all use same IP, prefix match covers all)
                {"Exness-MT5Trial", "47.91.105.29"},
                // Exness Real
                {"Exness-MT5Real8", "196.191.218.8"},
                {"Exness-MT5Real7", "196.191.218.7"},
                {"Exness-MT5Real6", "196.191.218.6"},
                {"Exness-MT5Real5", "196.191.218.5"},
                {"Exness-MT5Real4", "196.191.218.4"},
                {"Exness-MT5Real3", "196.191.218.3"},
                {"Exness-MT5Real2", "196.191.218.2"},
                {"Exness-MT5Real",  "196.191.218.1"},
                // ICMarkets
                {"ICMarkets-MT5",   "18.141.205.68"},
                // Tickmill
                {"Tickmill-MT5",    "52.220.128.77"},
                {"Tickmill",        "52.220.128.77"},
                // Pepperstone
                {"Pepperstone-MT5", "45.32.161.103"},
                // XM
                {"XM-MT5",         "52.76.127.89"},
                // FBS
                {"FBS-MT5",        "47.91.83.57"}
            };
            foreach (var kv in map)
                if (server.StartsWith(kv.Key, StringComparison.OrdinalIgnoreCase)) return kv.Value;
            try { var ips = Dns.GetHostAddresses(server); if (ips.Length > 0) return ips[0].ToString(); } catch {}
            return "47.91.105.29";
        }

        // ── accounts.json helpers ───────────────────────────────────────────
        static List<(ulong login, string password, string server)> LoadAccounts() {
            var result = new List<(ulong, string, string)>();
            try {
                if (!File.Exists(ACCOUNTS_FILE)) return result;
                string json = File.ReadAllText(ACCOUNTS_FILE);
                int pos = 0;
                while (pos < json.Length) {
                    int s = json.IndexOf('{', pos); if (s < 0) break;
                    int e = json.IndexOf('}', s);   if (e < 0) break;
                    string obj = json.Substring(s, e - s + 1);
                    string ls = GetJV(obj, "login"), pw = GetJV(obj, "password"), sv = GetJV(obj, "server");
                    if (!string.IsNullOrEmpty(ls) && !string.IsNullOrEmpty(pw) && ulong.TryParse(ls, out ulong lg))
                        result.Add((lg, pw, sv ?? "Exness-MT5Trial15"));
                    pos = e + 1;
                }
                Console.WriteLine("[Accounts] Loaded " + result.Count + " accounts");
            } catch (Exception ex) { Console.WriteLine("[Accounts] Load error: " + ex.Message); }
            return result;
        }

        static void SaveAccount(ulong login, string password, string server) {
            try {
                var list = LoadAccounts();
                list.RemoveAll(a => a.login == login);
                list.Add((login, password, server));
                var sb = new StringBuilder(); sb.Append("[");
                for (int i = 0; i < list.Count; i++) {
                    if (i > 0) sb.Append(",");
                    sb.Append("{\"login\":\"" + list[i].login + "\",\"password\":\"" + Esc(list[i].password) + "\",\"server\":\"" + Esc(list[i].server) + "\"}");
                }
                sb.Append("]");
                Directory.CreateDirectory(Path.GetDirectoryName(ACCOUNTS_FILE));
                File.WriteAllText(ACCOUNTS_FILE, sb.ToString());
                Console.WriteLine("[Accounts] Saved " + login);
            } catch (Exception ex) { Console.WriteLine("[Accounts] Save error: " + ex.Message); }
        }

        // ── MT5 connect ─────────────────────────────────────────────────────
        static void ConnectAccount(ulong login, string pass, string ip, string label) {
            try {
                var api = new MT5API(login, pass, ip, MPORT);
                api.Connect();
                lock (Lock) { Accounts[login] = api; }
                Console.WriteLine("[" + label + "] Connected bal=" + api.Account.Balance);
                // warm up history in background
                ThreadPool.QueueUserWorkItem(_ => {
                    try {
                        var h = api.DownloadOrderHistory(DateTime.Now.AddDays(-90), DateTime.Now.AddDays(1));
                        int cnt = (h != null && h.Orders != null) ? h.Orders.Count : 0;
                        Console.WriteLine("[" + label + "] History ready: " + cnt + " orders");
                    } catch (Exception he) { Console.WriteLine("[" + label + "] History warn: " + he.Message); }
                });
            } catch (Exception ex) { Console.WriteLine("[" + label + "] FAIL: " + ex.Message); }
        }

        static MT5API GetApi(ulong login) {
            lock (Lock) { return Accounts.ContainsKey(login) ? Accounts[login] : null; }
        }

        // ── Entry point ─────────────────────────────────────────────────────
        static void Main(string[] a) {
            Console.WriteLine("[MFT] Bridge starting on port " + HPORT);
            foreach (var acc in LoadAccounts()) {
                string ip = ServerToIP(acc.server);
                ConnectAccount(acc.login, acc.password, ip, "Auto-" + acc.login);
            }
            var srv = new TcpListener(IPAddress.Any, HPORT);
            srv.Start();
            Console.WriteLine("[MFT] Listening...");
            while (true) { var c = srv.AcceptTcpClient(); ThreadPool.QueueUserWorkItem(_ => Handle(c)); }
        }

        // ── JSON serialisation helpers ──────────────────────────────────────
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
        static Dictionary<string, string> ParseQS(string q) {
            var d = new Dictionary<string, string>();
            if (string.IsNullOrEmpty(q)) return d;
            foreach (var kv in q.Split('&')) { var x = kv.Split('='); if (x.Length == 2) d[x[0]] = Uri.UnescapeDataString(x[1]); }
            return d;
        }

        // ── HTTP handler ────────────────────────────────────────────────────
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

                string resp = ""; int code = 200;
                try {
                    // ── GET /health ──────────────────────────────────────────
                    if (path == "/health") {
                        var sb = new StringBuilder();
                        sb.Append("{\"status\":\"ok\",\"accounts\":[");
                        bool first = true;
                        lock (Lock) {
                            foreach (var kv in Accounts) {
                                if (!first) sb.Append(","); first = false;
                                string bal = "null", eq = "null", prof = "null";
                                try { bal  = kv.Value.Account.Balance.ToString(); } catch {}
                                try { eq   = kv.Value.AccountEquity.ToString();   } catch {}
                                try { prof = Math.Round(kv.Value.AccountProfit, 2).ToString(); } catch {}
                                sb.Append("{\"login\":" + kv.Key + ",\"connected\":true,\"balance\":" + bal + ",\"equity\":" + eq + ",\"profit\":" + prof + "}");
                            }
                        }
                        sb.Append("]}"); resp = sb.ToString();

                    // ── GET /account ─────────────────────────────────────────
                    } else if (path == "/account") {
                        ulong lg = ulong.Parse(qs["login"]); var api = GetApi(lg);
                        if (api == null) { code = 404; resp = "{\"error\":\"not connected\"}"; }
                        else {
                            int w = 0; while (api.Account == null && w < 10000) { Thread.Sleep(200); w += 200; }
                            resp = "{\"login\":" + api.Account.Login +
                                   ",\"balance\":"  + api.Account.Balance +
                                   ",\"equity\":"   + api.AccountEquity +
                                   ",\"profit\":"   + Math.Round(api.AccountProfit, 2) +
                                   ",\"currency\":\"" + api.AccountCurrency + "\"}";
                        }

                    // ── GET /trades/open ──────────────────────────────────────
                    } else if (path == "/trades/open") {
                        ulong lg = ulong.Parse(qs["login"]); var api = GetApi(lg);
                        if (api == null) { code = 404; resp = "{\"error\":\"not connected\"}"; }
                        else {
                            var ord = api.GetOpenedOrders(); // returns Order[]
                            var sb  = new StringBuilder(); sb.Append("[");
                            if (ord != null) {
                                for (int i = 0; i < ord.Length; i++) {
                                    var o = ord[i]; if (i > 0) sb.Append(",");
                                    sb.Append("{\"ticket\":"    + o.Ticket +
                                              ",\"symbol\":\""  + Esc(o.Symbol) + "\"" +
                                              ",\"type\":\""    + o.OrderType + "\"" +
                                              ",\"lots\":"      + o.Lots +
                                              ",\"open_price\":" + o.OpenPrice +
                                              ",\"profit\":"    + Math.Round(o.Profit, 2) +
                                              ",\"open_time\":\"" + o.OpenTime.ToString("yyyy-MM-dd HH:mm:ss") + "\"" +
                                              ",\"account\":"   + lg + "}");
                                }
                            }
                            sb.Append("]"); resp = sb.ToString();
                        }

                    // ── GET /trades/history ───────────────────────────────────
                    } else if (path == "/trades/history") {
                        ulong lg = ulong.Parse(qs["login"]);
                        int days = qs.ContainsKey("days") ? int.Parse(qs["days"]) : 30;
                        var api = GetApi(lg);
                        if (api == null) { code = 404; resp = "{\"error\":\"not connected\"}"; }
                        else {
                            var hist = api.DownloadOrderHistory(DateTime.Now.AddDays(-days), DateTime.Now.AddDays(1));
                            var sb   = new StringBuilder(); sb.Append("[");
                            if (hist != null && hist.Orders != null) {
                                bool first = true;
                                foreach (var o in hist.Orders) { // hist.Orders is List<Order>
                                    if (!first) sb.Append(","); first = false;
                                    sb.Append("{\"ticket\":"      + o.Ticket +
                                              ",\"symbol\":\""    + Esc(o.Symbol) + "\"" +
                                              ",\"type\":\""      + o.OrderType + "\"" +
                                              ",\"lots\":"        + o.Lots +
                                              ",\"open_price\":"  + o.OpenPrice +
                                              ",\"close_price\":" + o.ClosePrice +
                                              ",\"profit\":"      + Math.Round(o.Profit, 2) +
                                              ",\"open_time\":\""  + o.OpenTime.ToString("yyyy-MM-dd HH:mm:ss") + "\"" +
                                              ",\"close_time\":\"" + o.CloseTime.ToString("yyyy-MM-dd HH:mm:ss") + "\"" +
                                              ",\"account\":"     + lg + "}");
                                }
                            }
                            sb.Append("]"); resp = sb.ToString();
                        }

                    // ── POST /connect-account ─────────────────────────────────
                    } else if (path == "/connect-account" && mth == "POST") {
                        string sec = GetJV(body, "secret") ?? "";
                        if (sec != SECRET) { code = 403; resp = "{\"error\":\"Unauthorized\"}"; }
                        else {
                            string ls = GetJV(body, "login") ?? "", pw = GetJV(body, "password") ?? "", sv = GetJV(body, "server") ?? "";
                            if (string.IsNullOrEmpty(ls) || string.IsNullOrEmpty(pw)) { code = 400; resp = "{\"error\":\"login and password required\"}"; }
                            else {
                                ulong lg = ulong.Parse(ls);
                                string sip = GetJV(body, "serverIp") ?? "";
                                string ip  = !string.IsNullOrEmpty(sip) ? sip : ServerToIP(sv);
                                SaveAccount(lg, pw, string.IsNullOrEmpty(sv) ? "Exness-MT5Trial15" : sv);
                                MT5API old = null;
                                lock (Lock) { if (Accounts.ContainsKey(lg)) { old = Accounts[lg]; Accounts.Remove(lg); } }
                                try { if (old != null) old.Disconnect(); } catch {}
                                ThreadPool.QueueUserWorkItem(_ => ConnectAccount(lg, pw, ip, "User-" + lg));
                                resp = "{\"connected\":true,\"login\":" + lg + ",\"msg\":\"connecting\"}";
                            }
                        }

                    // ── POST /verify-account ──────────────────────────────────
                    } else if (path == "/verify-account" && mth == "POST") {
                        string sec = GetJV(body, "secret") ?? "";
                        if (sec != SECRET) { code = 403; resp = "{\"error\":\"Unauthorized\"}"; }
                        else {
                            string ls = GetJV(body, "login") ?? "", pw = GetJV(body, "password") ?? "", sv = GetJV(body, "server") ?? "";
                            if (string.IsNullOrEmpty(ls) || string.IsNullOrEmpty(pw)) { code = 400; resp = "{\"error\":\"login and password required\"}"; }
                            else {
                                ulong lg = ulong.Parse(ls);
                                MT5API api = GetApi(lg), tmp = null; bool existing = (api != null);
                                try {
                                    if (!existing) {
                                        string sip = GetJV(body, "serverIp") ?? "";
                                        string ip  = !string.IsNullOrEmpty(sip) ? sip : ServerToIP(sv);
                                        tmp = new MT5API(lg, pw, ip, MPORT); tmp.Connect();
                                        int w = 0; while (tmp.Account == null && w < 20000) { Thread.Sleep(200); w += 200; } // 20s timeout
                                        api = tmp;
                                    }
                                    if (api == null || api.Account == null) { code = 400; resp = "{\"valid\":false,\"error\":\"Cannot connect - check credentials\"}"; }
                                    else {
                                        double bal = api.Account.Balance;
                                        bool balOk = bal >= 500.0 && bal <= 1100.0; // Accept $500-$1100 (fresh demo or minor trading)
                                        var op = api.GetOpenedOrders(); // Order[]
                                        bool noT = op == null || op.Length == 0;
                                        if (!balOk)  { code = 400; resp = "{\"valid\":false,\"error\":\"Balance must be between $500-$1,100. Yours: $" + bal.ToString("F2") + ". Reset your demo account to $1,000 in your broker dashboard.\"}"; }
                                        else if (!noT) { code = 400; resp = "{\"valid\":false,\"error\":\"Close all open trades first\",\"open_trades\":" + op.Length + "}"; }
                                        else { resp = "{\"valid\":true,\"login\":" + lg + ",\"balance\":" + bal.ToString("F2") + ",\"open_trades\":0}"; Console.WriteLine("[Verify] OK " + lg); }
                                    }
                                } catch (Exception ex) { code = 400; resp = "{\"valid\":false,\"error\":\"" + Esc(ex.Message) + "\"}"; }
                                finally { try { if (!existing && tmp != null) tmp.Disconnect(); } catch {} }
                            }
                        }

                    // ── POST /disconnect-account ──────────────────────────────
                    } else if (path == "/disconnect-account" && mth == "POST") {
                        string sec = GetJV(body, "secret") ?? "";
                        if (sec != SECRET) { code = 403; resp = "{\"error\":\"Unauthorized\"}"; }
                        else {
                            string ls = GetJV(body, "login") ?? "";
                            if (string.IsNullOrEmpty(ls)) { code = 400; resp = "{\"error\":\"login required\"}"; }
                            else {
                                ulong lg = ulong.Parse(ls); MT5API old = null;
                                lock (Lock) { if (Accounts.ContainsKey(lg)) { old = Accounts[lg]; Accounts.Remove(lg); } }
                                try { if (old != null) old.Disconnect(); } catch {}
                                resp = "{\"disconnected\":true,\"login\":" + lg + "}";
                            }
                        }

                    // ── POST /close-all ───────────────────────────────────────
                    } else if (path == "/close-all" && mth == "POST") {
                        string ls2 = GetJV(body, "login") ?? (qs.ContainsKey("login") ? qs["login"] : "");
                        if (string.IsNullOrEmpty(ls2)) { code = 400; resp = "{\"error\":\"login required\"}"; }
                        else {
                            ulong lg2 = ulong.Parse(ls2); var api2 = GetApi(lg2);
                            if (api2 == null) { code = 503; resp = "{\"error\":\"account not connected\"}"; }
                            else {
                                var op2 = api2.GetOpenedOrders(); // Order[]
                                int closed2 = 0, failed2 = 0;
                                if (op2 != null) {
                                    foreach (var o in op2) {
                                        try {
                                            // Get current price for close
                                            double closePrice = 0;
                                            try {
                                                api2.Subscribe(o.Symbol); Thread.Sleep(300);
                                                var q = api2.GetQuote(o.Symbol);
                                                if (q != null) closePrice = (o.OrderType == OrderType.Buy) ? q.Bid : q.Ask;
                                            } catch {}
                                            // paid API: OrderClose(ticket, symbol, price, lots, type)
                                            api2.OrderClose(o.Ticket, o.Symbol, closePrice, o.Lots, o.OrderType);
                                            closed2++;
                                        } catch { failed2++; }
                                    }
                                }
                                resp = "{\"closed\":" + closed2 + ",\"failed\":" + failed2 + ",\"login\":" + lg2 + "}";
                                Console.WriteLine("[CloseAll] " + lg2 + " closed=" + closed2 + " failed=" + failed2);
                            }
                        }

                    } else { code = 404; resp = "{\"error\":\"not found\"}"; }

                } catch (Exception ex) {
                    code = 500; resp = "{\"error\":\"" + Esc(ex.Message) + "\"}";
                    Console.WriteLine("[ERR] " + ex.Message);
                }

                var bb  = Encoding.UTF8.GetBytes(resp);
                var hdr = "HTTP/1.1 " + code + " OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: " + bb.Length + "\r\nConnection: close\r\n\r\n";
                var hb  = Encoding.UTF8.GetBytes(hdr);
                s.Write(hb, 0, hb.Length); s.Write(bb, 0, bb.Length); s.Flush();
            } catch (Exception e) { Console.WriteLine("[TCP] " + e.Message); } finally { c.Close(); }
        }
    }
}
