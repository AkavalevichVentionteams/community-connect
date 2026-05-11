import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useHostRole, type HostRole } from "@/lib/use-host-role";

interface Props {
  slug: string;
  /** Roles allowed to view the gated content. */
  allow: Array<"host" | "checker">;
  /** Where to send the user after sign-in if they are anonymous. */
  redirectPath: string;
  children: (ctx: {
    host: NonNullable<ReturnType<typeof useHostRole>["host"]>;
    role: HostRole;
  }) => ReactNode;
}

/**
 * Renders children only when the viewer holds one of the allowed roles for
 * the given host. Otherwise shows an explicit, role-appropriate message.
 */
export function HostRoleGate({ slug, allow, redirectPath, children }: Props) {
  const { loading, host, role, isAuthed } = useHostRole(slug);
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthed) {
      nav({ to: "/login", search: { redirect: redirectPath } });
    }
  }, [loading, isAuthed]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }
  if (!host) {
    return (
      <Centered title="Host not found">
        We couldn't find a host at <code className="font-mono">/hosts/{slug}</code>.
        <BackHome />
      </Centered>
    );
  }
  if (!isAuthed) return null; // redirecting

  if (!role) {
    return (
      <Centered title="You're not a member of this host">
        Ask a Host of <b>{host.name}</b> to invite you. Hosts can generate
        invite links from their dashboard.
        <BackHome />
      </Centered>
    );
  }

  if (!allow.includes(role)) {
    const need = allow.join(" or ");
    const yours = role;
    return (
      <Centered title="Not enough access">
        This page requires the <b>{need}</b> role for <b>{host.name}</b>.
        Your role here is <b>{yours}</b>.
        {yours === "checker" && (
          <p className="text-sm text-muted-foreground mt-2">
            Checkers can only open the check-in pages. Browse{" "}
            <Link to="/my-events" className="underline">My Events</Link>{" "}
            to find events you can check in.
          </p>
        )}
        <BackHome />
      </Centered>
    );
  }

  return <>{children({ host, role })}</>;
}

function Centered({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="mt-3 text-muted-foreground">{children}</div>
    </div>
  );
}

function BackHome() {
  return (
    <div className="mt-6">
      <Link to="/" className="underline">Back to home</Link>
    </div>
  );
}