import { supabase } from "../lib/supabaseClient";
import type { SaleEntry } from "../types/sales";

export type SalesDashboardRawRow = Record<string, unknown>;
export type SalesDashboardUser = {
  id: string;
  username: string;
  member_name: string | null;
  created_at: string;
};

type SaveStep = "sales_entries" | "sales_entry_inventory" | "sales_entry_payments";
const USERS_DIRECTORY_TABLE = "users_directory";
const USERS_DIRECTORY_SELECT = "id,username,member_name,created_at";
const USERS_DIRECTORY_PAGE_SIZE = 1000;

const isSalesSaveDebugEnabled =
  import.meta.env.DEV || import.meta.env.VITE_DEBUG_SALES_SAVE === "true";

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const toLocalDateIso = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["true", "t", "yes", "y", "1"].includes(normalized)) return true;
  if (["false", "f", "no", "n", "0"].includes(normalized)) return false;
  return null;
};

const debugSaveLog = (label: string, data: unknown) => {
  if (!isSalesSaveDebugEnabled) return;
  console.log(label, data);
};

const toErrorDebugMeta = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return { raw: error };
  }

  const maybeError = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
    status?: number;
  };

  return {
    message: maybeError.message,
    details: maybeError.details,
    hint: maybeError.hint,
    code: maybeError.code,
    status: maybeError.status,
    raw: error
  };
};

