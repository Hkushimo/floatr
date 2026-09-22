import HelpRoom from "@/src/HelpRoom";
import { Page, Panel, PrimaryLink } from "@/src/ui";

export default function FourOhFour() {
  if (typeof window !== "undefined") {
    const match = window.location.pathname.match(/\/help\/([^/]+)\/?$/);
    if (match) return <HelpRoom roomSlug={decodeURIComponent(match[1])} />;
  }

  return (
    <Page title="Not found">
      <Panel>
        <h1>That page is not here.</h1>
        <PrimaryLink href="/">Back to Floatr</PrimaryLink>
      </Panel>
    </Page>
  );
}
