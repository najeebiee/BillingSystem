import type { InventoryAggregateRow } from "@/components/daily-sales/shared";
import {
  formatPaymentModes,
  isDateWithinRange,
  normalizeDateInput,
} from "@/components/daily-sales/shared";
import { normalizeDailySalesPackageType } from "@/lib/dailySalesPackages";
import { listDailySalesEntries } from "@/services/dailySales.service";
import {
  fetchInventoryReportRows,
  type SalesDashboardRawRow,
} from "@/services/salesDashboard.service";
import type { DailySalesRecord } from "@/types/dailySales";

const INVENTORY_DATE_KEYS = [
  "report_date",
  "entry_date",
  "sale_date",
  "date",
  "transaction_date",
  "created_at",
] as const;

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

const pickString = (row: SalesDashboardRawRow, keys: string[], fallback = ""): string => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
};

const pickNumber = (row: SalesDashboardRawRow, keys: string[]): number => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) {
      return toNumber(value);
    }
  }

  return 0;
};

const toNormalizedText = (value: string) => value.trim().toLowerCase();

const inferCount = (row: SalesDashboardRawRow, preferredKeys: string[] = []): number => {
  const preferred = pickNumber(row, preferredKeys);
  if (preferred > 0) {
    return preferred;
  }

  const generic = pickNumber(row, ["quantity", "qty", "package_qty", "count"]);
  if (generic > 0) {
    return generic;
  }

  return 1;
};

const pickInventoryDate = (row: SalesDashboardRawRow): string => {
  for (const key of INVENTORY_DATE_KEYS) {
    const value = normalizeDateInput(row[key]);
    if (value) {
      return value;
    }
  }

  return "";
};

const getUpgradePackageBucket = (packageType: string) => {
  const normalized = packageType.trim().toUpperCase();
  if (normalized === "USILVERGOLD") {
    return "gold";
  }

  if (normalized === "UGOLDPLATINUM" || normalized === "USILVERPLATINUM") {
    return "platinum";
  }

  return null;
};

const mapPackageColumns = (row: SalesDashboardRawRow) => {
  const direct = {
    platinum: pickNumber(row, ["package_platinum", "package_plat", "plat", "platinum_qty"]),
    gold: pickNumber(row, ["package_gold", "gold", "gold_qty"]),
    silver: pickNumber(row, ["package_silver", "silver", "silver_qty"]),
  };

  if (direct.platinum > 0 || direct.gold > 0 || direct.silver > 0) {
    return direct;
  }

  const packageType = toNormalizedText(pickString(row, ["package_type"], ""));
  if (!packageType) {
    return direct;
  }

  const count = inferCount(row, ["package_quantity", "quantity", "qty"]);
  if (packageType.includes("platinum") || packageType.includes("plat")) {
    direct.platinum = count;
  } else if (packageType.includes("gold")) {
    direct.gold = count;
  } else if (packageType.includes("silver")) {
    direct.silver = count;
  }

  return direct;
};

const mapRetailColumns = (row: SalesDashboardRawRow) => {
  const mapped = {
    synbioticBottle: pickNumber(row, [
      "retail_bottles",
      "retail_bottle",
      "bottle",
      "retail_bottle_qty",
    ]),
    synbioticBlister: pickNumber(row, [
      "retail_blisters",
      "retail_blister",
      "blister",
      "retail_blister_qty",
    ]),
    voucher: pickNumber(row, ["retail_vouchers", "retail_voucher", "voucher", "voucher_qty"]),
    employeeDiscount: pickNumber(row, [
      "retail_discounts",
      "retail_discount",
      "discount",
      "discount_qty",
      "employee_discount_qty",
    ]),
  };

  const packageType = toNormalizedText(pickString(row, ["package_type"], ""));

  if (mapped.synbioticBottle === 0 && packageType.includes("retail")) {
    mapped.synbioticBottle = inferCount(row, ["retail_bottles", "quantity", "qty"]);
  }

  if (mapped.synbioticBlister === 0 && packageType.includes("blister")) {
    mapped.synbioticBlister = inferCount(row, ["retail_blisters", "blister_count", "quantity", "qty"]);
  }

  if (mapped.voucher === 0 && packageType.includes("voucher")) {
    mapped.voucher = inferCount(row, ["retail_vouchers", "quantity", "qty"]);
  }

  if (mapped.employeeDiscount === 0 && packageType.includes("discount")) {
    mapped.employeeDiscount = inferCount(row, ["retail_discounts", "discount_qty", "quantity", "qty"]);
  }

  return mapped;
};

