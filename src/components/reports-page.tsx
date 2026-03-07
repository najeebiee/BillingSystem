import React, { useMemo, useState } from "react";
import type { SaleEntry } from "../types/sales";

interface ReportsPageProps {
  salesEntries: SaleEntry[];
  onRemoveEntry: (id: string) => void;
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
}

const computeTotal = (e: SaleEntry): number => {
  if (e.totalSales && parseFloat(e.totalSales) > 0) return parseFloat(e.totalSales);
  const qty = parseInt(e.quantity, 10) || 1;
  const price = parseFloat(e.priceAfterDiscount) || parseFloat(e.originalPrice) || 0;
  const disc = parseFloat(e.oneTimeDiscount) || 0;
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
      return "CASH";
  }
};

const fmtAmount = (n: number): string =>
  `\u20B1${n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;

function HoverButton({
  label,
  onClick,
  color,
  hoverColor,
  height,
  padding,
  fontSize,
  fontWeight
}: HoverButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? hoverColor : color,
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
        cursor: "pointer"
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

export function ReportsPage({ salesEntries, onRemoveEntry }: ReportsPageProps) {
  const [reportType, setReportType] = useState("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [generated, setGenerated] = useState(false);
  const [transModal, setTransModal] = useState<SaleEntry | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!generated) return salesEntries;
    return salesEntries.filter((entry) => {
      if (startDate && entry.date < startDate) return false;
      if (endDate && entry.date > endDate) return false;
      return true;
    });
  }, [salesEntries, generated, startDate, endDate]);

  const displayed = useMemo(() => {
    if (!search.trim()) return filtered;
    const query = search.toLowerCase();

    return filtered.filter((entry) => {
      return (
        entry.date.includes(query) ||
        entry.pgfNumber.toLowerCase().includes(query) ||
        entry.username.toLowerCase().includes(query) ||
        entry.memberName.toLowerCase().includes(query) ||
        paymentLabel(entry.modeOfPayment, entry.paymentModeType).toLowerCase().includes(query)
      );
    });
  }, [filtered, search]);

  const totalSales = displayed.reduce((sum, entry) => sum + computeTotal(entry), 0);
  const totalBottles = displayed.reduce((sum, entry) => sum + (parseInt(entry.releasedBottles, 10) || 0), 0);
  const totalBlisters = displayed.reduce((sum, entry) => sum + (parseInt(entry.releasedBlister, 10) || 0), 0);

  const showEmptyInitial = displayed.length === 0 && salesEntries.length === 0;
  const showEmptyFiltered = displayed.length === 0 && salesEntries.length > 0;

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "8px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
        padding: "28px 32px"
      }}
    >
      <h2
        style={{
          fontSize: "22px",
          fontWeight: 600,
          color: "#212529",
          marginBottom: "20px"
        }}
      >
        Sales Reports
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "20px",
          marginBottom: "16px"
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#212529",
              marginBottom: "6px"
            }}
          >
            Report Type
          </label>
          <select
            value={reportType}
            onChange={(event) => setReportType(event.target.value)}
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
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#212529",
              marginBottom: "6px"
            }}
          >
            Start Date
          </label>
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
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "#212529",
              marginBottom: "6px"
            }}
          >
            End Date
          </label>
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

      <div style={{ marginBottom: "24px" }}>
        <HoverButton
          label="Generate Report"
          onClick={() => setGenerated(true)}
          color="#2E86C1"
          hoverColor="#2471A3"
          height="38px"
          padding="0 20px"
          fontSize="14px"
          fontWeight={500}
        />
      </div>

      <div
        style={{
          borderTop: "1px solid #dee2e6",
          borderRight: "none",
          borderBottom: "none",
          borderLeft: "none",
          marginBottom: "20px"
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px"
        }}
      >
        <h3
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#212529"
          }}
        >
          Report Results
        </h3>

        <input
          type="text"
          placeholder="Search table..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onFocus={() => setFocusedField("search")}
          onBlur={() => setFocusedField(null)}
          style={{
            ...inputStyle(focusedField === "search"),
            width: "340px"
          }}
        />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <HoverButton
          label="Excel"
          onClick={() => {
            // Placeholder action only.
          }}
          color="#28A745"
          hoverColor="#218838"
          height="32px"
          padding="0 16px"
          fontSize="13px"
          fontWeight={500}
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
            {showEmptyInitial && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    ...tableCellStyle(true),
                    textAlign: "center",
                    padding: "32px",
                    color: "#9CA3AF",
                    fontSize: "14px"
                  }}
                >
                  No entries yet. Go to Encoder to add sales entries.
                </td>
              </tr>
            )}

            {showEmptyFiltered && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    ...tableCellStyle(true),
                    textAlign: "center",
                    padding: "32px",
                    color: "#9CA3AF",
                    fontSize: "14px"
                  }}
                >
                  No entries match your filter. Try adjusting the date range.
                </td>
              </tr>
            )}

            {displayed.map((entry, index) => {
              const rowBottles = parseInt(entry.releasedBottles, 10) || 0;
              const rowBlisters = parseInt(entry.releasedBlister, 10) || 0;

              return (
                <tr key={entry.id} style={{ backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#fafafa" }}>
                  <td style={tableCellStyle(false)}>{entry.date || "—"}</td>
                  <td style={tableCellStyle(false)}>{entry.pgfNumber || "—"}</td>
                  <td style={tableCellStyle(false)}>{entry.username || "—"}</td>
                  <td style={{ ...tableCellStyle(false), fontWeight: 500 }}>{fmtAmount(computeTotal(entry))}</td>
                  <td style={tableCellStyle(false)}>{paymentLabel(entry.modeOfPayment, entry.paymentModeType)}</td>
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
                      />
                      <HoverButton
                        label="Print"
                        onClick={() => window.print()}
                        color="#2E86C1"
                        hoverColor="#2471A3"
                        height="30px"
                        padding="0 12px"
                        fontSize="12px"
                        fontWeight={500}
                      />
                      <HoverButton
                        label="Remove"
                        onClick={() => {
                          const target = entry.memberName || entry.pgfNumber || "this entry";
                          const confirmed = window.confirm(`Remove entry for ${target}?`);
                          if (confirmed) {
                            onRemoveEntry(entry.id);
                          }
                        }}
                        color="#FD7E14"
                        hoverColor="#E8690A"
                        height="30px"
                        padding="0 12px"
                        fontSize="12px"
                        fontWeight={500}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

            {displayed.length > 0 && (
              <tr style={{ backgroundColor: "#e9ecef" }}>
                <td style={{ ...tableCellStyle(false), fontWeight: 700, color: "#212529" }}>Total:</td>
                <td style={tableCellStyle(false)} />
                <td style={tableCellStyle(false)} />
                <td style={{ ...tableCellStyle(false), fontWeight: 700, color: "#212529" }}>
                  {fmtAmount(totalSales)}
                </td>
                <td style={tableCellStyle(false)} />
                <td style={{ ...tableCellStyle(false), fontWeight: 700, color: "#212529" }}>{totalBottles}</td>
                <td style={{ ...tableCellStyle(false), fontWeight: 700, color: "#212529" }}>
                  {totalBlisters}
                </td>
                <td style={tableCellStyle(true)} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {displayed.length > 0 && (
        <div
          style={{
            marginTop: "10px",
            fontSize: "12px",
            color: "#9CA3AF"
          }}
        >
          Showing {displayed.length} record{displayed.length > 1 ? "s" : ""}
        </div>
      )}

      {transModal && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setTransModal(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
              setTransModal(null);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "8px",
              padding: "28px 32px",
              minWidth: "420px",
              maxWidth: "560px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
            }}
          >
            <h4
              style={{
                color: "#2E3A8C",
                fontSize: "16px",
                fontWeight: 600,
                marginBottom: "16px"
              }}
            >
              Transaction Details
            </h4>

            <table
              style={{
                width: "100%",
                fontSize: "13px",
                borderCollapse: "collapse"
              }}
            >
              <tbody>
                {[
                  ["Date", transModal.date || "—"],
                  ["POF Number", transModal.pgfNumber || "—"],
                  ["GG Trans No.", transModal.username || "—"],
                  ["Member Name", transModal.memberName || "—"],
                  ["Member Type", transModal.memberType || "—"],
                  ["Package Type", transModal.packageType || "—"],
                  [
                    "Original Price",
                    `?${(parseFloat(transModal.originalPrice) || 0).toLocaleString("en-US")}`
                  ],
                  ["Quantity", transModal.quantity || "1"],
                  ["Discount", transModal.discount ? `${transModal.discount}%` : "None"],
                  [
                    "Price After Disc.",
                    `?${(parseFloat(transModal.priceAfterDiscount) || 0).toLocaleString("en-US")}`
                  ],
                  [
                    "One-time Discount",
                    transModal.oneTimeDiscount ? `?${transModal.oneTimeDiscount}` : "—"
                  ],
                  ["Total Sales", fmtAmount(computeTotal(transModal))],
                  [
                    "Mode of Payment",
                    paymentLabel(transModal.modeOfPayment, transModal.paymentModeType)
                  ],
                  ["Reference No.", transModal.referenceNumber || "—"],
                  ["Released Bottles", transModal.releasedBottles || "0"],
                  ["Released Blisters", transModal.releasedBlister || "0"],
                  ["To Follow Bottles", transModal.toFollowBottles || "0"],
                  ["To Follow Blisters", transModal.toFollowBlister || "0"],
                  ["Received By", transModal.receivedBy || "—"],
                  ["Collected By", transModal.collectedBy || "—"],
                  ["Remarks", transModal.remarks || "—"]
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td
                      style={{
                        padding: "6px 8px",
                        color: "#6B7280",
                        width: "160px",
                        borderBottom: "1px solid #F3F4F6",
                        borderTop: "none",
                        borderRight: "none",
                        borderLeft: "none"
                      }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        color: "#111827",
                        fontWeight: 500,
                        borderBottom: "1px solid #F3F4F6",
                        borderTop: "none",
                        borderRight: "none",
                        borderLeft: "none"
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setTransModal(null)}
                style={{
                  backgroundColor: "#2E3A8C",
                  color: "#FFFFFF",
                  borderTop: "none",
                  borderRight: "none",
                  borderBottom: "none",
                  borderLeft: "none",
                  borderRadius: "4px",
                  padding: "8px 20px",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
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

