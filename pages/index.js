import Link from "next/link";
import { QrCode, ShieldCheck } from "lucide-react";
import { Page, Muted } from "@/src/ui";

export default function Home() {
  return (
    <Page title="Floatr" subtitle="Temporary AV help desk for corporate event rooms." logoOnly>
      <div className="stack landing-stack">
        <div className="grid-two">
          <Link className="nav-tile" href="/technician/">
            <ShieldCheck size={22} />
            <span>Technician dashboard</span>
          </Link>
          <Link className="nav-tile" href="/admin/">
            <QrCode size={22} />
            <span>Admin setup</span>
          </Link>
        </div>

        <Muted>
          Room links look like <code>/help/ballroom-a</code>. Direct QR opens are supported on GitHub Pages.
        </Muted>
      </div>
    </Page>
  );
}
