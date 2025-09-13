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

const RANGE_DAYS = 21; // "Last 3 weeks" window

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

export function Home({ profile }: Props) {
  const { user } = useAuth();
  const [nutri, setNutri] = useState<NutritionDaily[]>([]);
  const [weights, setWeights] = useState<BodyWeight[]>([]);

  // fetch recent nutrition + weight
  useEffect(() => {
    if (!user) return;
    listNutritionRecent(user.id, 30).then(setNutri);
    listBodyWeight(user.id, 90).then(setWeights);
  }, [user]);

  // targets panel
  const calTarget = profile ? calorieTarget(profile) : 0;
  const protTarget = profile ? proteinTarget(profile) : 0;

  // build stacked kcal data for last 3 weeks
  const energyData = useMemo(() => {
    const byDate = new Map(nutri.map((n) => [n.date, n]));
    return isoRange(RANGE_DAYS).map((iso) => {
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
  }, [nutri]);

  // weight line data (last 3 weeks only)
  const weightData = useMemo(() => {
    const cutoffIso = daysBackIso(RANGE_DAYS - 1);
    return weights
      .filter((w) => w.date >= cutoffIso)
      .map((w) => ({ label: fmtLabel(w.date), kg: Number(w.kg) }));
  }, [weights]);

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
          <li>Consistency > perfection. Tiny daily wins compound.</li>
        </ul>
      </Card>

      {/* Energy chart */}
      <div className="md:col-span-3">
        <Card title="Energy Consumed (kcal) — last 3 weeks">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energyData} stackOffset="expand">
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
        <Card title="Weight (kg) — last 3 weeks">
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
