export type Activity = "sedentary" | "light" | "moderate" | "active" | "veryActive";
export type Goal = "fatLoss" | "maintain" | "gain";
export type Split = "ppl" | "upper_lower";
export type SplitDay = "push" | "pull" | "legs" | "upper" | "lower";
export type WorkoutSet = { reps: number; weightKg: number };

export type Profile = {
  id: string;
  name: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity: Activity | null;
  goal: Goal | null;
  protein_per_kg: number | null;
};

export type NutritionDaily = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  calories: number;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  created_at: string;
};

export type Workout = {
  id: string;
  user_id: string;
  date: string;
  name: string;
  sets: WorkoutSet[] | null; // JSON
  split: Split | null;
  day: SplitDay | null;
  created_at: string;
};

export type BodyWeight = {
  id: string;
  user_id: string;
  date: string;
  kg: number;
  created_at: string;
};
