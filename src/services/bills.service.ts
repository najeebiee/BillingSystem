import { supabase } from "../lib/supabaseClient";
import type { PostgrestError } from "@supabase/supabase-js";
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

export type ServiceError =
  | {
      code: "DUPLICATE_PRF";
      message: string;
    };

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
      vendor:vendors!inner(id,name,address)
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
    const escaped = q.replace(/[%(),]/g, "").trim();
    if (escaped) {
    request = request.or(
        `reference_no.ilike.%${escaped}%,vendors.name.ilike.%${escaped}%`
    );
    }
  }

  const { data, error, count } = await request;

  if (error) {
    return { data: [], count: 0, error: error.message };
  }

  const bills = (data ?? []) as unknown as Array<Bill & { vendor?: { id: string; name: string } }>;
  bills.forEach((bill) => {
    if (Array.isArray(bill.vendor)) {
      bill.vendor = bill.vendor[0];
    }
  });

  if (bills.length === 0) {
    return {
      data: bills as Array<Bill & { vendor?: { id: string; name: string }; payment_methods: string[] }>,
      count: count ?? 0,
      error: null as string | null
    };
  }

  const billIds = bills.map((bill) => bill.id);
  const { data: breakdowns, error: breakdownError } = await supabase
    .from("bill_breakdowns")
    .select("bill_id,payment_method")
    .in("bill_id", billIds);

  if (breakdownError) {
    return { data: [], count: 0, error: breakdownError.message };
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

  return {
    data: bills.map((bill) => ({
      ...bill,
      payment_methods: Array.from(paymentMethodsByBill.get(bill.id) ?? [])
    })) as Array<Bill & { vendor?: { id: string; name: string }; payment_methods: string[] }>,
    count: count ?? 0,
    error: null as string | null
  };
}

export async function generateReferenceNo(requestDate?: string) {
  const params = requestDate ? { p_request_date: requestDate } : {};
  const { data, error } = await supabase.rpc("generate_reference_no", params);

  if (error) {
    return {
      data: null as string | null,
      error: mapDbError(error, "Failed to generate reference number.")
    };
  }

  return { data: (data as string) || null, error: null as string | null };
}

export async function isReferenceNoTaken(referenceNo: string, excludeBillId?: string) {
  const value = referenceNo.trim();
  if (!value) return false;

  let query = supabase
    .from("bills")
    .select("id", { count: "exact", head: true })
    .eq("reference_no", value);

  if (excludeBillId) {
    query = query.neq("id", excludeBillId);
  }

  const { count, error } = await query;

  if (error) return false;
  return (count ?? 0) > 0;
}

function mapDbError(error: PostgrestError | null | undefined, fallback: string) {
  if (!error) return fallback;

  if (error.code === "23505") {
    const details = error.details || error.message || "";
    if (details.includes("reference_no") || details.includes("bills_reference_no_unique")) {
      return {
        code: "DUPLICATE_PRF",
        message: "PRF already existing"
      } satisfies ServiceError;
    }
  }

  if (error.code === "23514" && error.message.includes("bill_breakdowns_payment_method_check")) {
    return "One or more breakdown payment methods are invalid.";
  }

  if (error.code === "42501") {
    return "You do not have permission to perform this action.";
  }

  return error.message || fallback;
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
      vendor:vendors!inner(id,name,address),
      breakdowns:bill_breakdowns(id,bill_id,payment_method,description,amount,bank_name,bank_account_name,bank_account_no)
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
      vendor: Array.isArray(data.vendor) ? data.vendor[0] : data.vendor,
      breakdowns: (data.breakdowns ?? []).map((breakdown) => ({
        ...breakdown,
        amount: roundMoney(breakdown.amount)
      }))
    } as BillDetails,
    error: null as string | null
  };
}

function roundMoney(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export interface CreateBillPayload {
  bill: Omit<Bill, "id" | "created_at" | "updated_at">;
  breakdowns: Array<Omit<BillBreakdown, "id" | "bill_id">>;
}

export async function createBill(payload: CreateBillPayload) {
  const normalizedBill = {
    ...payload.bill,
    total_amount: roundMoney(payload.bill.total_amount)
  };

  const { data: bill, error: billError } = await supabase
    .from("bills")
    .insert(normalizedBill)
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
    return {
      data: null as Bill | null,
      error: mapDbError(billError, "Failed to create bill.")
    };
  }

  const breakdowns = payload.breakdowns.map((b) => ({
    bill_id: bill.id,
    payment_method: b.payment_method,
    description: b.description ?? "",
    amount: roundMoney(b.amount),
    bank_name: b.payment_method === "bank_transfer" ? b.bank_name ?? null : null,
    bank_account_name: b.payment_method === "bank_transfer" ? b.bank_account_name ?? null : null,
    bank_account_no: b.payment_method === "bank_transfer" ? b.bank_account_no ?? null : null
  }));

  if (breakdowns.length > 0) {
    const { error: breakdownError } = await supabase
      .from("bill_breakdowns")
      .insert(breakdowns);

    if (breakdownError) {
      return {
        data: bill as Bill,
        error: mapDbError(breakdownError, "Failed to save breakdown lines.")
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
  const normalizedBill = {
    ...payload.bill,
    total_amount: roundMoney(payload.bill.total_amount)
  };

  const { data: updated, error: updateError } = await supabase
    .from("bills")
    .update(normalizedBill)
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
    return {
      data: null as Bill | null,
      error: mapDbError(updateError, "Failed to update bill.")
    };
  }

  const { error: deleteError } = await supabase
    .from("bill_breakdowns")
    .delete()
    .eq("bill_id", id);

  if (deleteError) {
    return { data: updated as Bill, error: mapDbError(deleteError, "Failed to update breakdown lines.") };
  }

  const breakdowns = payload.breakdowns.map((b) => ({
    bill_id: id,
    payment_method: b.payment_method,
    description: b.description ?? "",
    amount: roundMoney(b.amount),
    bank_name: b.payment_method === "bank_transfer" ? b.bank_name ?? null : null,
    bank_account_name: b.payment_method === "bank_transfer" ? b.bank_account_name ?? null : null,
    bank_account_no: b.payment_method === "bank_transfer" ? b.bank_account_no ?? null : null
  }));

  if (breakdowns.length > 0) {
    const { error: insertError } = await supabase
      .from("bill_breakdowns")
      .insert(breakdowns);

    if (insertError) {
      return { data: updated as Bill, error: mapDbError(insertError, "Failed to save breakdown lines.") };
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
