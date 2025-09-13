import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useOutletContext } from "react-router-dom";
import App from "./App";
import "./index.css";
import { AuthGate } from "./components/auth/AuthGate";
import { RequireAuth } from "./components/routes/RequireAuth";
import { Home } from "./pages/Home";
import { Calories } from "./pages/Calories";
import { Workouts } from "./pages/Workouts";
import { Progress } from "./pages/Progress";
import { Profile } from "./types";

function HomeWithCtx() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  return <Home profile={profile} />;
}
function CaloriesWithCtx() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  return <Calories profile={profile} />;
}
function ProgressWithCtx() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  return <Progress profile={profile} />;
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/auth" element={<AuthGate />} />
      <Route path="/" element={<App />}>
        <Route
          index
          element={
            <RequireAuth>
              <HomeWithCtx />
            </RequireAuth>
          }
        />
        <Route
          path="calories"
          element={
            <RequireAuth>
              <CaloriesWithCtx />
            </RequireAuth>
          }
        />
        <Route
          path="workouts"
          element={
            <RequireAuth>
              <Workouts />
            </RequireAuth>
          }
        />
        <Route
          path="progress"
          element={
            <RequireAuth>
              <ProgressWithCtx />
            </RequireAuth>
          }
        />
      </Route>
    </Routes>
  </BrowserRouter>
);