const toColumnNameFromError = (error: unknown): string | null => {
  if (!error || typeof error !== "object") return null;

  const maybeError = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  // Supabase/PostgREST schema-cache errors usually expose missing columns this way.
  const joined = [maybeError.message, maybeError.details, maybeError.hint]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");

  if (!joined) return null;

  const patterns = [
    /column ['"]([a-zA-Z0-9_]+)['"]/i,
    /Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i,
    /unknown field ['"]([a-zA-Z0-9_]+)['"]/i
  ];

  for (const pattern of patterns) {
    const match = joined.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
};

async function insertRowWithColumnFallback(
  table: string,
  inputPayload: Record<string, unknown>,
  options?: { select?: string; single?: boolean }
): Promise<{ data: unknown; payloadUsed: Record<string, unknown> }> {
  const payload = { ...inputPayload };
  let attempts = 0;

  while (attempts < 20) {
    attempts += 1;

    const query = supabase.from(table).insert(payload);
    const execute =
      options?.select && options.single
        ? query.select(options.select).single()
        : options?.select
        ? query.select(options.select)
        : query;

    const { data, error } = await execute;
    if (!error) return { data, payloadUsed: payload };

    const missingColumn = toColumnNameFromError(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
      delete payload[missingColumn];
      continue;
    }

    throw error;
  }

  throw new Error(`Insert retries exceeded for ${table}.`);
}

async function insertRowsWithColumnFallback(
  table: string,
  inputRows: Array<Record<string, unknown>>
): Promise<Array<Record<string, unknown>>> {
  let rows = inputRows.map((row) => ({ ...row }));
  let attempts = 0;

  while (attempts < 20) {
    attempts += 1;

    const { error } = await supabase.from(table).insert(rows);
    if (!error) return rows;

    const missingColumn = toColumnNameFromError(error);
    if (missingColumn) {
      const hasColumn = rows.some((row) => Object.prototype.hasOwnProperty.call(row, missingColumn));
      if (hasColumn) {
        rows = rows.map((row) => {
          if (!Object.prototype.hasOwnProperty.call(row, missingColumn)) return row;
          const nextRow = { ...row };
          delete nextRow[missingColumn];
          return nextRow;
        });
        continue;
      }
    }

    throw error;
  }

  throw new Error(`Insert retries exceeded for ${table}.`);
}

export async function fetchSalesDashboardUsers(): Promise<SalesDashboardUser[]> {
  const rows: Array<Record<string, unknown>> = [];
  let from = 0;

  while (true) {
    const to = from + USERS_DIRECTORY_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from(USERS_DIRECTORY_TABLE)
      .select(USERS_DIRECTORY_SELECT)
      .order("username", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const batch = (data as Array<Record<string, unknown>> | null) ?? [];
    rows.push(...batch);

    if (batch.length < USERS_DIRECTORY_PAGE_SIZE) break;
    from += USERS_DIRECTORY_PAGE_SIZE;
  }

  return rows.map((row) => ({
    id: String(row.id ?? ""),
    username: toText(row.username),
    member_name: toText(row.member_name) || null,
    created_at: toText(row.created_at)
  }));
}

export async function saveSalesEntry(entry: SaleEntry): Promise<void> {
  const primaryAmount = Math.max(0, toNumber(entry.totalSales) - toNumber(entry.amount2));
  const secondaryAmount = Math.max(0, toNumber(entry.amount2));
  const authUserPromise = supabase.auth.getUser();
  const authUserResult = await authUserPromise;
  const authUserId = authUserResult.data.user?.id ?? null;
  const saleDate = toText(entry.date) || toLocalDateIso();
  const pofNumber = toText(entry.pgfNumber) || null;
  const newMember = toBoolean(entry.newMember);
  const toBlister = toBoolean(entry.toBlister);
  const discountValue = toNumber(entry.discount);

  const salesEntryInsert: Record<string, unknown> = {
    event: toText(entry.event),
    // Keep both old/new column keys to support current and legacy table versions.
    report_date: saleDate,
    entry_date: saleDate,
    sale_date: saleDate,
    pof_number: pofNumber,
    po_number: pofNumber,
    member_name: toText(entry.memberName),
    username: toText(entry.username),
    new_member: newMember ?? false,
    is_new_member: newMember ?? false,
    member_type: toText(entry.memberType),
    package_type: toText(entry.packageType),
    to_blister: toBlister ?? false,
    quantity: toNumber(entry.quantity),
    blister_count: toNumber(entry.blisterCount),
    original_price: toNumber(entry.originalPrice),
    discount_label: toText(entry.discount),
    discount_rate: discountValue,
    discount_percent: discountValue,
    one_time_discount: toNumber(entry.oneTimeDiscount),
    price_after_discount: toNumber(entry.priceAfterDiscount),
    total_sales: toNumber(entry.totalSales),
    primary_payment_mode: toText(entry.modeOfPayment),
    primary_payment_amount: primaryAmount,
    remarks: toText(entry.remarks),
    received_by: toText(entry.receivedBy),
    collected_by: toText(entry.collectedBy)
  };

  if (authUserId) {
    // Helps satisfy common INSERT RLS policy shape: created_by = auth.uid().
    salesEntryInsert.created_by = authUserId;
  }

  let salesEntryId: string | number | null = null;
  let failedStep: SaveStep | null = null;

  debugSaveLog("SAVE PAYLOAD", {
    table: "sales_entries",
    authUserId,
    payload: salesEntryInsert
  });

  try {
    failedStep = "sales_entries";
    const { data: insertedEntry, payloadUsed: salesEntryPayloadUsed } = await insertRowWithColumnFallback(
      "sales_entries",
      salesEntryInsert,
      { select: "id", single: true }
    );

    debugSaveLog("SAVE RESPONSE", {
      table: "sales_entries",
      payloadUsed: salesEntryPayloadUsed,
      response: insertedEntry,
      error: null
    });

    salesEntryId = (insertedEntry as { id: string | number }).id;

    const inventoryInsertPayload = {
      // Keep both old/new key sets for compatibility.
      sale_entry_id: salesEntryId,
      sales_entry_id: salesEntryId,
      released_bottle: toNumber(entry.releasedBottles),
      released_bottles: toNumber(entry.releasedBottles),
      released_blister: toNumber(entry.releasedBlister),
      released_blisters: toNumber(entry.releasedBlister),
      to_follow_bottle: toNumber(entry.toFollowBottles),
      to_follow_bottles: toNumber(entry.toFollowBottles),
      to_follow_blister: toNumber(entry.toFollowBlister),
      to_follow_blisters: toNumber(entry.toFollowBlister)
    };

    debugSaveLog("SAVE PAYLOAD", {
      table: "sales_entry_inventory",
      payload: inventoryInsertPayload
    });

    failedStep = "sales_entry_inventory";
    const inventoryPayloadUsed = await insertRowWithColumnFallback(
      "sales_entry_inventory",
      inventoryInsertPayload
    );

    debugSaveLog("SAVE RESPONSE", {
      table: "sales_entry_inventory",
      payloadUsed: inventoryPayloadUsed.payloadUsed,
      error: null
    });

    const paymentRows: Array<Record<string, unknown>> = [];

    if (toText(entry.modeOfPayment)) {
      paymentRows.push({
        sale_entry_id: salesEntryId,
        sales_entry_id: salesEntryId,
        payment_no: 1,
        mode: toText(entry.modeOfPayment),
        payment_mode: toText(entry.modeOfPayment),
        mode_type: toText(entry.paymentModeType),
        payment_type: toText(entry.paymentModeType),
        reference_no: toText(entry.referenceNumber),
        reference_number: toText(entry.referenceNumber),
        amount: primaryAmount
      });
    }

    if (toText(entry.modeOfPayment2) && secondaryAmount > 0) {
      paymentRows.push({
        sale_entry_id: salesEntryId,
        sales_entry_id: salesEntryId,
        payment_no: 2,
        mode: toText(entry.modeOfPayment2),
        payment_mode: toText(entry.modeOfPayment2),
        mode_type: toText(entry.paymentModeType2),
        payment_type: toText(entry.paymentModeType2),
        reference_no: toText(entry.referenceNumber2),
        reference_number: toText(entry.referenceNumber2),
        amount: secondaryAmount
      });
    }

    if (paymentRows.length > 0) {
      debugSaveLog("SAVE PAYLOAD", {
        table: "sales_entry_payments",
        payload: paymentRows
      });

      failedStep = "sales_entry_payments";
      const paymentRowsPayloadUsed = await insertRowsWithColumnFallback(
        "sales_entry_payments",
        paymentRows
      );

      debugSaveLog("SAVE RESPONSE", {
        table: "sales_entry_payments",
        payloadUsed: paymentRowsPayloadUsed,
        error: null
      });
    }
  } catch (error) {
    const debugMeta = {
      step: failedStep,
      table: failedStep,
      salesEntryId,
      error: toErrorDebugMeta(error)
    };
    console.error("SAVE ERROR", debugMeta);

    if (salesEntryId !== null) {
      const paymentDeleteFilter = `sales_entry_id.eq.${salesEntryId},sale_entry_id.eq.${salesEntryId}`;

      await supabase.from("sales_entry_payments").delete().or(paymentDeleteFilter);
      await supabase.from("sales_entry_inventory").delete().or(paymentDeleteFilter);
      await supabase.from("sales_entries").delete().eq("id", salesEntryId);
    }

    if (error && typeof error === "object") {
      Object.assign(error as Record<string, unknown>, {
        saveStep: failedStep,
        debugMeta
      });
    }

    throw error;
  }
}

export async function fetchSalesEntriesCount(): Promise<number> {
  const { count, error } = await supabase
    .from("sales_entries")
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function fetchInventoryReportRows(): Promise<SalesDashboardRawRow[]> {
  const { data, error } = await supabase.from("v_inventory_report").select("*");
  if (error) throw error;
  return (data as SalesDashboardRawRow[] | null) ?? [];
}

export async function fetchSalesReportRows(): Promise<SalesDashboardRawRow[]> {
  const { data, error } = await supabase.from("v_sales_report").select("*");
  if (error) throw error;
  return (data as SalesDashboardRawRow[] | null) ?? [];
}

export async function fetchSalesEntryRows(): Promise<SalesDashboardRawRow[]> {
  const { data, error } = await supabase.from("sales_entries").select("*");
  if (error) throw error;
  return (data as SalesDashboardRawRow[] | null) ?? [];
}

export async function fetchSalesEntryInventoryRows(): Promise<SalesDashboardRawRow[]> {
  const { data, error } = await supabase.from("sales_entry_inventory").select("*");
  if (error) throw error;
  return (data as SalesDashboardRawRow[] | null) ?? [];
}

async function deleteRowsByPossibleColumns(
  table: string,
  value: string | number,
  columns: string[]
): Promise<void> {
  let lastError: unknown = null;

  for (const column of columns) {
    const { error } = await supabase.from(table).delete().eq(column, value);
    if (!error) return;

    const missingColumn = toColumnNameFromError(error);
    if (missingColumn === column) {
      lastError = error;
      continue;
    }

    throw error;
  }

  if (lastError) {
    throw lastError;
  }
}

export async function deleteSalesEntry(entryId: string): Promise<void> {
  await deleteRowsByPossibleColumns("sales_entry_payments", entryId, [
    "sales_entry_id",
    "sale_entry_id"
  ]);
  await deleteRowsByPossibleColumns("sales_entry_inventory", entryId, [
    "sales_entry_id",
    "sale_entry_id"
  ]);

  const { error } = await supabase.from("sales_entries").delete().eq("id", entryId);
  if (error) throw error;
}

export async function fetchSalesEntryPaymentRows(): Promise<SalesDashboardRawRow[]> {
  const { data, error } = await supabase.from("sales_entry_payments").select("*");
  if (error) throw error;
  return (data as SalesDashboardRawRow[] | null) ?? [];
}

export async function fetchDailyCashCountRows(): Promise<SalesDashboardRawRow[]> {
  const { data, error } = await supabase.from("v_daily_cash_count").select("*");
  if (error) throw error;
  return (data as SalesDashboardRawRow[] | null) ?? [];
}

async function fetchDetailRows(
  viewName: "v_bank_transfer_details" | "v_maya_details" | "v_gcash_details"
): Promise<SalesDashboardRawRow[]> {
  const { data, error } = await supabase.from(viewName).select("*");
  if (error) throw error;
  return (data as SalesDashboardRawRow[] | null) ?? [];
}

export async function fetchBankTransferDetails(): Promise<SalesDashboardRawRow[]> {
  return fetchDetailRows("v_bank_transfer_details");
}

export async function fetchMayaDetails(): Promise<SalesDashboardRawRow[]> {
  return fetchDetailRows("v_maya_details");
}

export async function fetchGcashDetails(): Promise<SalesDashboardRawRow[]> {
  return fetchDetailRows("v_gcash_details");
}
