import type {
  CashFieldId,
  CashOnHandPieces,
  EncoderPaymentModeOption,
  PaymentMode,
} from "@/types/dailySales";
import { printHtmlDocument } from "@/print/printReport";

export type ReportRangeType = "daily" | "weekly" | "monthly" | "custom";

export type PaymentTypeOption = {
  label: string;
  value: string;
};

export type PackageRow = {
  label: string;
  qty: number;
  price: number;
  amount: number;
};

export type AmountRow = {
  label: string;
  amount: number;
};

export type InventoryAggregateRow = {
  id: string;
  name: string;
  ggTransNo: string;
  pofNumber: string;
  platinum: number;
  gold: number;
  silver: number;
  synbioticBottle: number;
  synbioticBlister: number;
  voucher: number;
  employeeDiscount: number;
  numberOfBottles: number;
  numberOfBlisters: number;
  releasedBottle: number;
  releasedBlister: number;
  toFollowBottle: number;
  toFollowBlister: number;
  amount: number;
  modeOfPayment: string;
};

export const paymentModes: PaymentMode[] = [
  "ALL",
  "CASH",
  "BANK",
  "MAYA(IGI)",
  "MAYA(ATC)",
  "SBCOLLECT(IGI)",
  "SBCOLLECT(ATC)",
  "EWALLET",
  "CHEQUE",
  "EPOINTS",
  "CONSIGNMENT",
  "AR(CSA)",
  "AR(LEADERSUPPORT)",
];

export const primaryPaymentModes: Exclude<EncoderPaymentModeOption, "N/A">[] = [
  "CASH",
  "BANK",
  "MAYA(IGI)",
  "MAYA(ATC)",
  "SBCOLLECT(IGI)",
  "SBCOLLECT(ATC)",
  "EWALLET",
  "CHEQUE",
  "EPOINTS",
  "CONSIGNMENT",
  "AR(CSA)",
  "AR(LEADERSUPPORT)",
];

export const secondaryPaymentModes: EncoderPaymentModeOption[] = [
  "N/A",
  ...primaryPaymentModes,
];

export const paymentTypeOptionsByMode: Partial<
  Record<Exclude<EncoderPaymentModeOption, "N/A">, PaymentTypeOption[]>
> = {
  BANK: [
    { label: "Security Bank", value: "SECURITYBANK" },
    { label: "BPI", value: "BPI" },
    { label: "BDO", value: "BDO" },
    { label: "GoTyme", value: "GOTYME" },
  ],
  EWALLET: [{ label: "Payout", value: "PAYOUT" }],
};

export const defaultPaymentTypeOption: PaymentTypeOption = {
  label: "N/A",
  value: "N/A",
};

export const encoderDiscountOptions: Array<{ label: string; value: number }> = [
  { label: "No Discount", value: 0 },
  { label: "10% (P380)", value: 380 },
  { label: "20% (P760)", value: 760 },
  { label: "P50", value: 50 },
  { label: "P150", value: 150 },
  { label: "P500", value: 500 },
  { label: "P80", value: 80 },
  { label: "P240", value: 240 },
  { label: "P800", value: 800 },
  { label: "P1748", value: 1748 },
  { label: "40% (P1,520)", value: 1520 },
  { label: "45% (P1,710)", value: 1710 },
  { label: "50% (P1,900)", value: 1900 },
  { label: "40% (P520)", value: 520 },
  { label: "45% (P585)", value: 585 },
  { label: "47.5% (P618)", value: 618 },
  { label: "50% (P650)", value: 650 },
];

export const cashDenominations: Array<{
  label: string;
  id: CashFieldId;
  spanId: string;
  multiplier: number;
}> = [
  { label: "1000.00", id: "cohOneThousand", spanId: "spnOneThousand", multiplier: 1000 },
  { label: "500.00", id: "cohFiveHundred", spanId: "spnFiveHundred", multiplier: 500 },
  { label: "200.00", id: "cohTwoHundred", spanId: "spnTwoHundred", multiplier: 200 },
  { label: "100.00", id: "cohOneHundred", spanId: "spnOneHundred", multiplier: 100 },
  { label: "50.00", id: "cohFifty", spanId: "spnFifty", multiplier: 50 },
  { label: "20.00", id: "cohTwenty", spanId: "spnTwenty", multiplier: 20 },
  { label: "10.00", id: "cohTen", spanId: "spnTen", multiplier: 10 },
  { label: "5.00", id: "cohFive", spanId: "spnFive", multiplier: 5 },
  { label: "1.00", id: "cohOne", spanId: "spnOne", multiplier: 1 },
  { label: "0.25", id: "cohCents", spanId: "spnCents", multiplier: 0.25 },
];

