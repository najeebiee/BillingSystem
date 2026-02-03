import { supabase } from "../lib/supabaseClient";
import type { Vendor } from "../types/billing";

export async function listVendors(query?: string) {
  let request = supabase.from("vendors").select("id,name,address").order("name");

  if (query && query.trim()) {
    request = request.ilike("name", `%${query.trim()}%`);
  }

  const { data, error } = await request.limit(50);

  if (error) {
    return { data: [] as Vendor[], error: error.message };
  }

  return { data: (data ?? []) as Vendor[], error: null as string | null };
}

export async function createVendor(name: string, address?: string | null) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { data: null as Vendor | null, error: "Vendor name is required." };
  }

  const { data, error } = await supabase
    .from("vendors")
    .insert({ name: trimmedName, address: address ?? null })
    .select("id,name,address")
    .single();

  if (error) {
    return { data: null as Vendor | null, error: error.message };
  }

  return { data: data as Vendor, error: null as string | null };
}
