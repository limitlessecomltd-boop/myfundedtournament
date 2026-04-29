using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using MetaQuotes.MT5ManagerAPI;

namespace MftBridge {

class Program {

    const string MGR_SERVER   = "51.195.4.87:443";
    const ulong  MGR_LOGIN    = 10007;
    const string MGR_PASSWORD = "Noman@2026";
    const int    HPORT        = 5099;
    const string SECRET       = "mft_bridge_secret_2024";
    const string DEFAULT_GROUP = "demo\\contest";

    static IMTManagerAPI _factory = null;
    static IMTManagerAPI _mgr     = null;
    static bool          _connected    = false;
    static DateTime      _lastConnect  = DateTime.MinValue;
    static readonly object _lock = new object();
    static readonly Dictionary<ulong,bool> _tradingState = new Dictionary<ulong,bool>();

    static void Main(string[] a) {
        Console.WriteLine("[MFT] Manager Bridge v2.0 — port " + HPORT);
        Console.WriteLine("[MFT] Target: " + MGR_SERVER + " login=" + MGR_LOGIN);
        Connect();
        new Thread(()=>{ while(true){ Thread.Sleep(60000); if(!_connected) Connect(); }}) { IsBackground=true }.Start();
        var srv = new TcpListener(IPAddress.Any, HPORT);
        srv.Start();
        Console.WriteLine("[MFT] Listening...");
        while(true){ var c=srv.AcceptTcpClient(); ThreadPool.QueueUserWorkItem(_=>Handle(c)); }
    }

    static void Connect() {
        lock(_lock) {
            try {
                _lastConnect = DateTime.UtcNow;
                Console.WriteLine("[MGR] Creating factory...");
                _factory = IMTManagerAPI.CreateManagerAPI();
                if(_factory==null){ Console.WriteLine("[MGR] ERROR: CreateManagerAPI() null — check MT5APIManager64.dll exists"); return; }

                Console.WriteLine("[MGR] Factory OK, version=" + _factory.Version);
                // CreateManager returns IMTManagerAPI (same interface, different instance)
                _mgr = _factory.CreateManager(_factory.Version);
                if(_mgr==null){ Console.WriteLine("[MGR] ERROR: CreateManager() null"); return; }

                Console.WriteLine("[MGR] Connecting to " + MGR_SERVER + "...");
                uint ret = _mgr.Connect(MGR_SERVER);
                if(ret != IMTManagerAPI.MT_RET_OK){ Console.WriteLine("[MGR] Connect failed: " + ret); return; }

                ret = _mgr.Authorize(MGR_LOGIN, MGR_PASSWORD);
                if(ret != IMTManagerAPI.MT_RET_OK){ Console.WriteLine("[MGR] Authorize failed: " + ret); return; }

                _connected = true;
                Console.WriteLine("[MGR] ✅ Connected and authorized to " + MGR_SERVER);
            } catch(Exception ex) {
                Console.WriteLine("[MGR] Exception: " + ex.GetType().Name + ": " + ex.Message);
                _connected = false;
            }
        }
    }

    static void EnsureConnected() {
        if(!_connected && (DateTime.UtcNow-_lastConnect).TotalSeconds > 30) Connect();
    }

