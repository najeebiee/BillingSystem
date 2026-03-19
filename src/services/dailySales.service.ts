import { supabase } from "@/lib/supabaseClient";
import {
  getDailySalesPackageBlisterCount,
  getDailySalesPackageBottleCount,
  normalizeDailySalesPackageType,
} from "@/lib/dailySalesPackages";
import {
  deleteSalesEntry,
  fetchSalesEntryInventoryRows,
  fetchSalesEntryPaymentRows,
  fetchSalesEntryRows,
  saveSalesEntry,
  type SalesDashboardRawRow,
} from "@/services/salesDashboard.service";
import type {
  AgentPerformance,
  CashFieldId,
  CashOnHandPieces,
  DailySalesRecord,
  EncoderFormModel,
  EncoderPaymentModeOption,
  PaymentMode,
  SalesDataset,
  SummaryStat,
} from "@/types/dailySales";
import type { SaleEntry } from "@/types/sales";

const LOCAL_ENTRIES_KEY = "guildledger.daily-sales.entries";
const LOCAL_CASH_KEY = "guildledger.daily-sales.cash";

const CASH_FIELD_MAP: Record<CashFieldId, string> = {
  cohOneThousand: "pcs_one_thousand",
  cohFiveHundred: "pcs_five_hundred",
  cohTwoHundred: "pcs_two_hundred",
  cohOneHundred: "pcs_one_hundred",
  cohFifty: "pcs_fifty",
  cohTwenty: "pcs_twenty",
  cohTen: "pcs_ten",
  cohFive: "pcs_five",
  cohOne: "pcs_one",
  cohCents: "pcs_cents",
};

const emptyCashOnHand: CashOnHandPieces = {
  cohOneThousand: 0,
  cohFiveHundred: 0,
  cohTwoHundred: 0,
  cohOneHundred: 0,
  cohFifty: 0,
  cohTwenty: 0,
  cohTen: 0,
  cohFive: 0,
  cohOne: 0,
  cohCents: 0,
};

const cashMultipliers: Record<CashFieldId, number> = {
  cohOneThousand: 1000,
  cohFiveHundred: 500,
  cohTwoHundred: 200,
  cohOneHundred: 100,
  cohFifty: 50,
  cohTwenty: 20,
  cohTen: 10,
  cohFive: 5,
  cohOne: 1,
  cohCents: 0.01,
};

type RawCashRow = Record<string, unknown> | null;

const toText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return ["1", "true", "t", "yes", "y"].includes(normalized);
};

const safeWindow = () => (typeof window === "undefined" ? null : window);

function readLocalJson<T>(key: string, fallback: T): T {
  const win = safeWindow();
  if (!win) {
    return fallback;
  }

  try {
    const raw = win.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson<T>(key: string, value: T) {
  const win = safeWindow();
  if (!win) {
    return;
  }

  win.localStorage.setItem(key, JSON.stringify(value));
}

function pickString(row: SalesDashboardRawRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

function pickNumber(row: SalesDashboardRawRow, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) {
      return toNumber(value);
    }
  }

  return fallback;
}

function toDateKey(value: string) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sortRecords(rows: DailySalesRecord[]) {
  return [...rows].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }

    return String(right.dailySalesId).localeCompare(String(left.dailySalesId));
  });
}

