import { supabase } from "../lib/supabaseClient";

export function normalizeBillSearchTerm(value: string | undefined | null) {
  return (value ?? "").trim().replace(/[%(),]/g, "").trim();
}

export async function findVendorIdsForBillSearch(searchTerm: string) {
  if (!searchTerm) {
    return { data: [] as string[], error: null as string | null };
  }

  const { data, error } = await supabase
    .from("vendors")
    .select("id")
    .ilike("name", `%${searchTerm}%`)
    .limit(100);

  if (error) {
    return { data: [] as string[], error: error.message };
  }

  return {
    data: (data ?? []).map((vendor) => vendor.id).filter(Boolean),
    error: null as string | null
  };
}

export function buildBillSearchOrFilter(searchTerm: string, vendorIds: string[]) {
  const clauses = [`reference_no.ilike.%${searchTerm}%`, `remarks.ilike.%${searchTerm}%`];

  if (vendorIds.length > 0) {
    clauses.push(`vendor_id.in.(${vendorIds.join(",")})`);
  }

  return clauses.join(",");
}
