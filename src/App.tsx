import React, { useEffect, useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useAuth } from "./hooks/useAuth";
import { getProfile, ensureProfileFromUser } from "./services/db";
import { Profile } from "./types";
import { NavBtn } from "./components/ui/NavBtn";

export default function App() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) return setProfile(null);
      const p = (await getProfile(user.id)) || (await ensureProfileFromUser(user));
      setProfile(p);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold">FitVibe</Link>
        <nav className="flex gap-2">
          <NavBtn to="/" label="Home" />
          <NavBtn to="/calories" label="Track Calories" />
          <NavBtn to="/workouts" label="Track Workouts" />
          <NavBtn to="/progress" label="Progress" />
          <NavBtn to="/analytics" label="Analytics" />
          {user && (
            <button className="rounded-xl bg-gray-200 px-3 py-2 text-sm" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          )}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-24">
        <Outlet context={{ profile }} />
      </main>
    </div>
  );
}
