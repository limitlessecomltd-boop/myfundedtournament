using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using MetaQuotes.MT5ManagerAPI;
using MetaQuotes.MT5CommonAPI;

namespace MftBridge {
class Program {

    const string MGR_SERVER    = "51.195.4.87:443";
    const ulong  MGR_LOGIN     = 10007;
    const string MGR_PASSWORD  = "Noman@2026";
    const int    HPORT         = 5099;
    const string SECRET        = "mft_bridge_secret_2024";
    const string DEFAULT_GROUP = "demo\\Pro";

    static CIMTManagerAPI _mgr       = null;
    static bool     _connected       = false;
    static DateTime _lastConnect     = DateTime.MinValue;
    static readonly object _lock     = new object();

    static void Main(string[] a) {
        Console.WriteLine("[MFT] Manager Bridge v2.0 — port " + HPORT);
        // Start HTTP listener FIRST (critical for Windows Service — must respond within 30s)
        var srv = new TcpListener(IPAddress.Any, HPORT);
        srv.Start();
        Console.WriteLine("[MFT] Listening on port " + HPORT);
        // Connect to MT5 in background thread so service starts instantly
        new Thread(()=>{
            Connect();
            while(true){ Thread.Sleep(60000); if(!_connected) Connect(); }
        }) { IsBackground=true }.Start();
        // Accept connections
        while(true){ var c=srv.AcceptTcpClient(); ThreadPool.QueueUserWorkItem(_=>Handle(c)); }
    }

    static void Connect() {
        lock(_lock) {
            try {
                _lastConnect = DateTime.UtcNow;
                if(_mgr != null){ try{ _mgr.Disconnect(); }catch{} }

                Console.WriteLine("[MGR] Creating manager...");
                // Correct: GetVersion uses 'out', CreateManager uses 'out'
                uint ver = 0;
                MTRetCode rc = SMTManagerAPIFactory.GetVersion(out ver);
                if(ver == 0) ver = 3900;
                Console.WriteLine("[MGR] SDK version: " + ver);

                // Initialize must be called first with path to MT5APIManager64.dll
                string dllPath = System.IO.Path.GetDirectoryName(
                    System.Reflection.Assembly.GetExecutingAssembly().Location);
                MTRetCode initRc = SMTManagerAPIFactory.Initialize(dllPath);
                Console.WriteLine("[MGR] Initialize path=" + dllPath + " rc=" + initRc);

                _mgr = SMTManagerAPIFactory.CreateManager(ver, out rc);
                if(_mgr == null){ Console.WriteLine("[MGR] CreateManager failed: " + rc); return; }

                Console.WriteLine("[MGR] Connecting to " + MGR_SERVER + "...");
                // Exact signature: Connect(string server, ulong login, string password,
                //                          string password_cert, EnPumpModes pump_mode, uint timeout)
                // EnPumpModes values from scan:
                //   PUMP_MODE_USERS=1, PUMP_MODE_ORDERS=8, PUMP_MODE_POSITIONS=128
                rc = _mgr.Connect(
                    MGR_SERVER,
                    MGR_LOGIN,
                    MGR_PASSWORD,
                    "",
                    CIMTManagerAPI.EnPumpModes.PUMP_MODE_USERS |
                    CIMTManagerAPI.EnPumpModes.PUMP_MODE_ORDERS |
                    CIMTManagerAPI.EnPumpModes.PUMP_MODE_POSITIONS,
                    30000);

                if(rc != MTRetCode.MT_RET_OK){ Console.WriteLine("[MGR] Connect failed: " + rc); _mgr=null; return; }

                _connected = true;
                Console.WriteLine("[MGR] ✅ Connected to " + MGR_SERVER);
            } catch(Exception ex){
                Console.WriteLine("[MGR] Exception: " + ex.GetType().Name + ": " + ex.Message);
                _connected=false; _mgr=null;
            }
        }
    }

