import { requireResourceUser } from "@/lib/auth";
import { getLang } from "@/lib/i18n";
import { readNetwork, mayLinkStudent } from "@/lib/sales-network";
import {
  customerTeamManager,
  eligibleCustomerUsers,
  type CustomerScope,
} from "@/lib/customer-access";
import CustomerDesk from "./CustomerDesk";
export default async function NetworkPage({
  searchParams,
}: {
  searchParams?: Promise<{ scope?: string; owner?: string }>;
}) {
  const actor = await requireResourceUser(),
    lang = await getLang(),
    manager = await customerTeamManager(actor),
    sp = await searchParams;
  const scope: CustomerScope =
    sp?.scope === "team" && manager
      ? "team"
      : sp?.scope === "collaborating"
        ? "collaborating"
        : sp?.scope === "mine"
          ? "mine"
          : manager
            ? "team"
            : "mine";
  const owner = scope === "team" ? String(sp?.owner ?? "") : "";
  const [view, users] = await Promise.all([
    readNetwork(actor, { scope, ownerId: owner }),
    eligibleCustomerUsers(),
  ]);
  return (
    <CustomerDesk
      lang={lang}
      view={view}
      users={users}
      scope={scope}
      manager={manager}
      actorId={actor.id}
      ownerFilter={owner}
      readOnly={Boolean(actor.isObserver)}
      canLinkStudent={mayLinkStudent(actor)}
    />
  );
}
