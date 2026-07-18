import { requireCommunicationCenterUser } from "@/lib/communication-access";
import CommunicationCenterClient from "./CommunicationCenterClient";

export default async function CommunicationCenterPage() {
  const user = await requireCommunicationCenterUser();
  return <CommunicationCenterClient currentUser={{ id: user.id, name: user.name, role: user.role }} />;
}
