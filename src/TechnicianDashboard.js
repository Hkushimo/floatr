import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LogOut, Radio, RefreshCcw, UserCheck } from "lucide-react";
import { fetchOpenRequestsForTechnician } from "@/src/data";
import { supabase } from "@/src/supabase";
import { Button, Page, Panel, TextInput, StatusPill } from "@/src/ui";

const SESSION_KEY = "floatr_technician";

export default function TechnicianDashboard() {
  const [session, setSession] = useState(null);
  const [accessCode, setAccessCode] = useState("");
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (stored) setSession(JSON.parse(stored));
    setStatus("ready");
  }, []);

  useEffect(() => {
    if (!session?.id) return;
    loadRequests(session.id);
    const channel = supabase
      .channel(`floatr-tech-${session.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => {
        loadRequests(session.id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "request_claims" }, () => {
        loadRequests(session.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  async function loadRequests(technicianId = session?.id) {
    if (!technicianId) return;
    setStatus("loading");
    try {
      const data = await fetchOpenRequestsForTechnician(technicianId);
      setRequests(data);
      setStatus("ready");
    } catch (error) {
      setMessage(error.message);
      setStatus("ready");
    }
  }

  async function login(event) {
    event.preventDefault();
    setMessage("");
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .eq("access_code", accessCode.trim())
      .maybeSingle();

    if (error || !data) {
      setMessage("Could not find that technician code.");
      return;
    }

    window.localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    setSession(data);
  }

  function logout() {
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setRequests([]);
  }

  async function claim(requestId) {
    if (!session) return;
    const { error } = await supabase.from("request_claims").upsert(
      {
        request_id: requestId,
        technician_id: session.id,
      },
      { onConflict: "request_id,technician_id" }
    );
    if (error) setMessage(error.message);
    await loadRequests();
  }

  async function resolve(requestId) {
    const { error } = await supabase
      .from("requests")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", requestId);
    if (error) setMessage(error.message);
    await loadRequests();
  }

  const openCount = useMemo(() => requests.length, [requests]);

  if (!session) {
    return (
      <Page title="Technician Login" subtitle="Enter the access code from the event admin.">
        <form className="stack" onSubmit={login}>
          <Panel>
            <label className="label" htmlFor="code">
              Technician code
            </label>
            <TextInput
              id="code"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              autoComplete="one-time-code"
              placeholder="Example: AV-1248"
              required
            />
          </Panel>
          {message && <div className="notice danger">{message}</div>}
          <Button type="submit" disabled={status === "loading"}>
            <UserCheck size={18} />
            Log in
          </Button>
        </form>
      </Page>
    );
  }

  return (
    <Page title="Open Requests" subtitle={`${session.name} · ${openCount} open`}>
      <div className="toolbar">
        <Button type="button" className="secondary" onClick={() => loadRequests()}>
          <RefreshCcw size={17} />
          Refresh
        </Button>
        <Button type="button" className="ghost" onClick={logout}>
          <LogOut size={17} />
          Out
        </Button>
      </div>

      {message && <div className="notice danger">{message}</div>}

      <div className="stack">
        {requests.length === 0 && (
          <Panel>
            <Radio size={24} />
            <h2>No open calls</h2>
            <p className="muted">New assigned room requests will appear here live.</p>
          </Panel>
        )}

        {requests.map((request) => {
          const claims = request.request_claims || [];
          const claimedByMe = claims.some((claim) => claim.technician_id === session.id);
          return (
            <Panel key={request.id}>
              <div className="request-head">
                <div>
                  <h2>{request.rooms?.name || "Room"}</h2>
                  <p className="muted">
                    {new Date(request.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <StatusPill tone={claimedByMe ? "active" : "neutral"}>{request.category}</StatusPill>
              </div>
              {request.description && <p>{request.description}</p>}
              <p className="muted">
                Claimed by:{" "}
                {claims.length
                  ? claims.map((claim) => claim.technicians?.name || "Technician").join(", ")
                  : "Nobody yet"}
              </p>
              <div className="button-row">
                <Button type="button" className="secondary" onClick={() => claim(request.id)}>
                  <UserCheck size={18} />
                  {claimedByMe ? "You're on it" : "I'm on it"}
                </Button>
                <Button type="button" onClick={() => resolve(request.id)}>
                  <CheckCircle2 size={18} />
                  Resolved
                </Button>
              </div>
            </Panel>
          );
        })}
      </div>
    </Page>
  );
}
