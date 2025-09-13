import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/auth" state={{ from: loc }} replace />;
  return <>{children}</>;
}