export const paymentTypeTableIds: Array<{ id: string; title: string; label: string }> = [
  { id: "tblEwallet", title: "Ewallet", label: "E-Wallet" },
  { id: "tblBank", title: "Bank", label: "Bank Transfer - Security Bank" },
  { id: "tblMayaIgi", title: "Maya(IGI)", label: "Maya (IGI)" },
  { id: "tblMayaAtc", title: "Maya(ATC)", label: "Maya (ATC)" },
  { id: "tblSbCollectIgi", title: "SbCollect(IGI)", label: "SB Collect (IGI)" },
  { id: "tblSbCollectAtc", title: "SbCollect(ATC)", label: "SB Collect (ATC)" },
  { id: "tblArCsa", title: "AR(CSA)", label: "Accounts Receivable - CSA" },
  { id: "tblArLeaderSupport", title: "AR Leader Support", label: "Accounts Receivable - Leaders Support" },
  { id: "tblCheque", title: "Cheque", label: "Cheque" },
  { id: "tblEpoints", title: "Epoints", label: "E-Points" },
];

export const defaultZeroOneOptions = ["HeadEagle01", "HERA01", "Romar01", "Ironman"];

export const defaultCodePaymentOptions = ["PD", "FS"] as const;

export const fieldClassName =
  "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900";

export const textareaClassName =
  "mt-1 min-h-[88px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

export const defaultCashPieces: CashOnHandPieces = {
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

export function getLocalDateIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const todayIso = getLocalDateIso();

export function normalizeDateInput(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return getLocalDateIso(parsed);
    }

    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return getLocalDateIso(value);
  }

  return "";
}

export function normalizeDateRange(fromDate: string, toDate: string) {
  const normalizedFrom = normalizeDateInput(fromDate);
  const normalizedTo = normalizeDateInput(toDate);

  if (!normalizedFrom && !normalizedTo) {
    return { from: "", to: "" };
  }

  if (!normalizedFrom) {
    return { from: normalizedTo, to: normalizedTo };
  }

  if (!normalizedTo) {
    return { from: normalizedFrom, to: normalizedFrom };
  }

  return normalizedFrom <= normalizedTo
    ? { from: normalizedFrom, to: normalizedTo }
    : { from: normalizedTo, to: normalizedFrom };
}

export function isDateWithinRange(
  value: unknown,
  fromDate?: string,
  toDate?: string,
): boolean {
  const normalizedValue = normalizeDateInput(value);
  const { from, to } = normalizeDateRange(fromDate ?? "", toDate ?? "");

  if (!from && !to) {
    return true;
  }

  if (!normalizedValue) {
    return false;
  }

  if (from && normalizedValue < from) {
    return false;
  }

  if (to && normalizedValue > to) {
    return false;
  }

  return true;
}

function toSearchableText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  if (value instanceof Date) {
    return normalizeDateInput(value);
  }

  return "";
}

