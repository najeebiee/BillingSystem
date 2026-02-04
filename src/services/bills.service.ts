import { supabase } from "../lib/supabaseClient";
import type {
  Bill,
  BillBreakdown,
  BillDetails,
  BillStatus
} from "../types/billing";

export interface ListBillsParams {
  status?: BillStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export async function listBills(params: ListBillsParams) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

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
      bank_name,
      bank_account_name,
      bank_account_no,
      status,
      remarks,
      total_amount,
      created_by,
      created_at,
      updated_at,
      vendor:vendors(id,name,address)
    `,
      { count: "exact" }
    )
    .order("request_date", { ascending: false })
    .range(from, to);

  if (params.status) {
    request = request.eq("status", params.status);
  }

  if (params.dateFrom) {
    request = request.gte("request_date", params.dateFrom);
  }

  if (params.dateTo) {
    request = request.lte("request_date", params.dateTo);
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    request = request.or(
      `reference_no.ilike.%${q}%,vendor.name.ilike.%${q}%`
    );
  }

  const { data, error, count } = await request;

  if (error) {
    return { data: [], count: 0, error: error.message };
  }

  return {
    data: (data ?? []) as Array<Bill & { vendor?: { id: string; name: string } }>,
    count: count ?? 0,
    error: null as string | null
  };
}

export async function getBillById(id: string) {
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      id,
      vendor_id,
      reference_no,
      request_date,
      priority_level,
      payment_method,
      bank_name,
      bank_account_name,
      bank_account_no,
      status,
      remarks,
      total_amount,
      created_by,
      created_at,
      updated_at,
      vendor:vendors(id,name,address),
      breakdowns:bill_breakdowns(id,bill_id,category,description,amount)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    return { data: null as BillDetails | null, error: error.message };
  }

  return {
    data: {
      bill: {
        id: data.id,
        vendor_id: data.vendor_id,
        reference_no: data.reference_no,
        request_date: data.request_date,
        priority_level: data.priority_level,
        payment_method: data.payment_method,
        bank_name: data.bank_name,
        bank_account_name: data.bank_account_name,
        bank_account_no: data.bank_account_no,
        status: data.status,
        remarks: data.remarks,
        total_amount: data.total_amount,
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at
      },
      vendor: data.vendor,
      breakdowns: data.breakdowns ?? []
    } as BillDetails,
    error: null as string | null
  };
}

export interface CreateBillPayload {
  bill: Omit<Bill, "id" | "created_at" | "updated_at">;
  breakdowns: Array<Omit<BillBreakdown, "id" | "bill_id">>;
}

export async function createBill(payload: CreateBillPayload) {
  const { data: bill, error: billError } = await supabase
    .from("bills")
    .insert(payload.bill)
    .select(
      `
      id,
      vendor_id,
      reference_no,
      request_date,
      priority_level,
      payment_method,
      bank_name,
      bank_account_name,
      bank_account_no,
      status,
      remarks,
      total_amount,
      created_by,
      created_at,
      updated_at
    `
    )
    .single();

  if (billError || !bill) {
    return { data: null as Bill | null, error: billError?.message || "Failed to create bill." };
  }

  const breakdowns = payload.breakdowns.map((b) => ({
    bill_id: bill.id,
    category: b.category,
    description: b.description ?? "",
    amount: Number.isFinite(b.amount) ? b.amount : 0
  }));

  if (breakdowns.length > 0) {
    const { error: breakdownError } = await supabase
      .from("bill_breakdowns")
      .insert(breakdowns);

    if (breakdownError) {
      return {
        data: bill as Bill,
        error: breakdownError.message
      };
    }
  }

  return { data: bill as Bill, error: null as string | null };
}

export interface UpdateBillPayload {
  bill: Partial<Omit<Bill, "id" | "created_at" | "updated_at">>;
  breakdowns: Array<Omit<BillBreakdown, "id" | "bill_id">>;
}

export async function updateBill(id: string, payload: UpdateBillPayload) {
  const { data: updated, error: updateError } = await supabase
    .from("bills")
    .update(payload.bill)
    .eq("id", id)
    .select(
      `
      id,
      vendor_id,
      reference_no,
      request_date,
      priority_level,
      payment_method,
      bank_name,
      bank_account_name,
      bank_account_no,
      status,
      remarks,
      total_amount,
      created_by,
      created_at,
      updated_at
    `
    )
    .single();

  if (updateError || !updated) {
    return { data: null as Bill | null, error: updateError?.message || "Failed to update bill." };
  }

  const { error: deleteError } = await supabase
    .from("bill_breakdowns")
    .delete()
    .eq("bill_id", id);

  if (deleteError) {
    return { data: updated as Bill, error: deleteError.message };
  }

  const breakdowns = payload.breakdowns.map((b) => ({
    bill_id: id,
    category: b.category,
    description: b.description ?? "",
    amount: Number.isFinite(b.amount) ? b.amount : 0
  }));

  if (breakdowns.length > 0) {
    const { error: insertError } = await supabase
      .from("bill_breakdowns")
      .insert(breakdowns);

    if (insertError) {
      return { data: updated as Bill, error: insertError.message };
    }
  }

  return { data: updated as Bill, error: null as string | null };
}

export async function updateBillStatus(id: string, status: BillStatus) {
  const { data, error } = await supabase
    .from("bills")
    .update({ status })
    .eq("id", id)
    .select(
      `
      id,
      vendor_id,
      reference_no,
      request_date,
      priority_level,
      payment_method,
      bank_name,
      bank_account_name,
      bank_account_no,
      status,
      remarks,
      total_amount,
      created_by,
      created_at,
      updated_at
    `
    )
    .single();

  if (error || !data) {
    return { data: null as Bill | null, error: error?.message || "Failed to update bill status." };
  }

  return { data: data as Bill, error: null as string | null };
}
