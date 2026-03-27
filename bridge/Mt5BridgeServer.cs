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
        static MT5API api1; static MT5API api2;
        const ulong LOGIN1=260325865; const string PASS1="uoqcyW3|Eh";
        const ulong LOGIN2=260552450; const string PASS2="h/8f3P4vpT";
        const string HOST="47.91.105.29"; const int MPORT=443; const int HPORT=5099;
        static void Main(string[] a) {
            Console.WriteLine("[MFT] Starting...");
            var t1=new Thread(()=>Conn(LOGIN1,PASS1,"A1",ref api1));
            var t2=new Thread(()=>Conn(LOGIN2,PASS2,"A2",ref api2));
            t1.Start();t2.Start();t1.Join();t2.Join();
            Console.WriteLine("[MFT] Listening on port "+HPORT);
            var srv=new TcpListener(IPAddress.Any,HPORT); srv.Start();
            while(true){var c=srv.AcceptTcpClient();ThreadPool.QueueUserWorkItem(_=>Handle(c));}
        }
        static void Conn(ulong login,string pass,string lbl,ref MT5API api){
            try{api=new MT5API(login,pass,HOST,MPORT);api.Connect();Console.WriteLine("["+lbl+"] OK bal="+api.Account.Balance);}
            catch(Exception e){Console.WriteLine("["+lbl+"] FAIL:"+e.Message);}
        }
        static void Handle(TcpClient c){
            try{
                var s=c.GetStream(); var r=new StreamReader(s,Encoding.UTF8);
                var req=r.ReadLine(); string l; while(!string.IsNullOrEmpty(l=r.ReadLine())){}
                if(string.IsNullOrEmpty(req)){c.Close();return;}
                var pts=req.Split(' '); if(pts.Length<2){c.Close();return;}
                var full=pts[1]; var qi=full.IndexOf('?');
                var path=qi>=0?full.Substring(0,qi):full; var qstr=qi>=0?full.Substring(qi+1):"";
                path=path.TrimEnd('/');
                var qs=new Dictionary<string,string>();
                foreach(var kv in qstr.Split('&')){var x=kv.Split('=');if(x.Length==2)qs[x[0]]=Uri.UnescapeDataString(x[1]);}
                string body=""; int code=200;
                try{
                    if(path=="/health"){
                        string b1="null",b2="null";
                        try{b1=api1.Account.Balance.ToString();}catch{}
                        try{b2=api2.Account.Balance.ToString();}catch{}
                        body="{"status":"ok","a1":{"login":"+LOGIN1+","connected":"+(api1!=null?"true":"false")+","balance":"+b1+"},"a2":{"login":"+LOGIN2+","connected":"+(api2!=null?"true":"false")+","balance":"+b2+"}}";
                    } else if(path=="/account"){
                        ulong lg=ulong.Parse(qs["login"]); var api=lg==LOGIN1?api1:api2;
                        if(api==null){code=500;body="{"error":"not connected"}";}
                        else{int w=0;while(api.Account==null&&w<10000){Thread.Sleep(200);w+=200;}
                        body="{"login":"+api.Account.Login+","balance":"+api.Account.Balance+","equity":"+api.AccountEquity+","profit":"+Math.Round(api.AccountProfit,2)+","currency":""+api.AccountCurrency+""}";}
                    } else if(path=="/trades/open"){
                        ulong lg=ulong.Parse(qs["login"]); var api=lg==LOGIN1?api1:api2;
                        if(api==null){code=500;body="{"error":"not connected"}";}
                        else{var orders=api.GetOpenedOrders(); var sb=new StringBuilder(); sb.Append("[");
                        for(int i=0;i<orders.Length;i++){var o=orders[i];if(i>0)sb.Append(",");
                        sb.Append("{"ticket":"+o.Ticket+","symbol":""+o.Symbol+"","type":""+o.OrderType+"","lots":"+o.Lots+","profit":"+Math.Round(o.Profit,2)+","account":"+lg+"}");}
                        sb.Append("]");body=sb.ToString();}
                    } else {code=404;body="{"error":"not found"}";}
                }catch(Exception ex){code=500;body="{"error":""+ex.Message.Replace(""","'")+""}";Console.WriteLine("[ERR]"+ex.Message);}
                var bb=Encoding.UTF8.GetBytes(body);
                var hdr="HTTP/1.1 "+code+" OK
Content-Type: application/json
Access-Control-Allow-Origin: *
Content-Length: "+bb.Length+"
Connection: close

";
                var hb=Encoding.UTF8.GetBytes(hdr); s.Write(hb,0,hb.Length); s.Write(bb,0,bb.Length); s.Flush();
            }catch(Exception e){Console.WriteLine("[TCP]"+e.Message);}finally{c.Close();}
        }
    }
}