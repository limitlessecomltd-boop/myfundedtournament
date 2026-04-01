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
        // Hardcoded admin accounts (always connected)
        static readonly ulong LOGIN1 = 260325865;
        static readonly string PASS1  = "uoqcyW3|Eh";
        static readonly ulong LOGIN2  = 260552450;
        static readonly string PASS2  = "h/8f3P4vpT";
        const string HOST  = "47.91.105.29";
        const int   MPORT  = 443;
        const int   HPORT  = 5099;
        const string SECRET = "mft_bridge_secret_2024";
        static readonly Dictionary<ulong, MT5API> Accounts = new Dictionary<ulong, MT5API>();
        static readonly object AccountsLock = new object();
        static void Main(string[] a) {
            Console.WriteLine("[MFT] Starting C# bridge on port " + HPORT);
            ConnectAccount(LOGIN1, PASS1, "Admin1");
            ConnectAccount(LOGIN2, PASS2, "Admin2");
            var srv = new TcpListener(IPAddress.Any, HPORT);
            srv.Start();
            Console.WriteLine("[MFT] Listening...");
            while (true) { var c = srv.AcceptTcpClient(); ThreadPool.QueueUserWorkItem(_ => Handle(c)); }
        }
        static void ConnectAccount(ulong login, string pass, string label) {
            try { var api = new MT5API(login, pass, HOST, MPORT); api.Connect(); lock (AccountsLock) { Accounts[login] = api; } Console.WriteLine("[" + label + "] OK bal=" + api.Account.Balance); }
            catch (Exception e) { Console.WriteLine("[" + label + "] FAIL: " + e.Message); }
        }
        static MT5API GetAbŽeÕÀ†ogin) { lock (AccountsLock) { return Accounts.ContainsKey(login) ? Accounts[login] : null; } }
        static void Handle(TcpClient c) {
            try {
                var s = c.GetStream(); var r = new StreamReader(s, Encoding.UTF8);
                var req = r.ReadLine(); if (string.IsNullOrEmpty(req)) { c.Close(); return; }
                int clen = 0; string ln;
                while (!string.IsNullOrEmpty(ln = r.ReadLine())) { if (ln.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase)) int.TryParse(ln.Substring(15).Trim(), out clen); }
                string body = ""; if (clen > 0) { var buf = new char[clen]; r.Read(buf, 0, clen); body = new string(buf); }
                var pts = req.Split(' '); if (pts.Length < 2) { c.Close(); return; }
                var mth = pts[0]; var full = pts[1]; var qi = full.IndexOf('?');
                var path = (qi >= 0 ? full.Substring(0, qi) : full).TrimEnd('/');
                var qs = ParseQS(qi >= 0 ? full.Substring(qi + 1) : "");
                string resp = ""; int code = 200;
                try {
                    if (path == "/health") {
                        var sb = new StringBuilder(); sb.Append("{\"status\":\"ok\",\"accounts\":["); bool f = true;
                        lock (AccountsLock) { foreach (var kv in Accounts) { if (!f) sb.Append(","); f = false; string bal = "null"; try { bal = kv.Value.Account.Balance.ToString(); } catch {} sb.Append("{\"login\":" + kv.Key + ",\"connected\":true,\"balance\":" + bal + "}"); } }
                        sb.Append("]}"); resp = sb.ToString();
                    } else if (path == "/account") {
                        ulong lg = ulong.Parse(qs["login"]); var api = GetApi(lg);
                        if (api == null) { code = 404; resp = "{\"error\":\"not connected\"}"; }
                        else { int w = 0; while (api.Account == null && w < 10000) { Thread.Sleep(200); w += 200; } resp = "{\"login\":" + api.Account.Login + ",\"balance\":" + api.Account.Balance + ",\"equity\":" + api.AccountEquity + ",\"profit\":" + Math.Round(api.AccountProfit, 2) + ",\"currency\":\"" + api.AccountCurrency + "\"}"; }
                    } else if (path == "/trades/open") {
                        ulong lg = ulong.Parse(qs["login"]); var api = GetApi(lg);
                        if (api == null) { code = 404; resp = "{\"error\":\"not connected\"}"; }
                        else { var ord = api.GetOpenedOrders(); var sb = new StringBuilder(); sb.Append("["); for (int i = 0; i < ord.Length; i++) { var o = ord[i]; if (i > 0) sb.Append(","); sb.Append("{\"ticket\":" + o.Ticket + ",\"symbol\":\"" + o.Symbol + "\",\"type\":\"" + o.OrderType + "\",\"lots\":" + o.Lots + ",\"open_price\":" + o.OpenPrice + ",\"profit\":" + Math.Round(o.Profit, 2) + ",\"open_time\":\"" + o.OpenTime.ToString("yyyy-MM-dd HH:mm:ss") + "\",\"account\":" + lg + "}"); } sb.Append("]"); resp = sb.ToString(); }
                    } else if (path == "/trades/history") {
                        ulong lg = ulong.Parse(qs["login"]); int days = qs.ContainsKey("days") ? int.Parse(qs["days"]) : 30; var api = GetApi(lg);
                        if (api == null) { code = 404; resp = "{\"error\":\"not connected\"}"; }
                        else { var h = api.DownloadOrderHistory(DateTime.Now.AddDays(-days), DateTime.Now.AddDays(1)); var sb = new StringBuilder(); sb.Append("["); bool ff = true; foreach (var o in h) { if (!ff) sb.Append(","); ff = false; sb.Append("{\"ticket\":" + o.Ticket + ",\"symbol\":\"" + Esc(o.Symbol) + "\",\"type\":\"" + o.OrderType + "\",\"lots\":" + o.Lots + ",\"open_price\":" + o.OpenPrice + ",\"close_price\":" + o.ClosePrice + ",\"profit\":" + Math.Round(o.Profit, 2) + ",\"open_time\":\"" + o.OpenTime.ToString("yyyy-MM-dd HH:mm:ss") + "\",\"close_time\":\"" + o.CloseTime.ToString("yyyy-MM-dd HH:mm:ss") + "\",\"account\":" + lg + "}"); } sb.Append("]"); resp = sb.ToString(); }
                    } else if (path == "/connect-account" && mth == "POST") {
                        string sec = GetJV(body, "secret") ?? "";
                        if (sec != SECRET) { code = 403; resp = "{\"error\":\"Unauthorized\"}"; }
                        else { string ls = GetJV(body, "login") ?? ""; string pw = GetJV(body, "password") ?? "";
                            if (string.IsNullOrEmpty(ls) || string.IsNullOrEmpty(pw)) { code = 400; resp = "{\"error\":\"login+PW required\"}"; }
                            else { ulong lg = ulong.Parse(ls);
                                if (GetApi(lg) != null) { resp = "{\"connected\":true,\"login\":" + lg + ",\"msg\":\"already connected\"}"; }
                                else { ThreadPool.QueueUserWorkItem(_ => ConnectAccount(lg, pw, "User-" + lg)); resp = "{\"connected\":true,\"login\":" + lg + ",\"msg\":\"connecting\"}"; }
                            }
                        }
                    } else if (path == "/verify-account" && mth == "POST") {
                        string sec = GetJV(body, "secret") ?? "";
                        if (sec != SECRET) { code = 403; resp = "{\"error\":\"Unauthorized\"}"; }
                        else { string ls = GetJV(body, "login") ?? ""; string pw = GetJV(body, "password") ?? "";
                            if (string.IsNullOrEmpty(ls) || string.IsNullOrEmpty(pw)) { code = 400; resp = "{\"error\":\"login+pw required\"}"; }
                            else { MT5API t=null; try { ulong lg = ulong.Parse(ls); t = new MT5API(lg, pw, HOST, MPORT); t.Connect(); int w=0; while(t.Account==null&&w<10000){Thread.Sleep(200);w+=200;} if(t.Account==null){code=400;resp="{\"valid\":false,\"error\":\"cannot connect\"}";} else{double bal=t.Account.Balance;bool bOk=bal>=990&&bal<=1010;var op=t.GetOpenedOrders();bool nT=op==null||op.Length==0;if(!bOk){code=400;resp="{\"valid\":false,\"error\":\"Balance must be $1000. Yours: $"+bal.ToString("F2")+"\"}";}else if(!nT){code=400;resp="{\"valid\":false,\"error\":\"Close all open trades first\",\"open_trades\":"+op.Length+"}";}else{resp="{\"valid\":true,\"login\":"+lg+",\"balance\":"+bal.ToString("F2")+",\"open_trades\":0}";Console.WriteLine("[Verify] OK login="+lg);}}}catch(Exception ex){code=400;resp="{\"valid\":false,\"error\":\""+Esc(ex.Message)+"\"}";}finally{try{if(t!=null)t.Disconnect();}catch{}}} }
                    } else { code = 404; resp = "{\"error\":\"not found\"}"; }
                } catch (Exception ex) { code = 500; resp = "{\"error\":\"" + Esc(ex.Message) + "\"}"; }
                var bb = Encoding.UTF8.GetBytes(resp);
                var hdr = "HTTP/1.1 " + code + " OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: " + bb.Length + "\r\nConnection: close\r\n\r\n";
                var hb = Encoding.UTF8.GetBytes(hdr); s.Write(hb, 0, hb.Length); s.Write(bb, 0, bb.Length); s.Flush();
            } catch (Exception e) { Console.WriteLine("[TCP] " + e.Message); } finally { c.Close(); }
        }
        static Dictionary<string, string> ParseQS(string q) { var d=new Dictionary<string,string>(); if(string.IsNullOrEmpty(q))return d; foreach(var kv in q.Split('&')){var x=kv.Split('=');if(x.Length==2)d[x[0]]=Uri.UnescapeDataString(x[1]);} return d; }
        static string GetJV(string json, string key) { if(string.IsNullOrEmpty(json))return null; string se="\""+key+"\""; int i=json.IndexOf(se);if(i<0)return null; int co=json.IndexOf(':',i);if(co<0)return null; int st=json.IndexOf('"',co);if(st<0)return null; int en=json.IndexOf('"',st+1);if(en<0)return null; return json.Substring(st+1,en-st-1); }
        static string Esc(string s) { if(s==null)return ""; return s.Replace("\\","\\\\").Replace("\"","\\\"").Replace("\n","\\n").Replace("\r",""); }
    }
}
