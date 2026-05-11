import { createFileRoute, useNavigate } from "@tanstack/react-router";
import EventEditor from "@/components/EventEditor";
import { HostRoleGate } from "@/components/HostRoleGate";

export const Route = createFileRoute("/host/$slug/events/new")({
  component: NewEvent,
});

function NewEvent() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  return (
    <HostRoleGate slug={slug} allow={["host"]} redirectPath={`/host/${slug}/events/new`}>
      {() => (
        <EventEditor
          slug={slug}
          onSaved={(id) =>
            nav({ to: "/host/$slug/events/$id/edit", params: { slug, id } })
          }
        />
      )}
    </HostRoleGate>
  );
}