const mapInventoryViewRow = (row: SalesDashboardRawRow, index: number): InventoryAggregateRow => {
  const packageColumns = mapPackageColumns(row);
  const retailColumns = mapRetailColumns(row);
  const primaryPaymentMode = pickString(row, [
    "primary_payment_mode",
    "payment_mode",
    "mode_of_payment",
    "mode",
  ]);
  const secondaryPaymentMode = pickString(row, [
    "secondary_payment_mode",
    "mode_of_payment_2",
    "payment_mode_2",
    "mode_2",
  ]);

  return {
    id:
      pickString(row, ["id", "inventory_report_id", "sales_entry_id", "sale_entry_id"]) ||
      `inventory-${index + 1}`,
    name: pickString(row, ["member_name", "name", "full_name"], "-"),
    ggTransNo: pickString(row, ["gg_trans_no", "gg_trans", "gg_transaction_no", "username"], "-"),
    pofNumber: pickString(row, ["pof_number", "pgf_number", "po_number", "pof"], "-"),
    platinum: packageColumns.platinum,
    gold: packageColumns.gold,
    silver: packageColumns.silver,
    synbioticBottle: retailColumns.synbioticBottle,
    synbioticBlister: retailColumns.synbioticBlister,
    voucher: retailColumns.voucher,
    employeeDiscount: retailColumns.employeeDiscount,
    numberOfBottles: pickNumber(row, ["bottles", "total_bottles", "number_of_bottles"]),
    numberOfBlisters: pickNumber(row, ["blisters", "total_blisters", "number_of_blisters"]),
    releasedBottle: pickNumber(row, ["released_bottles", "released_bottle"]),
    releasedBlister: pickNumber(row, ["released_blisters", "released_blister"]),
    toFollowBottle: pickNumber(row, ["to_follow_bottles", "to_follow_bottle"]),
    toFollowBlister: pickNumber(row, ["to_follow_blisters", "to_follow_blister"]),
    amount: pickNumber(row, ["amount", "total_amount", "amount_total", "total_sales"]),
    modeOfPayment: formatPaymentModes(primaryPaymentMode, secondaryPaymentMode),
  };
};

const mapInventoryEntryRow = (row: DailySalesRecord): InventoryAggregateRow => {
  const normalizedPackage = normalizeDailySalesPackageType(row.packageType);
  const upgradeBucket = getUpgradePackageBucket(row.packageType);

  return {
    id: row.id,
    name: row.memberName || "-",
    ggTransNo: row.ggTransNo || "-",
    pofNumber: row.pofNumber || "-",
    platinum:
      normalizedPackage === "PLATINUM"
        ? row.quantity
        : upgradeBucket === "platinum"
          ? row.quantity
          : 0,
    gold:
      normalizedPackage === "GOLD"
        ? row.quantity
        : upgradeBucket === "gold"
          ? row.quantity
          : 0,
    silver: normalizedPackage === "SILVER" ? row.quantity : 0,
    synbioticBottle: normalizedPackage === "RETAIL" ? row.bottles : 0,
    synbioticBlister: normalizedPackage === "BLISTER" ? row.blisters : 0,
    voucher: 0,
    employeeDiscount:
      row.discount > 0 && (normalizedPackage === "RETAIL" || normalizedPackage === "BLISTER")
        ? row.quantity
        : 0,
    numberOfBottles: row.bottles,
    numberOfBlisters: row.blisters,
    releasedBottle: row.releasedBottle,
    releasedBlister: row.releasedBlister,
    toFollowBottle: row.balanceBottle,
    toFollowBlister: row.balanceBlister,
    amount: row.sales,
    modeOfPayment: formatPaymentModes(row.paymentMode, row.paymentModeTwo),
  };
};

export async function loadInventoryReportRows(
  fromDate: string,
  toDate: string,
): Promise<InventoryAggregateRow[]> {
  try {
    const rawRows = await fetchInventoryReportRows();
    const filteredRows = rawRows.filter((row) =>
      isDateWithinRange(pickInventoryDate(row), fromDate, toDate),
    );

    if (filteredRows.length > 0) {
      return filteredRows.map(mapInventoryViewRow);
    }
  } catch {
    // Fall back to the sales entries dataset when the report view is unavailable.
  }

  const entries = await listDailySalesEntries();
  return entries
    .filter((row) => isDateWithinRange(row.date, fromDate, toDate))
    .map(mapInventoryEntryRow);
}
