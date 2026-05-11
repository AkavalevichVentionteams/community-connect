import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { slugify } from "@/lib/event-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/host/new")({
  component: NewHostPage,
});

function NewHostPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", bio: "", contact_email: "", logo_url: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", search: { redirect: "/host/new" } });
    if (user) setForm((f) => ({ ...f, contact_email: f.contact_email || user.email || "" }));
  }, [user, loading]);

  async function uploadLogo(f: File) {
    if (!user) return;
    const path = `logos/${user.id}-${Date.now()}-${f.name}`;
    const { error } = await supabase.storage.from("event-assets").upload(path, f);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("event-assets").getPublicUrl(path);
    setForm((s) => ({ ...s, logo_url: data.publicUrl }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const baseSlug = slugify(form.name) || "host";
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase.from("hosts").insert({ ...form, slug, owner_id: user.id }).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    await supabase.from("host_members").insert({ host_id: data.id, user_id: user.id, role: "host" });
    toast.success("Host created");
    nav({ to: "/host/$slug/dashboard", params: { slug: data.slug } });
  }

  if (!user) return null;
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Become a host</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder="Host / organization name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <textarea className="w-full border rounded px-3 py-2" placeholder="Short bio" maxLength={280} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        <div className="text-xs text-muted-foreground -mt-2">{form.bio.length}/280</div>
        <input className="w-full border rounded px-3 py-2" type="email" placeholder="Contact email" required value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
        <label className="block text-sm">Logo
          <input type="file" accept="image/*" onChange={(e) => e.target.files && uploadLogo(e.target.files[0])} />
        </label>
        {form.logo_url && <img src={form.logo_url} className="w-20 h-20 rounded-full object-cover" />}
        <button disabled={busy} className="w-full rounded bg-primary text-primary-foreground py-2 font-medium">{busy ? "…" : "Create host"}</button>
      </form>
    </div>
  );
}