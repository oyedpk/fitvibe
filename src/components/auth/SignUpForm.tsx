import React, { useState } from "react";
import { supabase, siteUrl } from "../../supabaseClient";
import { Activity, Goal } from "../../types";
import { Input } from "../ui/Input";
import { NumberInput } from "../ui/Number";
import { Select } from "../ui/Select";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(30);
  const [height, setHeight] = useState<number>(175);
  const [weight, setWeight] = useState<number>(77);
  const [activity, setActivity] = useState<Activity>("moderate");
  const [goal, setGoal] = useState<Goal>("fatLoss");
  const [proteinPerKg, setProteinPerKg] = useState<number>(2);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (!email) return;

    setLoading(true);
    // Passwordless sign-up: create user + send magic link (no password)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,     // ✅ create account if it doesn't exist
        emailRedirectTo: siteUrl,   // e.g. https://yourapp.vercel.app
        data: {
          name,
          age,
          height_cm: height,
          weight_kg: weight,
          activity,
          goal,
          protein_per_kg: proteinPerKg,
        },
      },
    });
    setLoading(false);

    if (error) {
      setErr(error.message ?? "Something went wrong.");
    } else {
      setMsg("Check your email to confirm and sign in.");
    }
  }

  return (
    <form onSubmit={signUp} className="grid grid-cols-2 gap-3">
      <Input
        label="Email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        className="col-span-2"
      />
      <Input label="Name" value={name} onChange={setName} />
      <NumberInput label="Age" value={age} onChange={setAge} />
      <NumberInput label="Height (cm)" value={height} onChange={setHeight} />
      <NumberInput label="Weight (kg)" value={weight} onChange={setWeight} />
      <Select
        label="Activity"
        value={activity}
        onChange={(v) => setActivity(v as Activity)}
        options={[
          { value: "sedentary", label: "Sedentary" },
          { value: "light", label: "Light" },
          { value: "moderate", label: "Moderate" },
          { value: "active", label: "Active" },
          { value: "veryActive", label: "Very Active" },
        ]}
      />
      <Select
        label="Goal"
        value={goal}
        onChange={(v) => setGoal(v as Goal)}
        options={[
          { value: "fatLoss", label: "Fat Loss" },
          { value: "maintain", label: "Maintain" },
          { value: "gain", label: "Gain" },
        ]}
      />
      <NumberInput
        label="Protein (g/kg)"
        step={0.1}
        value={proteinPerKg}
        onChange={setProteinPerKg}
      />

      <button
        className="col-span-2 rounded-xl bg-black text-white px-4 py-2"
        disabled={loading}
      >
        {loading ? "Sending..." : "Create account"}
      </button>

      {msg && <div className="col-span-2 text-xs text-green-700">{msg}</div>}
      {err && <div className="col-span-2 text-xs text-red-600">{err}</div>}

      <div className="col-span-2 text-xs text-gray-600">
        We’ll email you a link. On first login we’ll create your profile from these details.
      </div>
    </form>
  );
}
