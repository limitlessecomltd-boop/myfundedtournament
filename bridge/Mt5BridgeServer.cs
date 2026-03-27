using mtapi.mt5;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace MftBridge
{
    class Program
    {
        static MT5API api1;
        static MT5API api2;

        const ulong  LOGIN1   = 260325865;
        const string PASS1    = "uoqcyW3|Eh";
        const ulong  LOGIN2   = 260552450;
        const string PASS2    = "h/8f3P4vpT";
        const string MT5_HOST = "47.91.105.29";
        const int    MT5_PORT = 443;
        const int    HTTP_PORT = 5099;

        static void Main(string[] args)
        {
            Console.WriteLine("[MFT Bridge] Starting MT5 connections...");

            Thread t1 = new Thread(() => ConnectAccount(LOGIN1, PASS1, "Account1", ref api1));
            Thread t2 = new Thread(() => ConnectAccount(LOGIN2, PASS2, "Account2", ref api2));
            t1.Start(); t2.Start();
            t1.Join();  t2.Join();

            Console.WriteLine("[MFT Bridge] Both done. Starting TCP HTTP server on port " + HTTP_PORT);
            StartTcpServer();
        }

        static void ConnectAccount(ulong login, string password, string label, ref MT5API api)
        {
            try
            {
                api = new MT5API(login, password, MT5_HOST, MT5_PORT);
                api.Connect();
                Console.WriteLine("[" + label + "] Connected. Login=" + login + " Balance=" + api.Account.Balance);
            }
            catch (Exception ex)
            {
                Console.WriteLine("[" + label + "] FAILED: " + ex.Message);
            }
        }

        static void StartTcpServer()
        {
            TcpListener server = new TcpListener(IPAddress.Any, HTTP_PORT);
            server.Start();
            Console.WriteLine("[MFT Bridge] Listening on port " + HTTP_PORT);