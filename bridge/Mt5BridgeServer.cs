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
        const string DB_PATH = @"C:\mft-bridge\db\mft_bridge.db";
        const int MPORT = 443;
        const int HPORT = 5099;
        const string SECRET = "mft_bridge_secret_2024";
        static readonly Dictionary<ulong, MT5API> Accounts = new Dictionary<ulong, MT5API>();
        static readonly Dictionary<ulong, string> Passwords = new Dictionary<ulong, string>();
        static readonly object Lock = new object();

        static string ServerToIP(string server) {
            if (string.IsNullOrEmpty(server)) return "47.91.105.29";
            var map = new Dictionary<string, string> {
                {"Exness-MT5Trial", "47.91.105.29"},
                {"Exness-MT5Real8", "196.191.218.8"},
                {"Exness-MT5Real7", "196.191.218.7"},
                {"Exness-MT5Real6", "196.191.218.6"},
                {"Exness-MT5Real5", "196.191.218.5"},
                {"Exness-MT5Real4", "196.191.218.4"},
                {"Exness-MT5Real3", "196.191.218.3"},
                {"Exness-MT5Real2", "196.191.218.2"},
                {"Exness-MT5Real", "196.191.218.1"}
            };
            foreach (var kv in map)
                if (server.StartsWith(kv.Key, StringComparison.OrdinalIgnoreCase)) return kv.Value;
            try { var ips = Dns.GetHostAddresses(server); if (ips.Length > 0) return ips[0].ToString(); } catch {}
            return "47.91.105.29";
        }

        static void Main(string[] a) {
            Console.WriteLine("[MFT] Starting C# bridge on port " + HPORT);
            LoadAndConnectAllAccounts();
            var srv = new TcpListener(IPAddress.Any, HPORT);
            srv.Start();
            Console.WriteLine("[MFT] Listening...");
            // Background thread to reconnect accounts every 5 minutes
            ThreadPool.QueueUserWorkItem(_ => {
                while (true) {
                    Thread.Sleep(300000); // 5 minutes
                    LoadAndConnectAllAccounts();
                }
            });
            while (true) { var c = srv.AcceptTcpClient(); ThreadPool.QueueUserWorkItem(_ => Handle(c)); }
        }

        static void LoadAndConnectAllAccounts() {
            Console.WriteLine("[MFT] Loading accounts from SQLite DB...");
            try {
                // Read accounts directly from SQLite file using raw bytes
                var lines = ReadAccountsFromDB();
                Console.WriteLine("[MFT] Found " + lines.Count + " accounts in DB");
                foreach (var acc in lines) {
                    ulong login = acc.Key;
                    string pw = acc.Value.Item1;
                    string server = acc.Value.Item2;
                    string ip = ServerToIP(server);
                    if (!string.IsNullOrEmpty(pw) && GetApi(login) == null) {
                        lock (Lock) { Passwords[login] = pw; }
                        ConnectAccount(login, pw, ip, "DB-" + login);
                    }
                }
            } catch (Exception e) {
                Console.WriteLine("[MFT] LoadAccounts error: " + e.Message);
            }
        }

        static Dictionary<ulong, Tuple<string, string>> ReadAccountsFromDB() {
            var result = new Dictionary<ulong, Tuple<string, string>>();
            try {
                // Use SQLite via process since we don't have the DLL
                // Read the DB using a simple approach - call python to dump it
                var psi = new System.Diagnostics.ProcessStartInfo {
                    FileName = "python",
                    Arguments = "-c \"import sqlite3,json; conn=sqlite3.connect('" + DB_PATH.Replace("\\", "/") + "'); rows=conn.execute('SELECT mt5_login,mt5_password,mt5_server FROM accounts WHERE mt5_password IS NOT NULL AND mt5_password != \'\' ').fetchall(); print(json.dumps([[str(r[0]),str(r[1] or \'\'),str(r[2] or \'Exness-MT5Trial15\')] for r in rows])); conn.close()\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                var proc = System.Diagnostics.Process.Start(psi);
                string output = proc.StandardOutput.ReadToEnd().Trim();
                proc.WaitForExit();
                if (!string.IsNullOrEmpty(output) && output.StartsWith("[")) {
                    // Parse simple JSON array
                    output = output.Trim('[', ']');
                    foreach (var item in output.Split(new string[]{"],[", "], [","],[","[ "},StringSplitOptions.RemoveEmptyEntries)) {
                        var parts = item.Trim('[', ']').Split(',');
                        if (parts.Length >= 2) {
                            string loginStr = parts[0].Trim().Trim('"');
                            string pw = parts[1].Trim().Trim('"');
                            string sv = parts.Length > 2 ? parts[2].Trim().Trim('"') : "Exness-MT5Trial15";
                            if (ulong.TryParse(loginStr, out ulong lg) && !string.IsNullOrEmpty(pw))
                                result[lg] = new Tuple<string, string>(pw, sv);
                        }
                    }
                }
            } catch (Exception e) {
                Console.WriteLine("[DB Read] Error: " + e.Message);
            }
            return result;
        }

        static void ConnectAccount(ulong login, string pass, string ip, string label) {
            try {
                var api = new MT5API(login, pass, ip, MPORT);
                api.Connect();
                lock (Lock) { Accounts[login] = api; }
                Console.WriteLine("[" + label + "] Connected bal=" + api.Account.Balance);
            } catch (Exception e) { Console.WriteLine("[" + label + "] FAIL: " + e.Message); }
        }

        static MT5API GetApi(ulong login) {
            lock (Lock) { return Accounts.ContainsKey(login) ? Accounts[login] : null; }
        }

        static void Handle(TcpClient c) {
            try {
                var s = c.GetStream();
                var r = new StreamReader(s, Encoding.UTF8);
                var req = r.ReadLine();
                if (string.IsNullOrEmpty(req)) { c.Close(); return; }
                int clen = 0; string ln;
                while (!string.IsNullOrEmpty(ln = r.ReadLine()))
                    if (ln.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase))
                        int.TryParse(ln.Substring(15).Trim(), out clen);
                string body = "";
                if (clen > 0) { var buf = new char[clen]; r.Read(buf, 0, clen); body = new string(buf); }
                var pts = req.Split(' ');
                if (pts.Length < 2) { c.Close(); return; }
                var mth = pts[0]; var full = pts[1];
                var qi = full.IndexOf('?');
                var path = (qi >= 0 ? full.Substring(0, qi) : full).TrimEnd('/');
                var qs = ParseQS(qi >= 0 ? full.Substring(qi + 1) : "");
                string resp = ""; int code = 200;
                try {
                    if (path == "/health") {
                        var sb = new StringBuilder();
                        sb.Append("{\"status\":\"ok\",\"accounts\":[");
                        bool first = true;
                        lock (Lock) {
                            foreach (var kv in Accounts) {
                                if (!first) sb.Append(","); first = false;
                                string bal = "null";
                                try { bal = kv.Value.Account.Balance.ToString(); } catch {}
                                sb.Append("{\"login\":" + kv.Key + ",\"connected\":true,\"balance\":" + bal + "}");
                            }
                        }
                        sb.Append("]}"); resp = sb.ToString();
                    } else if (path == "/account") {
                        ulong lg = ulong.Parse(qs["login"]); var api = GetApi(lg);
                        if (api == null) { code = 404; resp = "{\"error\":\"not connected\"}"; }
                        else { int w = 0; while (api.Account == null && w < 10000) { Thread.Sleep(200); w += 200; }
                            resp = "{\"login\":" + api.Account.Login + ",\"balance\":" + api.Account.Balance + ",\"equity\":" + api.AccountEquity + ",\"profit\":" + Math.Round(api.AccountProfit, 2) + ",\"currency\":\"" + api.AccountCurrency + "\"}"; }
                    } else if (path == "/trades/open") {
                        ulong lg = ulong.Parse(qs["login"]); var api = GetApi(lg);
                        if (api == null) { code = 404; resp = "{\"error\":\"not connected\"}"; }
                        else { var ord = api.GetOpenedOrders(); var sb = new StringBuilder(); sb.Append("[");
                            for (int i = 0; i < ord.Length; i++) { var o = ord[i]; if (i > 0) sb.Append(",");
                                sb.Append("{\"ticket\":" + o.Ticket + ",\"symbol\":\"" + o.Symbol + "\",\"type\":\"" + o.OrderType + "\",\"lots\":" + o.Lots + ",\"open_price\":" + o.OpenPrice + ",\"profit\":" + Math.Round(o.Profit, 2) + ",\"open_time\":\"" + o.OpenTime.ToString("yyyy-MM-dd HH:mm:ss") + "\",\"account\":" + lg + "}"); }
                            sb.Append("]"); resp = sb.ToString(); }
                    } else if (path == "/trades/history") {
                        ulong lg = ulong.Parse(qs["login"]); int days = qs.ContainsKey("days") ? int.Parse(qs["days"]) : 30; var api = GetApi(lg);
                        if (api == null) { code = 404; resp = "{\"error\":\"not connected\"}"; }
                        else { var hist = api.DownloadOrderHistory(DateTime.Now.AddDays(-days), DateTime.Now.AddDays(1));
                            var sb = new StringBuilder(); sb.Append("["); bool first = true;
                            foreach (var o in hist.Orders) { if (!first) sb.Append(","); first = false;
                                sb.Append("{\"ticket\":" + o.Ticket + ",\"symbol\":\"" + Esc(o.Symbol) + "\",\"type\":\"" + o.OrderType + "\",\"lots\":" + o.Lots + ",\"open_price\":" + o.OpenPrice + ",\"close_price\":" + o.ClosePrice + ",\"profit\":" + Math.Round(o.Profit, 2) + ",\"open_time\":\"" + o.OpenTime.ToString("yyyy-MM-dd HH:mm:ss") + "\",\"close_time\":\"" + o.CloseTime.ToString("yyyy-MM-dd HH:mm:ss") + "\",\"account\":" + lg + "}"); }
                            sb.Append("]"); resp = sb.ToString(); }
                    } else if (path == "/connect-account" && mth == "POST") {
                        string sec = GetJV(body, "secret") ?? "";
                        if (sec != SECRET) { code = 403; resp = "{\"error\":\"Unauthorized\"}"; }
                        else { string ls = GetJV(body, "login") ?? ""; string pw = GetJV(body, "password") ?? ""; string sv = GetJV(body, "server") ?? "";
                            if (string.IsNullOrEmpty(ls) || string.IsNullOrEmpty(pw)) { code = 400; resp = "{\"error\":\"login and password required\"}"; }
                            else { ulong lg = ulong.Parse(ls); string ip = ServerToIP(sv);
                                lock (Lock) { Passwords[lg] = pw; }
                                if (GetApi(lg) != null) { resp = "{\"connected\":true,\"login\":" + lg + ",\"msg\":\"already connected\"}"; }
                                else { ThreadPool.QueueUserWorkItem(_ => ConnectAccount(lg, pw, ip, "User-" + lg)); resp = "{\"connected\":true,\"login\":" + lg + ",\"msg\":\"connecting\"}"; } } }
                    } else if (path == "/verify-account" && mth == "POST") {
                        string sec = GetJV(body, "secret") ?? "";
                        if (sec != SECRET) { code = 403; resp = "{\"error\":\"Unauthorized\"}"; }
                        else { string ls = GetJV(body, "login") ?? ""; string pw = GetJV(body, "password") ?? ""; string sv = GetJV(body, "server") ?? "";
                            if (string.IsNullOrEmpty(ls) || string.IsNullOrEmpty(pw)) { code = 400; resp = "{\"error\":\"login and password required\"}"; }
                            else { ulong lg = ulong.Parse(ls);
                                MT5API api = GetApi(lg); MT5API tmp = null; bool existing = (api != null);
                                try {
                                    if (!existing) { string ip = ServerToIP(sv); tmp = new MT5API(lg, pw, ip, MPORT); tmp.Connect(); int w=0; while(tmp.Account==null&&w<10000){Thread.Sleep(200);w+=200;} api=tmp; }
                                    if (api == null || api.Account == null) { code = 400; resp = "{\"valid\":false,\"error\":\"Cannot connect - check credentials\"}"; }
                                    else { double bal = api.Account.Balance; bool balOk = bal >= 990.0 && bal <= 1010.0;
                                        var op = api.GetOpenedOrders(); bool noT = op == null || op.Length == 0;
                                        if (!balOk) { code = 400; resp = "{\"valid\":false,\"error\":\"Balance must be $1,000. Yours: $" + bal.ToString("F2") + "\"}"; }
                                        else if (!noT) { code = 400; resp = "{\"valid\":false,\"error\":\"Close all open trades first\",\"open_trades\":" + op.Length + "}"; }
                                        else { resp = "{\"valid\":true,\"login\":" + lg + ",\"balance\":" + bal.ToString("F2") + ",\"open_trades\":0}"; Console.WriteLine("[Verify] OK " + lg); } }
                                } catch (Exception ex) { code = 400; resp = "{\"valid\":false,\"error\":\"" + Esc(ex.Message) + "\"}"; }
                                finally { try { if (!existing && tmp != null) tmp.Disconnect(); } catch {} } } }
                    } else { code = 404; resp = "{\"error\":\"not found\"}"; }
                } catch (Exception ex) { code = 500; resp = "{\"error\":\"" + Esc(ex.Message) + "\"}"; Console.WriteLine("[ERR] " + ex.Message); }
                var bb = Encoding.UTF8.GetBytes(resp);
                var hdr = "HTTP/1.1 " + code + " OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: " + bb.Length + "\r\nConnection: close\r\n\r\n";
                var hb = Encoding.UTF8.GetBytes(hdr); s.Write(hb, 0, hb.Length); s.Write(bb, 0, bb.Length); s.Flush();
            } catch (Exception e) { Console.WriteLine("[TCP] " + e.Message); } finally { c.Close(); }
        }

        static Dictionary<string, string> ParseQS(string q) {
            var d = new Dictionary<string, string>();
            if (string.IsNullOrEmpty(q)) return d;
            foreach (var kv in q.Split('&')) { var x = kv.Split('='); if (x.Length == 2) d[x[0]] = Uri.UnescapeDataString(x[1]); }
            return d;
        }
        static string GetJV(string json, string key) {
            if (string.IsNullOrEmpty(json)) return null;
            string se = "\"" + key + "\""; int i = json.IndexOf(se); if (i < 0) return null;
            int co = json.IndexOf(':', i); if (co < 0) return null;
            int st = json.IndexOf('"', co); if (st < 0) return null;
            int en = json.IndexOf('"', st + 1); if (en < 0) return null;
            return json.Substring(st + 1, en - st - 1);
        }
        static string Esc(string s) {
            if (s == null) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "");
        }
    }
}        static void LoadAllAccounts() {
            try {
                string scriptPath = @"C:\mft-bridge\bridge\read_accounts.py";
                if (!File.Exists(PASS_FILE)) { Console.WriteLine("[MFT] No accounts file: " + PASS_FILE); return; }
                if (!File.Exists(scriptPath)) { Console.WriteLine("[MFT] No script: " + scriptPath); return; }
                var psi = new System.Diagnostics.ProcessStartInfo("python", scriptPath);
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                var proc = System.Diagnostics.Process.Start(psi);
                string output = proc.StandardOutput.ReadToEnd();
                string err = proc.StandardError.ReadToEnd();
                proc.WaitForExit();
                if (!string.IsNullOrEmpty(err)) Console.WriteLine("[MFT] Script err: " + err.Trim());
                Console.WriteLine("[MFT] Accounts from file: [" + output.Trim().Replace("\n"," | ") + "]");
                int count = 0;
                foreach (string line in output.Split(new char[]{'\n','\r'}, StringSplitOptions.RemoveEmptyEntries)) {
                    var p = line.Trim().Split('|');
                    if (p.Length < 2) continue;
                    if (!ulong.TryParse(p[0], out ulong lg)) continue;
                    string pw = p[1];
                    string sv = p.Length > 2 ? p[2] : "Exness-MT5Trial15";
                    if (GetApi(lg) == null) {
                        Console.WriteLine("[MFT] Connecting: " + lg + " on " + sv);
                        ConnectAccount(lg, pw, ServerToIP(sv), "Auto-" + lg);
                        count++;
                    }
                }
                Console.WriteLine("[MFT] Connected " + count + " new accounts");
            } catch (Exception e) { Console.WriteLine("[Load] Error: " + e.Message + " " + e.StackTrace); }
        }