    static void EnsureConnected() {
        if(!_connected && (DateTime.UtcNow-_lastConnect).TotalSeconds > 30) Connect();
    }

    static string Esc(string s){ if(s==null)return""; return s.Replace("\\","\\\\").Replace("\"","\\\"").Replace("\n","\\n").Replace("\r",""); }
    static string GetJV(string j,string k){ if(string.IsNullOrEmpty(j))return null; int i=j.IndexOf("\""+k+"\""); if(i<0)return null; int co=j.IndexOf(':',i); if(co<0)return null; int st=j.IndexOf('"',co); if(st<0)return null; int en=j.IndexOf('"',st+1); if(en<0)return null; return j.Substring(st+1,en-st-1); }
    static string GetJVArr(string j,string k){ if(string.IsNullOrEmpty(j))return null; int i=j.IndexOf("\""+k+"\""); if(i<0)return null; int co=j.IndexOf(':',i); if(co<0)return null; int st=j.IndexOf('[',co); if(st<0)return null; int en=j.IndexOf(']',st); if(en<0)return null; return j.Substring(st+1,en-st-1); }
    static string GetNum(string j,string k){ if(string.IsNullOrEmpty(j))return"0"; int i=j.IndexOf("\""+k+"\""); if(i<0)return"0"; int co=j.IndexOf(':',i); if(co<0)return"0"; int st=co+1; while(st<j.Length&&j[st]==' ')st++; if(st>=j.Length)return"0"; if(j[st]=='"'){int en=j.IndexOf('"',st+1);if(en<0)return"0";return j.Substring(st+1,en-st-1);} int e2=st; while(e2<j.Length&&(char.IsDigit(j[e2])||j[e2]=='.'||j[e2]=='-'))e2++; return j.Substring(st,e2-st); }
    static Dictionary<string,string> ParseQS(string q){ var d=new Dictionary<string,string>(); if(string.IsNullOrEmpty(q))return d; foreach(var kv in q.Split('&')){var x=kv.Split(new[]{'='},2);if(x.Length==2)d[x[0]]=Uri.UnescapeDataString(x[1]);}return d; }
    static string MakePw(){ const string u="ABCDEFGHJKMNPQRSTUVWXYZ",l="abcdefghjkmnpqrstuvwxyz",d="23456789",s="!@#$",a="ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$"; var rng=new Random(); var pw=new char[12]; pw[0]=u[rng.Next(u.Length)];pw[1]=l[rng.Next(l.Length)];pw[2]=d[rng.Next(d.Length)];pw[3]=s[rng.Next(s.Length)]; for(int i=4;i<12;i++)pw[i]=a[rng.Next(a.Length)]; for(int i=pw.Length-1;i>0;i--){int j=rng.Next(i+1);var t=pw[i];pw[i]=pw[j];pw[j]=t;} return new string(pw); }
    static void Send(TcpClient c,System.IO.Stream s,int code,string body){ try{ var bb=Encoding.UTF8.GetBytes(body); var hdr="HTTP/1.1 "+code+" OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: "+bb.Length+"\r\nConnection: close\r\n\r\n"; var hb=Encoding.UTF8.GetBytes(hdr); s.Write(hb,0,hb.Length);s.Write(bb,0,bb.Length);s.Flush(); }catch{} }

