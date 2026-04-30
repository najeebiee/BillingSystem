import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type ExportableBill = {
  request_date?: string;
  reference_no?: string;
  vendor?: { name?: string };
  remarks?: string | null;
  payment_method?: string;
  payment_methods?: string[];
  priority_level?: string;
  total_amount?: number | string | null;
  status?: string;
  created_by?: string;
};

type ExportMeta = {
  filters?: string;
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

const formatPaymentMethod = (value: string) => {
  switch (value) {
    case "bank_transfer":
      return "Bank Transfer";
    case "check":
      return "Check";
    case "cash":
      return "Cash";
    case "other":
      return "Other";
    default:
      return toSentenceCase(value);
  }
};

export const formatPeso = (amount: number) =>
  `\u20b1${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getExportDate = () => new Date().toISOString().slice(0, 10);

export function mapBillsToExportRows(bills: ExportableBill[]) {
  return bills.map((bill) => {
    const paymentMethods = Array.from(
      new Set(
        (bill.payment_methods?.length ? bill.payment_methods : bill.payment_method ? [bill.payment_method] : [])
          .filter(Boolean)
          .map(formatPaymentMethod)
      )
    );
    const total = Number(bill.total_amount ?? 0);

    return {
      Date: formatDate(bill.request_date),
      "Reference No.": bill.reference_no ?? "",
      "Payee / Vendor": bill.vendor?.name ?? "",
      "Purpose Summary": bill.remarks ?? "",
      "Payment Method": paymentMethods.join(", "),
      Priority: toSentenceCase(bill.priority_level ?? ""),
      "Total Amount": formatPeso(Number.isFinite(total) ? total : 0),
      Status: toSentenceCase(bill.status ?? ""),
      "Requested By": bill.created_by ?? ""
    };
  });
}

export function exportBillsToCSV(bills: ExportableBill[]) {
  const rows = mapBillsToExportRows(bills);
  const csv = Papa.unparse(rows, {
    columns: [
      "Date",
      "Reference No.",
      "Payee / Vendor",
      "Purpose Summary",
      "Payment Method",
      "Priority",
      "Total Amount",
      "Status",
      "Requested By"
    ]
  });

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `bills_${getExportDate()}.csv`);
}

export function exportBillsToExcel(bills: ExportableBill[]) {
  const rows = mapBillsToExportRows(bills);
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      "Date",
      "Reference No.",
      "Payee / Vendor",
      "Purpose Summary",
      "Payment Method",
      "Priority",
      "Total Amount",
      "Status",
      "Requested By"
    ]
  });

  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 18 },
    { wch: 24 },
    { wch: 36 },
    { wch: 24 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Payment Requests");
  XLSX.writeFile(workbook, `bills_${getExportDate()}.xlsx`);
}

export function exportBillsToPDF(bills: ExportableBill[], meta?: ExportMeta) {
  const rows = mapBillsToExportRows(bills);
  const exportedAt = formatDateTime(new Date());
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4"
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Payment Requests", 40, 34);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Exported: ${exportedAt}`, 40, 50);
  if (meta?.filters) {
    doc.text(`Filters: ${meta.filters}`, 40, 64);
  }

  autoTable(doc, {
    startY: meta?.filters ? 74 : 60,
    head: [
      [
        "Date",
        "Reference No.",
        "Payee / Vendor",
        "Purpose Summary",
        "Payment Method",
        "Priority",
        "Total Amount",
        "Status",
        "Requested By"
      ]
    ],
    body: rows.map((row) => [
      row.Date,
      row["Reference No."],
      row["Payee / Vendor"],
      row["Purpose Summary"],
      row["Payment Method"],
      row.Priority,
      row["Total Amount"],
      row.Status,
      row["Requested By"]
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
      3: { cellWidth: 220 },
      6: { halign: "right" }
    },
    didParseCell: (hookData) => {
      if (hookData.column.index === 6) {
        hookData.cell.styles.halign = "right";
      }
    }
  });

  doc.save(`bills_${getExportDate()}.pdf`);
}
