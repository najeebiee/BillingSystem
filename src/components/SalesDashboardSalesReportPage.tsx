import React, { useEffect, useMemo, useState } from "react";
import {
  fetchBankTransferDetails,
  fetchDailyCashCountRows,
  fetchGcashDetails,
  fetchMayaDetails,
  fetchSalesReportRows,
  type SalesDashboardRawRow
} from "../services/salesDashboard.service";

const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.25] as const;

const formatMoney = (value: number) =>
  value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DEFAULT_PRICE = {
  platinum: 35000,
  gold: 10500,
  silver: 3500,
  bottle: 2280,
  blister: 779
};

type DetailRow = {
  memberName: string;
  referenceNo: string;
  amount: number;
};

type CashDenominationRow = {
  label: string;
  pieces: number;
  amount: number;
};

type CashBreakdownMap = Record<string, { pieces: number; amount: number }>;

const DATE_KEYS = ["report_date", "cash_date", "entry_date", "date", "transaction_date", "created_at"];
const isSalesReportDebugEnabled =
  import.meta.env.DEV || import.meta.env.VITE_DEBUG_SALES_REPORT === "true";

const getTodayLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const pickString = (row: SalesDashboardRawRow, keys: string[], fallback = ""): string => {
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

const toSearchText = (row: SalesDashboardRawRow): string =>
  Object.values(row)
    .map((value) => (typeof value === "string" ? value.toLowerCase() : String(value ?? "")))
    .join(" ");

const isRowForDate = (row: SalesDashboardRawRow, reportDate: string): boolean => {
  const value = pickString(row, DATE_KEYS);
  if (!value) return false;
  return value.slice(0, 10) === reportDate;
};

const filterRowsForDate = (rows: SalesDashboardRawRow[], reportDate: string): SalesDashboardRawRow[] =>
  rows.filter((row) => isRowForDate(row, reportDate));

const hasAnyKey = (row: SalesDashboardRawRow, keys: string[]): boolean =>
  keys.some((key) => row[key] !== undefined && row[key] !== null);

const hasMetricKeys = (rows: SalesDashboardRawRow[], keys: string[]): boolean =>
  rows.some((row) => hasAnyKey(row, keys));

const sumByKeys = (rows: SalesDashboardRawRow[], keys: string[]): number =>
  rows.reduce((sum, row) => sum + pickNumber(row, keys), 0);

const buildEmptyCashBreakdown = (): CashBreakdownMap =>
  Object.fromEntries(
    DENOMINATIONS.map((denom) => [String(denom === 0.25 ? 0.25 : denom), { pieces: 0, amount: 0 }])
  );

const pickLatestCashCountRows = (rows: SalesDashboardRawRow[]): SalesDashboardRawRow[] => {
  const grouped = new Map<string, SalesDashboardRawRow[]>();
  rows.forEach((row) => {
    const cashCountId = pickString(row, ["cash_count_id"], "");
    if (!cashCountId) return;
    const existing = grouped.get(cashCountId) ?? [];
    existing.push(row);
    grouped.set(cashCountId, existing);
  });

  if (grouped.size === 0) return rows;

  let selectedRows: SalesDashboardRawRow[] = [];
  let selectedTimestamp = -Infinity;

  grouped.forEach((groupRows) => {
    const latestGroupTimestamp = Math.max(
      ...groupRows.map((row) => {
        const rawCreatedAt = pickString(row, ["created_at"], "");
        const parsed = Date.parse(rawCreatedAt);
        return Number.isFinite(parsed) ? parsed : -Infinity;
      })
    );

    if (latestGroupTimestamp > selectedTimestamp) {
      selectedTimestamp = latestGroupTimestamp;
      selectedRows = groupRows;
    }
  });

  return selectedRows;
};

const mapCashBreakdown = (
  rows: SalesDashboardRawRow[]
): { breakdown: CashBreakdownMap; totalFromSource: number | null } => {
  const breakdown = buildEmptyCashBreakdown();

  rows.forEach((row) => {
    const denomination = pickNumber(row, ["denomination"]);
    const denominationKey = String(denomination === 0.25 ? 0.25 : denomination);
    if (!Object.prototype.hasOwnProperty.call(breakdown, denominationKey)) return;

    breakdown[denominationKey] = {
      pieces: breakdown[denominationKey].pieces + pickNumber(row, ["pieces"]),
      amount: breakdown[denominationKey].amount + pickNumber(row, ["amount"])
    };
  });

  const totalFromSource = rows.length > 0 ? pickNumber(rows[0], ["total_cash"]) : 0;
  return {
    breakdown,
    totalFromSource: totalFromSource > 0 ? totalFromSource : null
  };
};

const mapDetailRows = (rows: SalesDashboardRawRow[]): DetailRow[] =>
  rows.map((row) => ({
    memberName: pickString(row, ["member_name", "name", "full_name"], "-"),
    referenceNo: pickString(row, ["reference_number", "reference_no", "reference"], "-"),
    amount: pickNumber(row, ["amount", "total_amount", "value"])
  }));

type MetricResult = {
  qty: number;
  price: number;
  amount: number;
  matched: boolean;
};

function aggregateMetric(
  rows: SalesDashboardRawRow[],
  itemKeywords: string[],
  options?: { sectionKeywords?: string[]; fallbackPrice?: number }
): MetricResult {
  const sectionKeywords = options?.sectionKeywords ?? [];
  const fallbackPrice = options?.fallbackPrice ?? 0;

  const matches = rows.filter((row) => {
    const text = toSearchText(row);
    const itemMatch = itemKeywords.some((keyword) => text.includes(keyword));
    const sectionMatch =
      sectionKeywords.length === 0 || sectionKeywords.some((keyword) => text.includes(keyword));
    return itemMatch && sectionMatch;
  });

  if (matches.length === 0) {
    return {
      qty: 0,
      price: fallbackPrice,
      amount: 0,
      matched: false
    };
  }

  const qty = matches.reduce((sum, row) => sum + pickNumber(row, ["qty", "quantity", "count"]), 0);
  const amount = matches.reduce(
    (sum, row) => sum + pickNumber(row, ["amount_total", "total_amount", "amount", "total", "value"]),
    0
  );
  const explicitPrice = matches.find((row) => pickNumber(row, ["price", "unit_price", "rate"]) > 0);
  const price = explicitPrice
    ? pickNumber(explicitPrice, ["price", "unit_price", "rate"])
    : fallbackPrice;

  return {
    qty,
    price,
    amount,
    matched: true
  };
}

function aggregateWithFallback(
  rows: SalesDashboardRawRow[],
  itemKeywords: string[],
  sectionKeywords: string[],
  fallbackPrice: number
): MetricResult {
  const sectionScoped = aggregateMetric(rows, itemKeywords, { sectionKeywords, fallbackPrice });
  if (sectionScoped.matched) return sectionScoped;
  return aggregateMetric(rows, itemKeywords, { fallbackPrice });
}

function resolveMetricRow(
  rows: SalesDashboardRawRow[],
  config: {
    qtyKeys: string[];
    amountKeys?: string[];
    fallbackPrice: number;
    fallbackKeywords: string[];
    fallbackSectionKeywords: string[];
  }
): Omit<MetricResult, "matched"> {
  const qty = sumByKeys(rows, config.qtyKeys);
  const hasQtyColumns = hasMetricKeys(rows, config.qtyKeys);
  const amountKeys = config.amountKeys ?? [];
  const hasAmountColumns = amountKeys.length > 0 && hasMetricKeys(rows, amountKeys);
  const amountFromColumns = amountKeys.length > 0 ? sumByKeys(rows, amountKeys) : 0;

  if (hasQtyColumns || hasAmountColumns) {
    const amount =
      hasAmountColumns && amountFromColumns > 0 ? amountFromColumns : qty * config.fallbackPrice;
    return {
      qty,
      price: config.fallbackPrice,
      amount
    };
  }

  const fallback = aggregateWithFallback(
    rows,
    config.fallbackKeywords,
    config.fallbackSectionKeywords,
    config.fallbackPrice
  );

  return {
    qty: fallback.qty,
    price: fallback.price,
    amount: fallback.amount
  };
}

function SalesTableHeader({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="bg-gray-100">
        {cols.map((col, idx) => (
          <th
            key={`${col}-${idx}`}
            className={`border border-black px-2 py-1 font-bold ${idx === 0 ? "text-left" : "text-right"}`}
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function SalesRow({ label, qty, price, amount }: { label: string; qty: number; price: number; amount: number }) {
  return (
    <tr>
      <td className="border border-black px-2 py-1">{label}</td>
      <td className="border border-black px-2 py-1 text-right">{qty}</td>
      <td className="border border-black px-2 py-1 text-right">{formatMoney(price)}</td>
      <td className="border border-black px-2 py-1 text-right">{formatMoney(amount)}</td>
    </tr>
  );
}

function TotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <tr>
      <td className="border border-black px-2 py-1 font-bold" colSpan={3}>
        {label}
      </td>
      <td className="border border-black px-2 py-1 text-right font-bold">{formatMoney(amount)}</td>
    </tr>
  );
}

export function SalesDashboardSalesReportPage() {
  const [reportDate, setReportDate] = useState<string>(() => getTodayLocalDate());
  const [preparedBy, setPreparedBy] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [cashBreakdown, setCashBreakdown] = useState<CashBreakdownMap>(() => buildEmptyCashBreakdown());
  const [cashTotalFromSource, setCashTotalFromSource] = useState<number | null>(null);

  const [summaryRows, setSummaryRows] = useState<SalesDashboardRawRow[]>([]);
  const [bankRows, setBankRows] = useState<DetailRow[]>([]);
  const [mayaRows, setMayaRows] = useState<DetailRow[]>([]);
  const [gcashRows, setGcashRows] = useState<DetailRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadReportData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [summaryData, bankData, mayaData, gcashData, dailyCashCountData] = await Promise.all([
          fetchSalesReportRows(),
          fetchBankTransferDetails(),
          fetchMayaDetails(),
          fetchGcashDetails(),
          fetchDailyCashCountRows()
        ]);

        if (!active) return;

        const filteredSummaryRows = filterRowsForDate(summaryData, reportDate);
        const filteredBankRows = filterRowsForDate(bankData, reportDate);
        const filteredMayaRows = filterRowsForDate(mayaData, reportDate);
        const filteredGcashRows = filterRowsForDate(gcashData, reportDate);
        const filteredDailyCashRows = filterRowsForDate(dailyCashCountData, reportDate);

        setSummaryRows(filteredSummaryRows);
        setBankRows(mapDetailRows(filteredBankRows));
        setMayaRows(mapDetailRows(filteredMayaRows));
        setGcashRows(mapDetailRows(filteredGcashRows));
        const activeCashCountRows = pickLatestCashCountRows(filteredDailyCashRows);
        const { breakdown, totalFromSource } = mapCashBreakdown(activeCashCountRows);
        setCashBreakdown(breakdown);
        setCashTotalFromSource(totalFromSource);

        if (isSalesReportDebugEnabled) {
          console.log("SELECTED REPORT DATE", reportDate);
          console.log("DENOMINATION RAW DATA", dailyCashCountData);
          console.log("SALES REPORT LOAD", {
            selectedDate: reportDate,
            summaryRowsRawData: summaryData,
            bankRowsRawData: bankData,
            mayaRowsRawData: mayaData,
            gcashRowsRawData: gcashData,
            denominationRawData: dailyCashCountData,
            summaryRowsRaw: summaryData.length,
            summaryRowsFiltered: filteredSummaryRows.length,
            bankRowsFiltered: filteredBankRows.length,
            mayaRowsFiltered: filteredMayaRows.length,
            gcashRowsFiltered: filteredGcashRows.length,
            denominationRowsFiltered: filteredDailyCashRows.length,
            denominationRowsUsed: activeCashCountRows.length
          });
        }
      } catch (fetchError) {
        if (!active) return;
        if (isSalesReportDebugEnabled) {
          console.error("DENOMINATION ERROR", fetchError);
          console.log("SELECTED REPORT DATE", reportDate);
        }
        const message =
          fetchError instanceof Error ? fetchError.message : "Failed to load sales report.";
        setError(message);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadReportData();
    return () => {
      active = false;
    };
  }, [reportDate]);

  const packageSectionRows = useMemo(() => {
    return [
      {
        label: "Mobile Stockist",
        ...resolveMetricRow(summaryRows, {
          qtyKeys: ["mobile_stockist_qty", "mobile_stockist_total_qty", "mobile_stockist_silver_qty"],
          amountKeys: ["mobile_stockist_total", "mobile_stockist_amount", "mobile_stockist_package_total"],
          fallbackPrice: 0,
          fallbackKeywords: ["mobile stockist"],
          fallbackSectionKeywords: ["package sales", "member type"]
        })
      },
      {
        label: "Platinum",
        ...resolveMetricRow(summaryRows, {
          qtyKeys: ["platinum_qty", "package_platinum_qty", "package_platinum"],
          amountKeys: ["platinum_total", "platinum_amount"],
          fallbackPrice: DEFAULT_PRICE.platinum,
          fallbackKeywords: ["platinum"],
          fallbackSectionKeywords: ["package sales", "member type"]
        })
      },
      {
        label: "Gold",
        ...resolveMetricRow(summaryRows, {
          qtyKeys: ["gold_qty", "package_gold_qty", "package_gold"],
          amountKeys: ["gold_total", "gold_amount"],
          fallbackPrice: DEFAULT_PRICE.gold,
          fallbackKeywords: ["gold"],
          fallbackSectionKeywords: ["package sales", "member type"]
        })
      },
      {
        label: "Silver",
        ...resolveMetricRow(summaryRows, {
          qtyKeys: ["silver_qty", "package_silver_qty", "package_silver"],
          amountKeys: ["silver_total", "silver_amount"],
          fallbackPrice: DEFAULT_PRICE.silver,
          fallbackKeywords: ["silver"],
          fallbackSectionKeywords: ["package sales", "member type"]
        })
      }
    ];
  }, [summaryRows]);

  const mobileStockistPackageRows = useMemo(() => {
    return [
      {
        label: "Platinum",
        ...resolveMetricRow(summaryRows, {
          qtyKeys: ["mobile_stockist_platinum_qty"],
          amountKeys: ["mobile_stockist_platinum_total", "mobile_stockist_platinum_amount"],
          fallbackPrice: DEFAULT_PRICE.platinum,
          fallbackKeywords: ["platinum"],
          fallbackSectionKeywords: ["mobile stockist package"]
        })
      },
      {
        label: "Gold",
        ...resolveMetricRow(summaryRows, {
          qtyKeys: ["mobile_stockist_gold_qty"],
          amountKeys: ["mobile_stockist_gold_total", "mobile_stockist_gold_amount"],
          fallbackPrice: DEFAULT_PRICE.gold,
          fallbackKeywords: ["gold"],
          fallbackSectionKeywords: ["mobile stockist package"]
        })
      },
      {
        label: "Silver",
        ...resolveMetricRow(summaryRows, {
          qtyKeys: ["mobile_stockist_silver_qty"],
          amountKeys: ["mobile_stockist_silver_total", "mobile_stockist_silver_amount"],
          fallbackPrice: DEFAULT_PRICE.silver,
          fallbackKeywords: ["silver"],
          fallbackSectionKeywords: ["mobile stockist package"]
        })
      }
    ];
  }, [summaryRows]);

  const depotPackageRows = useMemo(() => {
    return [
      {
        label: "Platinum",
        ...resolveMetricRow(summaryRows, {
          qtyKeys: ["depot_platinum_qty"],
          amountKeys: ["depot_platinum_total", "depot_platinum_amount"],
          fallbackPrice: DEFAULT_PRICE.platinum,
          fallbackKeywords: ["platinum"],
          fallbackSectionKeywords: ["depot packs", "depot package", "depot pack"]
        })
      },
      {
        label: "Gold",
        ...resolveMetricRow(summaryRows, {
          qtyKeys: ["depot_gold_qty"],
          amountKeys: ["depot_gold_total", "depot_gold_amount"],
          fallbackPrice: DEFAULT_PRICE.gold,
          fallbackKeywords: ["gold"],
          fallbackSectionKeywords: ["depot packs", "depot package", "depot pack"]
        })
      },
      {
        label: "Silver",
        ...resolveMetricRow(summaryRows, {
          qtyKeys: ["depot_silver_qty"],
          amountKeys: ["depot_silver_total", "depot_silver_amount"],
          fallbackPrice: DEFAULT_PRICE.silver,
          fallbackKeywords: ["silver"],
          fallbackSectionKeywords: ["depot packs", "depot package", "depot pack"]
        })
      }
    ];
  }, [summaryRows]);

  const retailRows = useMemo(() => {
    return [
      {
        label: "Synbiotic+ (Bottle)",
        ...resolveMetricRow(summaryRows, {
          qtyKeys: ["retail_bottle_qty", "retail_bottles", "bottle_qty"],
          amountKeys: ["retail_bottle_total", "retail_bottle_amount"],
          fallbackPrice: DEFAULT_PRICE.bottle,
          fallbackKeywords: ["bottle"],
          fallbackSectionKeywords: ["retail"]
        })
      },
      {
        label: "Synbiotic+ (Blister)",
        ...resolveMetricRow(summaryRows, {
          qtyKeys: ["retail_blister_qty", "retail_blisters", "blister_qty"],
          amountKeys: ["retail_blister_total", "retail_blister_amount"],
          fallbackPrice: DEFAULT_PRICE.blister,
          fallbackKeywords: ["blister"],
          fallbackSectionKeywords: ["retail"]
        })
      },
      {
        label: "Employee Discount",
        ...resolveMetricRow(summaryRows, {
          qtyKeys: ["employee_discount_qty", "retail_discount_qty", "discount_qty"],
          amountKeys: ["employee_discount_total", "retail_discount_total", "discount_total"],
          fallbackPrice: 0,
          fallbackKeywords: ["employee discount"],
          fallbackSectionKeywords: ["retail"]
        })
      }
    ];
  }, [summaryRows]);

  const mobileStockistRetailRow = useMemo(
    () =>
      resolveMetricRow(summaryRows, {
        qtyKeys: ["mobile_stockist_retail_bottle_qty"],
        amountKeys: ["mobile_stockist_retail_bottle_total", "mobile_stockist_retail_total"],
        fallbackPrice: DEFAULT_PRICE.bottle,
        fallbackKeywords: ["mobile stockist retail", "bottle"],
        fallbackSectionKeywords: ["mobile stockist retail"]
      }),
    [summaryRows]
  );

  const depotRetailRow = useMemo(
    () =>
      resolveMetricRow(summaryRows, {
        qtyKeys: ["depot_retail_bottle_qty"],
        amountKeys: ["depot_retail_bottle_total", "depot_retail_total"],
        fallbackPrice: DEFAULT_PRICE.bottle,
        fallbackKeywords: ["depot retail", "bottle"],
        fallbackSectionKeywords: ["depot retail"]
      }),
    [summaryRows]
  );

  const sumAmount = (rows: Array<{ amount: number }>) => rows.reduce((sum, row) => sum + row.amount, 0);

  const packageSalesTotal = sumAmount(packageSectionRows);
  const mobileStockistPackageTotal = sumAmount(mobileStockistPackageRows);
  const depotPackageTotal = sumAmount(depotPackageRows);
  const retailTotal = sumAmount(retailRows);
  const mobileStockistRetailTotal = mobileStockistRetailRow.amount;
  const depotRetailTotal = depotRetailRow.amount;
  const fallbackGrandTotal =
    packageSalesTotal +
    mobileStockistPackageTotal +
    depotPackageTotal +
    retailTotal +
    mobileStockistRetailTotal +
    depotRetailTotal;
  const grandTotal = hasMetricKeys(summaryRows, ["gross_total_sales"])
    ? sumByKeys(summaryRows, ["gross_total_sales"])
    : fallbackGrandTotal;

  const detailsTotal = (rows: DetailRow[]) => rows.reduce((sum, row) => sum + row.amount, 0);
  const bankTotal = detailsTotal(bankRows);
  const mayaTotal = detailsTotal(mayaRows);
  const gcashTotal = detailsTotal(gcashRows);

  const resolvePaymentAmount = (keys: string[], fallback: number): number => {
    if (hasMetricKeys(summaryRows, keys)) return sumByKeys(summaryRows, keys);
    return fallback;
  };

  const paymentRows = useMemo(
    () => [
      { label: "Cash on Hand", amount: resolvePaymentAmount(["cash_total", "cash_amount"], 0) },
      { label: "E-Wallet", amount: resolvePaymentAmount(["ewallet_total", "e_wallet_total"], 0) },
      { label: "Bank Transfer", amount: resolvePaymentAmount(["bank_transfer_total", "bank_total"], bankTotal) },
      { label: "Maya", amount: resolvePaymentAmount(["maya_total"], mayaTotal) },
      { label: "GCash", amount: resolvePaymentAmount(["gcash_total"], gcashTotal) },
      { label: "Cheque", amount: resolvePaymentAmount(["cheque_total", "check_total"], 0) }
    ],
    [summaryRows, bankTotal, mayaTotal, gcashTotal]
  );

  const getNewAccountsCount = (memberType: "silver" | "gold" | "platinum"): number => {
    const matched = summaryRows.filter((row) => {
      const text = toSearchText(row);
      return text.includes("new account") && text.includes(memberType);
    });
    if (!matched.length) return 0;
    return matched.reduce((sum, row) => sum + pickNumber(row, ["count", "qty", "quantity"]), 0);
  };

  const newSilver = getNewAccountsCount("silver");
  const newGold = getNewAccountsCount("gold");
  const newPlatinum = getNewAccountsCount("platinum");
  const upgradesCount = resolvePaymentAmount(["upgrade", "upgrades"], 0);

  const cashRows = useMemo<CashDenominationRow[]>(
    () =>
      DENOMINATIONS.map((denom) => {
        const label = String(denom === 0.25 ? 0.25 : denom);
        const row = cashBreakdown[label] ?? { pieces: 0, amount: 0 };
        return {
          label,
          pieces: row.pieces,
          amount: row.amount
        };
      }),
    [cashBreakdown]
  );

  const totalCash = cashTotalFromSource ?? cashRows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="bg-white rounded-md border border-gray-300 p-3 text-[11px] leading-tight">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body * { visibility: hidden; }
          #sales-report-print, #sales-report-print * { visibility: visible; }
          #sales-report-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="mb-3 flex items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <span>Report Date:</span>
          <input
            type="date"
            value={reportDate}
            onChange={(event) => setReportDate(event.target.value)}
            className="border border-black px-2 py-1 text-[11px]"
          />
        </div>
        <button type="button" onClick={() => window.print()} className="rounded border border-black px-3 py-1">
          Print Report
        </button>
      </div>

      {error ? (
        <div className="mb-3 border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>
      ) : null}

      <div id="sales-report-print">
        <div className="border border-black p-2">
          <div className="text-center font-bold">Company Name</div>
          <div className="text-center font-bold">Daily Sales Report</div>
          <div className="text-center">Date: {reportDate}</div>

          {isLoading ? (
            <div className="py-6 text-center">Loading sales report...</div>
          ) : (
            <>
              <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: "58% 42%" }}>
                <div className="space-y-2">
                  <table className="w-full border-collapse border border-black">
                    <SalesTableHeader cols={["PACKAGE SALES (Member Type)", "QTY", "PRICE", "AMOUNT TOTAL"]} />
                    <tbody>
                      {packageSectionRows.map((row) => (
                        <SalesRow
                          key={`package-${row.label}`}
                          label={row.label}
                          qty={row.qty}
                          price={row.price}
                          amount={row.amount}
                        />
                      ))}
                      <TotalRow label="Total Package Sales" amount={packageSalesTotal} />
                    </tbody>
                  </table>

                  <table className="w-full border-collapse border border-black">
                    <SalesTableHeader cols={["MOBILE STOCKIST PACKAGE", "QTY", "PRICE", "AMOUNT TOTAL"]} />
                    <tbody>
                      {mobileStockistPackageRows.map((row) => (
                        <SalesRow
                          key={`mobile-stockist-package-${row.label}`}
                          label={row.label}
                          qty={row.qty}
                          price={row.price}
                          amount={row.amount}
                        />
                      ))}
                      <TotalRow
                        label="Total Mobile Stockist Package Sales"
                        amount={mobileStockistPackageTotal}
                      />
                    </tbody>
                  </table>

                  <table className="w-full border-collapse border border-black">
                    <SalesTableHeader cols={["DEPOT PACKS", "QTY", "PRICE", "AMOUNT TOTAL"]} />
                    <tbody>
                      {depotPackageRows.map((row) => (
                        <SalesRow
                          key={`depot-package-${row.label}`}
                          label={row.label}
                          qty={row.qty}
                          price={row.price}
                          amount={row.amount}
                        />
                      ))}
                      <TotalRow label="Total Depot Package Sales" amount={depotPackageTotal} />
                    </tbody>
                  </table>

                  <table className="w-full border-collapse border border-black">
                    <SalesTableHeader cols={["RETAIL ITEM", "QTY", "PRICE", "AMOUNT TOTAL"]} />
                    <tbody>
                      {retailRows.map((row) => (
                        <SalesRow
                          key={`retail-${row.label}`}
                          label={row.label}
                          qty={row.qty}
                          price={row.price}
                          amount={row.amount}
                        />
                      ))}
                      <TotalRow label="Total Retail Sales" amount={retailTotal} />
                    </tbody>
                  </table>

                  <table className="w-full border-collapse border border-black">
                    <SalesTableHeader cols={["MOBILE STOCKIST RETAIL", "QTY", "PRICE", "AMOUNT TOTAL"]} />
                    <tbody>
                      <SalesRow
                        label="Synbiotic+ (Bottle)"
                        qty={mobileStockistRetailRow.qty}
                        price={mobileStockistRetailRow.price}
                        amount={mobileStockistRetailRow.amount}
                      />
                      <TotalRow label="Total Mobile Stockist Retail Sales" amount={mobileStockistRetailTotal} />
                    </tbody>
                  </table>

                  <table className="w-full border-collapse border border-black">
                    <SalesTableHeader cols={["DEPOT RETAIL", "QTY", "PRICE", "AMOUNT TOTAL"]} />
                    <tbody>
                      <SalesRow
                        label="Synbiotic+ (Bottle)"
                        qty={depotRetailRow.qty}
                        price={depotRetailRow.price}
                        amount={depotRetailRow.amount}
                      />
                      <TotalRow label="Total Depot Retail Sales" amount={depotRetailTotal} />
                    </tbody>
                  </table>

                  <table className="w-full border-collapse border border-black">
                    <tbody>
                      <tr className="bg-gray-100">
                        <td className="border border-black px-2 py-1 font-bold">GRAND TOTAL</td>
                        <td className="border border-black px-2 py-1 text-right font-bold">
                          {formatMoney(grandTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2">
                  <table className="w-full border-collapse border border-black">
                    <SalesTableHeader cols={["DENOMINATION", "PIECES", "AMOUNT"]} />
                    <tbody>
                      {cashRows.map((row) => (
                        <tr key={row.label}>
                          <td className="border border-black px-2 py-1">{row.label}</td>
                          <td className="border border-black px-2 py-1 text-right">
                            {row.pieces}
                          </td>
                          <td className="border border-black px-2 py-1 text-right">
                            {formatMoney(row.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="border border-black px-2 py-1 font-bold" colSpan={2}>
                          Total Cash
                        </td>
                        <td className="border border-black px-2 py-1 text-right font-bold">
                          {formatMoney(totalCash)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <table className="w-full border-collapse border border-black">
                    <SalesTableHeader cols={["PAYMENT METHOD", "AMOUNT"]} />
                    <tbody>
                      {paymentRows.map((row) => (
                        <tr key={row.label}>
                          <td className="border border-black px-2 py-1">{row.label}</td>
                          <td className="border border-black px-2 py-1 text-right">
                            {formatMoney(row.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <table className="w-full border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-2 py-1 text-left font-bold" colSpan={2}>
                        NEW ACCOUNTS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-2 py-1">Silver</td>
                      <td className="border border-black px-2 py-1 text-right">{newSilver}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1">Gold</td>
                      <td className="border border-black px-2 py-1 text-right">{newGold}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1">Platinum</td>
                      <td className="border border-black px-2 py-1 text-right">{newPlatinum}</td>
                    </tr>
                  </tbody>
                </table>

                <table className="w-full border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-2 py-1 text-left font-bold">UPGRADES</th>
                      <th className="border border-black px-2 py-1 text-right font-bold">COUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-2 py-1">Total Upgrades</td>
                      <td className="border border-black px-2 py-1 text-right">{Math.round(upgradesCount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3 space-y-2">
                <table className="w-full border-collapse border border-black">
                  <thead>
                    <tr>
                      <th className="border border-black px-2 py-1 text-left font-bold" colSpan={3}>
                        BANK TRANSFER DETAILS
                      </th>
                    </tr>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-2 py-1 text-left font-bold">Member Name</th>
                      <th className="border border-black px-2 py-1 text-left font-bold">Reference No</th>
                      <th className="border border-black px-2 py-1 text-right font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bankRows.length ? bankRows : [{ memberName: "-", referenceNo: "-", amount: 0 }]).map(
                      (row, index) => (
                        <tr key={`bank-${index}`}>
                          <td className="border border-black px-2 py-1">{row.memberName}</td>
                          <td className="border border-black px-2 py-1">{row.referenceNo}</td>
                          <td className="border border-black px-2 py-1 text-right">
                            {formatMoney(row.amount)}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>

                <table className="w-full border-collapse border border-black">
                  <thead>
                    <tr>
                      <th className="border border-black px-2 py-1 text-left font-bold" colSpan={3}>
                        MAYA DETAILS
                      </th>
                    </tr>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-2 py-1 text-left font-bold">Member Name</th>
                      <th className="border border-black px-2 py-1 text-left font-bold">Reference No</th>
                      <th className="border border-black px-2 py-1 text-right font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(mayaRows.length ? mayaRows : [{ memberName: "-", referenceNo: "-", amount: 0 }]).map(
                      (row, index) => (
                        <tr key={`maya-${index}`}>
                          <td className="border border-black px-2 py-1">{row.memberName}</td>
                          <td className="border border-black px-2 py-1">{row.referenceNo}</td>
                          <td className="border border-black px-2 py-1 text-right">
                            {formatMoney(row.amount)}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>

                <table className="w-full border-collapse border border-black">
                  <thead>
                    <tr>
                      <th className="border border-black px-2 py-1 text-left font-bold" colSpan={3}>
                        GCASH DETAILS
                      </th>
                    </tr>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-2 py-1 text-left font-bold">Member Name</th>
                      <th className="border border-black px-2 py-1 text-left font-bold">Reference No</th>
                      <th className="border border-black px-2 py-1 text-right font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(gcashRows.length ? gcashRows : [{ memberName: "-", referenceNo: "-", amount: 0 }]).map(
                      (row, index) => (
                        <tr key={`gcash-${index}`}>
                          <td className="border border-black px-2 py-1">{row.memberName}</td>
                          <td className="border border-black px-2 py-1">{row.referenceNo}</td>
                          <td className="border border-black px-2 py-1 text-right">
                            {formatMoney(row.amount)}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="mt-4 grid grid-cols-2 gap-8">
            <div>
              <div>Prepared By</div>
              <input
                type="text"
                value={preparedBy}
                onChange={(event) => setPreparedBy(event.target.value)}
                className="mt-2 w-full border-b border-black py-1 outline-none"
              />
            </div>
            <div>
              <div>Checked By</div>
              <input
                type="text"
                value={checkedBy}
                onChange={(event) => setCheckedBy(event.target.value)}
                className="mt-2 w-full border-b border-black py-1 outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