    static void Handle(TcpClient c) {
        try {
            var s=c.GetStream(); var rdr=new System.IO.StreamReader(s,Encoding.UTF8);
            var req=rdr.ReadLine(); if(string.IsNullOrEmpty(req)){c.Close();return;}
            int clen=0; string ln;
            while(!string.IsNullOrEmpty(ln=rdr.ReadLine())) if(ln.StartsWith("Content-Length:",StringComparison.OrdinalIgnoreCase)) int.TryParse(ln.Substring(15).Trim(),out clen);
            string body=""; if(clen>0){var buf=new char[clen];rdr.Read(buf,0,clen);body=new string(buf);}
            var pts=req.Split(' '); if(pts.Length<2){c.Close();return;}
            var mth=pts[0]; var full=pts[1]; var qi=full.IndexOf('?');
            var path=(qi>=0?full.Substring(0,qi):full).TrimEnd('/');
            var qs=ParseQS(qi>=0?full.Substring(qi+1):"");
            if(mth=="OPTIONS"){Send(c,s,200,"{\"ok\":true}");return;}
            string resp=""; int code=200;
            try {
                EnsureConnected();
                if(path=="/health"){
                    resp="{\"status\":\"ok\",\"connected\":"+(_connected?"true":"false")+",\"server\":\""+MGR_SERVER+"\",\"version\":\"2.0-manager-api\"}";
                } else if(path=="/account"&&mth=="GET"){
                    if(!qs.ContainsKey("login")){code=400;resp="{\"error\":\"login required\"}";}
                    else{var r=GetAccount(ulong.Parse(qs["login"]));if(r==null){code=404;resp="{\"error\":\"not found\"}";}else resp=r;}
                } else if(path=="/trades/open"&&mth=="GET"){
                    if(!qs.ContainsKey("login")){code=400;resp="{\"error\":\"login required\"}";}
                    else resp=GetOpenTrades(ulong.Parse(qs["login"]));
                } else if(path=="/trades/history"&&mth=="GET"){
                    if(!qs.ContainsKey("login")){code=400;resp="{\"error\":\"login required\"}";}
                    else{int days=qs.ContainsKey("days")?int.Parse(qs["days"]):90;resp=GetHistory(ulong.Parse(qs["login"]),days);}
                } else if(path=="/verify-account"&&mth=="POST"){
                    if((GetJV(body,"secret")??"")!=SECRET){code=403;resp="{\"error\":\"Unauthorized\"}";}
                    else{string ls=GetJV(body,"login")??"";if(string.IsNullOrEmpty(ls)){code=400;resp="{\"error\":\"login required\"}";}
                    else{ulong lg=ulong.Parse(ls);var r=GetAccount(lg);if(r==null){code=400;resp="{\"valid\":false,\"error\":\"Not found\"}";}else resp="{\"valid\":true,\"login\":"+lg+","+r.Substring(1);}}
                } else if(path=="/connect-account"&&mth=="POST"){
                    if((GetJV(body,"secret")??"")!=SECRET){code=403;resp="{\"error\":\"Unauthorized\"}";}
                    else{ulong lg=ulong.Parse(GetJV(body,"login")??"0");resp="{\"connected\":true,\"login\":"+lg+"}";}
                } else if(path=="/disconnect-account"&&mth=="POST"){
                    if((GetJV(body,"secret")??"")!=SECRET){code=403;resp="{\"error\":\"Unauthorized\"}";}
                    else{ulong lg=ulong.Parse(GetJV(body,"login")??"0");resp="{\"disconnected\":true,\"login\":"+lg+"}";}
                } else if(path=="/close-all"&&mth=="POST"){
                    string ls=GetJV(body,"login")??(qs.ContainsKey("login")?qs["login"]:"");
                    if(string.IsNullOrEmpty(ls)){code=400;resp="{\"error\":\"login required\"}";}
                    else resp=CloseAll(ulong.Parse(ls));
                } else if(path=="/create-account"&&mth=="POST"){
                    if((GetJV(body,"secret")??"")!=SECRET){code=403;resp="{\"error\":\"Unauthorized\"}";}
                    else{string name=GetJV(body,"name")??"MFT Trader",grp=GetJV(body,"group")??DEFAULT_GROUP;
                    double bal=1000;try{bal=double.Parse(GetNum(body,"balance"));}catch{}
                    int lev=100;try{lev=int.Parse(GetNum(body,"leverage"));}catch{}
                    resp=CreateAccount(name,grp,bal,lev);if(resp.Contains("\"error\""))code=500;}
                } else if(path=="/enable-trading"&&mth=="POST"){
                    if((GetJV(body,"secret")??"")!=SECRET){code=403;resp="{\"error\":\"Unauthorized\"}";}
                    else{ulong lg=ulong.Parse(GetJV(body,"login")??"0");bool ok=SetTrading(lg,true);resp="{\"success\":"+(ok?"true":"false")+",\"login\":"+lg+"}";}
                } else if(path=="/disable-trading"&&mth=="POST"){
                    if((GetJV(body,"secret")??"")!=SECRET){code=403;resp="{\"error\":\"Unauthorized\"}";}
                    else{ulong lg=ulong.Parse(GetJV(body,"login")??"0");bool ok=SetTrading(lg,false);resp="{\"success\":"+(ok?"true":"false")+",\"login\":"+lg+"}";}
                } else if(path=="/enable-battle"&&mth=="POST"){
                    if((GetJV(body,"secret")??"")!=SECRET){code=403;resp="{\"error\":\"Unauthorized\"}";}
                    else{string arr=GetJVArr(body,"logins")??"";var sb2=new StringBuilder();sb2.Append("[");int en2=0,tot=0;bool fl=true;
                    foreach(var p in arr.Split(',')){string ls3=p.Trim().Trim('"');if(string.IsNullOrEmpty(ls3)||!ulong.TryParse(ls3,out ulong lg3))continue;tot++;bool ok=SetTrading(lg3,true);if(ok)en2++;if(!fl)sb2.Append(",");fl=false;sb2.Append("{\"login\":"+lg3+",\"enabled\":"+(ok?"true":"false")+"}");}
                    sb2.Append("]");resp="{\"success\":true,\"enabled\":"+en2+",\"total\":"+tot+",\"results\":"+sb2+"}";}
                } else if(path=="/deposit"&&mth=="POST"){
                    if((GetJV(body,"secret")??"")!=SECRET){code=403;resp="{\"error\":\"Unauthorized\"}";}
                    else{ulong lg=ulong.Parse(GetJV(body,"login")??"0");double amt=0;try{amt=double.Parse(GetNum(body,"amount"));}catch{}
                    string cmt=GetJV(body,"comment")??"MFT Deposit";bool ok=Deposit(lg,amt,cmt);resp="{\"success\":"+(ok?"true":"false")+",\"login\":"+lg+",\"amount\":"+amt+"}";}
                } else{code=404;resp="{\"error\":\"not found\",\"path\":\""+Esc(path)+"\"}";}
            }catch(Exception ex){code=500;resp="{\"error\":\""+Esc(ex.Message)+"\"}";Console.WriteLine("[ERR] "+path+": "+ex.Message);}
            Send(c,s,code,resp);
        }catch(Exception e){Console.WriteLine("[TCP] "+e.Message);}finally{try{c.Close();}catch{}}
    }

