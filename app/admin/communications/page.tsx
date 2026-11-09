import { requireCommunicationCenterUser } from "@/lib/communication-access";
import CommunicationCenterClient from "./CommunicationCenterClient";

export default async function CommunicationCenterPage({ searchParams }: { searchParams: Promise<{ kind?: string; taskId?: string }> }) {
  const user = await requireCommunicationCenterUser();
  const query = await searchParams;
  return <CommunicationCenterClient currentUser={{ id: user.id, name: user.name, role: user.role }}
    initialKind={query.kind === "COURSE_CHANGE" ? "COURSE_CHANGE" : "FEEDBACK"}
    initialTaskId={typeof query.taskId === "string" && /^[\w-]+$/.test(query.taskId) ? query.taskId : ""} />;
}
