import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";

// --- Supabase init ---
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || (process.env as any).REACT_APP_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || (process.env as any).REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Auth wrapper ---
function useAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return { user };
}

// --- DB helpers ---
async function fetchMeals(user_id, dateISO) {
  const { data, error } = await supabase
    .from("meals")
    .select("id, date, name, calories, protein")
    .eq("user_id", user_id)
    .eq("date", dateISO)
    .order("id", { ascending: false });
  if (error) throw error;
  return data;
}

async function fetchWorkouts(user_id, dateISO) {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, date, name, sets")
    .eq("user_id", user_id)
    .eq("date", dateISO)
    .order("id", { ascending: false });
  if (error) throw error;
  return data;
}

async function addMealRow(user_id, dateISO, name, calories, protein) {
  const { error } = await supabase.from("meals").insert({
    user_id,
    date: dateISO,
    name,
    calories,
    protein,
  });
  if (error) throw error;
}

async function addWorkoutRow(user_id, dateISO, name, sets) {
  const { error } = await supabase.from("workouts").insert({
    user_id,
    date: dateISO,
    name,
    sets,
  });
  if (error) throw error;
}

// --- App ---
export default function App() {
  const { user } = useAuth();
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0, 10));
  const [meals, setMeals] = useState([]);
  const [workouts, setWorkouts] = useState([]);

  // load from supabase
  useEffect(() => {
    if (!user) return;
    fetchMeals(user.id, dateISO).then(setMeals);
    fetchWorkouts(user.id, dateISO).then(setWorkouts);
  }, [user, dateISO]);

  // --- UI handlers ---
  async function addMeal(newMeal) {
    if (!user) return;
    await addMealRow(user.id, dateISO, newMeal.name, newMeal.calories, newMeal.protein);
    const updated = await fetchMeals(user.id, dateISO);
    setMeals(updated);
  }
  async function addWorkout(newWorkout) {
    if (!user) return;
    await addWorkoutRow(user.id, dateISO, newWorkout.name, newWorkout.sets);
    const updated = await fetchWorkouts(user.id, dateISO);
    setWorkouts(updated);
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AuthUI />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="max-w-5xl mx-auto px-4 py-6 flex justify-between">
        <h1 className="text-2xl font-bold">FitVibe + Supabase</h1>
        <input
          type="date"
          value={dateISO}
          onChange={(e) => setDateISO(e.target.value)}
          className="rounded-xl border px-3 py-2 shadow-sm"
        />
      </header>

      <main className="max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-6">
        <Card title="Meals">
          <MealForm dateISO={dateISO} onAdd={addMeal} />
          <List items={meals} render={(m) => (
            <div className="flex justify-between">
              <div>{m.name} — {m.calories} kcal / {m.protein} g</div>
            </div>
          )} empty="No meals yet" />
        </Card>

        <Card title="Workouts">
          <WorkoutForm dateISO={dateISO} onAdd={addWorkout} />
          <List items={workouts} render={(w) => (
            <div>
              <div className="font-medium">{w.name}</div>
              {w.sets && w.sets.map((s, i) => (
                <div key={i}>{s.reps} reps × {s.weightKg} kg</div>
              ))}
            </div>
          )} empty="No workouts yet" />
        </Card>
      </main>
    </div>
  );
}

function AuthUI() {
  async function signIn() {
    const email = prompt("Enter email for magic link");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert("Check your email for magic link");
  }
  return <button onClick={signIn} className="px-4 py-2 bg-black text-white rounded-xl">Sign in with Magic Link</button>;
}

function Card({ title, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </motion.div>
  );
}

function List({ items, render, empty }) {
  return (
    <div className="mt-3 space-y-2">
      {items.length ? items.map((x) => <div key={x.id}>{render(x)}</div>) : <div className="text-sm text-gray-500">{empty}</div>}
    </div>
  );
}

function MealForm({ dateISO, onAdd }) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);

  async function submit(e) {
    e.preventDefault();
    await onAdd({ dateISO, name, calories, protein });
    setName("");
    setCalories(0);
    setProtein(0);
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-3 gap-2">
      <input placeholder="Food" value={name} onChange={(e) => setName(e.target.value)} className="border rounded-xl px-2 py-1" />
      <input type="number" placeholder="kcal" value={calories} onChange={(e) => setCalories(Number(e.target.value))} className="border rounded-xl px-2 py-1" />
      <input type="number" placeholder="protein" value={protein} onChange={(e) => setProtein(Number(e.target.value))} className="border rounded-xl px-2 py-1" />
      <button className="col-span-3 rounded-xl bg-black text-white py-1">Add meal</button>
    </form>
  );
}

function WorkoutForm({ dateISO, onAdd }) {
  const [name, setName] = useState("");
  const [setsText, setSetsText] = useState("10@60, 8@60");

  async function submit(e) {
    e.preventDefault();
    const sets = setsText.split(",").map(s => {
      const [reps, weight] = s.trim().split("@");
      return { reps: Number(reps), weightKg: Number(weight) };
    });
    await onAdd({ dateISO, name, sets });
    setName("");
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2">
      <input placeholder="Exercise" value={name} onChange={(e) => setName(e.target.value)} className="border rounded-xl px-2 py-1" />
      <input placeholder="Sets (10@60, 8@60)" value={setsText} onChange={(e) => setSetsText(e.target.value)} className="border rounded-xl px-2 py-1" />
      <button className="col-span-2 rounded-xl bg-black text-white py-1">Add workout</button>
    </form>
  );
}
