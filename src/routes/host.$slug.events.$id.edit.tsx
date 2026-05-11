import { createFileRoute } from "@tanstack/react-router";
import EventEditor from "@/components/EventEditor";
import { HostRoleGate } from "@/components/HostRoleGate";

export const Route = createFileRoute("/host/$slug/events/$id/edit")({
  component: EditEvent,
});

function EditEvent() {
  const { slug, id } = Route.useParams();
  return (
    <HostRoleGate
      slug={slug}
      allow={["host"]}
      redirectPath={`/host/${slug}/events/${id}/edit`}
    >
      {() => <EventEditor slug={slug} eventId={id} />}
    </HostRoleGate>
  );
}