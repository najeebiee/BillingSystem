import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type SalesEntry = {
  id: string;
  sale_date: string;
  package_type?: string | null;
  quantity?: number | string | null;
  total_sales?: number | string | null;
  new_member?: string | boolean | number | null;
  member_type?: string | null;
};

type SaleEntryPayment = {
  id: string;
  sale_entry_id: string;
  mode?: string | null;
  mode_type?: string | null;
  reference_no?: string | null;
  amount?: number | string | null;
};

type CashDenomination = {
  label: string;
  value: number;
  count: number;
  total: number;
};

const toNumber = (value: unknown) => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const norm = (value: unknown) =>
  (value ?? "").toString().trim().toLowerCase();

const formatCurrency = (value: number) =>
  `PHP ${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const formatDenomination = (value: number) =>
  value >= 1 ? `PHP ${value}` : `PHP ${value.toFixed(2)}`;

const parseDenomination = (key: string) => {
  const cleaned = key.toLowerCase();
  const decimalMatch = cleaned.match(/\d+(?:[._]\d+)?/g);
  if (!decimalMatch) return null;
  const raw = decimalMatch[decimalMatch.length - 1];
  const normalized = raw.replace("_", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
};

const extractCashBreakdown = (
  row: Record<string, unknown> | null
): CashDenomination[] | null => {
  if (!row) return null;
  const source =
    (row.denominations as Record<string, unknown> | undefined) ??
    (row.counts as Record<string, unknown> | undefined) ??
    (row.breakdown as Record<string, unknown> | undefined) ??
    row;

  const breakdown: CashDenomination[] = [];
  Object.entries(source).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof value === "object") return;
    const count = toNumber(value);
    if (count === 0) return;
    const denom = parseDenomination(key);
    if (denom === null) return;
    breakdown.push({
      label: formatDenomination(denom),
      value: denom,
      count,
      total: denom * count
    });
  });

  if (breakdown.length === 0) return null;
  breakdown.sort((a, b) => b.value - a.value);
  return breakdown;
};

const autoDistributeCash = (cashTotal: number): CashDenomination[] => {
  const denominations = [
    1000,
    500,
    200,
    100,
    50,
    20,
    10,
    5,
    1,
    0.25,
    0.1,
    0.05
  ];

  let remaining = Math.max(0, Math.round(cashTotal * 100));
  const breakdown: CashDenomination[] = [];

  denominations.forEach((denom) => {
    const denomCents = Math.round(denom * 100);
    const count = denomCents > 0 ? Math.floor(remaining / denomCents) : 0;
    if (count > 0) {
      remaining -= count * denomCents;
      breakdown.push({
        label: formatDenomination(denom),
        value: denom,
        count,
        total: denom * count
      });
    }
  });

  if (remaining !== 0) {
    const adjustment = remaining / 100;
    breakdown.push({
      label: "Adjustment",
      value: adjustment,
      count: 1,
      total: adjustment
    });
  }

  return breakdown;
};

export function SalesDashboardSalesReportPage() {
  const [reportDate, setReportDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [entries, setEntries] = useState<SalesEntry[]>([]);
  const [payments, setPayments] = useState<SaleEntryPayment[]>([]);
  const [cashCountRow, setCashCountRow] = useState<Record<string, unknown> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadReport = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const errors: string[] = [];

        const { data: entryData, error: entryError } = await supabase
          .from("sales_entries")
          .select("*")
          .eq("sale_date", reportDate);

        if (entryError) {
          if (!isMounted) return;
          setEntries([]);
          setPayments([]);
          setCashCountRow(null);
          setErrorMessage(entryError.message || "Failed to load sales report.");
          setIsLoading(false);
          return;
        }

        const entriesList = (entryData ?? []) as SalesEntry[];
        if (!isMounted) return;
        setEntries(entriesList);

        if (entriesList.length === 0) {
          setPayments([]);
          setCashCountRow(null);
          setIsLoading(false);
          return;
        }

        const saleEntryIds = entriesList.map((entry) => entry.id);
        if (saleEntryIds.length) {
          const { data: paymentData, error: paymentError } = await supabase
            .from("sales_entry_payments")
            .select("*")
            .in("sale_entry_id", saleEntryIds);

          if (paymentError) {
            errors.push(paymentError.message);
            setPayments([]);
          } else {
            setPayments((paymentData ?? []) as SaleEntryPayment[]);
          }
        } else {
          setPayments([]);
        }

        const { data: cashCounts, error: cashError } = await supabase
          .from("daily_cash_counts")
          .select("*")
          .eq("sale_date", reportDate)
          .maybeSingle();

        if (cashError) {
          setCashCountRow(null);
        } else {
          setCashCountRow(
            (cashCounts ?? null) as Record<string, unknown> | null
          );
        }

        if (errors.length) {
          setErrorMessage(errors.join(" "));
        }

        setIsLoading(false);
      } catch (error) {
        if (!isMounted) return;
        setEntries([]);
        setPayments([]);
        setCashCountRow(null);
        setErrorMessage(
          (error as Error)?.message || "Failed to load sales report."
        );
        setIsLoading(false);
      }
    };

    loadReport();

    return () => {
      isMounted = false;
    };
  }, [reportDate]);

  const packageSummary = useMemo(() => {
    const summaryMap = new Map<
      string,
      { label: string; quantity: number; totalSales: number }
    >();

    entries.forEach((entry) => {
      const label = (entry.package_type ?? "").toString().trim() || "Unknown";
      const quantity = toNumber(entry.quantity);
      const totalSales = toNumber(entry.total_sales);
      const existing = summaryMap.get(label) ?? {
        label,
        quantity: 0,
        totalSales: 0
      };

      existing.quantity += quantity;
      existing.totalSales += totalSales;
      summaryMap.set(label, existing);
    });

    return Array.from(summaryMap.values());
  }, [entries]);

  const categoryTotals = useMemo(() => {
    let mobileStockist = 0;
    let depot = 0;
    let retail = 0;
    let grandTotal = 0;
    let newAccounts = 0;
    let upgrades = 0;

    entries.forEach((entry) => {
      const label = norm(entry.package_type);
      const totalSales = toNumber(entry.total_sales);
      const isNew =
        entry.new_member === true ||
        entry.new_member === 1 ||
        norm(entry.new_member) === "yes" ||
        norm(entry.new_member) === "true";

      if (label.includes("mobile") || label.includes("stockist")) {
        mobileStockist += totalSales;
      }
      if (label.includes("depot")) {
        depot += totalSales;
      }
      if (label.includes("retail")) {
        retail += totalSales;
      }

      if (isNew) {
        newAccounts += 1;
      }

      const memberType = norm(entry.member_type);
      if (memberType.includes("upgrade") || label.includes("upgrade")) {
        upgrades += 1;
      }

      grandTotal += totalSales;
    });

    return {
      mobileStockist,
      depot,
      retail,
      grandTotal,
      newAccounts,
      upgrades
    };
  }, [entries]);

  const paymentTotals = useMemo(() => {
    const totals = {
      cash: 0,
      bank: 0,
      maya: 0,
      sbCollect: 0,
      ar: 0,
      cheque: 0,
      consignment: 0,
      ePoints: 0,
      other: 0
    };

    const bankBreakdown = { igi: 0, atc: 0 };
    const mayaBreakdown = { igi: 0, atc: 0 };
    const sbCollectBreakdown = { igi: 0, atc: 0 };
    const arBreakdown = { csa: 0, leadersSupport: 0 };

    payments.forEach((payment) => {
      const mode = norm(payment.mode);
      const modeType = norm(payment.mode_type);
      const amount = toNumber(payment.amount);

      const isCash = mode.includes("cash");
      const isBank = mode.includes("bank");
      const isMaya = mode.includes("maya");
      const isSbCollect = mode.includes("sb") && mode.includes("collect");
      const isAr = mode.includes("ar") || mode.includes("accounts receivable");
      const isCheque = mode.includes("cheque") || mode.includes("check");
      const isConsignment = mode.includes("consignment");
      const isEPoints = mode.includes("e-point") || mode.includes("epoint") || mode.includes("e point");

      if (isCash) {
        totals.cash += amount;
        return;
      }
      if (isBank) {
        totals.bank += amount;
        if (modeType.includes("igi")) bankBreakdown.igi += amount;
        if (modeType.includes("atc")) bankBreakdown.atc += amount;
        return;
      }
      if (isMaya) {
        totals.maya += amount;
        if (modeType.includes("igi")) mayaBreakdown.igi += amount;
        if (modeType.includes("atc")) mayaBreakdown.atc += amount;
        return;
      }
      if (isSbCollect) {
        totals.sbCollect += amount;
        if (modeType.includes("igi")) sbCollectBreakdown.igi += amount;
        if (modeType.includes("atc")) sbCollectBreakdown.atc += amount;
        return;
      }
      if (isAr) {
        totals.ar += amount;
        if (modeType.includes("csa")) arBreakdown.csa += amount;
        if (modeType.includes("leader") || modeType.includes("support")) {
          arBreakdown.leadersSupport += amount;
        }
        return;
      }
      if (isCheque) {
        totals.cheque += amount;
        return;
      }
      if (isConsignment) {
        totals.consignment += amount;
        return;
      }
      if (isEPoints) {
        totals.ePoints += amount;
        return;
      }

      totals.other += amount;
    });

    return {
      totals,
      bankBreakdown,
      mayaBreakdown,
      sbCollectBreakdown,
      arBreakdown
    };
  }, [payments]);

  const cashTotal = paymentTotals.totals.cash;

  const cashBreakdown = useMemo(() => {
    const dbBreakdown = extractCashBreakdown(cashCountRow);
    if (dbBreakdown) {
      const dbTotal = dbBreakdown.reduce(
        (sum, item) => sum + item.total,
        0
      );
      const diff = Math.round((cashTotal - dbTotal) * 100);
      if (diff !== 0) {
        const adjustmentValue = diff / 100;
        dbBreakdown.push({
          label: "Adjustment",
          value: adjustmentValue,
          count: 1,
          total: adjustmentValue
        });
      }
      return dbBreakdown;
    }
    return autoDistributeCash(cashTotal);
  }, [cashCountRow, cashTotal]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="text-sm text-gray-600">
          {isLoading ? "Loading sales report..." : "Sales report"}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Report Date</span>
          <input
            type="date"
            value={reportDate}
            onChange={(e) =>
              setReportDate(
                e.target.value || new Date().toISOString().slice(0, 10)
              )
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 text-sm text-red-600 no-print">{errorMessage}</div>
      ) : null}

      <div id="print-root" className="print-only mt-6">
        <div data-print-fit>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Sales Report
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Report Date: {reportDate}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              Entries: {entries.length}
            </div>
          </div>

          <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">
                Package Sales Summary
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      Package
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                      Total Sales
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {packageSummary.length > 0 ? (
                    packageSummary.map((item) => (
                      <tr key={item.label}>
                        <td className="px-4 py-2 text-gray-900">
                          {item.label}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {item.quantity.toLocaleString("en-PH")}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {formatCurrency(item.totalSales)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-2 text-gray-500">Total</td>
                      <td className="px-4 py-2 text-right text-gray-500">
                        0
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500">
                        {formatCurrency(0)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700">
                  Package Totals
                </h2>
              </div>
              <div className="px-4 py-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Mobile Stockist Package</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(categoryTotals.mobileStockist)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Depot Package</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(categoryTotals.depot)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Retail</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(categoryTotals.retail)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Grand Total</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(categoryTotals.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700">
                  Account Activity
                </h2>
              </div>
              <div className="px-4 py-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">New Accounts</span>
                  <span className="font-semibold text-gray-900">
                    {categoryTotals.newAccounts.toLocaleString("en-PH")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Upgrades</span>
                  <span className="font-semibold text-gray-900">
                    {categoryTotals.upgrades.toLocaleString("en-PH")}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700">
                  Payment Totals
                </h2>
              </div>
              <div className="px-4 py-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Cash on Hand</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentTotals.totals.cash)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Bank</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentTotals.totals.bank)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Maya</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentTotals.totals.maya)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">SB Collect</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentTotals.totals.sbCollect)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">
                Payment Breakdown
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 py-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Cash on Hand</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentTotals.totals.cash)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">
                    Bank (Security Bank)
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentTotals.totals.bank)}
                  </span>
                </div>
                <div className="pl-4 space-y-1 text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>IGI</span>
                    <span>{formatCurrency(paymentTotals.bankBreakdown.igi)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ATC</span>
                    <span>{formatCurrency(paymentTotals.bankBreakdown.atc)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Maya (IGI / ATC)</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentTotals.totals.maya)}
                  </span>
                </div>
                <div className="pl-4 space-y-1 text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>IGI</span>
                    <span>{formatCurrency(paymentTotals.mayaBreakdown.igi)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ATC</span>
                    <span>{formatCurrency(paymentTotals.mayaBreakdown.atc)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">SB Collect (IGI / ATC)</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentTotals.totals.sbCollect)}
                  </span>
                </div>
                <div className="pl-4 space-y-1 text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>IGI</span>
                    <span>{formatCurrency(paymentTotals.sbCollectBreakdown.igi)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ATC</span>
                    <span>{formatCurrency(paymentTotals.sbCollectBreakdown.atc)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">AR CSA</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentTotals.arBreakdown.csa)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">AR Leaders Support</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentTotals.arBreakdown.leadersSupport)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Cheque</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentTotals.totals.cheque)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Consignment</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentTotals.totals.consignment)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">E-Points</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentTotals.totals.ePoints)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Other</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentTotals.totals.other)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">
                Cash on Hand Breakdown
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      Denomination
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                      Pieces
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cashBreakdown.length > 0 ? (
                    cashBreakdown.map((row, index) => (
                      <tr key={`${row.label}-${index}`}>
                        <td className="px-4 py-2 text-gray-900">{row.label}</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {row.count.toLocaleString("en-PH")}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-2 text-gray-500">Total</td>
                      <td className="px-4 py-2 text-right text-gray-500">
                        0
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500">
                        {formatCurrency(0)}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-700">
                      Total Cash on Hand
                    </td>
                    <td />
                    <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(cashTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
