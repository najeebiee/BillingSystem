import React, { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { printElementById } from "../print/printReport";
import {
  fetchInventoryReportRows,
  type SalesDashboardRawRow
} from "../services/salesDashboard.service";

const INVENTORY_DATE_KEYS = ["entry_date", "created_at"] as const;

interface InventoryItem {
  name: string;
  ggTrans: string;
  pofNumber: string;
  packageType: { plat: number; gold: number; silver: number };
  retail: { bottle: number; blister: number; voucher: number; discount: number };
  bottles: number;
  blisters: number;
  released: { bottle: number; blister: number };
  toFollow: { bottle: number; blister: number };
  amount: number;
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

const renderDashForZero = (value: number): number | string => (value === 0 ? "-" : value);

const INVENTORY_PRINT_CSS = `
  #inventory-report-print {
    width: 100% !important;
    max-width: none !important;
    margin: 0 auto !important;
    padding: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    background: #fff !important;
  }
  #inventory-report-print .overflow-x-auto {
    overflow: visible !important;
  }
  #inventory-report-print table {
    width: 100% !important;
    border-collapse: collapse !important;
    table-layout: fixed !important;
  }
  #inventory-report-print th,
  #inventory-report-print td {
    min-width: 0 !important;
    padding: 4px 5px !important;
    font-size: 10px !important;
    line-height: 1.2 !important;
    white-space: normal !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
  }
  #inventory-report-print h2 {
    font-size: 20px !important;
    margin: 0 0 6px !important;
  }
  #inventory-report-print h3 {
    font-size: 16px !important;
    margin: 0 0 6px !important;
  }
  #inventory-report-print .mb-8 {
    margin-bottom: 14px !important;
    padding-bottom: 10px !important;
  }
  #inventory-report-print .mt-12 {
    margin-top: 18px !important;
  }
  #inventory-report-print .pt-8 {
    padding-top: 10px !important;
  }
`;

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const pickString = (row: SalesDashboardRawRow, keys: string[], fallback = "-"): string => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
};

const pickNumber = (row: SalesDashboardRawRow, keys: string[]): number => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return toNumber(value);
  }
  return 0;
};

const toNormalizedText = (value: string): string => value.trim().toLowerCase();

const inferCount = (row: SalesDashboardRawRow, preferredKeys: string[] = []): number => {
  const preferred = pickNumber(row, preferredKeys);
  if (preferred > 0) return preferred;

  const generic = pickNumber(row, ["quantity", "qty", "package_qty", "count"]);
  if (generic > 0) return generic;

  // Fallback for rows where only the selected type label exists.
  return 1;
};

const toLocalDateKey = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const pickReportDate = (row: SalesDashboardRawRow): string => {
  const [entryDateKey, createdAtKey] = INVENTORY_DATE_KEYS;
  const entryDate = pickString(row, [entryDateKey], "");
  if (entryDate) return entryDate.slice(0, 10);

  const createdAt = pickString(row, [createdAtKey], "");
  return toLocalDateKey(createdAt);
};

const isRowForDate = (row: SalesDashboardRawRow, reportDate: string): boolean => {
  const rowDate = pickReportDate(row);
  if (!rowDate) return true;
  return rowDate === reportDate;
};

const mapPackageColumns = (row: SalesDashboardRawRow): InventoryItem["packageType"] => {
  const direct = {
    plat: pickNumber(row, ["package_platinum", "package_plat", "plat", "platinum_qty"]),
    gold: pickNumber(row, ["package_gold", "gold", "gold_qty"]),
    silver: pickNumber(row, ["package_silver", "silver", "silver_qty"])
  };

  if (direct.plat > 0 || direct.gold > 0 || direct.silver > 0) {
    return direct;
  }

  const packageType = toNormalizedText(pickString(row, ["package_type"], ""));
  if (!packageType) return direct;

  if (packageType.includes("platinum") || packageType.includes("plat")) {
    direct.plat = inferCount(row, ["package_quantity", "quantity", "qty"]);
  } else if (packageType.includes("gold")) {
    direct.gold = inferCount(row, ["package_quantity", "quantity", "qty"]);
  } else if (packageType.includes("silver")) {
    direct.silver = inferCount(row, ["package_quantity", "quantity", "qty"]);
  }

  return direct;
};