    // ── helpers ───────────────────────────────────────────────────────────────
    static string Esc(string s) {
        if(s==null) return "";
        return s.Replace("\\","\\\\").Replace("\"","\\\"").Replace("\n","\\n").Replace("\r","");
    }
    static string GetJV(string j, string k) {
        if(string.IsNullOrEmpty(j)) return null;
        int i=j.IndexOf("\""+k+"\""); if(i<0) return null;
        int co=j.IndexOf(':',i); if(co<0) return null;
        int st=j.IndexOf('"',co); if(st<0) return null;
        int en=j.IndexOf('"',st+1); if(en<0) return null;
        return j.Substring(st+1,en-st-1);
    }
    static string GetJVArr(string j, string k) {
        if(string.IsNullOrEmpty(j)) return null;
        int i=j.IndexOf("\""+k+"\""); if(i<0) return null;
        int co=j.IndexOf(':',i); if(co<0) return null;
        int st=j.IndexOf('[',co); if(st<0) return null;
        int en=j.IndexOf(']',st); if(en<0) return null;
        return j.Substring(st+1,en-st-1);
    }
    static string GetNum(string j, string k) {
        if(string.IsNullOrEmpty(j)) return "0";
        int i=j.IndexOf("\""+k+"\""); if(i<0) return "0";
        int co=j.IndexOf(':',i); if(co<0) return "0";
        int st=co+1; while(st<j.Length&&j[st]==' ') st++;
        if(st>=j.Length) return "0";
        if(j[st]=='"'){ int en=j.IndexOf('"',st+1); if(en<0) return "0"; return j.Substring(st+1,en-st-1); }
        int e2=st; while(e2<j.Length&&(char.IsDigit(j[e2])||j[e2]=='.'||j[e2]=='-')) e2++;
        return j.Substring(st,e2-st);
    }
    static Dictionary<string,string> ParseQS(string q) {
        var d=new Dictionary<string,string>(); if(string.IsNullOrEmpty(q)) return d;
        foreach(var kv in q.Split('&')){ var x=kv.Split(new[]{'='},2); if(x.Length==2) d[x[0]]=Uri.UnescapeDataString(x[1]); }
        return d;
    }
    static string MakePw() {
        const string u="ABCDEFGHJKMNPQRSTUVWXYZ",l="abcdefghjkmnpqrstuvwxyz",d="23456789",s="!@#$",a="ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
        var rng=new Random(); var pw=new char[12];
        pw[0]=u[rng.Next(u.Length)]; pw[1]=l[rng.Next(l.Length)]; pw[2]=d[rng.Next(d.Length)]; pw[3]=s[rng.Next(s.Length)];
        for(int i=4;i<12;i++) pw[i]=a[rng.Next(a.Length)];
        for(int i=pw.Length-1;i>0;i--){ int j=rng.Next(i+1); var t=pw[i]; pw[i]=pw[j]; pw[j]=t; }
        return new string(pw);
    }
    static void Send(TcpClient c, System.IO.Stream s, int code, string body) {
        try {
            var bb=Encoding.UTF8.GetBytes(body);
            var hdr="HTTP/1.1 "+code+" OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: "+bb.Length+"\r\nConnection: close\r\n\r\n";
            var hb=Encoding.UTF8.GetBytes(hdr); s.Write(hb,0,hb.Length); s.Write(bb,0,bb.Length); s.Flush();
        } catch {}
    }

