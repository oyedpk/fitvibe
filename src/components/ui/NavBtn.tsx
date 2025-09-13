import React from "react";
import { NavLink } from "react-router-dom";

export function NavBtn({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-xl px-3 py-2 text-sm ${isActive ? "bg-black text-white" : "bg-gray-100"}`
      }
    >
      {label}
    </NavLink>
  );
}
