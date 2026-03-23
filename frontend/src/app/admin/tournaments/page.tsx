"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

export default function AdminTournaments() {
  const [tours,   setTours]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState<string|null>(null);
  const [newName, setNewName] = useState("");
  const [confirm, setConfirm] = useState<{id:string,action:string}|null>(null);
  const [msg, setMsg] = useState("");

  const load = () => {
    setLoading(true);
    fetch("https://myfundedtournament-production.up.railway.app/api/admin/tournaments",{
      headers:{Authorization:"Bearer "+localStorage.getItem("fc_token")}
    }).then(r=>r.json())
      .then(d=>{ setTours(d.data||[]); })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(()=>setMsg(""),3000); };

  async function doAction(id: string, action: string) {
    const T = localStorage.getItem("fc_token");
    const API = "https://myfundedtournament-production.up.railway.app";
    const h = {Authorization:"Bearer "+T,"Content-Type":"application/json"};
    if (action === "force-start") {
      await fetch(`${API}/api/admin/tournaments/${id}/force-start`,{method:"POST",headers:h});
      flash("✅ Battle force-started!");
    } else if (action === "force-end") {
      await fetch(`${API}/api/admin/tournaments/${id}/force-end`,{method:"POST",headers:h});
      flash("✅ Battle force-ended!");
    } else if (action === "delete") {
      await fetch(`${API}/api/admin/tournaments/${id}`,{method:"DELETE",headers:h});
      flash("✅ Battle deleted.");
    }
    setConfirm(null);
    load();
  }

  async function doRename(id: string) {
    const T = localStorage.getItem("fc_token");
    await fetch("https://myfundedtournament-production.up.railway.app/api/admin/tournaments/"+id+"/rename",{
	  method:"PATCH", headers:{Authorization:"Bearer "+T,"Content-Type":"application/json"},
    body: JSON.stringify({name:newName})
  });
    setRenaming(null); setNewName(""); flash("✅ Renamed!"); load();
  }

  const live  = tours.filter(t => ["registration","active"].includes(t.status));
  const past  = tours.filter(t => ["ended","cancelled"].includes(t.status));

  const statusColor: Record<string,string> = {
    registration:"#FFD0�0 