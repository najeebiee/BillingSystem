import React, { useMemo, useState } from "react";
import { printReceipt } from "../print/printReceipt";
import type { SaleEntry } from "../types/sales";

type ReportType = "daily" | "weekly" | "monthly";
type MessageTone = "error" | "success" | "info";

interface ReportsPageProps {
  salesEntries: SaleEntry[];
  onRemoveEntry: (id: string) => Promise<void> | void;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRefresh?: () => Promise<void> | void;
}

interface HoverButtonProps {
  label: string;
  onClick: () => void;
  color: string;
  hoverColor: string;
  height: string;
  padding: string;
  fontSize: string;
  fontWeight: number;
  disabled?: boolean;
}

type AppliedFilters = {
  reportType: ReportType;
  startDate: string;
  endDate: string;
};

const computeTotal = (entry: SaleEntry): number => {
  if (entry.totalSales && parseFloat(entry.totalSales) > 0) return parseFloat(entry.totalSales);
  const qty = parseInt(entry.quantity, 10) || 1;
  const price = parseFloat(entry.priceAfterDiscount) || parseFloat(entry.originalPrice) || 0;
  const disc = parseFloat(entry.oneTimeDiscount) || 0;
  return Math.max(0, qty * price - disc);
};

const paymentLabel = (mode: string, type: string): string => {
  if (type === "maya") return "MAYA";
  if (type === "gcash") return "GCASH";
  if (type === "bdo") return "BANK TRANSFER (BDO)";
  if (type === "bpi") return "BANK TRANSFER (BPI)";
  switch (mode) {
    case "cash":
      return "CASH";
    case "bank":
      return "BANK TRANSFER";
    case "ewallet":
      return "E-WALLET";
    case "cheque":
      return "CHEQUE";
    default:
      return "";
  }
};

const paymentSummary = (entry: SaleEntry): string => {
  const labels = [
    paymentLabel(entry.modeOfPayment, entry.paymentModeType),
    paymentLabel(entry.modeOfPayment2, entry.paymentModeType2)
  ].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);
  return labels.length > 0 ? labels.join(" + ") : "CASH";
};

const fmtAmount = (value: number): string =>
  `\u20B1${value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;

const fmtDetailedAmount = (value: number): string =>
  `\u20B1${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function HoverButton(props: HoverButtonProps) {
  const { label, onClick, color, hoverColor, height, padding, fontSize, fontWeight, disabled = false } = props;
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? color : hovered ? hoverColor : color,
        color: "#FFFFFF",
        height,
        padding,
        fontSize,
        fontWeight,
        borderRadius: "4px",
        borderTop: "none",
        borderRight: "none",
        borderBottom: "none",
        borderLeft: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1
      }}
    >
      {label}
    </button>
  );
}

const inputStyle = (isFocused: boolean): React.CSSProperties => ({
  width: "100%",
  height: "38px",
  borderTop: `1px solid ${isFocused ? "#2E86C1" : "#ced4da"}`,
  borderRight: `1px solid ${isFocused ? "#2E86C1" : "#ced4da"}`,
  borderBottom: `1px solid ${isFocused ? "#2E86C1" : "#ced4da"}`,
  borderLeft: `1px solid ${isFocused ? "#2E86C1" : "#ced4da"}`,
  borderRadius: "4px",
  padding: "0 10px",
  fontSize: "14px",
  color: "#495057",
  outline: "none",
  backgroundColor: "#FFFFFF"
});

const tableCellStyle = (isLastCol = false): React.CSSProperties => ({
  padding: "10px 12px",
  fontSize: "14px",
  color: "#212529",
  borderBottom: "1px solid #dee2e6",
  borderRight: isLastCol ? "none" : "1px solid #dee2e6",
  borderTop: "none",
  borderLeft: "none",
  verticalAlign: "middle"
});

const tableHeaderStyle = (isLastCol = false): React.CSSProperties => ({
  padding: "10px 12px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: 600,
  color: "#495057",
  borderBottom: "2px solid #dee2e6",
  borderRight: isLastCol ? "none" : "1px solid #dee2e6",
  borderTop: "none",
  borderLeft: "none",
  whiteSpace: "nowrap"
});

const addDays = (date: string, days: number): string => {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(year, month - 1, day + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
};

const getMonthBounds = (date: string): { startDate: string; endDate: string } => {
  const [year, month] = date.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    startDate: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
    endDate: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
  };
};

