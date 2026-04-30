import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { PcfTransaction } from "../types/billing";

type ExportablePcfTransaction = Pick<
  PcfTransaction,
  | "date"
  | "pcv_number"
  | "payee"
  | "invoice_no"
  | "description"
  | "amount_in"
  | "amount_out"
  | "balance"
  | "transaction_type"
>;

export type PcfExportFilterSummary = {
  status: string;
  search: string;
  from: string;
  to: string;
  totalReplenishments: string;
  totalExpenses: string;
  endingBalance: string;
};

type ExportMeta = {
  filterSummary?: PcfExportFilterSummary;
};

const formatDate = (value: string | undefined) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
};

const formatDateTime = (value: Date) => {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  const hh = String(value.getHours()).padStart(2, "0");
  const min = String(value.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

const toSentenceCase = (value: string) =>
  value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const getDisplayValue = (value?: string | null) => {
  const normalized = (value ?? "").trim();
  return normalized || "-";
};

const formatTransactionType = (value: string) => {
  switch (value) {
    case "beginning_balance":
      return "Beginning Balance";
    case "replenishment":
      return "Replenishment";
    case "expense":
      return "Expense";
    default:
      return toSentenceCase(value);
  }
};

export const formatPeso = (amount: number) =>
  `\u20b1${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const getExportDate = () => new Date().toISOString().slice(0, 10);

export function mapPcfToExportRows(transactions: ExportablePcfTransaction[]) {
  return transactions.map((transaction) => ({
    Date: getDisplayValue(formatDate(transaction.date)),
    "PCV No.": getDisplayValue(transaction.pcv_number),
    Payee: getDisplayValue(transaction.payee),
    "Invoice No.": getDisplayValue(transaction.invoice_no),
    Description: getDisplayValue(transaction.description),
    In: formatPeso(Number(transaction.amount_in ?? 0)),
    Out: formatPeso(Number(transaction.amount_out ?? 0)),
    Balance: formatPeso(Number(transaction.balance ?? 0)),
    Type: formatTransactionType(transaction.transaction_type ?? "")
  }));
}

export function exportPcfToCSV(transactions: ExportablePcfTransaction[]) {
  const rows = mapPcfToExportRows(transactions);
  const csv = Papa.unparse(rows, {
    columns: [
      "Date",
      "PCV No.",
      "Payee",
      "Invoice No.",
      "Description",
      "In",
      "Out",
      "Balance",
      "Type"
    ]
  });

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `pcf_${getExportDate()}.csv`);
}

export function exportPcfToExcel(transactions: ExportablePcfTransaction[]) {
  const rows = mapPcfToExportRows(transactions);
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      "Date",
      "PCV No.",
      "Payee",
      "Invoice No.",
      "Description",
      "In",
      "Out",
      "Balance",
      "Type"
    ]
  });

  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 18 },
    { wch: 24 },
    { wch: 18 },
    { wch: 36 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Petty Cash Fund");
  XLSX.writeFile(workbook, `pcf_${getExportDate()}.xlsx`);
}

export function exportPcfToPDF(
  transactions: ExportablePcfTransaction[],
  meta?: ExportMeta
) {
  const rows = mapPcfToExportRows(transactions);
  const exportedAt = formatDateTime(new Date());
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4"
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Petty Cash Fund", 40, 34);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("View and manage petty cash transactions", 40, 50);
  doc.text(`Exported: ${exportedAt}`, 40, 64);

  let startY = 78;

  if (meta?.filterSummary) {
    const summaryLines = [
      `Status: ${meta.filterSummary.status}`,
      `Search: ${meta.filterSummary.search}`,
      `From: ${meta.filterSummary.from}`,
      `To: ${meta.filterSummary.to}`,
      `Total Replenishments: ${meta.filterSummary.totalReplenishments}`,
      `Total Expenses: ${meta.filterSummary.totalExpenses}`,
      `Ending Balance: ${meta.filterSummary.endingBalance}`
    ];

    summaryLines.forEach((line, index) => {
      doc.text(line, 40, startY + index * 14);
    });

    startY += summaryLines.length * 14 + 10;
  }

  autoTable(doc, {
    startY,
    head: [
      [
        "Date",
        "PCV No.",
        "Payee",
        "Invoice No.",
        "Description",
        "In",
        "Out",
        "Balance",
        "Type"
      ]
    ],
    body: rows.map((row) => [
      row.Date,
      row["PCV No."],
      row.Payee,
      row["Invoice No."],
      row.Description,
      row.In,
      row.Out,
      row.Balance,
      row.Type
    ]),
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 4
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255]
    },
    columnStyles: {
      4: { cellWidth: 220 },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" }
    },
    didParseCell: (hookData) => {
      if ([5, 6, 7].includes(hookData.column.index)) {
        hookData.cell.styles.halign = "right";
      }
    }
  });

  doc.save(`pcf_${getExportDate()}.pdf`);
}
