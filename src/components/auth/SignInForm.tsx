import React, { useState } from "react";
import { supabase, siteUrl } from "../../supabaseClient";
import { Input } from "../ui/Input";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: siteUrl,
        shouldCreateUser: false, // ⛔ don't create users on sign-in
      },
    });

    if (error) {
      setErr("No account found for that email. Please sign up first.");
      return;
    }
    setMsg("Magic link sent. Check your email.");
  }

  return (
    <form onSubmit={signIn} className="grid gap-3">
      <Input label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <button className="rounded-xl bg-black text-white px-4 py-2">Send magic link</button>
      {msg && <div className="text-xs text-green-700">{msg}</div>}
      {err && <div className="text-xs text-red-600">{err}</div>}
      <div className="text-xs text-gray-600">We’ll email you a sign-in link.</div>
    </form>
  );
}
