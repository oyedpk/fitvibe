import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Profile, NutritionDaily, BodyWeight } from "../types";
import { calorieTarget, proteinTarget } from "../utils/calcs";
import { useAuth } from "../hooks/useAuth";
import { listNutritionRecent, listBodyWeight } from "../services/db";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

type Props = { profile: Profile | null };
type RangeKey = "7" | "21" | "42" | "90" | "all";

function fmtLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}
function daysBackIso(n: number) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}
function isoRange(days: number) {
  return Array.from({ length: days }, (_, i) => daysBackIso(days - 1 - i));
}
function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function spanDates(startISO: string, endISO: string) {
  const res: string[] = [];
  let cur = startISO;
  while (cur <= endISO) {
    res.push(cur);
    cur = addDays(cur, 1);
  }
  return res;
}
const RANGE_LABEL: Record<RangeKey, string> = {
  "7": "Last week",
  "21": "Last 3 weeks",
  "42": "Last 6 weeks",
  "90": "Last 90 days",
  all: "All time",
};
function daysToFetch(range: RangeKey) {
  // How many days to fetch from DB for each range
  if (range === "all") return 365; // adjust later if you want a longer history
  return Number(range);
}

export function Home({ profile }: Props) {
  const { user } = useAuth();

  // separate selectors for each chart
  const [energyRange, setEnergyRange] = useState<RangeKey>("21");
  const [weightRange, setWeightRange] = useState<RangeKey>("21");

  const [nutri, setNutri] = useState<NutritionDaily[]>([]);
  const [weights, setWeights] = useState<BodyWeight[]>([]);

  // fetch nutrition when energy range changes
  useEffect(() => {
    if (!user) return;
    listNutritionRecent(user.id, daysToFetch(energyRange)).then(setNutri);
  }, [user, energyRange]);

  // fetch body weight when weight range changes
  useEffect(() => {
    if (!user) return;
    listBodyWeight(user.id, daysToFetch(weightRange)).then(setWeights);
  }, [user, weightRange]);

  // targets panel
  const calTarget = profile ? calorieTarget(profile) : 0;
  const protTarget = profile ? proteinTarget(profile) : 0;

  // build stacked kcal data for selected energy range
  const energyData = useMemo(() => {
    if (!nutri.length) return [];
    const byDate = new Map(nutri.map((n) => [n.date, n]));

    let seriesDates: string[] = [];
    if (energyRange === "all") {
      const sorted = [...nutri].sort((a, b) => (a.date < b.date ? -1 : 1));
      const start = sorted[0].date;
      const end = sorted[sorted.length - 1].date;
      seriesDates = spanDates(start, end);
    } else {
      seriesDates = isoRange(Number(energyRange));
    }

    return seriesDates.map((iso) => {
      const r = byDate.get(iso);
      const p = (r?.protein || 0) * 4;
      const c = (r?.carbs || 0) * 4;
      const f = (r?.fats || 0) * 9;
      return {
        iso,
        label: fmtLabel(iso),
        Protein: p,
        Carbs: c,
        Fat: f,
        Total: p + c + f,
      };
    });
  }, [nutri, energyRange]);

  // weight line data for selected weight range
  const weightData = useMemo(() => {
    if (!weights.length) return [];
    let filtered: BodyWeight[] = [];
    if (weightRange === "all") {
      filtered = [...weights].sort((a, b) => (a.date < b.date ? -1 : 1));
    } else {
      const cutoffIso = daysBackIso(Number(weightRange) - 1);
      filtered = weights.filter((w) => w.date >= cutoffIso);
    }
    return filtered.map((w) => ({ label: fmtLabel(w.date), kg: Number(w.kg) }));
  }, [weights, weightRange]);

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Quick actions */}
      <Card title="Quick actions">
        <div className="grid grid-cols-1 gap-3">
          <NavLink
            to="/calories"
            className="rounded-2xl bg-black text-white px-4 py-3 text-center"
          >
            Track Calories
          </NavLink>
          <NavLink
            to="/workouts"
            className="rounded-2xl bg-black text-white px-4 py-3 text-center"
          >
            Track Workouts
          </NavLink>
          <NavLink
            to="/progress"
            className="rounded-2xl bg-gray-900/80 text-white px-4 py-3 text-center"
          >
            Progress & Recommendations
          </NavLink>
        </div>
      </Card>

      {/* Targets */}
      <Card title="Daily targets">
        {profile ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-100 p-3">
              <div className="text-xs text-gray-500">Calorie Target</div>
              <div className="font-semibold">{calTarget} kcal</div>
            </div>
            <div className="rounded-2xl bg-gray-100 p-3">
              <div className="text-xs text-gray-500">Protein Target</div>
              <div className="font-semibold">{protTarget} g</div>
            </div>
            <div className="text-xs text-gray-600 col-span-2">
              Based on Mifflin–St Jeor + activity + goal.
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">Complete sign-up to see targets.</div>
        )}
      </Card>

      {/* Small tips */}
      <Card title="Tips">
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Log a single daily total for calories and macros.</li>
          <li>Choose your split (PPL or Upper/Lower) before adding sets.</li>
          <li>Consistency &gt; perfection. Tiny daily wins compound.</li>
        </ul>
      </Card>

      {/* Energy chart */}
      <div className="md:col-span-3">
        <Card title="Energy Consumed (kcal)">
          <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
            <div>
              {energyData.length
                ? `${fmtLabel(energyData[0].iso)} to ${fmtLabel(
                    energyData[energyData.length - 1].iso
                  )}`
                : "No data"}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs">Range</label>
              <select
                className="rounded-lg border px-2 py-1"
                value={energyRange}
                onChange={(e) => setEnergyRange(e.target.value as RangeKey)}
              >
                <option value="7">{RANGE_LABEL["7"]}</option>
                <option value="21">{RANGE_LABEL["21"]}</option>
                <option value="42">{RANGE_LABEL["42"]}</option>
                <option value="90">{RANGE_LABEL["90"]}</option>
                <option value="all">{RANGE_LABEL["all"]}</option>
              </select>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip
                  formatter={(value: any, name) => [`${Math.round(value as number)} kcal`, name]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Bar dataKey="Protein" stackId="kcal" />
                <Bar dataKey="Carbs" stackId="kcal" />
                <Bar dataKey="Fat" stackId="kcal" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Stacked by macro (Protein 4 kcal/g, Carbs 4 kcal/g, Fat 9 kcal/g).
          </div>
        </Card>
      </div>

      {/* Weight chart */}
      <div className="md:col-span-3">
        <Card title="Weight (kg)">
          <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
            <div>
              {weightData.length
                ? `${weightData[0].label} to ${weightData[weightData.length - 1].label}`
                : "No data"}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs">Range</label>
              <select
                className="rounded-lg border px-2 py-1"
                value={weightRange}
                onChange={(e) => setWeightRange(e.target.value as RangeKey)}
              >
                <option value="7">{RANGE_LABEL["7"]}</option>
                <option value="21">{RANGE_LABEL["21"]}</option>
                <option value="42">{RANGE_LABEL["42"]}</option>
                <option value="90">{RANGE_LABEL["90"]}</option>
                <option value="all">{RANGE_LABEL["all"]}</option>
              </select>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip />
                <Line type="monotone" dataKey="kg" dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
