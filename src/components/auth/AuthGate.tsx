import React, { useState } from "react";
import { motion } from "framer-motion";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";

export function AuthGate() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const { user, loading } = useAuth();

  // If already signed in (e.g., after magic link), go home
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 grid place-items-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-2xl border shadow-sm p-5"
      >
        <div className="flex gap-2 mb-4">
          <button
            className={`px-3 py-2 rounded-xl ${tab === "signin" ? "bg-black text-white" : "bg-gray-100"}`}
            onClick={() => setTab("signin")}
          >
            Sign in
          </button>
          <button
            className={`px-3 py-2 rounded-xl ${tab === "signup" ? "bg-black text-white" : "bg-gray-100"}`}
            onClick={() => setTab("signup")}
          >
            Sign up
          </button>
        </div>
        {tab === "signin" ? <SignInForm /> : <SignUpForm />}
      </motion.div>
    </div>
  );
}
