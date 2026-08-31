"use client";
// app/(staff)/representatives/page.jsx
//
// Representative selection is scoped to the acting Marshal/Counsellor's own
// house — they only see/select Teens assigned to that house. Admins keep the
// full, unscoped house picker so they can manage any house. The house scope
// is also enforced server-side (see
// supabase/migrations/0013_house_scoped_representatives.sql), this is not
// just a UI restriction.
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useConfig from "@/hooks/useConfig";
import useRegistrations from "@/hooks/useRegistrations";
import Button from "@/components/ui/Button";
import { canManageEvents, canSelectRepresentatives } from "@/utils/config";

export default function RepresentativesPage() {
  const supabase = createClient();
  const { currentUser, userRole } = useAuth();
  const { config } = useConfig();
  const { registrations } = useRegistrations();
  const isAdmin = canManageEvents(userRole);
  const [sports, setSports] = useState([]);
  const [selected, setSelected] = useState([]);
  const [sportId, setSportId] = useState("");
  const [houseKey, setHouseKey] = useState("");
  const [ownHouse, setOwnHouse] = useState(undefined); // undefined = loading, null = none found
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

  // Resolve the acting Marshal/Counsellor's own house from their staff
  // registration (admins skip this — they get the full house picker).
  useEffect(() => {
    if (isAdmin || !currentUser) { setOwnHouse(null); return; }
    let active = true;
    supabase.from("staff_registrations").select("houseKey, house, color")
      .eq("auth_user_id", currentUser.uid).not("houseKey", "is", null)
      .order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        if (!active) return;
        const row = data?.[0];
        setOwnHouse(row ? { key: row.houseKey, name: row.house, color: row.color } : null);
      });
    return () => { active = false; };
  }, [isAdmin, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock the house filter to the caller's own house once resolved.
  useEffect(() => {
    if (!isAdmin && ownHouse) setHouseKey(ownHouse.key);
  }, [isAdmin, ownHouse]);

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
  const selectedForSport = useMemo(
    () => selected.filter((r) => r.sportId === sportId && (isAdmin || r.houseKey === houseKey)),
    [selected, sportId, isAdmin, houseKey]
  );
  const add = async (person) => {
    setError("");
    const { error: e } = await supabase.from("event_representatives").insert({
      sportId, personId: person.id, houseKey: person.houseKey,
      edition: config.currentEdition, selectedBy: currentUser.uid,
    });
    if (e) setError(e.message); else load();
  };
  const remove = async (id) => { await supabase.from("event_representatives").delete().eq("id", id); load(); };

  if (!canSelectRepresentatives(userRole)) return <p className="p-8 text-center">Only Marshals, Counsellors, Staff, and Admins can select house representatives.</p>;
  if (!isAdmin && ownHouse === undefined) return <p className="p-8 text-center text-gray-500">Loading your house…</p>;
  if (!isAdmin && ownHouse === null) return <p className="p-8 text-center text-gray-500">Your staff registration isn&apos;t linked to a house yet, so representative selection isn&apos;t available. Contact an admin if this seems wrong.</p>;

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-8 px-3 sm:px-4 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">House Representatives</h1>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
          {isAdmin ? "Select the eligible pool before an event begins." : <>Select the eligible pool for <span className="font-semibold" style={{ color: ownHouse.color }}>{ownHouse.name}</span> before an event begins.</>}
        </p>
      </div>
      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl shadow">
        <select className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm sm:text-base" value={sportId} onChange={e => setSportId(e.target.value)}>
          <option value="">Select event</option>
          {sportGroups.map(group => (
            <optgroup key={group.name} label={group.name}>
              {group.items.map(s => <option key={s.id} value={s.id}>{s.name} · {s.category} · {s.ageCategory || "Open"}</option>)}
            </optgroup>
          ))}
        </select>
        {isAdmin ? (
          <select className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm sm:text-base" value={houseKey} onChange={e => setHouseKey(e.target.value)}>
            <option value="">All houses</option>
            {[...new Map(registrations.filter(p => p.houseKey).map(p => [p.houseKey, p.house])).entries()].map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
        ) : (
          <div className="p-3 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center flex-wrap gap-1 text-sm sm:text-base">
            Your house: <span className="font-semibold" style={{ color: ownHouse.color }}>{ownHouse.name}</span>
          </div>
        )}
      </div>
      {sportId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section>
            <h2 className="font-semibold mb-2 text-gray-900 dark:text-white">Eligible participants</h2>
            <div className="space-y-2">
              {candidates.map(p => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <span className="min-w-0 break-words text-sm sm:text-base text-gray-900 dark:text-white">{p.name} · {p.age} · {p.house}</span>
                  <Button size="sm" onClick={() => add(p)} className="shrink-0">Select</Button>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="font-semibold mb-2 text-gray-900 dark:text-white">Selected representatives</h2>
            <div className="space-y-2">
              {selectedForSport.map(r => {
                const p = registrations.find(p => p.id === r.personId);
                return (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <span className="min-w-0 break-words text-sm sm:text-base text-gray-900 dark:text-white">{p?.name || "Participant"} · {p?.house}</span>
                    <button className="shrink-0 text-red-600 dark:text-red-400 hover:text-red-800 text-sm font-medium" onClick={() => remove(r.id)}>Remove</button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
