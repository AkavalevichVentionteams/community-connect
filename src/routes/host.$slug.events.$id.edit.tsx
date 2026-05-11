import { createFileRoute } from "@tanstack/react-router";
import EventEditor from "@/components/EventEditor";

export const Route = createFileRoute("/host/$slug/events/$id/edit")({
  component: EditEvent,
});

function EditEvent() {
  const { slug, id } = Route.useParams();
  return <EventEditor slug={slug} eventId={id} />;
}