import { supabase } from "../lib/supabaseClient";

export async function submitEventRequest(payload: Record<string, unknown>) {
  const { error } = await supabase.from("event_requests").insert({
    payload,
    submitted_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null as string | null };
}