function normalizePaymentMode(
  rawMode: string,
  rawType: string,
): Exclude<PaymentMode, "ALL"> {
  const mode = rawMode.trim().toLowerCase();
  const type = rawType.trim().toLowerCase();

  if (type.includes("maya(igi)") || type.includes("maya igi")) {
    return "MAYA(IGI)";
  }

  if (type.includes("maya(atc)") || type.includes("maya atc")) {
    return "MAYA(ATC)";
  }

  if (type.includes("sbcollect(igi)") || type.includes("sbcollect igi")) {
    return "SBCOLLECT(IGI)";
  }

  if (type.includes("sbcollect(atc)") || type.includes("sbcollect atc")) {
    return "SBCOLLECT(ATC)";
  }

  if (mode.includes("cash")) {
    return "CASH";
  }

  if (mode.includes("cheque") || mode.includes("check")) {
    return "CHEQUE";
  }

  if (mode.includes("epoint")) {
    return "EPOINTS";
  }

  if (mode.includes("consignment")) {
    return "CONSIGNMENT";
  }

  if (mode.includes("ar") && type.includes("csa")) {
    return "AR(CSA)";
  }

  if (mode.includes("ar") && type.includes("leader")) {
    return "AR(LEADERSUPPORT)";
  }

  if (mode.includes("ewallet") || mode.includes("gcash") || type.includes("gcash")) {
    return "EWALLET";
  }

  if (mode.includes("maya") || type.includes("maya")) {
    return "MAYA(IGI)";
  }

  if (mode.includes("bank")) {
    return "BANK";
  }

  return "CASH";
}

function mapPaymentForStorage(
  paymentMode: EncoderPaymentModeOption,
  paymentType: string,
) {
  const normalizedType = paymentType === "N/A" ? "" : paymentType.trim();

  switch (paymentMode) {
    case "CASH":
      return { mode: "cash", type: "na" };
    case "BANK":
      return { mode: "bank", type: normalizedType || "securitybank" };
    case "MAYA(IGI)":
      return { mode: "ewallet", type: "maya(igi)" };
    case "MAYA(ATC)":
      return { mode: "ewallet", type: "maya(atc)" };
    case "SBCOLLECT(IGI)":
      return { mode: "bank", type: "sbcollect(igi)" };
    case "SBCOLLECT(ATC)":
      return { mode: "bank", type: "sbcollect(atc)" };
    case "EWALLET":
      return { mode: "ewallet", type: normalizedType || "payout" };
    case "CHEQUE":
      return { mode: "cheque", type: normalizedType || "na" };
    case "EPOINTS":
      return { mode: "epoints", type: "na" };
    case "CONSIGNMENT":
      return { mode: "consignment", type: "na" };
    case "AR(CSA)":
      return { mode: "ar", type: "csa" };
    case "AR(LEADERSUPPORT)":
      return { mode: "ar", type: "leadersupport" };
    default:
      return { mode: "", type: "" };
  }
}

function mapEncoderFormToLegacyEntry(form: EncoderFormModel): SaleEntry {
  const primary = mapPaymentForStorage(form.paymentMode, form.paymentType);
  const secondary = mapPaymentForStorage(form.paymentModeTwo, form.paymentTypeTwo);

  return {
    id: "",
    savedAt: new Date().toISOString(),
    event: form.event,
    date: form.date,
    pgfNumber: form.pofNumber,
    memberName: form.name,
    username: form.username,
    newMember: form.newMember === "1" ? "Yes" : "No",
    memberType: form.memberType,
    packageType: form.packageType,
    toBlister: form.isToBlister === "1" ? "Yes" : "No",
    originalPrice: String(form.originalPrice),
    quantity: String(form.quantity),
    blisterCount: String(form.blisterCount),
    discount: String(form.discount),
    priceAfterDiscount: String(form.price),
    oneTimeDiscount: String(form.oneTimeDiscount),
    totalSales: String(form.sales),
    modeOfPayment: primary.mode,
    paymentModeType: primary.type,
    referenceNumber: form.referenceNo === "N/A" ? "" : form.referenceNo,
    modeOfPayment2: secondary.mode,
    paymentModeType2: secondary.type,
    referenceNumber2: form.referenceNoTwo === "N/A" ? "" : form.referenceNoTwo,
    amount2: String(form.salesTwo),
    releasedBottles: String(form.released),
    releasedBlister: String(form.releasedBlpk),
    toFollowBottles: String(form.toFollow),
    toFollowBlister: String(form.toFollowBlpk),
    remarks: form.remarks,
    receivedBy: form.receivedBy,
    collectedBy: form.collectedBy,
  };
}

