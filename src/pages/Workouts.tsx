import React, { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { Input } from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";
import { addWorkoutRow, listWorkoutsByDate } from "../services/db";
import { Split, SplitDay, Workout, WorkoutSet } from "../types";

export function Workouts() {
  const { user } = useAuth();
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0, 10));
  const [split, setSplit] = useState<Split>("ppl");
  const [day, setDay] = useState<SplitDay>("push");
  const [name, setName] = useState("");
  const [setsText, setSetsText] = useState("10@60, 8@60, 6@60");
  const [list, setList] = useState<Workout[]>([]);

  useEffect(() => {
    if (!user) return;
    listWorkoutsByDate(user.id, dateISO).then(setList);
  }, [user, dateISO]);

  function dayOptionsForSplit(s: Split): SplitDay[] {
    return s === "ppl" ? ["push", "pull", "legs"] : ["upper", "lower"];
  }

  async function addWorkout() {
    if (!user || !name.trim() || !setsText.trim()) return;
    const sets: WorkoutSet[] = setsText.split(",").map((s) => {
      const [reps, weight] = s.trim().split("@");
      return { reps: Number(reps), weightKg: Number(weight) };
    }).filter(s => !isNaN(s.reps) && !isNaN(s.weightKg));
    await addWorkoutRow(user.id, dateISO, name.trim(), sets, split, day);
    setName("");
    const updated = await listWorkoutsByDate(user.id, dateISO);
    setList(updated);
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card title="New Workout Entry">
        <div className="flex items-center gap-3 mb-3">
          <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className="rounded-xl border px-3 py-2 shadow-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Split"
            value={split}
            onChange={(v) => { setSplit(v as Split); setDay(dayOptionsForSplit(v as Split)[0]); }}
            options={[
              { value: "ppl", label: "Push/Pull/Legs" },
              { value: "upper_lower", label: "Upper/Lower" },
            ]}
          />
          <Select
            label="Day"
            value={day}
            onChange={(v) => setDay(v as SplitDay)}
            options={dayOptionsForSplit(split).map(d => ({ value: d, label: d[0].toUpperCase() + d.slice(1) }))}
          />
          <Input label="Exercise" value={name} onChange={setName} placeholder="e.g., Barbell Bench Press" className="col-span-2" />
          <Input label="Sets (reps@kg, ...)" value={setsText} onChange={setSetsText} placeholder="e.g., 10@60, 8@60, 6@60" className="col-span-2" />
        </div>
        <div className="mt-3">
          <button className="rounded-xl bg-black text-white px-4 py-2" onClick={addWorkout}>Add workout</button>
        </div>
      </Card>

      <Card title="Today’s Workouts">
        {list.length ? (
          <div className="space-y-3">
            {list.map(w => (
              <div key={w.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{w.name}</div>
                  <div className="text-xs text-gray-600">{(w.split || "").toUpperCase()} • {w.day}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(w.sets || []).map((s, i) => (
                    <div key={i} className="bg-gray-100 rounded-lg px-2 py-1 text-xs">{s.reps} reps × {s.weightKg} kg</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : <div className="text-sm text-gray-600">No workouts yet.</div>}
      </Card>
    </div>
  );
}
