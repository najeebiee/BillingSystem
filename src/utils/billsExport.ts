import Papa from "papaparse";
import type { BillExportRow } from "../services/billsExportFetch";

type ExportFormat = "csv" | "xlsx" | "pdf";

function formatPaymentMethod(value: string) {
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
      return value;
  }
}

function formatStatus(value: string) {
  switch (value) {
    case "draft":
      return "Draft";
    case "awaiting_approval":
      return "Awaiting Approval";
    case "rejected":
      return "Rejected";
    case "approved":
      return "Approved";
    case "paid":
      return "Paid";
    case "void":
      return "Void";
    default:
      return value;
  }
}

function formatPriority(value: string) {
  switch (value) {
    case "urgent":
      return "Urgent";
    case "high":
      return "High";
    case "standard":
      return "Standard";
    case "low":
      return "Low";
    default:
      return value;
  }
}

function toExportRecords(rows: BillExportRow[]) {
  return rows.map((row) => ({
    Date: row.request_date,
    "Reference No.": row.reference_no,
    "Payee / Vendor": row.vendor_name,
    "Purpose Summary": row.purpose_summary || "-",
    "Payment Method": row.payment_methods.map(formatPaymentMethod).join(", ") || "-",
    Priority: formatPriority(row.priority_level),
    "Total Amount": Number(row.total_amount ?? 0),
    Status: formatStatus(row.status),
    "Requested By": row.created_by
  }));
}

function getTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

function buildFileName(ext: "csv" | "xlsx" | "pdf") {
  return `payment_requests_${getTimestamp()}.${ext}`;
}

export async function exportBills(rows: BillExportRow[], format: ExportFormat) {
  const records = toExportRecords(rows);

  if (format === "csv") {
    const { saveAs } = await import("file-saver");
    const csv = Papa.unparse(records);
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, buildFileName("csv"));
    return;
  }

  if (format === "xlsx") {
    const [{ saveAs }, XLSX] = await Promise.all([import("file-saver"), import("xlsx")]);
    const worksheet = XLSX.utils.json_to_sheet(records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payment Requests");
    const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([output], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    saveAs(blob, buildFileName("xlsx"));
    return;
  }

  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable")
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(12);
  doc.text("Payment Requests", 40, 36);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 52);

  autoTable(doc, {
    startY: 68,
    styles: { fontSize: 8, cellPadding: 4 },
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
      row.request_date,
      row.reference_no,
      row.vendor_name,
      row.purpose_summary || "-",
      row.payment_methods.map(formatPaymentMethod).join(", ") || "-",
      formatPriority(row.priority_level),
      Number(row.total_amount ?? 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      formatStatus(row.status),
      row.created_by
    ])
  });

  doc.save(buildFileName("pdf"));
}

export type { ExportFormat };
