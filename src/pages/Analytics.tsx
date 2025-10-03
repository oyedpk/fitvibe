import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card } from "../components/ui/Card";
import { useAuth } from "../hooks/useAuth";
import { listBodyWeight, listNutritionRecent, listWorkoutsRecent } from "../services/db";
import { BodyWeight, NutritionDaily, Workout } from "../types";

function formatDay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function titleCase(word: string | null | undefined) {
  if (!word) return "-";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function startOfWeekISO(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const diff = (d.getDay() + 6) % 7; // Monday as first day
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function endOfWeekISO(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() + (6 - diff));
  return d.toISOString().slice(0, 10);
}

type CombinedRow = {
  date: string;
  weight?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  workout?: string;
};

export function Analytics() {
  const { user } = useAuth();
  const [weights, setWeights] = useState<BodyWeight[]>([]);
  const [nutrition, setNutrition] = useState<NutritionDaily[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    if (!user) return;
    listBodyWeight(user.id, 180).then(setWeights);
    listNutritionRecent(user.id, 60).then(setNutrition);
    listWorkoutsRecent(user.id, 60).then(setWorkouts);
  }, [user]);

  const combinedRows = useMemo(() => {
    const map = new Map<string, CombinedRow>();

    weights.forEach((w) => {
      map.set(w.date, { ...(map.get(w.date) || { date: w.date }), date: w.date, weight: Number(w.kg) });
    });

    nutrition.forEach((n) => {
      map.set(n.date, {
        ...(map.get(n.date) || { date: n.date }),
        date: n.date,
        calories: n.calories || undefined,
        protein: n.protein != null ? Number(n.protein) : undefined,
        carbs: n.carbs != null ? Number(n.carbs) : undefined,
        fats: n.fats != null ? Number(n.fats) : undefined,
      });
    });

    workouts.forEach((w) => {
      map.set(w.date, {
        ...(map.get(w.date) || { date: w.date }),
        date: w.date,
        workout: w.day ? titleCase(w.day) : w.name,
      });
    });

    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [weights, nutrition, workouts]);

  const tableRows = useMemo(() => combinedRows.slice(0, 21), [combinedRows]);

  const totals = useMemo(() => {
    return tableRows.reduce(
      (acc, row) => {
        return {
          calories: acc.calories + (row.calories || 0),
          protein: acc.protein + (row.protein || 0),
          carbs: acc.carbs + (row.carbs || 0),
          fats: acc.fats + (row.fats || 0),
        };
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [tableRows]);

  const weightTrend = useMemo(() => {
    if (!weights.length) return [];
    return [...weights]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((w) => ({ iso: w.date, label: formatDate(w.date), kg: Number(w.kg) }));
  }, [weights]);

  const weeklyLoss = useMemo(() => {
    if (!weights.length) return [];
    const groups = new Map<string, BodyWeight[]>();
    weights.forEach((w) => {
      const startIso = startOfWeekISO(w.date);
      const arr = groups.get(startIso) || [];
      arr.push(w);
      groups.set(startIso, arr);
    });

    return Array.from(groups.entries())
      .map(([startIso, arr]) => {
        const sorted = arr.sort((a, b) => (a.date < b.date ? -1 : 1));
        const start = sorted[0];
        const end = sorted[sorted.length - 1];
        const delta = Number((start.kg - end.kg).toFixed(2));
        return {
          startIso,
          endIso: endOfWeekISO(startIso),
          label: `${formatDate(startIso)} - ${formatDate(endOfWeekISO(startIso))}`,
          lostKg: delta > 0 ? delta : 0,
        };
      })
      .sort((a, b) => (a.startIso < b.startIso ? -1 : 1));
  }, [weights]);

  const workoutSummary = useMemo(() => {
    const counts = workouts.reduce<Record<string, number>>((acc, w) => {
      const key = w.day ? titleCase(w.day) : w.name;
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => (a.label > b.label ? 1 : -1));
  }, [workouts]);

  return (
    <div className="space-y-6">
      <Card title="Daily log snapshot" className="overflow-x-auto">
        <div className="min-w-full">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2">Day</th>
                <th className="py-2">Date</th>
                <th className="py-2">Weight (kg)</th>
                <th className="py-2">Workout</th>
                <th className="py-2">Calories</th>
                <th className="py-2">Protein (g)</th>
                <th className="py-2">Carbs (g)</th>
                <th className="py-2">Fat (g)</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length ? (
                tableRows.map((row) => (
                  <tr key={row.date} className="border-t">
                    <td className="py-2">{formatDay(row.date)}</td>
                    <td className="py-2">{formatDate(row.date)}</td>
                    <td className="py-2">{row.weight ? row.weight.toFixed(1) : "-"}</td>
                    <td className="py-2">{row.workout || "-"}</td>
                    <td className="py-2">{row.calories ? row.calories.toLocaleString() : "-"}</td>
                    <td className="py-2">{row.protein != null ? Math.round(row.protein) : "-"}</td>
                    <td className="py-2">{row.carbs != null ? Math.round(row.carbs) : "-"}</td>
                    <td className="py-2">{row.fats != null ? Math.round(row.fats) : "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-500">
                    Log some data to populate your snapshot.
                  </td>
                </tr>
              )}
            </tbody>
            {tableRows.length ? (
              <tfoot className="text-sm font-medium">
                <tr className="border-t">
                  <td className="py-2" colSpan={4}>
                    Totals (last {tableRows.length} days)
                  </td>
                  <td className="py-2">{totals.calories.toLocaleString()}</td>
                  <td className="py-2">{Math.round(totals.protein)}</td>
                  <td className="py-2">{Math.round(totals.carbs)}</td>
                  <td className="py-2">{Math.round(totals.fats)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Weight vs Date">
          <div className="h-64">
            {weightTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightTrend} margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis domain={["auto", "auto"]} width={40} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)} kg`} />
                  <Line type="monotone" dataKey="kg" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Weight entries will unlock this chart.
              </div>
            )}
          </div>
        </Card>

        <Card title="Weight lost per week">
          <div className="h-64">
            {weeklyLoss.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyLoss} margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} height={60} interval={0} angle={-20} textAnchor="end" />
                  <YAxis width={40} tickFormatter={(v) => `${v}`} label={{ value: "kg", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(2)} kg`} />
                  <Legend />
                  <Bar dataKey="lostKg" fill="#2563eb" name="Lost" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Log weights across multiple weeks to see trends.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card title="Workout split summary">
        {workoutSummary.length ? (
          <ul className="grid md:grid-cols-3 gap-3 text-sm">
            {workoutSummary.map((item) => (
              <li key={item.label} className="rounded-2xl bg-gray-100 px-4 py-3 flex items-center justify-between">
                <span>{item.label}</span>
                <span className="font-semibold">{item.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">
            Your workout distribution will appear after logging sessions.
          </div>
        )}
      </Card>
    </div>
  );
}
