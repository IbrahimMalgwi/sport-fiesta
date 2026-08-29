"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useConfig from "@/hooks/useConfig";
import useRegistrations from "@/hooks/useRegistrations";
import Button from "@/components/ui/Button";
import { canMarshalEvents } from "@/utils/config";

export default function RepresentativesPage() {
  const supabase = createClient();
  const { currentUser, userRole } = useAuth();
  const { config } = useConfig();
  const { registrations } = useRegistrations();
  const [sports, setSports] = useState([]);
  const [selected, setSelected] = useState([]);
  const [sportId, setSportId] = useState("");
  const [houseKey, setHouseKey] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("sports").select("*"),
      supabase.from("event_representatives").select("*").eq("edition", config.currentEdition),
    ]);
    const rows = (s || []).slice().sort((a, b) => {
      const orderDiff = (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity);
      return orderDiff !== 0 ? orderDiff : (a.name || "").localeCompare(b.name || "");
    });
    setSports(rows); setSelected(r || []);
  };
  useEffect(() => { load(); }, [config.currentEdition]); // eslint-disable-line react-hooks/exhaustive-deps
  const sport = sports.find((s) => s.id === sportId);
  const sportGroups = useMemo(() => {
    const groups = [];
    for (const s of sports) {
      const groupName = s.eventGroup || "Other";
      let group = groups.find((g) => g.name === groupName);
      if (!group) { group = { name: groupName, items: [] }; groups.push(group); }
      group.items.push(s);
    }
    return groups;
  }, [sports]);
  const candidates = useMemo(() => registrations.filter((p) => {
    if (!p.assigned || !p.houseKey || (houseKey && p.houseKey !== houseKey)) return false;
    if (sport?.category !== "Mixed" && p.sex !== sport?.category) return false;
    if (sport?.minAge != null && Number(p.age) < sport.minAge) return false;
    if (sport?.maxAge != null && Number(p.age) > sport.maxAge) return false;
    return !selected.some((r) => r.sportId === sportId && r.personId === p.id);
  }), [registrations, houseKey, sport, sportId, selected]);
  const add = async (person) => {
    setError("");
    const { error: e } = await supabase.from("event_representatives").insert({
      sportId, personId: person.id, houseKey: person.houseKey,
      edition: config.currentEdition, selectedBy: currentUser.uid,
    });
    if (e) setError(e.message); else load();
  };
  const remove = async (id) => { await supabase.from("event_representatives").delete().eq("id", id); load(); };
  if (!canMarshalEvents(userRole)) return <p className="p-8 text-center">Only Marshals can select house representatives.</p>;
  return <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
    <div><h1 className="text-3xl font-bold dark:text-white">House Representatives</h1><p className="text-gray-500">Select the eligible pool before an event begins.</p></div>
    {error && <p className="text-red-600">{error}</p>}
    <div className="grid sm:grid-cols-2 gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow">
      <select className="p-3 rounded-lg border dark:bg-gray-700" value={sportId} onChange={e => setSportId(e.target.value)}><option value="">Select event</option>{sportGroups.map(group => <optgroup key={group.name} label={group.name}>{group.items.map(s => <option key={s.id} value={s.id}>{s.name} · {s.category} · {s.ageCategory || "Open"}</option>)}</optgroup>)}</select>
      <select className="p-3 rounded-lg border dark:bg-gray-700" value={houseKey} onChange={e => setHouseKey(e.target.value)}><option value="">All houses</option>{[...new Map(registrations.filter(p=>p.houseKey).map(p=>[p.houseKey,p.house])).entries()].map(([k,n])=><option key={k} value={k}>{n}</option>)}</select>
    </div>
    {sportId && <div className="grid md:grid-cols-2 gap-6"><section><h2 className="font-semibold mb-2 dark:text-white">Eligible participants</h2>{candidates.map(p=><div key={p.id} className="flex justify-between items-center p-3 mb-2 bg-white dark:bg-gray-800 rounded-lg"><span>{p.name} · {p.age} · {p.house}</span><Button onClick={()=>add(p)}>Select</Button></div>)}</section><section><h2 className="font-semibold mb-2 dark:text-white">Selected representatives</h2>{selected.filter(r=>r.sportId===sportId).map(r=>{const p=registrations.find(p=>p.id===r.personId);return <div key={r.id} className="flex justify-between items-center p-3 mb-2 bg-white dark:bg-gray-800 rounded-lg"><span>{p?.name || "Participant"} · {p?.house}</span><button className="text-red-600" onClick={()=>remove(r.id)}>Remove</button></div>})}</section></div>}
  </div>;
}
