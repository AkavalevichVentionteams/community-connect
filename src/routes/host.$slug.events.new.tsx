import { createFileRoute, useNavigate } from "@tanstack/react-router";
import EventEditor from "@/components/EventEditor";

export const Route = createFileRoute("/host/$slug/events/new")({
  component: NewEvent,
});

function NewEvent() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  return <EventEditor slug={slug} onSaved={(id) => nav({ to: "/host/$slug/events/$id/edit", params: { slug, id } })} />;
}