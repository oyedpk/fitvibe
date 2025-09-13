import React, { useState } from "react";
import { supabase, siteUrl } from "../../supabaseClient";
import { Input } from "../ui/Input";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offerResend, setOfferResend] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setOfferResend(false);
    if (!email) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: siteUrl, // e.g. https://fitvibe.vercel.app
        shouldCreateUser: false,  // ❗ sign-in must NOT create new users
      },
    });
    setLoading(false);

    if (error) {
      const m = error.message || "";
      // Friendly messages for common cases
      if (/confirm|verified/i.test(m)) {
        setErr("Your email isn’t confirmed yet.");
        setOfferResend(true); // show the Resend button below
      } else if (/not found|exist|signup/i.test(m)) {
        setErr("No account found for that email. Please sign up first.");
      } else {
        setErr(m);
      }
      return;
    }

    setMsg("Magic link sent. Check your email.");
  }

  async function resendConfirmation() {
    setMsg(null);
    setErr(null);
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: siteUrl },
    });
    setLoading(false);
    if (error) setErr(error.message || "Couldn’t resend confirmation.");
    else setMsg("Confirmation email re-sent. Check your inbox.");
  }

  return (
    <form onSubmit={signIn} className="grid gap-3">
      <Input label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <button className="rounded-xl bg-black text-white px-4 py-2" disabled={loading}>
        {loading ? "Sending..." : "Send magic link"}
      </button>
      {msg && <div className="text-xs text-green-700">{msg}</div>}
      {err && <div className="text-xs text-red-600">{err}</div>}
      {offerResend && (
        <button
          type="button"
          onClick={resendConfirmation}
          className="text-xs underline text-gray-700 justify-self-start"
          disabled={loading}
        >
          Resend confirmation email
        </button>
      )}
      <div className="text-xs text-gray-600">We’ll email you a sign-in link.</div>
    </form>
  );
}