const mapRetailColumns = (row: SalesDashboardRawRow): InventoryItem["retail"] => {
  const mapped = {
    bottle: pickNumber(row, ["retail_bottles", "retail_bottle", "bottle", "retail_bottle_qty"]),
    blister: pickNumber(row, ["retail_blisters", "retail_blister", "blister", "retail_blister_qty"]),
    voucher: pickNumber(row, ["retail_vouchers", "retail_voucher", "voucher", "voucher_qty"]),
    discount: pickNumber(row, ["retail_discounts", "retail_discount", "discount", "discount_qty"])
  };

  const packageType = toNormalizedText(pickString(row, ["package_type"], ""));

  if (mapped.bottle === 0 && packageType.includes("retail")) {
    mapped.bottle = inferCount(row, ["retail_bottles", "quantity", "qty"]);
  }
  if (mapped.blister === 0 && packageType.includes("blister")) {
    mapped.blister = inferCount(row, ["retail_blisters", "blister_count", "quantity", "qty"]);
  }
  if (mapped.voucher === 0 && packageType.includes("voucher")) {
    mapped.voucher = inferCount(row, ["retail_vouchers", "quantity", "qty"]);
  }
  if (mapped.discount === 0 && packageType.includes("discount")) {
    mapped.discount = inferCount(row, ["retail_discounts", "discount_qty", "quantity", "qty"]);
  }

  return mapped;
};

const mapRowToInventoryItem = (row: SalesDashboardRawRow): InventoryItem => ({
  name: pickString(row, ["member_name", "name", "full_name"]),
  ggTrans: pickString(row, ["gg_trans_no", "gg_trans", "gg_transaction_no", "gg_transaction"]),
  pofNumber: pickString(row, ["pof_number", "pgf_number", "pof", "pgf"]),
  packageType: mapPackageColumns(row),
  retail: mapRetailColumns(row),
  bottles: pickNumber(row, ["bottles", "total_bottles"]),
  blisters: pickNumber(row, ["blisters", "total_blisters"]),
  released: {
    bottle: pickNumber(row, ["released_bottles", "released_bottle"]),
    blister: pickNumber(row, ["released_blisters", "released_blister"])
  },
  toFollow: {
    bottle: pickNumber(row, ["to_follow_bottles", "to_follow_bottle"]),
    blister: pickNumber(row, ["to_follow_blisters", "to_follow_blister"])
  },
  amount: pickNumber(row, ["amount", "total_amount", "amount_total", "total_sales"])
});

