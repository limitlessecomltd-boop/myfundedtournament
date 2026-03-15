"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { format } from "date-fns";

const TIERS = ["starter","pro","elite"];
const STATUSES = ["upcoming","registration","active","ended","cancelled"];

const defaultForm = {
  name: "", tier: "starter", entryFee: "10", maxEntries: "200",
  registrationOpen: "", startTime: "", endTime: ""
};

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [editStatus, setEditStatus] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    adminApi.getTournaments().then(setTournaments).catch(console.error);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setCreating(true);
    try {
      await adminApi.createTournament({
        name: form.name, tier: form.tier,
        entryFee: parseFloat(form.entryFee),
        maxEntries: parseInt(form.maxEntries),
        registrationOpen: form.registrationOpen,
        startTime: form.startTime,
        endTime: form.endTime,
      });
      setForm(defaultForm);
      setShowCreate(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create");
    } finally { setCreating(false); }
  }

  async function updateStatus(id: string, status: string) {
    try { await adminApi.updateTournament(id, { status }); await load(); }
    catch (err: any) { alert(err?.response?.data?.error || "Failed"); }
  }

  const tierColor: Record<string, string> = { starter: "badge-blue", pro: "badge-amber", elite: "badge-green" };
  const statusColor: Record<string, string> = { active: "badge-green", registration: "badge-blue", upcoming: "badge-gray", ended: "badge-gray", cancelled: "badge-red" };

  return (
    <AdminLayout title="Tournaments">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <button onClick={() => setShowCreate(s => !s)} className="btn btn-primary">
          {showCreate ? "Cancel" : "+ Create Tournament"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card" style={{ marginBottom: 28, borderColor: "var(--green)" }}>
          <h3 style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>New Tournament</h3>
          <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 6, display: "block" }}>Tournament Name</label>
              <input className="input" placeholder="e.g. December Pro Challenge" value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 6, display: "block" }}>Tier</label>
              <select className="input" value={form.tier} onChange={e => setForm(f => ({...f, tier: e.target.value}))}>
                {TIERS.map(t => <option key={t} value={t} style={{ textTransform: "capitalize" }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 6, display: "block" }}>Entry Fee (USDT)</label>
              <input className="input" type="number" min="1" step="0.01" value={form.entryFee}
                onChange={e => setForm(f => ({...f, entryFee: e.target.value}))} required />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 6, display: "block" }}>Max Entries</label>
              <input className="input" type="number" min="10" value={form.maxEntries}
                onChange={e => setForm(f => ({...f, maxEntries: e.target.value}))} required />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 6, display: "block" }}>Registration Opens</label>
              <input className="input" type="datetime-local" value={form.registrationOpen}
                onChange={e => setForm(f => ({...f, registrationOpen: e.target.value}))} required />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 6, display: "block" }}>Tournament Starts</label>
              <input className="input" type="datetime-local" value={form.startTime}
                onChange={e => setForm(f => ({...f, startTime: e.target.value}))} required />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)", marginBottom: 6, display: "block" }}>Tournament Ends</label>
              <input className="input" type="datetime-local" value={form.endTime}
                onChange={e => setForm(f => ({...f, endTime: e.target.value}))} required />
            </div>

            {error && (
              <div style={{ gridColumn: "1 / -1", background: "var(--red-dim)", border: "1px solid rgba(255,78,106,0.3)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 13, color: "var(--red)" }}>
                {error}
              </div>
            )}

            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10 }}>
              <button type="submit" disabled={creating} className="btn btn-primary">
                {creating ? "Creating..." : "Create Tournament"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Tournaments table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Tier</th>
                <th>Entry Fee</th>
                <th>Prize Pool</th>
                <th>Entries</th>
                <th>Status</th>
                <th>Dates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500, color: "var(--text)" }}>{t.name}</td>
                  <td><span className={`badge ${tierColor[t.tier]}`} style={{ fontSize: 11, textTransform: "capitalize" }}>{t.tier}</span></td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>${t.entry_fee}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--green)" }}>${Number(t.prize_pool).toLocaleString()}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{t.active_entries} / {t.max_entries}</td>
                  <td>
                    <span className={`badge ${statusColor[t.status] || "badge-gray"}`} style={{ fontSize: 11, textTransform: "capitalize" }}>{t.status}</span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
                    <div>{format(new Date(t.start_time), "MMM d")}</div>
                    <div style={{ color: "var(--text3)" }}>→ {format(new Date(t.end_time), "MMM d")}</div>
                  </td>
                  <td>
                    <select
                      className="input" style={{ fontSize: 12, padding: "4px 8px", width: "auto" }}
                      value={editStatus[t.id] || t.status}
                      onChange={e => { setEditStatus(s => ({...s, [t.id]: e.target.value})); updateStatus(t.id, e.target.value); }}>
                      {STATUSES.map(s => <option key={s} value={s} style={{ textTransform: "capitalize" }}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