    // ── HTTP handler ──────────────────────────────────────────────────────────
    static void Handle(TcpClient c) {
        try {
            var s=c.GetStream();
            var rdr=new System.IO.StreamReader(s,Encoding.UTF8);
            var req=rdr.ReadLine(); if(string.IsNullOrEmpty(req)){ c.Close(); return; }
            int clen=0; string ln;
            while(!string.IsNullOrEmpty(ln=rdr.ReadLine()))
                if(ln.StartsWith("Content-Length:",StringComparison.OrdinalIgnoreCase))
                    int.TryParse(ln.Substring(15).Trim(),out clen);
            string body="";
            if(clen>0){ var buf=new char[clen]; rdr.Read(buf,0,clen); body=new string(buf); }
            var pts=req.Split(' '); if(pts.Length<2){ c.Close(); return; }
            var mth=pts[0]; var full=pts[1];
            var qi=full.IndexOf('?');
            var path=(qi>=0?full.Substring(0,qi):full).TrimEnd('/');
            var qs=ParseQS(qi>=0?full.Substring(qi+1):"");
            if(mth=="OPTIONS"){ Send(c,s,200,"{\"ok\":true}"); return; }

            string resp=""; int code=200;
            try {
                EnsureConnected();

                if(path=="/health") {
                    resp="{\"status\":\"ok\",\"connected\":"+(_connected?"true":"false")+",\"server\":\""+MGR_SERVER+"\",\"version\":\"2.0-manager-api\"}";

                } else if(path=="/account"&&mth=="GET") {
                    if(!qs.ContainsKey("login")){ code=400; resp="{\"error\":\"login required\"}"; }
                    else { var r=GetAccount(ulong.Parse(qs["login"])); resp=r??(code=404).ToString(); if(r==null) resp="{\"error\":\"not found\"}"; else resp=r; }

                } else if(path=="/trades/open"&&mth=="GET") {
                    if(!qs.ContainsKey("login")){ code=400; resp="{\"error\":\"login required\"}"; }
                    else resp=GetOpenTrades(ulong.Parse(qs["login"]));

                } else if(path=="/trades/history"&&mth=="GET") {
                    if(!qs.ContainsKey("login")){ code=400; resp="{\"error\":\"login required\"}"; }
                    else { int days=qs.ContainsKey("days")?int.Parse(qs["days"]):90; resp=GetHistory(ulong.Parse(qs["login"]),days); }

                } else if(path=="/verify-account"&&mth=="POST") {
                    if((GetJV(body,"secret")??"")!=SECRET){ code=403; resp="{\"error\":\"Unauthorized\"}"; }
                    else {
                        string ls=GetJV(body,"login")??""; if(string.IsNullOrEmpty(ls)){ code=400; resp="{\"error\":\"login required\"}"; }
                        else { ulong lg=ulong.Parse(ls); var r=GetAccount(lg); if(r==null){ code=400; resp="{\"valid\":false,\"error\":\"Not found\"}"; } else resp="{\"valid\":true,\"login\":"+lg+","+r.Substring(1); }
                    }

                } else if(path=="/connect-account"&&mth=="POST") {
                    if((GetJV(body,"secret")??"")!=SECRET){ code=403; resp="{\"error\":\"Unauthorized\"}"; }
                    else { ulong lg=ulong.Parse(GetJV(body,"login")??"0"); lock(_tradingState){_tradingState[lg]=true;} resp="{\"connected\":true,\"login\":"+lg+"}"; }

                } else if(path=="/disconnect-account"&&mth=="POST") {
                    if((GetJV(body,"secret")??"")!=SECRET){ code=403; resp="{\"error\":\"Unauthorized\"}"; }
                    else { ulong lg=ulong.Parse(GetJV(body,"login")??"0"); lock(_tradingState){_tradingState.Remove(lg);} resp="{\"disconnected\":true,\"login\":"+lg+"}"; }

                } else if(path=="/close-all"&&mth=="POST") {
                    string ls=GetJV(body,"login")??(qs.ContainsKey("login")?qs["login"]:"");
                    if(string.IsNullOrEmpty(ls)){ code=400; resp="{\"error\":\"login required\"}"; }
                    else resp=CloseAll(ulong.Parse(ls));

                } else if(path=="/create-account"&&mth=="POST") {
                    if((GetJV(body,"secret")??"")!=SECRET){ code=403; resp="{\"error\":\"Unauthorized\"}"; }
                    else {
                        string name=GetJV(body,"name")??"MFT Trader", email=GetJV(body,"email")??"", grp=GetJV(body,"group")??DEFAULT_GROUP;
                        double bal=1000; try{bal=double.Parse(GetNum(body,"balance"));}catch{}
                        int lev=100; try{lev=int.Parse(GetNum(body,"leverage"));}catch{}
                        resp=CreateAccount(name,email,grp,bal,lev); if(resp.Contains("\"error\"")) code=500;
                    }

                } else if(path=="/enable-trading"&&mth=="POST") {
                    if((GetJV(body,"secret")??"")!=SECRET){ code=403; resp="{\"error\":\"Unauthorized\"}"; }
                    else { ulong lg=ulong.Parse(GetJV(body,"login")??"0"); bool ok=SetTrading(lg,true); resp="{\"success\":"+(ok?"true":"false")+",\"login\":"+lg+"}"; }

                } else if(path=="/disable-trading"&&mth=="POST") {
                    if((GetJV(body,"secret")??"")!=SECRET){ code=403; resp="{\"error\":\"Unauthorized\"}"; }
                    else { ulong lg=ulong.Parse(GetJV(body,"login")??"0"); bool ok=SetTrading(lg,false); resp="{\"success\":"+(ok?"true":"false")+",\"login\":"+lg+"}"; }

                } else if(path=="/enable-battle"&&mth=="POST") {
                    if((GetJV(body,"secret")??"")!=SECRET){ code=403; resp="{\"error\":\"Unauthorized\"}"; }
                    else {
                        string arr=GetJVArr(body,"logins")??"";
                        var sb2=new StringBuilder(); sb2.Append("["); int en=0,tot=0; bool fl=true;
                        foreach(var p in arr.Split(',')){ string ls3=p.Trim().Trim('"'); if(string.IsNullOrEmpty(ls3)||!ulong.TryParse(ls3,out ulong lg3)) continue; tot++; bool ok=SetTrading(lg3,true); if(ok) en++; if(!fl) sb2.Append(","); fl=false; sb2.Append("{\"login\":"+lg3+",\"enabled\":"+(ok?"true":"false")+"}"); }
                        sb2.Append("]"); resp="{\"success\":true,\"enabled\":"+en+",\"total\":"+tot+",\"results\":"+sb2+"}";
                    }

                } else if(path=="/deposit"&&mth=="POST") {
                    if((GetJV(body,"secret")??"")!=SECRET){ code=403; resp="{\"error\":\"Unauthorized\"}"; }
                    else { ulong lg=ulong.Parse(GetJV(body,"login")??"0"); double amt=0; try{amt=double.Parse(GetNum(body,"amount"));}catch{} string cmt=GetJV(body,"comment")??"MFT Deposit"; bool ok=Deposit(lg,amt,cmt); resp="{\"success\":"+(ok?"true":"false")+",\"login\":"+lg+",\"amount\":"+amt+"}"; }

                } else { code=404; resp="{\"error\":\"not found\",\"path\":\""+Esc(path)+"\"}"; }

            } catch(Exception ex){ code=500; resp="{\"error\":\""+Esc(ex.Message)+"\"}"; Console.WriteLine("[ERR] "+path+": "+ex.Message); }
            Send(c,s,code,resp);
        } catch(Exception e){ Console.WriteLine("[TCP] "+e.Message); } finally{ try{c.Close();}catch{} }
    }