    // UserAccountGet(UInt64 login, CIMTAccount obj) ✅ confirmed
    // UserCreate() → CIMTUser ✅ confirmed
    // UserCreateAccount() → CIMTAccount ✅ confirmed  
    // UserGet(UInt64 login, CIMTUser obj) ✅ confirmed
    static string GetAccount(ulong login) {
        lock(_lock){ if(!_connected||_mgr==null)return null;
            try{
                var user=_mgr.UserCreate(); if(user==null)return null;
                if(_mgr.UserGet(login,user)!=MTRetCode.MT_RET_OK){user.Dispose();return null;}
                var acc=_mgr.UserCreateAccount(); if(acc==null){user.Dispose();return null;}
                _mgr.UserAccountGet(login,acc);
                // CIMTAccount has: Balance(), Equity(), Margin(), MarginFree()
                // Currency() is NOT on CIMTAccount — use group currency or default USD
                string r="{\"login\":"+login+
                    ",\"name\":\""+Esc(user.Name())+
                    "\",\"balance\":"+acc.Balance().ToString("F2")+
                    ",\"equity\":"+acc.Equity().ToString("F2")+
                    ",\"margin\":"+acc.Margin().ToString("F2")+
                    ",\"free_margin\":"+acc.MarginFree().ToString("F2")+
                    ",\"leverage\":"+user.Leverage()+
                    ",\"group\":\""+Esc(user.Group())+
                    "\",\"currency\":\"USD\"}";
                user.Dispose();acc.Dispose();return r;
            }catch(Exception ex){Console.WriteLine("[GetAccount] "+ex.Message);return null;}}
    }

