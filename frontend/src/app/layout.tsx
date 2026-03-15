"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>MyFundedTournament — Compete Demo. Win Real Funding.</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="Enter MT5 demo trading tournaments. Winner gets a real funded account with 90% profit split." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Navbar />
            <main style={{ minHeight: "calc(100vh - 60px)" }}>{children}</main>
            <Footer />
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