    // ── MT5 operations ────────────────────────────────────────────────────────

    static string GetAccount(ulong login) {
        lock(_lock) {
            if(!_connected||_mgr==null) return null;
            try {
                var user=_mgr.UserCreate(); if(user==null) return null;
                if(_mgr.UserGet(login,user)!=IMTManagerAPI.MT_RET_OK){ user.Dispose(); return null; }
                var acc=_mgr.AccountCreate(); if(acc==null){ user.Dispose(); return null; }
                _mgr.AccountGet(login,acc);
                string r="{\"login\":"+login+",\"name\":\""+Esc(user.Name())+"\",\"balance\":"+acc.Balance().ToString("F2")+",\"equity\":"+acc.Equity().ToString("F2")+",\"margin\":"+acc.Margin().ToString("F2")+",\"free_margin\":"+acc.MarginFree().ToString("F2")+",\"leverage\":"+user.Leverage()+",\"currency\":\""+Esc(acc.Currency())+"\",\"group\":\""+Esc(user.Group())+"\",\"trade_allowed\":"+user.TradeAllowed()+"}";
                user.Dispose(); acc.Dispose(); return r;
            } catch(Exception ex){ Console.WriteLine("[GetAccount] "+ex.Message); return null; }
        }
    }

    static string GetOpenTrades(ulong login) {
        lock(_lock) {
            if(!_connected||_mgr==null) return "[]";
            try {
                var arr=_mgr.PositionCreateArray(); if(arr==null) return "[]";
                _mgr.PositionGetByLogin(login,arr);
                var sb=new StringBuilder(); sb.Append("["); bool first=true;
                for(uint i=0;i<arr.Total();i++){
                    var p=arr.Next(i); if(p==null) continue;
                    if(!first) sb.Append(","); first=false;
                    string side=p.Action()==CIMTPosition.EnPositionAction.POSITION_BUY?"Buy":"Sell";
                    sb.Append("{\"ticket\":"+p.Position()+",\"symbol\":\""+Esc(p.Symbol())+"\",\"type\":\""+side+"\",\"lots\":"+((double)p.Volume()/10000.0).ToString("F2")+",\"open_price\":"+p.PriceOpen().ToString("F5")+",\"close_price\":"+p.PriceCurrent().ToString("F5")+",\"profit\":"+p.Profit().ToString("F2")+",\"open_time\":\""+DateTimeOffset.FromUnixTimeSeconds((long)p.TimeCreate()).DateTime.ToString("yyyy-MM-dd HH:mm:ss")+"\",\"account\":"+login+"}");
                }
                sb.Append("]"); arr.Dispose(); return sb.ToString();
            } catch(Exception ex){ Console.WriteLine("[OpenTrades] "+ex.Message); return "[]"; }
        }
    }