    // PositionGet(UInt64 login, CIMTPositionArray positions) ✅ confirmed
    // CIMTPosition.EnPositionAction: POSITION_BUY=0, POSITION_SELL=1 ✅ confirmed
    // p.Action() returns uint — compare with (uint) cast
    static string GetOpenTrades(ulong login) {
        lock(_lock){ if(!_connected||_mgr==null)return"[]";
            try{
                var arr=_mgr.PositionCreateArray(); if(arr==null)return"[]";
                _mgr.PositionGet(login,arr);
                var sb=new StringBuilder();sb.Append("[");bool first=true;
                for(uint i=0;i<arr.Total();i++){
                    var p=arr.Next(i);if(p==null)continue;
                    if(!first)sb.Append(",");first=false;
                    // p.Action() returns uint, POSITION_BUY=0
                    string side=p.Action()==0?"Buy":"Sell";
                    sb.Append("{\"ticket\":"+p.Position()+
                        ",\"symbol\":\""+Esc(p.Symbol())+
                        "\",\"type\":\""+side+
                        "\",\"lots\":"+((double)p.Volume()/10000.0).ToString("F2")+
                        ",\"open_price\":"+p.PriceOpen().ToString("F5")+
                        ",\"close_price\":"+p.PriceCurrent().ToString("F5")+
                        ",\"profit\":"+p.Profit().ToString("F2")+
                        ",\"open_time\":\""+DateTimeOffset.FromUnixTimeSeconds((long)p.TimeCreate()).DateTime.ToString("yyyy-MM-dd HH:mm:ss")+
                        "\",\"account\":"+login+"}");
                }
                sb.Append("]");arr.Dispose();return sb.ToString();
            }catch(Exception ex){Console.WriteLine("[OpenTrades] "+ex.Message);return"[]";}}
    }

    // DealRequest(UInt64 login, Int64 from, Int64 to, CIMTDealArray deals) ✅ confirmed
    // CIMTDeal.EnDealAction: DEAL_BUY=0,DEAL_SELL=1,DEAL_BALANCE=2,DEAL_CREDIT=3 ✅ confirmed
    // d.Action() returns uint
    static string GetHistory(ulong login,int days) {
        lock(_lock){ if(!_connected||_mgr==null)return"[]";
            try{
                long from=DateTimeOffset.UtcNow.AddDays(-days).ToUnixTimeSeconds();
                long to=DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                var arr=_mgr.DealCreateArray(); if(arr==null)return"[]";
                _mgr.DealRequest(login,from,to,arr);
                var sb=new StringBuilder();sb.Append("[");bool first=true;
                for(uint i=0;i<arr.Total();i++){
                    var d=arr.Next(i);if(d==null)continue;
                    if(!first)sb.Append(",");first=false;
                    uint act=d.Action();
                    string t=act==0?"Buy":act==1?"Sell":act==2?"Balance":act==3?"Credit":"Other";
                    sb.Append("{\"ticket\":"+d.Deal()+
                        ",\"symbol\":\""+Esc(d.Symbol())+
                        "\",\"type\":\""+t+
                        "\",\"lots\":"+((double)d.Volume()/10000.0).ToString("F2")+
                        ",\"open_price\":"+d.Price().ToString("F5")+
                        ",\"profit\":"+d.Profit().ToString("F2")+
                        ",\"open_time\":\""+DateTimeOffset.FromUnixTimeSeconds(d.Time()).DateTime.ToString("yyyy-MM-dd HH:mm:ss")+
                        "\",\"comment\":\""+Esc(d.Comment())+
                        "\",\"account\":"+login+"}");
                }
                sb.Append("]");arr.Dispose();return sb.ToString();
            }catch(Exception ex){Console.WriteLine("[History] "+ex.Message);return"[]";}}
    }

