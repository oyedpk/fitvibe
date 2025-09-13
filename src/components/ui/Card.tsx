import { supabase } from "../../supabaseClient";
import type {
  Activity, Goal, Profile, NutritionDaily, Workout, BodyWeight, Split, SplitDay, WorkoutSet
} from "../types";

export async function ensureProfileFromUser(user: any) {
  if (!user) return null;
  const { data: existing } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (existing) return existing as Profile;

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
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data as Profile;
}

export async function getProfile(user_id: string) {
  const { data } = await supabase.from("profiles").select("*").eq("id", user_id).maybeSingle();
  return data as Profile | null;
}

/* Nutrition */
export async function getNutritionForDate(user_id: string, dateISO: string) {
  const { data } = await supabase
    .from("nutrition_daily")
    .select("*")
    .eq("user_id", user_id)
    .eq("date", dateISO)
    .maybeSingle();
  return data as NutritionDaily | null;
}
export async function upsertNutrition(user_id: string, dateISO: string, row: Partial<NutritionDaily>) {
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
export async function listNutritionRecent(user_id: string, days = 30) {
  const { data } = await supabase
    .from("nutrition_daily")
    .select("*")
    .eq("user_id", user_id)
    .gte("date", new Date(Date.now() - days * 86400000).toISOString().slice(0, 10))
    .order("date", { ascending: false });
  return (data || []) as NutritionDaily[];
}

/* Workouts */
export async function addWorkoutRow(
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
export async function listWorkoutsByDate(user_id: string, dateISO: string) {
  const { data } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", user_id)
    .eq("date", dateISO)
    .order("created_at", { ascending: false });
  return (data || []) as Workout[];
}
export async function listWorkoutsRecent(user_id: string, days = 30) {
  const { data } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", user_id)
    .gte("date", new Date(Date.now() - days * 86400000).toISOString().slice(0, 10))
    .order("date", { ascending: false });
  return (data || []) as Workout[];
}

/* Body weight */
export async function addBodyWeight(user_id: string, dateISO: string, kg: number) {
  const { error } = await supabase.from("body_weight").upsert({ user_id, date: dateISO, kg });
  if (error) throw error;
}
export async function listBodyWeight(user_id: string, days = 120) {
  const { data } = await supabase
    .from("body_weight")
    .select("*")
    .eq("user_id", user_id)
    .gte("date", new Date(Date.now() - days * 86400000).toISOString().slice(0, 10))
    .order("date", { ascending: true });
  return (data || []) as BodyWeight[];
}
