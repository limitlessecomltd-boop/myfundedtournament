import { useEffect, useRef, useState } from "react";
import { Entry } from "@/types";

const WS = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";

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