    // DealerSend(CIMTRequest request, CIMTDealerSink sink, UInt32& id) ✅ confirmed — 'out' keyword
    // CIMTRequest.EnTradeActions: TA_CLOSE_BY=10, TA_DEALER_POS_EXECUTE=200 ✅ confirmed
    // CIMTOrder.EnOrderType: OP_BUY=0, OP_SELL=1 ✅ confirmed
    static string CloseAll(ulong login) {
        lock(_lock){ if(!_connected||_mgr==null)return"{\"error\":\"not connected\",\"closed\":0}";
            try{
                var positions=_mgr.PositionCreateArray();if(positions==null)return"{\"closed\":0}";
                _mgr.PositionGet(login,positions);
                uint total=positions.Total();
                if(total==0){positions.Dispose();return"{\"closed\":0,\"message\":\"No open positions\"}";}
                int closed=0,failed=0;
                for(uint i=0;i<total;i++){
                    var pos=positions.Next(i);if(pos==null)continue;
                    try{
                        var req=_mgr.RequestCreate();if(req==null){failed++;continue;}
                        // TA_DEALER_POS_EXECUTE=200 for force close by dealer
                        req.Action(CIMTRequest.EnTradeActions.TA_DEALER_POS_EXECUTE);
                        req.Login(login);
                        req.Symbol(pos.Symbol());
                        req.Volume(pos.Volume());
                        req.Position(pos.Position());
                        // Reverse: pos.Action()==0(BUY) → sell(1), pos.Action()==1(SELL) → buy(0)
                        req.Type(pos.Action()==0
                            ? CIMTOrder.EnOrderType.OP_SELL
                            : CIMTOrder.EnOrderType.OP_BUY);
                        req.Comment("MFT Battle End - Force Close");
                        // DealerSend signature: (CIMTRequest, CIMTDealerSink, out UInt32)
                        uint reqId=0;
                        MTRetCode ret=_mgr.DealerSend(req,null,out reqId);
                        if(ret==MTRetCode.MT_RET_OK||ret==MTRetCode.MT_RET_REQUEST_DONE)closed++;else failed++;
                        req.Dispose();
                    }catch{failed++;}
                }
                positions.Dispose();
                Console.WriteLine("[CloseAll] login="+login+" closed="+closed+"/"+total);
                return"{\"closed\":"+closed+",\"failed\":"+failed+",\"total\":"+total+",\"login\":"+login+"}";
            }catch(Exception ex){Console.WriteLine("[CloseAll] "+ex.Message);return"{\"error\":\""+Esc(ex.Message)+"\",\"closed\":0}";}}
    }