    static string GetHistory(ulong login, int days) {
        lock(_lock) {
            if(!_connected||_mgr==null) return "[]";
            try {
                ulong from=(ulong)DateTimeOffset.UtcNow.AddDays(-days).ToUnixTimeSeconds();
                ulong to  =(ulong)DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                var arr=_mgr.DealCreateArray(); if(arr==null) return "[]";
                _mgr.DealGetByLogin(login,from,to,arr);
                var sb=new StringBuilder(); sb.Append("["); bool first=true;
                for(uint i=0;i<arr.Total();i++){
                    var d=arr.Next(i); if(d==null) continue;
                    if(!first) sb.Append(","); first=false;
                    string t=d.Action()==CIMTDeal.EnDealAction.DEAL_BUY?"Buy":d.Action()==CIMTDeal.EnDealAction.DEAL_SELL?"Sell":d.Action()==CIMTDeal.EnDealAction.DEAL_BALANCE?"Balance":d.Action()==CIMTDeal.EnDealAction.DEAL_CREDIT?"Credit":"Other";
                    sb.Append("{\"ticket\":"+d.Deal()+",\"symbol\":\""+Esc(d.Symbol())+"\",\"type\":\""+t+"\",\"lots\":"+((double)d.Volume()/10000.0).ToString("F2")+",\"open_price\":"+d.Price().ToString("F5")+",\"profit\":"+d.Profit().ToString("F2")+",\"open_time\":\""+DateTimeOffset.FromUnixTimeSeconds((long)d.Time()).DateTime.ToString("yyyy-MM-dd HH:mm:ss")+"\",\"comment\":\""+Esc(d.Comment())+"\",\"account\":"+login+"}");
                }
                sb.Append("]"); arr.Dispose(); return sb.ToString();
            } catch(Exception ex){ Console.WriteLine("[History] "+ex.Message); return "[]"; }
        }
    }

    static string CloseAll(ulong login) {
        lock(_lock) {
            if(!_connected||_mgr==null) return "{\"error\":\"not connected\",\"closed\":0}";
            try {
                var pos=_mgr.PositionCreateArray(); if(pos==null) return "{\"closed\":0}";
                _mgr.PositionGetByLogin(login,pos);
                uint total=pos.Total(); if(total==0){ pos.Dispose(); return "{\"closed\":0,\"message\":\"No open positions\"}"; }
                int closed=0,failed=0;
                for(uint i=0;i<total;i++){
                    var p=pos.Next(i); if(p==null) continue;
                    try {
                        var req=_mgr.RequestCreate(); if(req==null){ failed++; continue; }
                        req.Action(CIMTRequest.EnTradeActions.TA_CLOSE_BY);
                        req.Login(login); req.Symbol(p.Symbol()); req.Volume(p.Volume()); req.Position(p.Position());
                        req.Type(p.Action()==CIMTPosition.EnPositionAction.POSITION_BUY?CIMTOrder.EnOrderType.OP_SELL:CIMTOrder.EnOrderType.OP_BUY);
                        req.Comment("MFT Battle End - Force Close");
                        var res=_mgr.DealerResultCreate();
                        if(_mgr.DealerDeal(req,res)==IMTManagerAPI.MT_RET_OK) closed++; else failed++;
                        req.Dispose(); if(res!=null) res.Dispose();
                    } catch{ failed++; }
                }
                pos.Dispose(); Console.WriteLine("[CloseAll] login="+login+" closed="+closed+"/"+total);
                return "{\"closed\":"+closed+",\"failed\":"+failed+",\"total\":"+total+",\"login\":"+login+"}";
            } catch(Exception ex){ Console.WriteLine("[CloseAll] "+ex.Message); return "{\"error\":\""+Esc(ex.Message)+"\",\"closed\":0}"; }
        }
    }

