import { useRouter } from "next/router";
import HelpRoom from "@/src/HelpRoom";

export default function HelpRoomPage() {
  const router = useRouter();
  const roomSlug = router.query.roomSlug;

  if (!roomSlug) return null;
  return <HelpRoom roomSlug={String(roomSlug)} />;
}