function buildLocalRecord(form: EncoderFormModel): DailySalesRecord {
  const localId = `local-${Date.now()}`;

  return {
    id: localId,
    dailySalesId: localId,
    pofNumber: form.pofNumber,
    ggTransNo: form.username,
    date: form.date,
    memberName: form.name,
    zeroOne: form.username,
    memberType: form.memberType,
    packageType: form.packageType,
    quantity: form.quantity,
    bottles: form.noOfBottles,
    blisters: form.blisterCount,
    sales: form.sales,
    paymentMode: form.paymentMode === "N/A" ? "CASH" : form.paymentMode,
    paymentType: form.paymentType === "N/A" ? "" : form.paymentType,
    referenceNo: form.referenceNo === "N/A" ? "" : form.referenceNo,
    paymentModeTwo: form.paymentModeTwo,
    paymentTypeTwo: form.paymentTypeTwo === "N/A" ? "" : form.paymentTypeTwo,
    referenceNoTwo: form.referenceNoTwo === "N/A" ? "" : form.referenceNoTwo,
    salesTwo: form.salesTwo,
    status: form.toFollow > 0 || form.toFollowBlpk > 0 ? "To Follow" : "Released",
    newMember: form.newMember === "1",
    originalPrice: form.originalPrice,
    discount: form.discount,
    discountedPrice: form.price,
    releasedBottle: form.released,
    releasedBlister: form.releasedBlpk,
    balanceBottle: form.toFollow,
    balanceBlister: form.toFollowBlpk,
    isToBlister: form.isToBlister === "1",
    remarks: form.remarks,
    receivedBy: form.receivedBy,
    collectedBy: form.collectedBy,
    savedAt: new Date().toISOString(),
    source: "local",
  };
}

function mergeRecords(remoteRows: DailySalesRecord[], localRows: DailySalesRecord[]) {
  const merged = new Map<string, DailySalesRecord>();

  for (const row of remoteRows) {
    merged.set(row.id, row);
  }

  for (const row of localRows) {
    merged.set(row.id, row);
  }

  return sortRecords(Array.from(merged.values()));
}