export function InventoryReportPage() {
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isPrintHovered, setIsPrintHovered] = useState(false);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = useMemo(
    () => inventoryData.reduce((sum, item) => sum + item.amount, 0),
    [inventoryData]
  );

  useEffect(() => {
    let active = true;

    const loadInventoryRows = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const rows = await fetchInventoryReportRows();
        if (!active) return;
        setInventoryData(rows.filter((row) => isRowForDate(row, reportDate)).map(mapRowToInventoryItem));
      } catch (fetchError) {
        if (!active) return;
        const message =
          fetchError instanceof Error ? fetchError.message : "Failed to load inventory report.";
        setError(message);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadInventoryRows();
    return () => {
      active = false;
    };
  }, [reportDate]);

  const handlePrintReport = async () => {
    try {
      await printElementById({
        elementId: "inventory-report-print",
        title: "Inventory Daily Report",
        pageCss: "@page { size: A4 landscape; margin: 8mm; }",
        extraCss: INVENTORY_PRINT_CSS
      });
    } catch (printError) {
      console.error("INVENTORY REPORT PRINT ERROR", printError);
      alert("Unable to open the inventory print preview. Please try again.");
    }
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="mb-6 flex items-center justify-between gap-3 no-print">
        <h1
          style={{
            color: "#2E3A8C",
            fontSize: "20px",
            fontWeight: 500
          }}
        >
          Inventory Report
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span style={{ color: "#374151", fontSize: "14px", fontWeight: 500 }}>Report Date:</span>
            <input
              type="date"
              value={reportDate}
              onChange={(event) => setReportDate(event.target.value)}
              className="rounded border px-2 py-1"
              style={{
                borderColor: "#D0D5DD",
                color: "#374151",
                fontSize: "13px",
                height: "36px"
              }}
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-2 px-6"
            onClick={handlePrintReport}
            onMouseEnter={() => setIsPrintHovered(true)}
            onMouseLeave={() => setIsPrintHovered(false)}
            style={{
              backgroundColor: isPrintHovered ? "#1F2870" : "#2E3A8C",
              color: "#FFFFFF",
              height: "44px",
              borderRadius: "8px"
            }}
          >
            <Printer className="w-5 h-5" />
            <span
              style={{
                fontSize: "14px"
              }}
            >
              Print Report
            </span>
          </button>
        </div>
      </div>

      <div id="print-root">
        <div id="inventory-report-print" className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8 pb-6 text-center" style={{ borderBottom: "2px solid #2E3A8C" }}>
          <h2
            style={{
              color: "#2E3A8C",
              fontSize: "24px",
              marginBottom: "8px"
            }}
          >
            Company Name
          </h2>
          <h3
            style={{
              color: "#374151",
              fontSize: "20px",
              marginBottom: "8px"
            }}
          >
            Inventory Daily Report
          </h3>
          <p
            style={{
              color: "#6B7280",
              fontSize: "14px"
            }}
          >
            Report Date: {reportDate}
          </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "#F3F4F6" }}>
                <th
                  className="px-3 py-3 text-left"
                  style={{ color: "#374151", fontSize: "12px", minWidth: "120px" }}
                >
                  Name
                </th>
                <th
                  className="px-3 py-3 text-left"
                  style={{ color: "#374151", fontSize: "12px", minWidth: "100px" }}
                >
                  GG Trans No
                </th>
                <th
                  className="px-3 py-3 text-left"
                  style={{ color: "#374151", fontSize: "12px", minWidth: "100px" }}
                >
                  POF Number
                </th>
                <th
                  className="px-3 py-3 text-center"
                  colSpan={3}
                  style={{ color: "#374151", fontSize: "12px", borderLeft: "1px solid #D0D5DD" }}
                >
                  Package Type
                </th>
                <th
                  className="px-3 py-3 text-center"
                  colSpan={4}
                  style={{ color: "#374151", fontSize: "12px", borderLeft: "1px solid #D0D5DD" }}
                >
                  Retail Items
                </th>
                <th
                  className="px-3 py-3 text-right"
                  style={{ color: "#374151", fontSize: "12px", borderLeft: "1px solid #D0D5DD" }}
                >
                  Bottles
                </th>
                <th className="px-3 py-3 text-right" style={{ color: "#374151", fontSize: "12px" }}>
                  Blisters
                </th>
                <th
                  className="px-3 py-3 text-center"
                  colSpan={2}
                  style={{ color: "#374151", fontSize: "12px", borderLeft: "1px solid #D0D5DD" }}
                >
                  Released
                </th>
                <th
                  className="px-3 py-3 text-center"
                  colSpan={2}
                  style={{ color: "#374151", fontSize: "12px", borderLeft: "1px solid #D0D5DD" }}
                >
                  To Follow
                </th>
                <th
                  className="px-3 py-3 text-right"
                  style={{ color: "#374151", fontSize: "12px", borderLeft: "1px solid #D0D5DD" }}
                >
                  Amount
                </th>
              </tr>
              <tr style={{ backgroundColor: "#F9FAFB" }}>
                <th colSpan={3} className="px-2 py-2" style={{ color: "#6B7280", fontSize: "12px" }} />
                <th
                  className="px-2 py-2 text-center"
                  style={{ color: "#6B7280", fontSize: "12px", borderLeft: "1px solid #D0D5DD" }}
                >
                  Plat
                </th>
                <th className="px-2 py-2 text-center" style={{ color: "#6B7280", fontSize: "12px" }}>
                  Gold
                </th>
                <th className="px-2 py-2 text-center" style={{ color: "#6B7280", fontSize: "12px" }}>
                  Silver
                </th>
                <th
                  className="px-2 py-2 text-center"
                  style={{ color: "#6B7280", fontSize: "12px", borderLeft: "1px solid #D0D5DD" }}
                >
                  Bottle
                </th>
                <th className="px-2 py-2 text-center" style={{ color: "#6B7280", fontSize: "12px" }}>
                  Blister
                </th>
                <th className="px-2 py-2 text-center" style={{ color: "#6B7280", fontSize: "12px" }}>
                  Voucher
                </th>
                <th className="px-2 py-2 text-center" style={{ color: "#6B7280", fontSize: "12px" }}>
                  Disc.
                </th>
                <th className="px-2 py-2" style={{ color: "#6B7280", fontSize: "12px", borderLeft: "1px solid #D0D5DD" }} />
                <th className="px-2 py-2" style={{ color: "#6B7280", fontSize: "12px" }} />
                <th
                  className="px-2 py-2 text-center"
                  style={{ color: "#6B7280", fontSize: "12px", borderLeft: "1px solid #D0D5DD" }}
                >
                  Bottle
                </th>
                <th className="px-2 py-2 text-center" style={{ color: "#6B7280", fontSize: "12px" }}>
                  Blister
                </th>
                <th
                  className="px-2 py-2 text-center"
                  style={{ color: "#6B7280", fontSize: "12px", borderLeft: "1px solid #D0D5DD" }}
                >
                  Bottle
                </th>
                <th className="px-2 py-2 text-center" style={{ color: "#6B7280", fontSize: "12px" }}>
                  Blister
                </th>
                <th className="px-2 py-2" style={{ color: "#6B7280", fontSize: "12px", borderLeft: "1px solid #D0D5DD" }} />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={17} className="px-3 py-3 text-center" style={{ fontSize: "12px" }}>
                    Loading inventory report...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={17}
                    className="px-3 py-3 text-center"
                    style={{ fontSize: "12px", color: "#B91C1C" }}
                  >
                    {error}
                  </td>
                </tr>
              ) : inventoryData.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-3 py-3 text-center" style={{ fontSize: "12px" }}>
                    No inventory records found for {reportDate}.
                  </td>
                </tr>
              ) : (
                inventoryData.map((item, index) => (
                  <tr key={`${item.ggTrans}-${item.pofNumber}-${index}`} className="border-t" style={{ borderColor: "#E5E7EB" }}>
                    <td className="px-3 py-3 text-left" style={{ fontSize: "12px" }}>
                      {item.name}
                    </td>
                    <td className="px-3 py-3 text-left" style={{ fontSize: "12px" }}>
                      {item.ggTrans}
                    </td>
                    <td className="px-3 py-3 text-left" style={{ fontSize: "12px" }}>
                      {item.pofNumber}
                    </td>
                    <td className="px-3 py-3 text-center" style={{ fontSize: "12px", borderLeft: "1px solid #E5E7EB" }}>
                      {renderDashForZero(item.packageType.plat)}
                    </td>
                    <td className="px-3 py-3 text-center" style={{ fontSize: "12px" }}>
                      {renderDashForZero(item.packageType.gold)}
                    </td>
                    <td className="px-3 py-3 text-center" style={{ fontSize: "12px" }}>
                      {renderDashForZero(item.packageType.silver)}
                    </td>
                    <td className="px-3 py-3 text-center" style={{ fontSize: "12px", borderLeft: "1px solid #E5E7EB" }}>
                      {renderDashForZero(item.retail.bottle)}
                    </td>
                    <td className="px-3 py-3 text-center" style={{ fontSize: "12px" }}>
                      {renderDashForZero(item.retail.blister)}
                    </td>
                    <td className="px-3 py-3 text-center" style={{ fontSize: "12px" }}>
                      {renderDashForZero(item.retail.voucher)}
                    </td>
                    <td className="px-3 py-3 text-center" style={{ fontSize: "12px" }}>
                      {renderDashForZero(item.retail.discount)}
                    </td>
                    <td className="px-3 py-3 text-right" style={{ fontSize: "12px", borderLeft: "1px solid #E5E7EB" }}>
                      {item.bottles}
                    </td>
                    <td className="px-3 py-3 text-right" style={{ fontSize: "12px" }}>
                      {item.blisters}
                    </td>
                    <td className="px-3 py-3 text-center" style={{ fontSize: "12px", borderLeft: "1px solid #E5E7EB" }}>
                      {item.released.bottle}
                    </td>
                    <td className="px-3 py-3 text-center" style={{ fontSize: "12px" }}>
                      {item.released.blister}
                    </td>
                    <td className="px-3 py-3 text-center" style={{ fontSize: "12px", borderLeft: "1px solid #E5E7EB" }}>
                      {item.toFollow.bottle}
                    </td>
                    <td className="px-3 py-3 text-center" style={{ fontSize: "12px" }}>
                      {item.toFollow.blister}
                    </td>
                    <td className="px-3 py-3 text-right" style={{ fontSize: "12px", borderLeft: "1px solid #E5E7EB" }}>
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid #2E3A8C", backgroundColor: "#F0F4FF" }}>
                <td colSpan={16} className="px-3 py-3 text-right" style={{ fontSize: "12px" }}>
                  <span style={{ color: "#2E3A8C" }}>Total Amount:</span>
                </td>
                <td
                  className="px-3 py-3 text-right"
                  style={{
                    borderLeft: "1px solid #2E3A8C",
                    color: "#2E3A8C",
                    fontSize: "14px"
                  }}
                >
                  {formatCurrency(totalAmount)}
                </td>
              </tr>
            </tfoot>
            </table>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-12 pt-8" style={{ borderTop: "1px solid #D0D5DD" }}>
            <div>
              <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "48px" }}>Prepared By:</p>
              <div style={{ borderTop: "1px solid #374151", paddingTop: "8px" }}>
                <p style={{ fontSize: "14px", textAlign: "center", color: "#374151" }}>Name & Signature</p>
              </div>
            </div>
            <div>
              <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "48px" }}>Checked By:</p>
              <div style={{ borderTop: "1px solid #374151", paddingTop: "8px" }}>
                <p style={{ fontSize: "14px", textAlign: "center", color: "#374151" }}>Name & Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
