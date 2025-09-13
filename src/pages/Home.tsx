import React from "react";
import { Card } from "../components/ui/Card";
import { NavLink } from "react-router-dom";
import { Profile } from "../types";
import { calorieTarget, proteinTarget } from "../utils/calcs";

export function Home({ profile }: { profile: Profile | null }) {
  const calTarget = profile ? calorieTarget(profile) : 0;
  const protTarget = profile ? proteinTarget(profile) : 0;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card title="Quick Start">
        <div className="grid grid-cols-1 gap-3">
          <NavLink to="/calories" className="rounded-2xl bg-black text-white px-4 py-3 text-center">
            Track Calories
          </NavLink>
          <NavLink to="/workouts" className="rounded-2xl bg-black text-white px-4 py-3 text-center">
            Track Workouts
          </NavLink>
          <NavLink to="/progress" className="rounded-2xl bg-gray-900/80 text-white px-4 py-3 text-center">
            Progress & Recommendations
          </NavLink>
        </div>
      </Card>
      <Card title="Targets">
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
      <Card title="Tips">
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Log one daily total for calories/macros.</li>
          <li>Select split (PPL or Upper/Lower) before adding exercises.</li>
          <li>Progress page will generate nudges from your data.</li>
        </ul>
      </Card>
    </div>
  );
}
