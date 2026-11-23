import { requireResourceUser } from "@/lib/auth";
import { getLang } from "@/lib/i18n";
import {
  readNetwork,
  networkPreview,
  mayLinkStudent,
} from "@/lib/sales-network";
import NetworkWorkspace from "./NetworkWorkspace";
export default async function NetworkPage() {
  const actor = await requireResourceUser(),
    lang = await getLang();
  const [view, preview] = await Promise.all([
    readNetwork(actor),
    networkPreview(actor),
  ]);
  return (
    <NetworkWorkspace
      lang={lang}
      view={view}
      preview={preview.store}
      defaults={preview.defaults}
      suggestions={preview.suggestions}
      readOnly={Boolean(actor.isObserver)}
      canLinkStudent={mayLinkStudent(actor)}
    />
  );
}