    static string CreateAccount(string name, string email, string group, double balance, int leverage) {
        lock(_lock) {
            if(!_connected||_mgr==null) return "{\"error\":\"Manager not connected\"}";
            try {
                var user=_mgr.UserCreate(); if(user==null) return "{\"error\":\"UserCreate failed\"}";
                user.Name(name); user.Email(email); user.Group(group);
                user.Leverage((uint)leverage); user.TradeAllowed(0); user.SendReports(0);
                user.Comment("MFT Battle "+DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"));
                uint ret=_mgr.UserAdd(user);
                if(ret!=IMTManagerAPI.MT_RET_OK){ user.Dispose(); return "{\"error\":\"UserAdd failed code="+ret+". Check group: "+Esc(group)+"\"}"; }
                ulong nl=user.Login(); user.Dispose();
                string pw=MakePw();
                _mgr.UserPasswordSet(nl,pw,CIMTUser.EnPasswords.PASSWORD_MAIN,false);
                var deal=_mgr.DealerCreate();
                if(deal!=null){ deal.Login(nl); deal.Action(CIMTDeal.EnDealAction.DEAL_BALANCE); deal.Profit(balance); deal.Comment("MFT Battle Starting $"+balance.ToString("F0")); _mgr.DealerBalance(deal); deal.Dispose(); }
                lock(_tradingState){_tradingState[nl]=false;}
                Console.WriteLine("[Create] login="+nl+" name="+name+" bal="+balance+" LOCKED");
                return "{\"success\":true,\"login\":"+nl+",\"password\":\""+Esc(pw)+"\",\"server\":\""+MGR_SERVER+"\",\"balance\":"+balance+",\"trading_locked\":true}";
            } catch(Exception ex){ Console.WriteLine("[Create] "+ex.Message); return "{\"error\":\""+Esc(ex.Message)+"\"}"; }
        }
    }

    static bool SetTrading(ulong login, bool enable) {
        lock(_lock) {
            if(!_connected||_mgr==null) return false;
            try {
                var user=_mgr.UserCreate(); if(user==null) return false;
                if(_mgr.UserGet(login,user)!=IMTManagerAPI.MT_RET_OK){ user.Dispose(); return false; }
                user.TradeAllowed(enable?1u:0u);
                uint ret=_mgr.UserUpdate(user); user.Dispose();
                Console.WriteLine("[SetTrading] login="+login+" enable="+enable+" ret="+ret);
                return ret==IMTManagerAPI.MT_RET_OK;
            } catch(Exception ex){ Console.WriteLine("[SetTrading] "+ex.Message); return false; }
        }
    }

    static bool Deposit(ulong login, double amount, string comment) {
        lock(_lock) {
            if(!_connected||_mgr==null) return false;
            try {
                var deal=_mgr.DealerCreate(); if(deal==null) return false;
                deal.Login(login); deal.Action(CIMTDeal.EnDealAction.DEAL_BALANCE); deal.Profit(amount); deal.Comment(comment);
                uint ret=_mgr.DealerBalance(deal); deal.Dispose();
                return ret==IMTManagerAPI.MT_RET_OK;
            } catch{ return false; }
        }
    }
}
}
