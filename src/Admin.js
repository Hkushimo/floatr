import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CalendarPlus, DoorOpen, FileText, Link as LinkIcon, Pencil, Power, Radio, Trash2, UserPlus, UsersRound, X } from "lucide-react";
import { fetchAdminData, slugify } from "@/src/data";
import { absoluteRoomUrl } from "@/src/routes";
import { supabase } from "@/src/supabase";
import { Button, Page, Panel, Select, TextInput } from "@/src/ui";

const ADMIN_SESSION_KEY = "floatr_admin_unlocked";
const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE || "floatr-admin";

export default function Admin() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [data, setData] = useState({ events: [], rooms: [], technicians: [], assignments: [], openRequests: [], allRequests: [] });
  const [eventName, setEventName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomSlug, setRoomSlug] = useState("");
  const [roomEventId, setRoomEventId] = useState("");
  const [techName, setTechName] = useState("");
  const [techCode, setTechCode] = useState("");
  const [assignmentRoomId, setAssignmentRoomId] = useState("");
  const [assignmentTechId, setAssignmentTechId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setIsUnlocked(window.localStorage.getItem(ADMIN_SESSION_KEY) === "true");
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;
    load();
    const channel = supabase
      .channel("floatr-admin-open-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "request_claims" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isUnlocked]);

  useEffect(() => {
    setRoomSlug(slugify(roomName));
  }, [roomName]);

  async function load() {
    try {
      setData(await fetchAdminData());
    } catch (error) {
      setMessage(error.message);
    }
  }

  function unlockAdmin(event) {
    event.preventDefault();
    if (adminCode.trim() !== ADMIN_CODE) {
      setMessage("Incorrect admin code.");
      return;
    }
    window.localStorage.setItem(ADMIN_SESSION_KEY, "true");
    setMessage("");
    setIsUnlocked(true);
  }

  function lockAdmin() {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    setIsUnlocked(false);
    setAdminCode("");
    setData({ events: [], rooms: [], technicians: [], assignments: [], openRequests: [], allRequests: [] });
  }

  async function run(action, done) {
    setMessage("");
    const { error } = await action();
    if (error) {
      setMessage(error.message);
      return;
    }
    done?.();
    await load();
  }

  async function addEvent(event) {
    event.preventDefault();
    await run(
      () => supabase.from("events").insert({ name: eventName.trim() }),
      () => setEventName("")
    );
  }

  async function addRoom(event) {
    event.preventDefault();
    await run(
      () =>
        supabase.from("rooms").insert({
          event_id: roomEventId,
          name: roomName.trim(),
          slug: roomSlug.trim(),
        }),
      () => {
        setRoomName("");
        setRoomSlug("");
      }
    );
  }

  async function addTechnician(event) {
    event.preventDefault();
    await run(
      () => supabase.from("technicians").insert({ name: techName.trim(), access_code: techCode.trim() }),
      () => {
        setTechName("");
        setTechCode("");
      }
    );
  }

  async function assignRoom(event) {
    event.preventDefault();
    await run(
      () =>
        supabase.from("room_assignments").upsert(
          {
            room_id: assignmentRoomId,
            technician_id: assignmentTechId,
          },
          { onConflict: "room_id,technician_id" }
        ),
      () => {
        setAssignmentRoomId("");
        setAssignmentTechId("");
      }
    );
  }

  async function editEvent(eventRecord) {
    const name = window.prompt("Event name", eventRecord.name);
    if (!name?.trim()) return;
    await run(() => supabase.from("events").update({ name: name.trim() }).eq("id", eventRecord.id));
  }

  async function editRoom(room) {
    const name = window.prompt("Room name", room.name);
    if (!name?.trim()) return;
    const slug = window.prompt("Room URL slug", room.slug);
    if (!slug?.trim()) return;
    await run(() =>
      supabase
        .from("rooms")
        .update({ name: name.trim(), slug: slugify(slug) })
        .eq("id", room.id)
    );
  }

  async function editTechnician(technician) {
    const name = window.prompt("Technician name", technician.name);
    if (!name?.trim()) return;
    const accessCode = window.prompt("Technician access code", technician.access_code);
    if (!accessCode?.trim()) return;
    await run(() =>
      supabase
        .from("technicians")
        .update({ name: name.trim(), access_code: accessCode.trim() })
        .eq("id", technician.id)
    );
  }

  async function deleteRecord(table, id, label) {
    if (table === "events") {
      await clearShow(`Delete ${label} and clear the whole show? Download the EOD report first if you need it.`);
      return;
    }

    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    await run(() => supabase.from(table).delete().eq("id", id));
  }

  function generateReportText() {
    const requests = data.allRequests;
    const eventNames = [...new Set(data.events.map((event) => event.name))].join(", ") || "Floatr event";
    const resolved = requests.filter((request) => request.status === "resolved");
    const open = requests.filter((request) => request.status !== "resolved");
    const byCategory = countBy(requests, (request) => request.category);
    const byRoom = countBy(requests, (request) => request.rooms?.name || "Unknown room");

    const lines = [
      "Floatr EOD Report",
      eventNames,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "Summary",
      `Total calls: ${requests.length}`,
      `Resolved: ${resolved.length}`,
      `Still open at report time: ${open.length}`,
      "",
      "Calls by category",
      ...formatCounts(byCategory),
      "",
      "Calls by room",
      ...formatCounts(byRoom),
      "",
      "Call log",
      ...requests.map((request, index) => {
        const claims = request.request_claims || [];
        const claimedBy = claims.length
          ? claims.map((claim) => claim.technicians?.name || "Technician").join(", ")
          : "Nobody";
        const created = new Date(request.created_at).toLocaleString();
        const resolvedAt = request.resolved_at ? new Date(request.resolved_at).toLocaleString() : "";
        return [
          `${index + 1}. ${request.rooms?.name || "Unknown room"} · ${request.category} · ${request.status}`,
          `   Opened: ${created}`,
          resolvedAt ? `   Resolved: ${resolvedAt}` : "   Resolved: -",
          `   Claimed by: ${claimedBy}`,
          `   Note: ${request.description || "-"}`,
        ].join("\n");
      }),
      "",
    ];

    return lines.join("\n");
  }

  function downloadEodReport() {
    const report = generateReportText();
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `floatr-eod-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function endShow() {
    const totalRecords =
      data.allRequests.length +
      data.assignments.length +
      data.rooms.length +
      data.events.length +
      data.technicians.length;

    await clearShow(
      `End the show and clear ${totalRecords} setup/call record${totalRecords === 1 ? "" : "s"}? Download the EOD report first if you need it.`
    );
  }

  async function clearShow(confirmMessage) {
    if (!window.confirm(confirmMessage)) return;
    setMessage("");
    const { error } = await supabase.rpc("reset_show");
    if (error) {
      setMessage(`Could not clear show: ${error.message}`);
      return;
    }

    setEventName("");
    setRoomName("");
    setRoomSlug("");
    setRoomEventId("");
    setTechName("");
    setTechCode("");
    setAssignmentRoomId("");
    setAssignmentTechId("");

    try {
      const freshData = await fetchAdminData();
      setData(freshData);
      const remaining =
        freshData.allRequests.length +
        freshData.assignments.length +
        freshData.rooms.length +
        freshData.events.length +
        freshData.technicians.length;

      setMessage(
        remaining === 0
          ? "Floatr is cleared for the next event."
          : `Tried to end show, but ${remaining} record${remaining === 1 ? "" : "s"} still remain. Check Supabase delete policies.`
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  function countBy(items, getKey) {
    return items.reduce((counts, item) => {
      const key = getKey(item);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function formatCounts(counts) {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return entries.length ? entries.map(([name, count]) => `- ${name}: ${count}`) : ["- None"];
  }

  return (
    <Page title="Admin" subtitle="Live calls first. Setup stays close when the event changes.">
      {message && <div className="notice danger">{message}</div>}

      {!isUnlocked ? (
        <form className="stack" onSubmit={unlockAdmin}>
          <Panel>
            <label className="label" htmlFor="admin-code">
              Admin code
            </label>
            <TextInput
              id="admin-code"
              type="password"
              value={adminCode}
              onChange={(event) => setAdminCode(event.target.value)}
              placeholder="Enter admin code"
              autoComplete="current-password"
              required
            />
          </Panel>
          <Button type="submit">Unlock admin</Button>
        </form>
      ) : (
        <>
          <div className="toolbar">
            <Button type="button" className="ghost" onClick={lockAdmin}>
              Lock admin
            </Button>
          </div>

          <div className="stack">
            <Panel className="command-panel">
          <div className="section-title">
            <h2>
              <Radio size={19} /> Open Calls
            </h2>
            <div className="metric">{data.openRequests.length}</div>
          </div>
          <div className="admin-call-list">
            {data.openRequests.length === 0 && <p className="muted">No open requests right now.</p>}
            {data.openRequests.map((request) => {
              const claims = request.request_claims || [];
              return (
                <div className="admin-call" key={request.id}>
                  <div className="request-head">
                    <div>
                      <strong>{request.rooms?.name || "Room"}</strong>
                      <p className="muted">
                        {request.category} · {new Date(request.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className="pill pill-neutral">{request.rooms?.events?.name || "Event"}</span>
                  </div>
                  {request.description && <p>{request.description}</p>}
                  <p className="muted">
                    Claimed by:{" "}
                    {claims.length
                      ? claims.map((claim) => claim.technicians?.name || "Technician").join(", ")
                      : "Nobody yet"}
                  </p>
                </div>
              );
            })}
          </div>
            </Panel>

            <Panel>
          <h2>
            <FileText size={19} /> Show Closeout
          </h2>
          <div className="closeout-grid">
            <div className="closeout-stat">
              <span>{data.allRequests.length}</span>
              <small>Total calls</small>
            </div>
            <div className="closeout-stat">
              <span>{data.openRequests.length}</span>
              <small>Open now</small>
            </div>
          </div>
          <div className="button-row">
            <Button type="button" className="secondary" onClick={downloadEodReport}>
              <FileText size={18} />
              EOD report
            </Button>
            <Button type="button" className="danger-button" onClick={endShow}>
              <Power size={18} />
              End show
            </Button>
          </div>
            </Panel>

            <div className="setup-grid">
              <Panel>
            <h2>
              <CalendarPlus size={19} /> Event
            </h2>
            <form className="form-row" onSubmit={addEvent}>
              <TextInput value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Event name" required />
              <Button type="submit">Add</Button>
            </form>
            <div className="admin-list">
              {data.events.map((event) => (
                <div className="admin-row" key={event.id}>
                  <span>{event.name}</span>
                  <div className="admin-actions">
                    <button type="button" className="icon-action" onClick={() => editEvent(event)} aria-label={`Edit ${event.name}`}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="icon-action danger-action" onClick={() => deleteRecord("events", event.id, event.name)} aria-label={`Delete ${event.name}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
              </Panel>

              <Panel>
            <h2>
              <DoorOpen size={19} /> Room
            </h2>
            <form className="stack small" onSubmit={addRoom}>
              <Select value={roomEventId} onChange={(event) => setRoomEventId(event.target.value)} required>
                <option value="">Select event</option>
                {data.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </Select>
              <TextInput value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="Room name" required />
              <TextInput value={roomSlug} onChange={(event) => setRoomSlug(slugify(event.target.value))} placeholder="room-slug" required />
              <Button type="submit">Create room</Button>
            </form>
            <div className="admin-list">
              {data.rooms.map((room) => (
                <div className="admin-row" key={room.id}>
                  <span>
                    {room.name}
                    <small>{room.slug}</small>
                  </span>
                  <div className="admin-actions">
                    <button type="button" className="icon-action" onClick={() => editRoom(room)} aria-label={`Edit ${room.name}`}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="icon-action danger-action" onClick={() => deleteRecord("rooms", room.id, room.name)} aria-label={`Delete ${room.name}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
              </Panel>

              <Panel>
            <h2>
              <UserPlus size={19} /> Technician
            </h2>
            <form className="stack small" onSubmit={addTechnician}>
              <TextInput value={techName} onChange={(event) => setTechName(event.target.value)} placeholder="Technician name" required />
              <TextInput value={techCode} onChange={(event) => setTechCode(event.target.value)} placeholder="Access code" required />
              <Button type="submit">Create technician</Button>
            </form>
            <div className="admin-list">
              {data.technicians.map((technician) => (
                <div className="admin-row" key={technician.id}>
                  <span>
                    {technician.name}
                    <small>{technician.access_code}</small>
                  </span>
                  <div className="admin-actions">
                    <button type="button" className="icon-action" onClick={() => editTechnician(technician)} aria-label={`Edit ${technician.name}`}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="icon-action danger-action" onClick={() => deleteRecord("technicians", technician.id, technician.name)} aria-label={`Delete ${technician.name}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
              </Panel>

              <Panel>
            <h2>
              <UsersRound size={19} /> Assignment
            </h2>
            <form className="stack small" onSubmit={assignRoom}>
              <Select value={assignmentRoomId} onChange={(event) => setAssignmentRoomId(event.target.value)} required>
                <option value="">Select room</option>
                {data.rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </Select>
              <Select value={assignmentTechId} onChange={(event) => setAssignmentTechId(event.target.value)} required>
                <option value="">Select technician</option>
                {data.technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </Select>
              <Button type="submit">Assign</Button>
            </form>
            <div className="admin-list">
              {data.assignments.map((assignment) => (
                <div className="admin-row" key={assignment.id}>
                  <span>
                    {assignment.rooms?.name || "Room"}
                    <small>{assignment.technicians?.name || "Technician"}</small>
                  </span>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="icon-action danger-action"
                      onClick={() => deleteRecord("room_assignments", assignment.id, "this assignment")}
                      aria-label="Remove assignment"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
              </Panel>
            </div>

            <Panel>
          <h2>
            <LinkIcon size={19} /> Room QR Codes
          </h2>
          <div className="qr-list">
            {data.rooms.map((room) => {
              const url = absoluteRoomUrl(room.slug);
              return (
                <div className="qr-card" key={room.id}>
                  <QRCodeSVG value={url} size={116} />
                  <div>
                    <strong>{room.name}</strong>
                    <p>{room.events?.name}</p>
                    <a href={url}>{url}</a>
                  </div>
                </div>
              );
            })}
          </div>
            </Panel>
          </div>
        </>
      )}
    </Page>
  );
}