function mapRemoteRows(
  entryRows: SalesDashboardRawRow[],
  inventoryRows: SalesDashboardRawRow[],
  paymentRows: SalesDashboardRawRow[],
) {
  const inventoryByEntryId = new Map<string, SalesDashboardRawRow>();
  for (const row of inventoryRows) {
    const entryId = String(row.sales_entry_id ?? row.sale_entry_id ?? "").trim();
    if (entryId) {
      inventoryByEntryId.set(entryId, row);
    }
  }

  const paymentsByEntryId = new Map<string, SalesDashboardRawRow[]>();
  for (const row of paymentRows) {
    const entryId = String(row.sales_entry_id ?? row.sale_entry_id ?? "").trim();
    if (!entryId) {
      continue;
    }

    const current = paymentsByEntryId.get(entryId) ?? [];
    current.push(row);
    paymentsByEntryId.set(entryId, current);
  }

  return entryRows.map((row) => {
    const id = String(row.id ?? "").trim();
    const inventoryRow = inventoryByEntryId.get(id);
    const payments = [...(paymentsByEntryId.get(id) ?? [])].sort(
      (left, right) => pickNumber(left, ["payment_no"]) - pickNumber(right, ["payment_no"]),
    );
    const primaryPayment = payments.find((payment) => pickNumber(payment, ["payment_no"]) === 1) ?? payments[0];
    const secondaryPayment = payments.find((payment) => pickNumber(payment, ["payment_no"]) === 2);
    const packageTypeLabel = pickString(row, ["package_type"], "SILVER");
    const normalizedPackageType = normalizeDailySalesPackageType(packageTypeLabel) ?? "SILVER";
    const quantity = pickNumber(row, ["quantity"], 1);
    const toBlister = toBoolean(row.to_blister);
    const bottles = getDailySalesPackageBottleCount(normalizedPackageType, quantity);
    const blisters =
      pickNumber(row, ["blister_count"]) ||
      getDailySalesPackageBlisterCount(
        normalizedPackageType,
        quantity,
        toBlister ? "1" : "0",
      );
    const primaryMode = normalizePaymentMode(
      pickString(primaryPayment ?? {}, ["payment_mode", "mode", "primary_payment_mode"]),
      pickString(primaryPayment ?? {}, ["payment_type", "mode_type"]),
    );
    const secondaryModeRaw = normalizePaymentMode(
      pickString(secondaryPayment ?? {}, ["payment_mode", "mode"]),
      pickString(secondaryPayment ?? {}, ["payment_type", "mode_type"]),
    );

    const balanceBottle = pickNumber(inventoryRow ?? {}, ["to_follow_bottles", "to_follow_bottle"]);
    const balanceBlister = pickNumber(inventoryRow ?? {}, ["to_follow_blisters", "to_follow_blister"]);

    return {
      id,
      dailySalesId: id,
      pofNumber: pickString(row, ["pof_number", "po_number", "pgf_number"]),
      ggTransNo: pickString(row, ["username"], "N/A"),
      date:
        pickString(row, ["report_date", "entry_date", "sale_date", "date"]) ||
        toDateKey(pickString(row, ["created_at"])),
      memberName: pickString(row, ["member_name", "full_name"]),
      zeroOne: pickString(row, ["username"]),
      memberType: pickString(row, ["member_type"]),
      packageType: packageTypeLabel,
      quantity,
      bottles,
      blisters,
      sales: pickNumber(row, ["total_sales"]),
      paymentMode: primaryMode,
      paymentType: pickString(primaryPayment ?? {}, ["payment_type", "mode_type"]),
      referenceNo: pickString(primaryPayment ?? {}, ["reference_number", "reference_no"]),
      paymentModeTwo: secondaryPayment ? secondaryModeRaw : "N/A",
      paymentTypeTwo: pickString(secondaryPayment ?? {}, ["payment_type", "mode_type"]),
      referenceNoTwo: pickString(secondaryPayment ?? {}, ["reference_number", "reference_no"]),
      salesTwo: pickNumber(secondaryPayment ?? {}, ["amount"]),
      status: balanceBottle > 0 || balanceBlister > 0 ? "To Follow" : "Released",
      newMember: toBoolean(row.is_new_member) || toBoolean(row.new_member),
      originalPrice: pickNumber(row, ["original_price"]),
      discount: pickNumber(row, ["discount_rate", "discount_percent"]),
      discountedPrice: pickNumber(row, ["price_after_discount"]),
      releasedBottle: pickNumber(inventoryRow ?? {}, ["released_bottles", "released_bottle"]),
      releasedBlister: pickNumber(inventoryRow ?? {}, ["released_blisters", "released_blister"]),
      balanceBottle,
      balanceBlister,
      isToBlister: toBlister,
      remarks: pickString(row, ["remarks"]),
      receivedBy: pickString(row, ["received_by"]),
      collectedBy: pickString(row, ["collected_by"]),
      savedAt: pickString(row, ["created_at", "saved_at"]),
      source: "remote" as const,
    };
  });
}

function normalizeLocalRecord(row: DailySalesRecord): DailySalesRecord {
  return {
    ...row,
    id: String(row.id),
    dailySalesId: String(row.dailySalesId),
    source: "local",
  };
}

export async function listDailySalesEntries(): Promise<DailySalesRecord[]> {
  const localRows = readLocalJson<DailySalesRecord[]>(LOCAL_ENTRIES_KEY, []).map(normalizeLocalRecord);

  try {
    const [entryRows, inventoryRows, paymentRows] = await Promise.all([
      fetchSalesEntryRows(),
      fetchSalesEntryInventoryRows(),
      fetchSalesEntryPaymentRows(),
    ]);

    const remoteRows = mapRemoteRows(entryRows, inventoryRows, paymentRows);
    return mergeRecords(remoteRows, localRows);
  } catch {
    return sortRecords(localRows);
  }
}

export async function saveDailySalesEntry(form: EncoderFormModel) {
  const localRow = buildLocalRecord(form);

  try {
    await saveSalesEntry(mapEncoderFormToLegacyEntry(form));
    return { source: "remote" as const };
  } catch (error) {
    const localRows = readLocalJson<DailySalesRecord[]>(LOCAL_ENTRIES_KEY, []);
    writeLocalJson(LOCAL_ENTRIES_KEY, sortRecords([...localRows, localRow]));
    return {
      source: "local" as const,
      error: error instanceof Error ? error.message : "Saved locally because backend wiring is unavailable.",
    };
  }
}

