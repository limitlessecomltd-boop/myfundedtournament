with open('C:/mft-bridge/mt5csharp/Mt5BridgeServer.cs', 'r', encoding='utf-8') as f:
    code = f.read()
old = '                    else{ code=404; body="{\\"error\\":\\"not found\\"}";}'
new_block = '''                    else if(path=="/create-demo-account"){
                        string nm=GetJV(reqBody,"name")??"MFT Trader";
                        string em=GetJV(reqBody,"email")??""
                        string ph=GetJV(reqBody,"phone")??"0000000000";
                        string sc=GetJV(reqBody,"secret")??""
                        if(sc!="mft_bridge_secret_2024"){code=403;body="{\\"error\\":\\"Unauthorized\\"}";
                        }else{try{var d=new DemoRequest{Name=nm,Email=em,Phone=ph,Deposit=1000.0,Leverage=100,Country=\"US\",Address=\"\",City=\"\",State=\"\",ZipCode=\"\"};var r=api1.CreateDemoAccount(d);if(r!=null&&r.Login>0){body="{\\"success\\":true,\\"login\\":"+r.Login+",\\"password\\":\\""+Esc(r.Password)+"\\",\\"server\\":\\""+Esc(r.Server)+"\\",\\"balance\\":1000}";Console.WriteLine(\"[Demo] \"+r.Login);}else{code=500;body="{\\"error\\":\\"null result\\"}";}
                        }catch(Exception ex){code=500;body="{\\"error\\":\\""+Esc(ex.Message)+"\\"}";}}
                    }
                    else{ code=404; body="{\\"error\\":\\"not found\\"}";}'
if old in code:
    code = code.replace(old, new_block, 1)
    print('Injected OK')
else:
    print('FAIL - marker not found')
    import sys; sys.exit(1)
with open('C:/mft-bridge/mt5csharp/Mt5BridgeServer.cs', 'w', encoding='utf-8') as f:
    f.write(code)
print('File written')