import type { Activity, Goal, Profile } from "../types";

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

export function tdee(p: Partial<Profile>, sex: "male" | "female" = "male") {
  const w = Number(p.weight_kg || 0);
  const h = Number(p.height_cm || 0);
  const a = Number(p.age || 0);
  const act = (p.activity as Activity) || "moderate";
  if (!w || !h || !a) return 0;
  return Math.round(msjBmr(sex, a, h, w) * (activityMultiplier[act] || 1.55));
}

export function calorieTarget(p: Partial<Profile>, sex: "male" | "female" = "male") {
  const base = tdee(p, sex);
  const g = (p.goal as Goal) || "fatLoss";
  if (g === "fatLoss") return Math.max(1200, base - 500);
  if (g === "gain") return base + 250;
  return base;
}

export function proteinTarget(p: Partial<Profile>) {
  const perKgRaw = p.protein_per_kg;
  const perKg = perKgRaw == null || perKgRaw === ""
    ? 2
    : Number(perKgRaw);
  const w = Number(p.weight_kg || 0);
  if (!Number.isFinite(perKg) || perKg < 0) {
    return 0;
  }
  return Math.round(perKg * w);
}