const resolveFilters = (
  reportType: ReportType,
  startDate: string,
  endDate: string
): { filters: AppliedFilters | null; error: string | null } => {
  if (!startDate) return { filters: null, error: "Please select a start date before generating the report." };
  if (reportType === "daily") return { filters: { reportType, startDate, endDate: startDate }, error: null };
  if (reportType === "weekly") {
    if (endDate && endDate < startDate) return { filters: null, error: "End Date cannot be earlier than Start Date." };
    return { filters: { reportType, startDate, endDate: endDate || addDays(startDate, 6) }, error: null };
  }
  const month = getMonthBounds(startDate);
  return { filters: { reportType, startDate: month.startDate, endDate: month.endDate }, error: null };
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const buildPrintHtml = (entry: SaleEntry): string => {
  const lines = [
    ["Date", entry.date || "-"],
    ["POF Number", entry.pgfNumber || "-"],
    ["GG Trans No.", entry.username || "-"],
    ["Member Name", entry.memberName || "-"],
    ["Member Type", entry.memberType || "-"],
    ["Package Type", entry.packageType || "-"],
    ["Total Sales", fmtDetailedAmount(computeTotal(entry))],
    ["Mode of Payment", paymentSummary(entry)],
    ["Reference No.", entry.referenceNumber || "-"],
    ["Released Bottles", entry.releasedBottles || "0"],
    ["Released Blisters", entry.releasedBlister || "0"],
    ["To Follow Bottles", entry.toFollowBottles || "0"],
    ["To Follow Blisters", entry.toFollowBlister || "0"],
    ["Remarks", entry.remarks || "-"]
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 10px;border:1px solid #d1d5db;color:#6b7280;width:180px;">${escapeHtml(label)}</td><td style="padding:8px 10px;border:1px solid #d1d5db;color:#111827;font-weight:600;">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8" /><title>Sales Transaction Detail</title><style>@page { size: A4 portrait; margin: 12mm; } body { font-family: Inter, Arial, sans-serif; color: #111827; margin: 0; } .page { padding: 20px; } .title { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #2E3A8C; } .subtitle { font-size: 13px; color: #6B7280; margin-bottom: 18px; } table { width: 100%; border-collapse: collapse; font-size: 13px; }</style></head><body><div class="page"><div class="title">Sales Transaction Detail</div><div class="subtitle">Generated from Reports Page</div><table>${lines}</table></div></body></html>`;
};

const getExportFileName = (filters: AppliedFilters | null, generated: boolean): string => {
  if (!generated || !filters) return "sales-report-all.xlsx";
  if (filters.startDate === filters.endDate) return `sales-report-${filters.startDate}.xlsx`;
  return `sales-report-${filters.startDate}-to-${filters.endDate}.xlsx`;
};

const messageColor = (tone: MessageTone): string =>
  tone === "error" ? "#B91C1C" : tone === "success" ? "#15803D" : "#6B7280";

export function ReportsPage({
  salesEntries,
  onRemoveEntry,
  isLoading = false,
  errorMessage = null,
  onRefresh
}: ReportsPageProps) {
  const [reportType, setReportType] = useState<ReportType>("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [generated, setGenerated] = useState(false);
  const [transModal, setTransModal] = useState<SaleEntry | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeRemoveId, setActiveRemoveId] = useState<string | null>(null);
  const [activePrintId, setActivePrintId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!generated || !appliedFilters) return salesEntries;
    return salesEntries.filter((entry) => {
      const rowDate = entry.date || entry.savedAt.slice(0, 10);
      if (!rowDate) return false;
      return rowDate >= appliedFilters.startDate && rowDate <= appliedFilters.endDate;
    });
  }, [salesEntries, generated, appliedFilters]);

  const displayed = useMemo(() => {
    if (!search.trim()) return filtered;
    const query = search.toLowerCase();
    return filtered.filter((entry) =>
      (entry.date || "").toLowerCase().includes(query) ||
      (entry.pgfNumber || "").toLowerCase().includes(query) ||
      (entry.username || "").toLowerCase().includes(query) ||
      (entry.memberName || "").toLowerCase().includes(query) ||
      paymentSummary(entry).toLowerCase().includes(query) ||
      (entry.referenceNumber || "").toLowerCase().includes(query)
    );
  }, [filtered, search]);

  const totalSales = displayed.reduce((sum, entry) => sum + computeTotal(entry), 0);
  const totalBottles = displayed.reduce((sum, entry) => sum + (parseInt(entry.releasedBottles, 10) || 0), 0);
  const totalBlisters = displayed.reduce((sum, entry) => sum + (parseInt(entry.releasedBlister, 10) || 0), 0);

  const showEmptyInitial = !isLoading && !errorMessage && displayed.length === 0 && salesEntries.length === 0;
  const showEmptyFiltered = !isLoading && !errorMessage && displayed.length === 0 && salesEntries.length > 0;

  const handleGenerateReport = async () => {
    const resolved = resolveFilters(reportType, startDate, endDate);
    if (!resolved.filters) {
      setMessageTone("error");
      setMessage(resolved.error);
      return;
    }

    setMessage(null);
    setIsGenerating(true);

    try {
      if (onRefresh) await onRefresh();
      setAppliedFilters(resolved.filters);
      setGenerated(true);
      setMessageTone("success");
      setMessage("Report generated successfully.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Failed to generate the report.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    if (displayed.length === 0) {
      setMessageTone("error");
      setMessage("There are no rows to export.");
      return;
    }

    setIsExporting(true);
    setMessage(null);

    try {
      const [{ saveAs }, XLSX] = await Promise.all([import("file-saver"), import("xlsx")]);
      const exportRows = displayed.map((entry) => ({
        Date: entry.date || "-",
        "POF Number": entry.pgfNumber || "-",
        "GG Trans No.": entry.username || "-",
        "Total Sales": computeTotal(entry),
        "Mode of Payment": paymentSummary(entry),
        "Total Bottles": parseInt(entry.releasedBottles, 10) || 0,
        "Total Blisters": parseInt(entry.releasedBlister, 10) || 0
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
      const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([output], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      saveAs(blob, getExportFileName(appliedFilters, generated));
      setMessageTone("success");
      setMessage(`Exported ${displayed.length} record(s) to Excel.`);
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Failed to export the current report.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintEntry = async (entry: SaleEntry) => {
    setActivePrintId(entry.id);
    setMessage(null);

    try {
      printReceipt(buildPrintHtml(entry));
      setMessageTone("info");
      setMessage(`Opened print preview for ${entry.username || entry.pgfNumber || "the transaction"}.`);
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Failed to print the selected transaction.");
    } finally {
      setActivePrintId(null);
    }
  };

  const handleRemove = async (entry: SaleEntry) => {
    const target = entry.memberName || entry.pgfNumber || "this entry";
    const confirmed = window.confirm(`Remove entry for ${target}?`);
    if (!confirmed) return;

    setActiveRemoveId(entry.id);
    setMessage(null);

    try {
      await onRemoveEntry(entry.id);
      if (transModal?.id === entry.id) setTransModal(null);
      setMessageTone("success");
      setMessage("Entry removed successfully.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Failed to remove the selected entry.");
    } finally {
      setActiveRemoveId(null);
    }
  };

  const modalRows: Array<[string, string]> = transModal
    ? [
        ["Date", transModal.date || "—"],
        ["POF Number", transModal.pgfNumber || "—"],
        ["GG Trans No.", transModal.username || "—"],
        ["Member Name", transModal.memberName || "—"],
        ["Member Type", transModal.memberType || "—"],
        ["Package Type", transModal.packageType || "—"],
        ["Original Price", fmtDetailedAmount(parseFloat(transModal.originalPrice) || 0)],
        ["Quantity", transModal.quantity || "1"],
        ["Discount", transModal.discount ? `${transModal.discount}%` : "None"],
        ["Price After Disc.", fmtDetailedAmount(parseFloat(transModal.priceAfterDiscount) || 0)],
        ["One-time Discount", transModal.oneTimeDiscount ? fmtDetailedAmount(parseFloat(transModal.oneTimeDiscount) || 0) : "—"],
        ["Total Sales", fmtAmount(computeTotal(transModal))],
        ["Mode of Payment", paymentSummary(transModal)],
        ["Reference No.", transModal.referenceNumber || "—"],
        ["Released Bottles", transModal.releasedBottles || "0"],
        ["Released Blisters", transModal.releasedBlister || "0"],
        ["To Follow Bottles", transModal.toFollowBottles || "0"],
        ["To Follow Blisters", transModal.toFollowBlister || "0"],
        ["Received By", transModal.receivedBy || "—"],
        ["Collected By", transModal.collectedBy || "—"],
        ["Remarks", transModal.remarks || "—"]
      ]
    : [];

  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.10)", padding: "28px 32px" }}>
      <h2 style={{ fontSize: "22px", fontWeight: 600, color: "#212529", marginBottom: "20px" }}>Sales Reports</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "16px" }}>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#212529", marginBottom: "6px" }}>Report Type</label>
          <select
            value={reportType}
            onChange={(event) => setReportType(event.target.value as ReportType)}
            onFocus={() => setFocusedField("reportType")}
            onBlur={() => setFocusedField(null)}
            style={inputStyle(focusedField === "reportType")}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#212529", marginBottom: "6px" }}>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            onFocus={() => setFocusedField("startDate")}
            onBlur={() => setFocusedField(null)}
            style={inputStyle(focusedField === "startDate")}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#212529", marginBottom: "6px" }}>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            onFocus={() => setFocusedField("endDate")}
            onBlur={() => setFocusedField(null)}
            style={inputStyle(focusedField === "endDate")}
          />
        </div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <HoverButton
          label={isGenerating ? "Generating..." : "Generate Report"}
          onClick={handleGenerateReport}
          color="#2E86C1"
          hoverColor="#2471A3"
          height="38px"
          padding="0 20px"
          fontSize="14px"
          fontWeight={500}
          disabled={isGenerating || isLoading}
        />
      </div>

      {message && <div style={{ marginBottom: "16px", fontSize: "13px", color: messageColor(messageTone) }}>{message}</div>}

      <div style={{ borderTop: "1px solid #dee2e6", borderRight: "none", borderBottom: "none", borderLeft: "none", marginBottom: "20px" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#212529" }}>Report Results</h3>
        <input
          type="text"
          placeholder="Search table..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onFocus={() => setFocusedField("search")}
          onBlur={() => setFocusedField(null)}
          style={{ ...inputStyle(focusedField === "search"), width: "340px" }}
        />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <HoverButton
          label={isExporting ? "Exporting..." : "Excel"}
          onClick={handleExport}
          color="#28A745"
          hoverColor="#218838"
          height="32px"
          padding="0 16px"
          fontSize="13px"
          fontWeight={500}
          disabled={isExporting || isLoading}
        />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
            borderTop: "1px solid #dee2e6",
            borderRight: "1px solid #dee2e6",
            borderBottom: "1px solid #dee2e6",
            borderLeft: "1px solid #dee2e6"
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f8f9fa" }}>
              <th style={tableHeaderStyle(false)}>Date</th>
              <th style={tableHeaderStyle(false)}>POF Number</th>
              <th style={tableHeaderStyle(false)}>GG Trans No.</th>
              <th style={tableHeaderStyle(false)}>Total Sales</th>
              <th style={tableHeaderStyle(false)}>Mode of Payment</th>
              <th style={tableHeaderStyle(false)}>Total Bottles</th>
              <th style={tableHeaderStyle(false)}>Total Blisters</th>
              <th style={tableHeaderStyle(true)} />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} style={{ ...tableCellStyle(true), textAlign: "center", padding: "32px", color: "#6B7280", fontSize: "14px" }}>
                  Loading report data...
                </td>
              </tr>
            )}

            {!isLoading && errorMessage && (
              <tr>
                <td colSpan={8} style={{ ...tableCellStyle(true), textAlign: "center", padding: "32px", color: "#B91C1C", fontSize: "14px" }}>
                  {errorMessage}
                </td>
              </tr>
            )}

            {showEmptyInitial && (
              <tr>
                <td colSpan={8} style={{ ...tableCellStyle(true), textAlign: "center", padding: "32px", color: "#9CA3AF", fontSize: "14px" }}>
                  No entries yet. Go to Encoder to add sales entries.
                </td>
              </tr>
            )}

            {showEmptyFiltered && (
              <tr>
                <td colSpan={8} style={{ ...tableCellStyle(true), textAlign: "center", padding: "32px", color: "#9CA3AF", fontSize: "14px" }}>
                  No entries match your filter. Try adjusting the date range.
                </td>
              </tr>
            )}

            {!isLoading &&
              !errorMessage &&
              displayed.map((entry, index) => {
                const rowBottles = parseInt(entry.releasedBottles, 10) || 0;
                const rowBlisters = parseInt(entry.releasedBlister, 10) || 0;

                return (
                  <tr key={entry.id} style={{ backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#fafafa" }}>
                    <td style={tableCellStyle(false)}>{entry.date || "—"}</td>
                    <td style={tableCellStyle(false)}>{entry.pgfNumber || "—"}</td>
                    <td style={tableCellStyle(false)}>{entry.username || "—"}</td>
                    <td style={{ ...tableCellStyle(false), fontWeight: 500 }}>{fmtAmount(computeTotal(entry))}</td>
                    <td style={tableCellStyle(false)}>{paymentSummary(entry)}</td>
                    <td style={tableCellStyle(false)}>{rowBottles}</td>
                    <td style={tableCellStyle(false)}>{rowBlisters}</td>
                    <td style={tableCellStyle(true)}>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <HoverButton
                          label="Trans No."
                          onClick={() => setTransModal(entry)}
                          color="#17A2B8"
                          hoverColor="#138496"
                          height="30px"
                          padding="0 12px"
                          fontSize="12px"
                          fontWeight={500}
                          disabled={activeRemoveId === entry.id}
                        />
                        <HoverButton
                          label={activePrintId === entry.id ? "Printing..." : "Print"}
                          onClick={() => {
                            void handlePrintEntry(entry);
                          }}
                          color="#2E86C1"
                          hoverColor="#2471A3"
                          height="30px"
                          padding="0 12px"
                          fontSize="12px"
                          fontWeight={500}
                          disabled={activePrintId === entry.id || activeRemoveId === entry.id}
                        />
                        <HoverButton
                          label={activeRemoveId === entry.id ? "Removing..." : "Remove"}
                          onClick={() => {
                            void handleRemove(entry);
                          }}
                          color="#FD7E14"
                          hoverColor="#E8690A"
                          height="30px"
                          padding="0 12px"
                          fontSize="12px"
                          fontWeight={500}
                          disabled={activeRemoveId === entry.id}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

            {!isLoading && !errorMessage && displayed.length > 0 && (
              <tr style={{ backgroundColor: "#e9ecef" }}>
                <td style={{ ...tableCellStyle(false), fontWeight: 700, color: "#212529" }}>Total:</td>
                <td style={tableCellStyle(false)} />
                <td style={tableCellStyle(false)} />
                <td style={{ ...tableCellStyle(false), fontWeight: 700, color: "#212529" }}>{fmtAmount(totalSales)}</td>
                <td style={tableCellStyle(false)} />
                <td style={{ ...tableCellStyle(false), fontWeight: 700, color: "#212529" }}>{totalBottles}</td>
                <td style={{ ...tableCellStyle(false), fontWeight: 700, color: "#212529" }}>{totalBlisters}</td>
                <td style={tableCellStyle(true)} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && !errorMessage && displayed.length > 0 && (
        <div style={{ marginTop: "10px", fontSize: "12px", color: "#9CA3AF" }}>
          Showing {displayed.length} record{displayed.length > 1 ? "s" : ""}
        </div>
      )}

      {transModal && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setTransModal(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Enter" || event.key === " ") setTransModal(null);
          }}
          style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ backgroundColor: "#FFFFFF", borderRadius: "8px", padding: "28px 32px", minWidth: "420px", maxWidth: "560px", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}
          >
            <h4 style={{ color: "#2E3A8C", fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>Transaction Details</h4>

            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
              <tbody>
                {modalRows.map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ padding: "6px 8px", color: "#6B7280", width: "160px", borderBottom: "1px solid #F3F4F6", borderTop: "none", borderRight: "none", borderLeft: "none" }}>{label}</td>
                    <td style={{ padding: "6px 8px", color: "#111827", fontWeight: 500, borderBottom: "1px solid #F3F4F6", borderTop: "none", borderRight: "none", borderLeft: "none" }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setTransModal(null)}
                style={{ backgroundColor: "#2E3A8C", color: "#FFFFFF", borderTop: "none", borderRight: "none", borderBottom: "none", borderLeft: "none", borderRadius: "4px", padding: "8px 20px", fontSize: "14px", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
