import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "/" }),
  component: SignupPage,
});

function SignupPage() {
  const nav = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password: pw,
      options: { data: { display_name: name }, emailRedirectTo: window.location.origin }
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    nav({ to: redirect });
  }

  return (
    <div className="max-w-sm mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-6">Create an account</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="w-full border rounded px-3 py-2" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" type="password" required placeholder="Password (min 6)" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} />
        <button disabled={busy} className="w-full rounded bg-primary text-primary-foreground py-2 font-medium">{busy ? "…" : "Create account"}</button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        Have an account? <Link to="/login" search={{ redirect }} className="underline">Sign in</Link>
      </p>
    </div>
  );
}