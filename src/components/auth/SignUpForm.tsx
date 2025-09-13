async function signUp(e: React.FormEvent) {
  e.preventDefault();
  if (!email) return;

  // Use OTP to CREATE the user + send magic link (no password required)
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,           // ✅ create account if it doesn't exist
      emailRedirectTo: siteUrl,         // e.g. https://yourapp.vercel.app
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

  if (error) {
    alert(error.message);
  } else {
    alert("Check your email to confirm and sign in.");
  }
}
