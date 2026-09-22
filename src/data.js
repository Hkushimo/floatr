import { supabase } from "@/src/supabase";

export const CATEGORIES = ["Audio", "Video/Display", "Microphone", "Other"];

export function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function fetchOpenRequestsForTechnician(technicianId) {
  const { data: assignments, error: assignmentError } = await supabase
    .from("room_assignments")
    .select("room_id")
    .eq("technician_id", technicianId);

  if (assignmentError) throw assignmentError;
  const roomIds = assignments.map((row) => row.room_id);
  if (roomIds.length === 0) return [];

  const { data, error } = await supabase
    .from("requests")
    .select("*, rooms(name, slug), request_claims(id, technician_id, technicians(name))")
    .in("room_id", roomIds)
    .neq("status", "resolved")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchAdminData() {
  const [events, rooms, technicians, assignments, openRequests, allRequests] = await Promise.all([
    supabase.from("events").select("*").order("created_at", { ascending: false }),
    supabase.from("rooms").select("*, events(name)").order("name"),
    supabase.from("technicians").select("*").order("name"),
    supabase
      .from("room_assignments")
      .select("*, rooms(name), technicians(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("requests")
      .select("*, rooms(name, slug, events(name)), request_claims(id, technician_id, technicians(name))")
      .neq("status", "resolved")
      .order("created_at", { ascending: true }),
    supabase
      .from("requests")
      .select("*, rooms(name, slug, events(name)), request_claims(id, technician_id, technicians(name))")
      .order("created_at", { ascending: true }),
  ]);

  for (const result of [events, rooms, technicians, assignments, openRequests, allRequests]) {
    if (result.error) throw result.error;
  }

  return {
    events: events.data || [],
    rooms: rooms.data || [],
    technicians: technicians.data || [],
    assignments: assignments.data || [],
    openRequests: openRequests.data || [],
    allRequests: allRequests.data || [],
  };
}
