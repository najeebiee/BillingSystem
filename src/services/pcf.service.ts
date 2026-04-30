import { supabase } from "../lib/supabaseClient";
import type {
  PcfQueryParams,
  PcfSummary,
  PcfTransaction,
  PcfTransactionStatus
} from "../types/billing";

export interface CreatePcfTransactionPayload {
  date: string;
  pcv_number?: string | null;
  payee?: string | null;
  invoice_no?: string | null;
  description?: string | null;
  amount_in?: number;
  amount_out?: number;
  notes?: string | null;
}

export interface UpdatePcfTransactionPayload {
  date: string;
  pcv_number?: string | null;
  payee?: string | null;
  invoice_no?: string | null;
  description?: string | null;
  amount_in?: number;
  amount_out?: number;
  notes?: string | null;
}

type PcfQueryBuilder<T> = {
  eq: (column: string, value: string) => T;
  gte: (column: string, value: string) => T;
  lte: (column: string, value: string) => T;
  or: (filters: string) => T;
};

function applyPcfFilters<T extends PcfQueryBuilder<T>>(
  request: T,
  params: Pick<PcfQueryParams, "search" | "type" | "status" | "dateFrom" | "dateTo">
) {
  let nextRequest = request;

  if (params.type) {
    nextRequest = nextRequest.eq("transaction_type", params.type);
  }

  if (params.status) {
    nextRequest = nextRequest.eq("status", params.status);
  }

  if (params.dateFrom) {
    nextRequest = nextRequest.gte("date", params.dateFrom);
  }

  if (params.dateTo) {
    nextRequest = nextRequest.lte("date", params.dateTo);
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    const escaped = q.replace(/[%(),]/g, "").trim();

    if (escaped) {
      nextRequest = nextRequest.or(
        `pcv_number.ilike.%${escaped}%,payee.ilike.%${escaped}%,description.ilike.%${escaped}%`
      );
    }
  }

  return nextRequest;
}

function getPaginationRange(params: PcfQueryParams) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const from = params.offset ?? (page - 1) * pageSize;
  const limit = params.limit ?? pageSize;
  const to = from + limit - 1;

  return { from, to };
}

function createEmptySummary(): PcfSummary {
  return {
    beginningBalance: 0,
    totalIn: 0,
    totalOut: 0,
    endingBalance: 0
  };
}