    // UserAdd(CIMTUser user, string master_pass, string investor_pass) ✅ confirmed
    // DealerBalance(UInt64 login, Double value, UInt32 type, String comment, UInt64& deal_id) ✅ confirmed — 'out'
    // USER_RIGHT_TRADE_DISABLED=4 ✅ confirmed — to disable trading SET this bit
    // USER_RIGHT_ENABLED=1 ✅ confirmed — account must be enabled
    static string CreateAccount(string name,string group,double balance,int leverage) {
        lock(_lock){ if(!_connected||_mgr==null)return"{\"error\":\"Manager not connected\"}";
            try{
                var user=_mgr.UserCreate();if(user==null)return"{\"error\":\"UserCreate failed\"}";
                user.Name(name);
                user.Group(group);
                user.Leverage((uint)leverage);
                user.Comment("MFT Battle "+DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm"));
                // Set rights: ENABLED(1) + TRADE_DISABLED(4) = trading locked until battle starts
                // USER_RIGHT_ENABLED=1, USER_RIGHT_TRADE_DISABLED=4
                user.Rights(CIMTUser.EnUsersRights.USER_RIGHT_ENABLED | CIMTUser.EnUsersRights.USER_RIGHT_TRADE_DISABLED);

                string pw=MakePw(); string inv=MakePw();
                MTRetCode ret=_mgr.UserAdd(user,pw,inv);
                if(ret!=MTRetCode.MT_RET_OK){user.Dispose();return"{\"error\":\"UserAdd failed: "+ret+". Check group '"+Esc(group)+"' exists.\"}";}
                ulong nl=user.Login();user.Dispose();

                // DealerBalance(login, value, type=0, comment, out deal_id)
                ulong dealId=0;
                _mgr.DealerBalance(nl,balance,0,"MFT Battle Starting $"+balance.ToString("F0"),out dealId);

                Console.WriteLine("[Create] login="+nl+" name="+name+" LOCKED");
                return"{\"success\":true,\"login\":"+nl+",\"password\":\""+Esc(pw)+"\",\"server\":\""+MGR_SERVER+"\",\"balance\":"+balance+",\"trading_locked\":true}";
            }catch(Exception ex){Console.WriteLine("[Create] "+ex.Message);return"{\"error\":\""+Esc(ex.Message)+"\"}";}
        }
    }

    // UserUpdate(CIMTUser obj) ✅ confirmed
    // To ENABLE trading: remove USER_RIGHT_TRADE_DISABLED(4), keep USER_RIGHT_ENABLED(1)
    // To DISABLE trading: add USER_RIGHT_TRADE_DISABLED(4)
    static bool SetTrading(ulong login,bool enable) {
        lock(_lock){ if(!_connected||_mgr==null)return false;
            try{
                var user=_mgr.UserCreate();if(user==null)return false;
                if(_mgr.UserGet(login,user)!=MTRetCode.MT_RET_OK){user.Dispose();return false;}
                CIMTUser.EnUsersRights rights=user.Rights();
                if(enable)
                    // Remove TRADE_DISABLED flag to enable trading
                    rights=(CIMTUser.EnUsersRights)((uint)rights & ~(uint)CIMTUser.EnUsersRights.USER_RIGHT_TRADE_DISABLED);
                else
                    // Add TRADE_DISABLED flag to lock trading
                    rights=(CIMTUser.EnUsersRights)((uint)rights | (uint)CIMTUser.EnUsersRights.USER_RIGHT_TRADE_DISABLED);
                user.Rights(rights);
                MTRetCode ret=_mgr.UserUpdate(user);user.Dispose();
                Console.WriteLine("[SetTrading] login="+login+" enable="+enable+" ret="+ret);
                return ret==MTRetCode.MT_RET_OK;
            }catch(Exception ex){Console.WriteLine("[SetTrading] "+ex.Message);return false;}}
    }

    // DealerBalance(UInt64 login, Double value, UInt32 type, String comment, UInt64& deal_id) ✅ confirmed
    static bool Deposit(ulong login,double amount,string comment) {
        lock(_lock){ if(!_connected||_mgr==null)return false;
            try{
                ulong dealId=0;
                MTRetCode ret=_mgr.DealerBalance(login,amount,0,comment,out dealId);
                return ret==MTRetCode.MT_RET_OK;
            }catch{return false;}}
    }
    static string GetDashboardHtml() {
        return System.IO.File.Exists("dashboard.html")
            ? System.IO.File.ReadAllText("dashboard.html")
            : "<html><body style='background:#04070f;color:#fff;font-family:monospace;padding:40px'><h2 style='color:#FFD700'>MFT Manager Bridge v2.0</h2><p>Bridge running. Place dashboard.html in the service directory to enable admin UI.</p><p>API: <a style='color:#00ff88' href='/health'>/health</a></p></body></html>";
    }

}
}
