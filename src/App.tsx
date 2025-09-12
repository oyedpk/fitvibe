import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";

// ---------- ENV & SUPABASE ----------
const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL || (process.env as any).REACT_APP_SUPABASE_URL;
const supabaseKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (process.env as any).REACT_APP_SUPABASE_ANON_KEY;
const siteUrl =
  (import.meta as any).env?.VITE_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");

const supabase = createClient(supabaseUrl, supabaseKey);

// ---------- TYPES ----------
type Activity = "sedentary" | "light" | "moderate" | "active" | "veryActive";
type Goal = "fatLoss" | "maintain" | "gain";
type Split = "ppl" | "upper_lower";
type SplitDay = "push" | "pull" | "legs" | "upper" | "lower";
type WorkoutSet = { reps: number; weightKg: number };

type Profile = {
  id: string;
  name: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity: Activity | null;
  goal: Goal | null;
  protein_per_kg: number | null;
};

type NutritionDaily = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  calories: number;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  created_at: string;
};

type Workout = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  name: string;
  sets: WorkoutSet[] | null; // stored as JSON
  split: Split | null;
  day: SplitDay | null;
  created_at: string;
};

type BodyWeight = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  kg: number;
  created_at: string;
};

// ---------- CALCS ----------
const activityMultiplier: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

function msjBmr(sex: "male" | "female", age: number, height_cm: number, weight_kg: number) {
  const s = sex === "male" ? 5 : -161;
  return Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age + s);
}
function tdee(p: Partial<Profile>, sex: "male" | "female" = "male") {
  const w = Number(p.weight_kg || 0);
  const h = Number(p.height_cm || 0);
  const a = Number(p.age || 0);
  const act = (p.activity as Activity) || "moderate";
  if (!w || !h || !a) return 0;
  return Math.round(msjBmr(sex, a, h, w) * (activityMultiplier[act] || 1.55));
}
function calorieTarget(p: Partial<Profile>, sex: "male" | "female" = "male") {
  const base = tdee(p, sex);
  const g = (p.goal as Goal) || "fatLoss";
  if (g === "fatLoss") return Math.max(1200, base - 500);
  if (g === "gain") return base + 250;
  return base;
}
function proteinTarget(p: Partial<Profile>) {
  const perKg = Number(p.protein_per_kg || 2);
  const w = Number(p.weight_kg || 0);
  return Math.round(perKg * w);
}

// ---------- AUTH ----------
function useAuth() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return { user };
}

