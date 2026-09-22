import { useEffect, useMemo, useState } from "react";
import { Send, Wrench } from "lucide-react";
import { CATEGORIES } from "@/src/data";
import { supabase } from "@/src/supabase";
import { Button, Page, Panel, TextArea } from "@/src/ui";

export default function HelpRoom({ roomSlug }) {
  const [room, setRoom] = useState(null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");

  const decodedSlug = useMemo(() => decodeURIComponent(roomSlug || ""), [roomSlug]);

  useEffect(() => {
    let alive = true;
    async function loadRoom() {
      setState("loading");
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, slug, events(name)")
        .eq("slug", decodedSlug)
        .maybeSingle();

      if (!alive) return;
      if (error || !data) {
        setState("missing");
        return;
      }
      setRoom(data);
      setState("ready");
    }
    if (decodedSlug) loadRoom();
    return () => {
      alive = false;
    };
  }, [decodedSlug]);

  async function submitRequest(event) {
    event.preventDefault();
    if (!room) return;

    setState("saving");
    setMessage("");
    const { error } = await supabase.from("requests").insert({
      room_id: room.id,
      category,
      description: description.trim() || null,
      status: "open",
    });

    if (error) {
      setMessage(error.message);
      setState("ready");
      return;
    }

    setDescription("");
    setMessage("Request sent. A technician will head your way.");
    setState("sent");
    window.setTimeout(() => setState("ready"), 2200);
  }

  if (state === "loading") {
    return (
      <Page title="Loading room">
        <Panel>Loading room...</Panel>
      </Page>
    );
  }

  if (state === "missing") {
    return (
      <Page title="Room not found">
        <Panel>
          <h1>Room not found</h1>
          <p className="muted">Check the QR code or ask the event team for a fresh room link.</p>
        </Panel>
      </Page>
    );
  }

  return (
    <Page title={room.name} subtitle={room.events?.name || "AV assistance"}>
      <form className="stack" onSubmit={submitRequest}>
        <Panel>
          <div className="brand-mark">
            <Wrench size={28} />
          </div>
          <h1>Need AV help?</h1>
          <p className="lead">{room.name}</p>
        </Panel>

        <Panel>
          <label className="label">What needs attention?</label>
          <div className="choice-grid">
            {CATEGORIES.map((option) => (
              <button
                type="button"
                key={option}
                className={`choice ${category === option ? "selected" : ""}`}
                onClick={() => setCategory(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <label className="label" htmlFor="description">
            Optional note
          </label>
          <TextArea
            id="description"
            maxLength={180}
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Example: projector is blank, wireless mic 2 is low"
          />
          <div className="counter">{description.length}/180</div>
        </Panel>

        {message && <div className="notice">{message}</div>}

        <Button type="submit" disabled={state === "saving" || state === "sent"}>
          <Send size={18} />
          {state === "saving" ? "Sending..." : state === "sent" ? "Sent" : "Request help"}
        </Button>
      </form>
    </Page>
  );
}
