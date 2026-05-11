import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AIChallenge2.0Task-2AKavalevich" },
      { name: "description", content: "Community Connect is a lightweight platform for hosting and attending free community events." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "AIChallenge2.0Task-2AKavalevich" },
      { property: "og:description", content: "Community Connect is a lightweight platform for hosting and attending free community events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "AIChallenge2.0Task-2AKavalevich" },
      { name: "twitter:description", content: "Community Connect is a lightweight platform for hosting and attending free community events." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5fd490e7-9413-4dd0-8fe3-3acd67241fa1/id-preview-91b04318--86567afc-0881-465c-bda8-69a84882bfbd.lovable.app-1778501127788.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5fd490e7-9413-4dd0-8fe3-3acd67241fa1/id-preview-91b04318--86567afc-0881-465c-bda8-69a84882bfbd.lovable.app-1778501127788.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SiteHeader />
        <main className="min-h-screen">
          <Outlet />
        </main>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function SiteHeader() {
  const { user } = useAuth();
  return (
    <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link to="/" className="font-bold text-lg tracking-tight text-primary">
          Communa
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link to="/explore" activeProps={{ className: "font-semibold" }}>Explore</Link>
          {user && <Link to="/tickets" activeProps={{ className: "font-semibold" }}>My Tickets</Link>}
          {user && <Link to="/my-events" activeProps={{ className: "font-semibold" }}>My Events</Link>}
          {user && <Link to="/host/new" activeProps={{ className: "font-semibold" }}>Become a Host</Link>}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-muted-foreground hidden sm:inline">{user.email}</span>
              <button
                className="px-3 py-1.5 rounded-md border hover:bg-muted"
                onClick={() => supabase.auth.signOut()}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-1.5 rounded-md hover:bg-muted">Sign in</Link>
              <Link to="/signup" className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