export async function updateDailySalesGgTransNo(entryId: string, username: string) {
  if (entryId.startsWith("local-")) {
    const localRows = readLocalJson<DailySalesRecord[]>(LOCAL_ENTRIES_KEY, []);
    writeLocalJson(
      LOCAL_ENTRIES_KEY,
      localRows.map((row) =>
        row.id === entryId
          ? {
              ...row,
              ggTransNo: username,
              zeroOne: username,
            }
          : row,
      ),
    );
    return;
  }

  const { error } = await supabase
    .from("sales_entries")
    .update({
      username,
    })
    .eq("id", entryId);

  if (error) {
    throw error;
  }
}

export async function removeDailySalesRecord(entryId: string) {
  if (entryId.startsWith("local-")) {
    const localRows = readLocalJson<DailySalesRecord[]>(LOCAL_ENTRIES_KEY, []);
    writeLocalJson(
      LOCAL_ENTRIES_KEY,
      localRows.filter((row) => row.id !== entryId),
    );
    return;
  }

  await deleteSalesEntry(entryId);
}

function normalizeRpcDataset(rows: unknown[]): SalesDataset {
  const agents: AgentPerformance[] = rows.map((row, index) => {
    const safeRow = (row ?? {}) as Record<string, unknown>;
    const sales = toNumber(
      safeRow.sales ?? safeRow.sales_total ?? safeRow.amount ?? safeRow.total_sales,
    );
    const target = toNumber(safeRow.target ?? safeRow.goal ?? safeRow.quota) || sales;
    const conversionRate = toNumber(
      safeRow.conversion_rate ?? safeRow.perf_perc ?? safeRow.conversionRate,
    );

    return {
      id: toText(safeRow.id ?? safeRow.leader_id ?? safeRow.agent_id) || `agent-${index + 1}`,
      name:
        toText(safeRow.leader_name ?? safeRow.name ?? safeRow.agent_name) || `Agent ${index + 1}`,
      sales,
      target,
      conversionRate,
      status: toText(safeRow.status ?? safeRow.agent_status).toLowerCase() === "idle" ? "idle" : "active",
    };
  });

  const totalSales = agents.reduce((sum, agent) => sum + agent.sales, 0);
  const totalTransactions = rows.reduce((sum, row) => {
    const safeRow = (row ?? {}) as Record<string, unknown>;
    return sum + toNumber(safeRow.orders ?? safeRow.order_count ?? safeRow.deals_total);
  }, 0);
  const avgConversion =
    agents.length > 0
      ? agents.reduce((sum, agent) => sum + agent.conversionRate, 0) / agents.length
      : 0;

  const summary: SummaryStat[] = [
    {
      id: "total-sales",
      label: "API Total Sales",
      value: `PHP ${Math.round(totalSales).toLocaleString()}`,
      trend: "up",
    },
    {
      id: "transactions",
      label: "API Orders",
      value: Math.round(totalTransactions).toLocaleString(),
      trend: "up",
    },
    {
      id: "active-agents",
      label: "Active Agents",
      value: agents.filter((agent) => agent.status === "active").length.toLocaleString(),
      trend: "neutral",
    },
    {
      id: "avg-conversion",
      label: "Avg Response",
      value: `${Math.round(avgConversion)}%`,
      trend: "neutral",
    },
  ];

  return {
    label: "Sales API Dataset",
    summary,
    agents,
  };
}

