import { useEffect, useRef, useState } from "react";
import { Entry } from "@/types";

const WS = process.env.NEXT_PUBLIC_WS_URL || "wss://myfundedtournament-production.up.railway.app";

export function useLeaderboardSocket(tournamentId: string, onUpdate: (data: any[]) => void) {
  const ws = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (!tournamentId) return;
    const socket = new WebSocket(`${WS}/ws`);
    ws.current = socket;
    socket.onopen = () => socket.send(JSON.stringify({ type: "subscribe_leaderboard", tournamentId }));
    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "leaderboard") onUpdate(msg.data);
      } catch {}
    };
    return () => socket.close();
  }, [tournamentId]);
}

export function useEntrySocket(entryId: string): Entry | null {
  const [entry, setEntry] = useState<Entry | null>(null);
  const ws = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (!entryId) return;
    const socket = new WebSocket(`${WS}/ws`);
    ws.current = socket;
    socket.onopen = () => socket.send(JSON.stringify({ type: "subscribe_entry", entryId }));
    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "entry_update") setEntry(msg.data);
      } catch {}
    };
    return () => socket.close();
  }, [entryId]);
  return entry;
}

export function usePaymentSocket(paymentId: string | null, onConfirmed: () => void) {
  useEffect(() => {
    if (!paymentId) return;
    const socket = new WebSocket(`${WS}/ws`);
    socket.onopen = () => socket.send(JSON.stringify({ type: "subscribe_payment", paymentId }));
    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "payment_status" && (msg.status === "confirmed" || msg.status === "finished")) {
          onConfirmed();
        }
      } catch {}
    };
    return () => socket.close();
  }, [paymentId]);
}

// ── Battle Live Chat Hook ─────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  msg_type: "message" | "system" | "taunt";
  created_at: string;
}

export function useBattleChat(tournamentId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!tournamentId) return;
    const socket = new WebSocket(`${WS}/ws`);
    ws.current = socket;
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "subscribe_chat", tournamentId }));
    };
    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "chat_message" && msg.tournamentId === tournamentId) {
          setMessages(prev => [...prev.slice(-99), msg.data]);
        }
      } catch {}
    };
    return () => socket.close();
  }, [tournamentId]);

  return { messages, setMessages };
}