// ---------- DATA HELPERS ----------
async function upsertProfileFromUser(user: any) {
  if (!user) return null;
  // Try to fetch
  const { data: existing } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (existing) return existing as Profile;

  // Build from user_metadata
  const m = user.user_metadata || {};
  const payload = {
    id: user.id,
    name: m.name ?? null,
    age: m.age ? Number(m.age) : null,
    height_cm: m.height_cm ? Number(m.height_cm) : null,
    weight_kg: m.weight_kg ? Number(m.weight_kg) : null,
    activity: (m.activity as Activity) ?? "moderate",
    goal: (m.goal as Goal) ?? "fatLoss",
    protein_per_kg: m.protein_per_kg ? Number(m.protein_per_kg) : 2.0,
  };
  await supabase.from("profiles").upsert(payload);
  return (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data as Profile;
}

async function getProfile(user_id: string) {
  const { data } = await supabase.from("profiles").select("*").eq("id", user_id).maybeSingle();
  return data as Profile | null;
}

// Nutrition daily
async function getNutritionForDate(user_id: string, dateISO: string) {
  const { data } = await supabase
    .from("nutrition_daily")
    .select("*")
    .eq("user_id", user_id)
    .eq("date", dateISO)
    .maybeSingle();
  return data as NutritionDaily | null;
}
async function upsertNutrition(user_id: string, dateISO: string, row: Partial<NutritionDaily>) {
  const { error } = await supabase.from("nutrition_daily").upsert({
    user_id,
    date: dateISO,
    calories: Number(row.calories || 0),
    protein: row.protein != null ? Number(row.protein) : null,
    carbs: row.carbs != null ? Number(row.carbs) : null,
    fats: row.fats != null ? Number(row.fats) : null,
  });
  if (error) throw error;
}
async function listNutritionRecent(user_id: string, days = 30) {
  const { data } = await supabase
    .from("nutrition_daily")
    .select("*")
    .eq("user_id", user_id)
    .gte("date", new Date(Date.now() - days * 86400000).toISOString().slice(0, 10))
    .order("date", { ascending: false });
  return (data || []) as NutritionDaily[];
}

// Workouts
async function addWorkoutRow(
  user_id: string,
  dateISO: string,
  name: string,
  sets: WorkoutSet[],
  split: Split,
  day: SplitDay
) {
  const { error } = await supabase.from("workouts").insert({
    user_id,
    date: dateISO,
    name,
    sets,
    split,
    day,
  });
  if (error) throw error;
}
async function listWorkoutsByDate(user_id: string, dateISO: string) {
  const { data } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", user_id)
    .eq("date", dateISO)
    .order("created_at", { ascending: false });
  return (data || []) as Workout[];
}
async function listWorkoutsRecent(user_id: string, days = 30) {
  const { data } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", user_id)
    .gte("date", new Date(Date.now() - days * 86400000).toISOString().slice(0, 10))
    .order("date", { ascending: false });
  return (data || []) as Workout[];
}

// Body weight
async function addBodyWeight(user_id: string, dateISO: string, kg: number) {
  const { error } = await supabase.from("body_weight").upsert({ user_id, date: dateISO, kg });
  if (error) throw error;
}
async function listBodyWeight(user_id: string, days = 120) {
  const { data } = await supabase
    .from("body_weight")
    .select("*")
    .eq("user_id", user_id)
    .gte("date", new Date(Date.now() - days * 86400000).toISOString().slice(0, 10))
    .order("date", { ascending: true });
  return (data || []) as BodyWeight[];
}

// ---------- MAIN APP ----------
export default function App() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [page, setPage] = useState<"home" | "calories" | "workouts" | "progress">("home");

  useEffect(() => {
    (async () => {
      if (!user) return;
      const p = (await getProfile(user.id)) || (await upsertProfileFromUser(user));
      setProfile(p);
    })();
  }, [user]);

  if (!user) return <AuthGateway />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">FitVibe</h1>
          <p className="text-xs text-gray-600">Calories • Workouts • Progress</p>
        </div>
        <nav className="flex gap-2">
          <NavBtn label="Home" active={page === "home"} onClick={() => setPage("home")} />
          <NavBtn label="Track Calories" active={page === "calories"} onClick={() => setPage("calories")} />
          <NavBtn label="Track Workouts" active={page === "workouts"} onClick={() => setPage("workouts")} />
          <NavBtn label="Progress" active={page === "progress"} onClick={() => setPage("progress")} />
          <button
            className="rounded-xl bg-gray-200 px-3 py-2 text-sm"
            onClick={() => supabase.auth.signOut()}
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-24">
        {page === "home" && <HomeHub goCalories={() => setPage("calories")} goWorkouts={() => setPage("workouts")} goProgress={() => setPage("progress")} profile={profile} />}
        {page === "calories" && <CaloriesPage profile={profile} />}
        {page === "workouts" && <WorkoutsPage />}
        {page === "progress" && <ProgressPage profile={profile} onProfileUpdate={setProfile} />}
      </main>
    </div>
  );
}

// ---------- PAGES ----------
function HomeHub({
  goCalories,
  goWorkouts,
  goProgress,
  profile,
}: {
  goCalories: () => void;
  goWorkouts: () => void;
  goProgress: () => void;
  profile: Profile | null;
}) {
  const calTarget = profile ? calorieTarget(profile) : 0;
  const protTarget = profile ? proteinTarget(profile) : 0;
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card title="Quick Start">
        <div className="grid grid-cols-1 gap-3">
          <button className="rounded-2xl bg-black text-white px-4 py-3" onClick={goCalories}>
            Track Calories
          </button>
          <button className="rounded-2xl bg-black text-white px-4 py-3" onClick={goWorkouts}>
            Track Workouts
          </button>
          <button className="rounded-2xl bg-gray-900/80 text-white px-4 py-3" onClick={goProgress}>
            Progress & Recommendations
          </button>
        </div>
      </Card>
      <Card title="Targets">
        {profile ? (
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Calorie Target" value={`${calTarget} kcal`} />
            <Stat label="Protein Target" value={`${protTarget} g`} />
            <div className="text-xs text-gray-600 col-span-2">
              Based on Mifflin–St Jeor + activity + goal.
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">Complete sign-up to see targets.</div>
        )}
      </Card>
      <Card title="Tips">
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Log **one** daily total for calories/macros — keep it simple.</li>
          <li>Use the split selector (PPL or Upper/Lower) before adding exercises.</li>
          <li>We’ll crunch trends and give nudges on the Progress page.</li>
        </ul>
      </Card>
    </div>
  );
}

