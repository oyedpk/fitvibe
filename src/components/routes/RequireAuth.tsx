import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  // Wait until we know if a session exists (prevents redirect loop)
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-gray-500">
        Checking session…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: loc }} replace />;
  }

  return <>{children}</>;
}
