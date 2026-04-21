import { supabase } from "../lib/supabaseClient";
import type { BillStatus } from "../types/billing";

type ActiveTab = "All" | "Draft" | "Awaiting Approval" | "Rejected" | "Approved" | "Paid" | "Void";

type BillExportRow = {
  id: string;
  request_date: string;
  reference_no: string;
  vendor_name: string;
  purpose_summary: string;
  payment_methods: string[];
  priority_level: string;
  total_amount: number;
  status: string;
  created_by: string;
};

type ExportFilters = {
  activeTab: string;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
};

const PAGE_SIZE = 1000;

function mapActiveTabToStatus(tab: string): BillStatus | undefined {
  switch (tab as ActiveTab) {
    case "Draft":
      return "draft";
    case "Awaiting Approval":
      return "awaiting_approval";
    case "Rejected":
      return "rejected";
    case "Approved":
      return "approved";
    case "Paid":
      return "paid";
    case "Void":
      return "void";
    default:
      return undefined;
  }
}

async function fetchFilteredBillsPage(filters: ExportFilters, from: number, to: number) {
  let request = supabase
    .from("bills")
    .select(
      `
      id,
      vendor_id,
      reference_no,
      request_date,
      priority_level,
      payment_method,
      status,
      remarks,
      total_amount,
      created_by,
      vendor:vendors!inner(id,name)
    `
    )
    .order("request_date", { ascending: false })
    .range(from, to);

  const status = mapActiveTabToStatus(filters.activeTab);
  if (status) {
    request = request.eq("status", status);
  }

  if (filters.dateFrom) {
    request = request.gte("request_date", filters.dateFrom);
  }

  if (filters.dateTo) {
    request = request.lte("request_date", filters.dateTo);
  }

  if (filters.searchQuery.trim()) {
    const escaped = filters.searchQuery.trim().replace(/[%(),]/g, "").trim();
    if (escaped) {
      const { data: matchingVendors, error: vendorSearchError } = await supabase
        .from("vendors")
        .select("id")
        .ilike("name", `%${escaped}%`)
        .limit(100);

      if (vendorSearchError) {
        return { data: [], error: vendorSearchError.message };
      }

      const vendorIds = (matchingVendors ?? []).map((vendor) => vendor.id).filter(Boolean);

      if (vendorIds.length > 0) {
        request = request.or(
          `reference_no.ilike.%${escaped}%,remarks.ilike.%${escaped}%,vendor_id.in.(${vendorIds.join(",")})`
        );
      } else {
        request = request.or(`reference_no.ilike.%${escaped}%,remarks.ilike.%${escaped}%`);
      }
    }
  }

  const { data, error } = await request;
  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null as string | null };
}

export async function fetchBillsForExport(filters: ExportFilters) {
  const allBills: Array<{
    id: string;
    reference_no: string;
    request_date: string;
    priority_level: string;
    payment_method?: string | null;
    status: string;
    remarks?: string | null;
    total_amount: number;
    created_by: string;
    vendor?: { id: string; name: string } | Array<{ id: string; name: string }>;
  }> = [];

  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const pageResult = await fetchFilteredBillsPage(filters, from, to);

    if (pageResult.error) {
      return { data: [] as BillExportRow[], error: pageResult.error };
    }

    const pageRows = pageResult.data as Array<{
      id: string;
      reference_no: string;
      request_date: string;
      priority_level: string;
      payment_method?: string | null;
      status: string;
      remarks?: string | null;
      total_amount: number;
      created_by: string;
      vendor?: { id: string; name: string } | Array<{ id: string; name: string }>;
    }>;

    allBills.push(...pageRows);

    if (pageRows.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  if (allBills.length === 0) {
    return { data: [] as BillExportRow[], error: null as string | null };
  }

  const billIds = allBills.map((bill) => bill.id);
  const { data: breakdowns, error: breakdownError } = await supabase
    .from("bill_breakdowns")
    .select("bill_id,payment_method")
    .in("bill_id", billIds);

  if (breakdownError) {
    return { data: [] as BillExportRow[], error: breakdownError.message };
  }

  const paymentMethodsByBill = new Map<string, Set<string>>();
  (breakdowns ?? []).forEach((breakdown) => {
    if (!paymentMethodsByBill.has(breakdown.bill_id)) {
      paymentMethodsByBill.set(breakdown.bill_id, new Set());
    }
    if (breakdown.payment_method) {
      paymentMethodsByBill.get(breakdown.bill_id)?.add(breakdown.payment_method);
    }
  });

  const mapped: BillExportRow[] = allBills.map((bill) => {
    const vendor = Array.isArray(bill.vendor) ? bill.vendor[0] : bill.vendor;
    const paymentMethods = Array.from(paymentMethodsByBill.get(bill.id) ?? []);
    const fallbackMethod = bill.payment_method ? [bill.payment_method] : [];

    return {
      id: bill.id,
      request_date: bill.request_date,
      reference_no: bill.reference_no,
      vendor_name: vendor?.name ?? "-",
      purpose_summary: bill.remarks ?? "-",
      payment_methods: paymentMethods.length ? paymentMethods : fallbackMethod,
      priority_level: bill.priority_level,
      total_amount: Number(bill.total_amount ?? 0),
      status: bill.status,
      created_by: bill.created_by
    };
  });

  return { data: mapped, error: null as string | null };
}

export type { BillExportRow, ExportFilters };