export function formatCurrency(value: number) {
  return `PHP ${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPesoShort(value: number) {
  return `PHP ${value.toLocaleString("en-PH", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}`;
}

export function formatDateDMYY(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = parsed.toLocaleString("en-US", { month: "short" });
  const year = String(parsed.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export function formatDateSlash(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${parsed.getFullYear()}`;
}

export function calculateRange(
  type: ReportRangeType,
  startDate: string,
  endDate: string,
  fallbackDate: string,
) {
  const fallback = normalizeDateInput(fallbackDate) || getLocalDateIso();
  const normalizedStart = normalizeDateInput(startDate) || fallback;
  const normalizedEnd = normalizeDateInput(endDate);

  if (type === "custom") {
    return normalizeDateRange(normalizedStart, normalizedEnd || normalizedStart);
  }

  if (type === "daily") {
    return { from: normalizedStart, to: normalizedStart };
  }

  if (type === "weekly") {
    if (normalizedEnd) {
      return normalizeDateRange(normalizedStart, normalizedEnd);
    }

    const fromDate = new Date(`${normalizedStart}T00:00:00`);
    fromDate.setDate(fromDate.getDate() + 6);
    return normalizeDateRange(normalizedStart, getLocalDateIso(fromDate));
  }

  const anchor = new Date(`${normalizedStart}T00:00:00`);
  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lastDay = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return {
    from: getLocalDateIso(firstDay),
    to: getLocalDateIso(lastDay),
  };
}

export function matchesSearch(values: unknown[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }

  return values
    .map((value) => toSearchableText(value).toLowerCase())
    .join(" ")
    .includes(query);
}

export function getPaymentTypeOptions(mode: EncoderPaymentModeOption): PaymentTypeOption[] {
  if (mode === "N/A") {
    return [defaultPaymentTypeOption];
  }

  return paymentTypeOptionsByMode[mode] ?? [defaultPaymentTypeOption];
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [headers.map((header) => escape(header)).join(",")];

  for (const row of rows) {
    lines.push(row.map((value) => escape(value)).join(","));
  }

  const blob = new Blob(["\ufeff", lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) {
  const [{ saveAs }, XLSX] = await Promise.all([import("file-saver"), import("xlsx")]);

  const exportRows = rows.map((row) =>
    headers.reduce<Record<string, string | number>>((record, header, index) => {
      record[header] = row[index] ?? "";
      return record;
    }, {}),
  );

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  saveAs(
    new Blob([output], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export function formatPaymentModes(
  primaryMode: string,
  secondaryMode?: string | null,
) {
  const modes = [primaryMode, secondaryMode]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value && value !== "N/A");

  return modes.length > 0 ? modes.join(" + ") : "N/A";
}

export function openPrintWindow(title: string, bodyHtml: string) {
  void printHtmlDocument({
    title,
    contentHtml: bodyHtml,
    pageCss: "@page { size: A4 portrait; margin: 10mm; }",
    extraCss: `
      body { font-family: Arial, sans-serif; color: #0f172a; }
      .print-shell { width: 100%; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td {
        border: 1px solid #cbd5e1;
        padding: 6px 8px;
        text-align: left;
        vertical-align: top;
        white-space: normal;
        word-break: break-word;
      }
      th { background: #f8fafc; }
      .daily-sales-sales-report__print-shell {
        width: 100%;
        max-width: 1024px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .daily-sales-sales-report__report-header,
      .daily-sales-inventory-report__header {
        text-align: center;
      }
      .daily-sales-sales-report__report-header h2,
      .daily-sales-inventory-report__header h2 {
        margin: 0;
        font-size: 14px;
        line-height: 20px;
        font-weight: 700;
      }
      .daily-sales-sales-report__report-header p,
      .daily-sales-inventory-report__header p {
        margin: 2px 0 0;
        font-size: 12px;
        line-height: 18px;
        color: #475569;
      }
      .daily-sales-sales-report__message {
        margin: 0;
        font-size: 12px;
        line-height: 18px;
        color: #b45309;
      }
      .daily-sales-sales-report__message--muted {
        color: #64748b;
      }
      .daily-sales-sales-report__main-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        align-items: start;
      }
      .daily-sales-sales-report__column {
        display: grid;
        gap: 12px;
        align-content: start;
      }
      .daily-sales-sales-report__box,
      .daily-sales-sales-report__mini-card {
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        overflow: hidden;
        background: #ffffff;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .daily-sales-sales-report__box-title,
      .daily-sales-sales-report__mini-card-title {
        padding: 8px 10px;
        background: #f8fafc;
        border-bottom: 1px solid #cbd5e1;
        font-size: 11px;
        line-height: 16px;
        font-weight: 700;
        letter-spacing: .06em;
        text-transform: uppercase;
        color: #334155;
      }
      .daily-sales-sales-report__table,
      .daily-sales-sales-report__three-col,
      .daily-sales-inventory-report__table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
      }
      .daily-sales-sales-report__table th,
      .daily-sales-sales-report__table td,
      .daily-sales-sales-report__three-col th,
      .daily-sales-sales-report__three-col td,
      .daily-sales-inventory-report__table th,
      .daily-sales-inventory-report__table td {
        border: 1px solid #cbd5e1;
        padding: 5px 6px;
        vertical-align: middle;
      }
      .daily-sales-sales-report__table thead th,
      .daily-sales-sales-report__three-col thead th,
      .daily-sales-inventory-report__table thead th {
        background: #f8fafc;
        font-size: 9px;
        line-height: 12px;
        font-weight: 700;
        text-transform: uppercase;
        color: #475569;
      }
      .daily-sales-sales-report__table tfoot td {
        background: #fbfcfe;
        font-weight: 700;
      }
      .daily-sales-sales-report__numeric,
      .daily-sales-inventory-report__table td[data-align="right"] {
        text-align: right;
      }
      .daily-sales-sales-report__center {
        text-align: center;
      }
      .daily-sales-sales-report__cash-input {
        width: 56px;
        height: 24px;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 0 6px;
        text-align: center;
        font-size: 10px;
      }
      .daily-sales-sales-report__summary {
        display: grid;
        gap: 8px;
        padding: 10px;
      }
      .daily-sales-sales-report__summary-row,
      .daily-sales-sales-report__mini-value {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 11px;
        line-height: 16px;
        color: #334155;
      }
      .daily-sales-sales-report__summary-row strong,
      .daily-sales-sales-report__mini-value strong {
        color: #0f172a;
        font-weight: 700;
      }
      .daily-sales-sales-report__summary-row--grand {
        padding-top: 8px;
        border-top: 1px solid #cbd5e1;
        font-size: 12px;
        line-height: 18px;
        font-weight: 700;
      }
      .daily-sales-sales-report__mini-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .daily-sales-sales-report__mini-card-body {
        padding: 10px;
      }
      .daily-sales-sales-report__footer {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        padding-top: 4px;
      }
      .daily-sales-sales-report__footer-block {
        text-align: center;
        font-size: 11px;
        line-height: 16px;
        color: #475569;
      }
      .daily-sales-sales-report__footer-block strong {
        display: block;
        margin-top: 6px;
        color: #0f172a;
        font-size: 12px;
        line-height: 18px;
      }
      .daily-sales-inventory-report__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 12px;
      }
      .daily-sales-inventory-report__range {
        font-size: 12px;
        font-weight: 700;
      }
      .daily-sales-inventory-report__table-wrap {
        overflow: visible !important;
      }
      .daily-sales-inventory-report__table {
        table-layout: auto;
        font-size: 9px;
      }
      .daily-sales-inventory-report__table th,
      .daily-sales-inventory-report__table td {
        padding: 4px 5px;
      }
    `,
  });
}