function buildFallbackMetricsDataset(rows: DailySalesRecord[], dateFrom: string, dateTo: string): SalesDataset {
  const filteredRows = rows.filter((row) => row.date >= dateFrom && row.date <= dateTo);
  const grouped = new Map<string, DailySalesRecord[]>();

  for (const row of filteredRows) {
    const key = row.zeroOne || row.ggTransNo || row.memberName || "Unassigned";
    const current = grouped.get(key) ?? [];
    current.push(row);
    grouped.set(key, current);
  }

  const agents: AgentPerformance[] = Array.from(grouped.entries()).map(([name, agentRows], index) => {
    const sales = agentRows.reduce((sum, row) => sum + row.sales, 0);
    const target = Math.max(sales * 1.15, 1);
    const conversionRate = Math.min(100, Math.round((sales / target) * 100));

    return {
      id: `derived-${index + 1}`,
      name,
      sales,
      target,
      conversionRate,
      status: agentRows.length > 0 ? "active" : "idle",
    };
  });

  const totalSales = filteredRows.reduce((sum, row) => sum + row.sales, 0);
  const totalOrders = filteredRows.length;
  const totalNewMembers = filteredRows.filter((row) => row.newMember).length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  return {
    label: "Derived Sales Dataset",
    summary: [
      {
        id: "total-sales",
        label: "Total Sales",
        value: `PHP ${Math.round(totalSales).toLocaleString()}`,
        trend: "up",
      },
      {
        id: "transactions",
        label: "Transactions",
        value: totalOrders.toLocaleString(),
        trend: "neutral",
      },
      {
        id: "new-members",
        label: "New Members",
        value: totalNewMembers.toLocaleString(),
        trend: totalNewMembers > 0 ? "up" : "neutral",
      },
      {
        id: "avg-order",
        label: "Avg Order Value",
        value: `PHP ${Math.round(avgOrderValue).toLocaleString()}`,
        trend: "neutral",
      },
    ],
    agents,
  };
}

export async function loadSalesMetricsDataset(dateFrom: string, dateTo: string): Promise<SalesDataset> {
  const rpcParamAttempts: Record<string, string>[] = [
    { date_from: dateFrom, date_to: dateTo },
    { p_date_from: dateFrom, p_date_to: dateTo },
    { df: dateFrom, dt: dateTo },
    { dateFrom, dateTo },
    { from_date: dateFrom, to_date: dateTo },
  ];

  for (const params of rpcParamAttempts) {
    const { data, error } = await supabase.rpc("rpc_sales_api_performance", params as never);
    if (!error) {
      return normalizeRpcDataset(Array.isArray(data) ? data : []);
    }
  }

  const rows = await listDailySalesEntries();
  return buildFallbackMetricsDataset(rows, dateFrom, dateTo);
}

function normalizeCashRow(row: RawCashRow): CashOnHandPieces {
  const next: CashOnHandPieces = { ...emptyCashOnHand };

  for (const [fieldId, columnName] of Object.entries(CASH_FIELD_MAP) as Array<[CashFieldId, string]>) {
    next[fieldId] = toNumber(row?.[columnName]);
  }

  return next;
}

export async function loadCashOnHand(transDate: string) {
  try {
    const { data, error } = await supabase
      .from("cash_on_hand")
      .select("*")
      .eq("trans_date", transDate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const pieces = normalizeCashRow((data ?? null) as RawCashRow);
    return {
      pieces,
      total: getCashOnHandTotal(pieces),
      source: "remote" as const,
    };
  } catch {
    const localMap = readLocalJson<Record<string, CashOnHandPieces>>(LOCAL_CASH_KEY, {});
    const pieces = localMap[transDate] ?? { ...emptyCashOnHand };
    return {
      pieces,
      total: getCashOnHandTotal(pieces),
      source: "local" as const,
    };
  }
}

export function persistCashOnHandLocally(transDate: string, pieces: CashOnHandPieces) {
  const localMap = readLocalJson<Record<string, CashOnHandPieces>>(LOCAL_CASH_KEY, {});
  writeLocalJson(LOCAL_CASH_KEY, {
    ...localMap,
    [transDate]: pieces,
  });
}

export function getCashOnHandTotal(pieces: CashOnHandPieces) {
  return (Object.entries(pieces) as Array<[CashFieldId, number]>).reduce(
    (sum, [fieldId, value]) => sum + value * cashMultipliers[fieldId],
    0,
  );
}
