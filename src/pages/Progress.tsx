import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { NumberInput } from "../components/ui/Number";
import { useAuth } from "../hooks/useAuth";
import { addBodyWeight, listBodyWeight, listNutritionRecent, listWorkoutsRecent } from "../services/db";
import { Profile, BodyWeight, NutritionDaily, Workout } from "../types";
import { calorieTarget, proteinTarget } from "../utils/calcs";

export function Progress({ profile }: { profile: Profile | null }) {
  const { user } = useAuth();
  const [weights, setWeights] = useState<BodyWeight[]>([]);
  const [kgtoday, setKgtoday] = useState<number>(Number(profile?.weight_kg || 0));
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0, 10));
  const [recentNutrition, setRecentNutrition] = useState<NutritionDaily[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    if (!user) return;
    listBodyWeight(user.id, 180).then(setWeights);
    listNutritionRecent(user.id, 30).then(setRecentNutrition);
    listWorkoutsRecent(user.id, 30).then(setRecentWorkouts);
  }, [user]);

  async function logWeight() {
    if (!user || !kgtoday) return;
    await addBodyWeight(user.id, dateISO, Number(kgtoday));
    const updated = await listBodyWeight(user.id, 180);
    setWeights(updated);
  }

  const weeklyDelta = useMemo(() => {
    if (weights.length < 2) return 0;
    const latest = weights[weights.length - 1];
    const weekAgo = weights.slice(0, -1).reverse().find(w =>
      (new Date(latest.date).getTime() - new Date(w.date).getTime()) >= 7 * 86400000
    ) || weights[0];
    return Number((latest.kg - weekAgo.kg).toFixed(2));
  }, [weights]);

  const targetKg = Number(profile?.weight_kg || 0) && profile?.goal === "fatLoss"
    ? Math.max(0, Number(profile!.weight_kg) - 5)
    : null;

  const etaWeeks = useMemo(() => {
    if (!targetKg || weights.length < 2) return null;
    const latest = weights[weights.length - 1].kg;
    const diff = latest - targetKg;
    const weekly = Math.abs(weeklyDelta);
    if (!weekly) return null;
    return Math.ceil(diff / weekly);
  }, [weeklyDelta, weights, targetKg]);

  const avgCals = recentNutrition.length
    ? Math.round(recentNutrition.reduce((s, r) => s + r.calories, 0) / recentNutrition.length)
    : 0;
  const avgProt = recentNutrition.length
    ? Math.round(recentNutrition.reduce((s, r) => s + (r.protein || 0), 0) / recentNutrition.length)
    : 0;
  const workoutsThisWeek = recentWorkouts.filter(w => (Date.now() - new Date(w.date).getTime()) <= 7 * 86400000).length;

  const recs: string[] = [];
  if (profile) {
    const cT = calorieTarget(profile);
    const pT = proteinTarget(profile);
    if (avgCals && Math.abs(avgCals - cT) > 200) {
      recs.push(`${avgCals > cT ? "Trim" : "Add"} ~${Math.abs(avgCals - cT)} kcal to align with target (${cT}).`);
    }
    if (avgProt && (pT - avgProt) > 20) {
      recs.push(`Increase protein by ~${pT - avgProt} g/day to hit ${pT} g.`);
    }
  }
  if (workoutsThisWeek < 3) recs.push("Aim for ≥3 sessions this week. Consider a 30–40 min full-body if busy.");
  if (weights.length >= 2 && weeklyDelta >= 0 && (profile?.goal === "fatLoss")) {
    recs.push("Weight plateau/upswing detected — review calories or add +15–20 min LISS on 2 days.");
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card title="Log Body Weight">
        <div className="grid grid-cols-3 gap-3">
          <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className="rounded-xl border px-3 py-2 shadow-sm col-span-2" />
          <NumberInput label="kg" value={kgtoday} onChange={setKgtoday} />
        </div>
        <div className="mt-3">
          <button className="rounded-xl bg-black text-white px-4 py-2" onClick={logWeight}>Save</button>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          {weeklyDelta ? `~${weeklyDelta > 0 ? "+" : ""}${weeklyDelta} kg over ~1 week.` : "Add a few entries to see trend."}
          {etaWeeks ? <div>ETA to target: ~{etaWeeks} weeks (rough).</div> : null}
        </div>
      </Card>

      <Card title="Recent Overview">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-gray-100 p-3">
            <div className="text-xs text-gray-500">Avg kcal (30d)</div>
            <div className="font-semibold">{avgCals ? `${avgCals} kcal` : "-"}</div>
          </div>
          <div className="rounded-2xl bg-gray-100 p-3">
            <div className="text-xs text-gray-500">Avg protein (30d)</div>
            <div className="font-semibold">{avgProt ? `${avgProt} g` : "-"}</div>
          </div>
          <div className="rounded-2xl bg-gray-100 p-3">
            <div className="text-xs text-gray-500">Workouts (7d)</div>
            <div className="font-semibold">{workoutsThisWeek}</div>
          </div>
          <div className="rounded-2xl bg-gray-100 p-3">
            <div className="text-xs text-gray-500">Weight logs</div>
            <div className="font-semibold">{weights.length}</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-600">
          Tip: Consistency beats perfection. Small daily wins compound.
        </div>
      </Card>

      <Card title="Recommendations">
        {recs.length ? (
          <ul className="list-disc list-inside text-sm space-y-1">
            {recs.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        ) : (
          <div className="text-sm text-gray-600">Log more data to generate personalized suggestions.</div>
        )}
      </Card>
    </div>
  );
}