function roundMoney(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function normalizeText(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}

function getDesiredBalance(
  transaction: Pick<PcfTransaction, "transaction_type" | "balance" | "amount_in" | "amount_out">,
  currentBalance: number
) {
  if (transaction.transaction_type === "beginning_balance") {
    return roundMoney(transaction.balance ?? currentBalance);
  }

  return roundMoney(
    currentBalance + Number(transaction.amount_in ?? 0) - Number(transaction.amount_out ?? 0)
  );
}

async function rebalancePcfTransactions() {
  const { data, error } = await supabase
    .from("pcf_transactions")
    .select("*")
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  const transactions = (data ?? []) as PcfTransaction[];
  let runningBalance = 0;

  for (const transaction of transactions) {
    const nextBalance = getDesiredBalance(transaction, runningBalance);

    if (roundMoney(transaction.balance) !== nextBalance) {
      const { error: updateError } = await supabase
        .from("pcf_transactions")
        .update({ balance: nextBalance })
        .eq("id", transaction.id);

      if (updateError) {
        return { error: updateError.message };
      }
    }

    runningBalance = nextBalance;
  }

  return { error: null as string | null };
}

export async function listPcfTransactions(params: PcfQueryParams) {
  const { from, to } = getPaginationRange(params);

  let request = supabase
    .from("pcf_transactions")
    .select("*", { count: "exact" })
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  request = applyPcfFilters(request, params);

  const { data, error, count } = await request;

  if (error) {
    return { data: [] as PcfTransaction[], count: 0, error: error.message };
  }

  return {
    data: (data ?? []) as PcfTransaction[],
    count: count ?? 0,
    error: null as string | null
  };
}

export async function listPcfTransactionsForExport(params: PcfQueryParams) {
  const batchSize = params.limit ?? params.pageSize ?? 1000;
  let offset = params.offset ?? 0;
  const allTransactions: PcfTransaction[] = [];

  while (true) {
    let request = supabase
      .from("pcf_transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + batchSize - 1);

    request = applyPcfFilters(request, params);

    const { data, error } = await request;

    if (error) {
      return { data: [] as PcfTransaction[], error: error.message };
    }

    const batch = (data ?? []) as PcfTransaction[];

    if (!batch.length) {
      break;
    }

    allTransactions.push(...batch);

    if (batch.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  return { data: allTransactions, error: null as string | null };
}

export async function getPcfSummary(params?: { dateFrom?: string; dateTo?: string }) {
  let request = supabase
    .from("pcf_transactions")
    .select("*")
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (params?.dateFrom) {
    request = request.gte("date", params.dateFrom);
  }

  if (params?.dateTo) {
    request = request.lte("date", params.dateTo);
  }

  const { data, error } = await request;

  if (error) {
    return { data: createEmptySummary(), error: error.message };
  }

  const rows = (data ?? []) as PcfTransaction[];

  if (!rows.length) {
    return { data: createEmptySummary(), error: null as string | null };
  }

  const firstBeginningBalanceRow = rows.find(
    (row) => row.transaction_type === "beginning_balance"
  );
  const firstRow = rows[0];
  const lastRow = rows[rows.length - 1];

  const beginningBalance = roundMoney(
    firstBeginningBalanceRow?.balance ?? firstRow?.balance ?? 0
  );
  const totalIn = roundMoney(
    rows.reduce((sum, row) => sum + Number(row.amount_in ?? 0), 0)
  );
  const totalOut = roundMoney(
    rows.reduce((sum, row) => sum + Number(row.amount_out ?? 0), 0)
  );
  const endingBalance = roundMoney(
    lastRow?.balance ?? beginningBalance + totalIn - totalOut
  );

  return {
    data: {
      beginningBalance,
      totalIn,
      totalOut,
      endingBalance
    } satisfies PcfSummary,
    error: null as string | null
  };
}

export async function createPcfTransaction(payload: CreatePcfTransactionPayload) {
  const amountIn = roundMoney(payload.amount_in ?? 0);
  const amountOut = roundMoney(payload.amount_out ?? 0);

  if (!payload.date) {
    return {
      data: null as PcfTransaction | null,
      error: "Date is required."
    };
  }

  if (!normalizeText(payload.payee)) {
    return {
      data: null as PcfTransaction | null,
      error: "Payee is required."
    };
  }

  if ((amountIn > 0 && amountOut > 0) || (amountIn <= 0 && amountOut <= 0)) {
    return {
      data: null as PcfTransaction | null,
      error: "Enter either Amount In or Amount Out."
    };
  }

  const transactionType = amountIn > 0 ? "replenishment" : "expense";

  const { data, error } = await supabase
    .from("pcf_transactions")
    .insert({
      date: payload.date,
      pcv_number: normalizeText(payload.pcv_number),
      payee: normalizeText(payload.payee),
      invoice_no: normalizeText(payload.invoice_no),
      description: normalizeText(payload.description),
      amount_in: amountIn,
      amount_out: amountOut,
      balance: 0,
      transaction_type: transactionType,
      notes: normalizeText(payload.notes)
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      data: null as PcfTransaction | null,
      error: error?.message || "Failed to save petty cash transaction."
    };
  }

  const rebalanceResult = await rebalancePcfTransactions();

  if (rebalanceResult.error) {
    return {
      data: data as PcfTransaction,
      error: rebalanceResult.error
    };
  }

  const { data: savedTransaction, error: fetchError } = await supabase
    .from("pcf_transactions")
    .select("*")
    .eq("id", data.id)
    .single();

  if (fetchError || !savedTransaction) {
    return {
      data: data as PcfTransaction,
      error: fetchError?.message || null
    };
  }

  return {
    data: savedTransaction as PcfTransaction,
    error: null as string | null
  };
}

export async function getPcfTransactionById(id: string) {
  const { data, error } = await supabase
    .from("pcf_transactions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return {
      data: null as PcfTransaction | null,
      error: error?.message || "Petty cash transaction not found."
    };
  }

  return {
    data: data as PcfTransaction,
    error: null as string | null
  };
}

export async function updatePcfTransaction(
  id: string,
  payload: UpdatePcfTransactionPayload
) {
  const amountIn = roundMoney(payload.amount_in ?? 0);
  const amountOut = roundMoney(payload.amount_out ?? 0);

  if (!payload.date) {
    return {
      data: null as PcfTransaction | null,
      error: "Date is required."
    };
  }

  if (!normalizeText(payload.payee)) {
    return {
      data: null as PcfTransaction | null,
      error: "Payee is required."
    };
  }

  if ((amountIn > 0 && amountOut > 0) || (amountIn <= 0 && amountOut <= 0)) {
    return {
      data: null as PcfTransaction | null,
      error: "Enter either Amount In or Amount Out."
    };
  }

  const transactionType = amountIn > 0 ? "replenishment" : "expense";

  const { data, error } = await supabase
    .from("pcf_transactions")
    .update({
      date: payload.date,
      pcv_number: normalizeText(payload.pcv_number),
      payee: normalizeText(payload.payee),
      invoice_no: normalizeText(payload.invoice_no),
      description: normalizeText(payload.description),
      amount_in: amountIn,
      amount_out: amountOut,
      transaction_type: transactionType,
      notes: normalizeText(payload.notes)
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return {
      data: null as PcfTransaction | null,
      error: error?.message || "Failed to update petty cash transaction."
    };
  }

  const rebalanceResult = await rebalancePcfTransactions();

  if (rebalanceResult.error) {
    return {
      data: data as PcfTransaction,
      error: rebalanceResult.error
    };
  }

  const { data: savedTransaction, error: fetchError } = await supabase
    .from("pcf_transactions")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !savedTransaction) {
    return {
      data: data as PcfTransaction,
      error: fetchError?.message || null
    };
  }

  return {
    data: savedTransaction as PcfTransaction,
    error: null as string | null
  };
}

export async function updatePcfTransactionStatus(
  id: string,
  status: PcfTransactionStatus
) {
  const updatePayload: {
    status: PcfTransactionStatus;
    is_liquidated?: boolean;
    liquidated_at?: string | null;
  } = { status };

  if (status !== "approved") {
    updatePayload.is_liquidated = false;
    updatePayload.liquidated_at = null;
  }

  const { data, error } = await supabase
    .from("pcf_transactions")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return {
      data: null as PcfTransaction | null,
      error: error?.message || "Failed to update petty cash status."
    };
  }

  return {
    data: data as PcfTransaction,
    error: null as string | null
  };
}

export async function setPcfLiquidationState(id: string, isLiquidated: boolean) {
  const { data, error } = await supabase
    .from("pcf_transactions")
    .update({
      is_liquidated: isLiquidated,
      liquidated_at: isLiquidated ? new Date().toISOString() : null
    })
    .eq("id", id)
    .eq("status", "approved")
    .select("*")
    .single();

  if (error || !data) {
    return {
      data: null as PcfTransaction | null,
      error: error?.message || "Failed to update liquidation state."
    };
  }

  return {
    data: data as PcfTransaction,
    error: null as string | null
  };
}
