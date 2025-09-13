import React, { useEffect, useState, useMemo } from "react";
import { Card } from "../components/ui/Card";
import { NumberInput } from "../components/ui/Number";
import { useAuth } from "../hooks/useAuth";
import { getNutritionForDate, listNutritionRecent, upsertNutrition } from "../services/db";
import { Profile, NutritionDaily } from "../types";
import { calorieTarget, proteinTarget } from "../utils/calcs";

export function Calories({ profile }: { profile: Profile | null }) {
  const { user } = useAuth();
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0, 10));
  const [row, setRow] = useState<NutritionDaily | null>(null);
  const [recent, setRecent] = useState<NutritionDaily[]>([]);

  useEffect(() => {
    if (!user) return;
    getNutritionForDate(user.id, dateISO).then(setRow);
  }, [user, dateISO]);

  useEffect(() => {
    if (!user) return;
    listNutritionRecent(user.id, 30).then(setRecent);
  }, [user, dateISO]);

  async function save() {
    if (!user) return;
    const payload = {
      calories: Number(row?.calories || 0),
      protein: row?.protein != null ? Number(row?.protein) : null,
      carbs: row?.carbs != null ? Number(row?.carbs) : null,
      fats: row?.fats != null ? Number(row?.fats) : null,
    };
    await upsertNutrition(user.id, dateISO, payload);
    const fresh = await getNutritionForDate(user.id, dateISO);
    setRow(fresh);
    const recents = await listNutritionRecent(user.id, 30);
    setRecent(recents);
  }

  const cTarget = profile ? calorieTarget(profile) : 0;
  const pTarget = profile ? proteinTarget(profile) : 0;
  const calGap = useMemo(() => cTarget - Number(row?.calories || 0), [cTarget, row]);
  const protGap = useMemo(() => pTarget - Number(row?.protein || 0), [pTarget, row]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card title="Daily Totals">
        <div className="flex items-center gap-3 mb-3">
          <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className="rounded-xl border px-3 py-2 shadow-sm" />
          {profile && (
            <div className="text-xs text-gray-600">
              Target: <b>{cTarget} kcal</b> / <b>{pTarget} g</b> protein
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Calories" value={row?.calories || 0} onChange={(v) => setRow({ ...(row as any), calories: v } as any)} />
          <NumberInput label="Protein (g)" value={row?.protein || 0} onChange={(v) => setRow({ ...(row as any), protein: v } as any)} />
          <NumberInput label="Carbs (g)" value={row?.carbs || 0} onChange={(v) => setRow({ ...(row as any), carbs: v } as any)} />
          <NumberInput label="Fats (g)" value={row?.fats || 0} onChange={(v) => setRow({ ...(row as any), fats: v } as any)} />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="rounded-xl bg-black text-white px-4 py-2" onClick={save}>Save</button>
          {profile ? (
            <div className="text-xs text-gray-600 self-center">
              {calGap > 150 && `You're ${calGap} kcal under.`}
              {calGap < -150 && `You're ${Math.abs(calGap)} kcal over.`}
              {protGap > 15 && ` Protein short by ${protGap}g.`}
            </div>
          ) : null}
        </div>
      </Card>

      <Card title="Last 30 days">
        {recent.length ? (
          <div className="text-sm">
            <div className="grid grid-cols-5 gap-2 font-medium text-xs text-gray-500 mb-2">
              <div>Date</div><div>kcal</div><div>P</div><div>C</div><div>F</div>
            </div>
            <div className="space-y-1 max-h-80 overflow-auto pr-1">
              {recent.map(r => (
                <div key={r.id} className="grid grid-cols-5 gap-2 text-sm">
                  <div>{r.date}</div>
                  <div>{r.calories}</div>
                  <div>{r.protein ?? "-"}</div>
                  <div>{r.carbs ?? "-"}</div>
                  <div>{r.fats ?? "-"}</div>
                </div>
              ))}
            </div>
          </div>
        ) : <div className="text-sm text-gray-600">No data yet.</div>}
      </Card>
    </div>
  );
}