function CaloriesPage({ profile }: { profile: Profile | null }) {
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0, 10));
  const [row, setRow] = useState<NutritionDaily | null>(null);
  const [recent, setRecent] = useState<NutritionDaily[]>([]);
  const { user } = useAuth();

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
  const calGap = cTarget ? cTarget - Number(row?.calories || 0) : 0;
  const protGap = pTarget ? pTarget - Number(row?.protein || 0) : 0;

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
          <Number label="Calories" value={row?.calories || 0} onChange={(v) => setRow({ ...(row as any), calories: v } as any)} />
          <Number label="Protein (g)" value={row?.protein || 0} onChange={(v) => setRow({ ...(row as any), protein: v } as any)} />
          <Number label="Carbs (g)" value={row?.carbs || 0} onChange={(v) => setRow({ ...(row as any), carbs: v } as any)} />
          <Number label="Fats (g)" value={row?.fats || 0} onChange={(v) => setRow({ ...(row as any), fats: v } as any)} />
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

function WorkoutsPage() {
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0, 10));
  const [split, setSplit] = useState<Split>("ppl");
  const [day, setDay] = useState<SplitDay>("push");
  const [name, setName] = useState("");
  const [setsText, setSetsText] = useState("10@60, 8@60, 6@60");
  const [list, setList] = useState<Workout[]>([]);
  const { user } = useAuth();

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

function ProgressPage({ profile, onProfileUpdate }: { profile: Profile | null; onProfileUpdate: (p: Profile) => void }) {
  const [weights, setWeights] = useState<BodyWeight[]>([]);
  const [kgtoday, setKgtoday] = useState<number>(Number(profile?.weight_kg || 0));
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0, 10));
  const [recentNutrition, setRecentNutrition] = useState<NutritionDaily[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const { user } = useAuth();

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

  // Weekly weight change (simple diff vs 7 days ago if present)
  const weeklyDelta = useMemo(() => {
    if (weights.length < 2) return 0;
    const latest = weights[weights.length - 1];
    const weekAgo = weights.slice(0, -1).reverse().find(w => {
      return (new Date(latest.date).getTime() - new Date(w.date).getTime()) >= 7 * 86400000;
    }) || weights[0];
    return Number((latest.kg - weekAgo.kg).toFixed(2));
  }, [weights]);

  // ETA to target if goal fatLoss and target < current
  const targetKg = Number(profile?.weight_kg || 0) && profile?.goal === "fatLoss" ? Math.max(0, Number(profile!.weight_kg) - 5) : null;
  const etaWeeks = useMemo(() => {
    if (!targetKg || weights.length < 2) return null;
    const latest = weights[weights.length - 1].kg;
    const diff = latest - targetKg;
    const weekly = Math.abs(weeklyDelta);
    if (!weekly) return null;
    return Math.ceil(diff / weekly);
  }, [weeklyDelta, weights, targetKg]);

  // Simple recs
  const avgCals = recentNutrition.length
    ? Math.round(recentNutrition.reduce((s, r) => s + r.calories, 0) / recentNutrition.length)
    : 0;
  const avgProt = recentNutrition.length
    ? Math.round((recentNutrition.reduce((s, r) => s + (r.protein || 0), 0) / recentNutrition.length))
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
          <Number label="kg" value={kgtoday} onChange={setKgtoday} />
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
          <Stat label="Avg kcal (30d)" value={avgCals ? `${avgCals} kcal` : "-"} />
          <Stat label="Avg protein (30d)" value={avgProt ? `${avgProt} g` : "-"} />
          <Stat label="Workouts (7d)" value={`${workoutsThisWeek}`} />
          <Stat label="Weight logs" value={`${weights.length}`} />
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

// ---------- AUTH GATEWAY (Sign in / Sign up) ----------
function AuthGateway() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  return (
    <div className="min-h-screen bg-gray-50 grid place-items-center px-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex gap-2 mb-4">
          <button className={`px-3 py-2 rounded-xl ${tab === "signin" ? "bg-black text-white" : "bg-gray-100"}`} onClick={() => setTab("signin")}>Sign in</button>
          <button className={`px-3 py-2 rounded-xl ${tab === "signup" ? "bg-black text-white" : "bg-gray-100"}`} onClick={() => setTab("signup")}>Sign up</button>
        </div>
        {tab === "signin" ? <SignInForm /> : <SignUpForm />}
      </motion.div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: siteUrl } });
    if (error) alert(error.message);
    else alert("Magic link sent. Check your email.");
  }
  return (
    <form onSubmit={signIn} className="grid gap-3">
      <Input label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <button className="rounded-xl bg-black text-white px-4 py-2">Send magic link</button>
      <div className="text-xs text-gray-600">We’ll email you a sign-in link.</div>
    </form>
  );
}

function SignUpForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(30);
  const [height, setHeight] = useState<number>(175);
  const [weight, setWeight] = useState<number>(77);
  const [activity, setActivity] = useState<Activity>("moderate");
  const [goal, setGoal] = useState<Goal>("fatLoss");
  const [proteinPerKg, setProteinPerKg] = useState<number>(2);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    const { error } = await supabase.auth.signUp({
      email,
      options: {
        emailRedirectTo: siteUrl,
        data: {
          name,
          age,
          height_cm: height,
          weight_kg: weight,
          activity,
          goal,
          protein_per_kg: proteinPerKg,
        },
      },
    });
    if (error) alert(error.message);
    else alert("Check your email to confirm and sign in.");
  }

  return (
    <form onSubmit={signUp} className="grid grid-cols-2 gap-3">
      <Input label="Email" value={email} onChange={setEmail} placeholder="you@example.com" className="col-span-2" />
      <Input label="Name" value={name} onChange={setName} />
      <Number label="Age" value={age} onChange={setAge} />
      <Number label="Height (cm)" value={height} onChange={setHeight} />
      <Number label="Weight (kg)" value={weight} onChange={setWeight} />
      <Select
        label="Activity"
        value={activity}
        onChange={(v) => setActivity(v as Activity)}
        options={[
          { value: "sedentary", label: "Sedentary" },
          { value: "light", label: "Light" },
          { value: "moderate", label: "Moderate" },
          { value: "active", label: "Active" },
          { value: "veryActive", label: "Very Active" },
        ]}
      />
      <Select
        label="Goal"
        value={goal}
        onChange={(v) => setGoal(v as Goal)}
        options={[
          { value: "fatLoss", label: "Fat Loss" },
          { value: "maintain", label: "Maintain" },
          { value: "gain", label: "Gain" },
        ]}
      />
      <Number label="Protein (g/kg)" step={0.1} value={proteinPerKg} onChange={setProteinPerKg} />
      <button className="col-span-2 rounded-xl bg-black text-white px-4 py-2">Create account</button>
      <div className="col-span-2 text-xs text-gray-600">
        We’ll email you a link. On first login we’ll create your profile from these details.
      </div>
    </form>
  );
}

// ---------- UI PRIMITIVES ----------
function Card({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`bg-white rounded-2xl shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between"><h2 className="font-semibold">{title}</h2></div>
      <div className="mt-3">{children}</div>
    </motion.div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-100 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
function NavBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`rounded-xl px-3 py-2 text-sm ${active ? "bg-black text-white" : "bg-gray-100"}`} onClick={onClick}>
      {label}
    </button>
  );
}
function Input({ label, value, onChange, placeholder = "", className = "" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <label className={`text-sm ${className}`}>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <input className="w-full rounded-xl border px-3 py-2 shadow-sm" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function Number({ label, value, onChange, step = 1, className = "" }: { label: string; value: number; onChange: (v: number) => void; step?: number; className?: string }) {
  return (
    <label className={`text-sm ${className}`}>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <input type="number" className="w-full rounded-xl border px-3 py-2 shadow-sm" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
function Select<T extends string>({ label, value, onChange, options, className = "" }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <label className={`text-sm ${className}`}>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <select className="w-full rounded-xl border px-3 py-2 shadow-sm" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
