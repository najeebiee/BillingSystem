import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { applyPrintFit, resetPrintFit } from "../utils/printFit";

type SalesEntry = {
  id: string;
  sale_date: string;
  package_type?: string | null;
  quantity?: number | string | null;
  total_sales?: number | string | null;
  released_bottle?: number | string | null;
  released_blister?: number | string | null;
  to_follow_bottle?: number | string | null;
  to_follow_blister?: number | string | null;
};

const toNumber = (value: unknown) => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const normalizeLabel = (value: unknown) => {
  const label = (value ?? "").toString().trim();
  return label.length ? label : "Unknown";
};

const formatCurrency = (value: number) =>
  `PHP ${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

export function SalesDashboardInventoryReportPage() {
  const [reportDate, setReportDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [entries, setEntries] = useState<SalesEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforePrint = () => applyPrintFit();
    const handleAfterPrint = () => resetPrintFit();
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    supabase
      .from("sales_entries")
      .select("*")
      .eq("sale_date", reportDate)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setErrorMessage(error.message);
          setEntries([]);
          return;
        }
        setEntries((data ?? []) as SalesEntry[]);
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load inventory report.");
        setEntries([]);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [reportDate]);

  const report = useMemo(() => {
    const summaryMap = new Map<
      string,
      { label: string; quantity: number; totalSales: number }
    >();
    let retailTotal = 0;
    let grandTotal = 0;
    let releasedBottle = 0;
    let releasedBlister = 0;
    let toFollowBottle = 0;
    let toFollowBlister = 0;

    entries.forEach((entry) => {
      const label = normalizeLabel(entry.package_type);
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

      if (label.toLowerCase().includes("retail")) {
        retailTotal += totalSales;
      }

      grandTotal += totalSales;
      releasedBottle += toNumber(entry.released_bottle);
      releasedBlister += toNumber(entry.released_blister);
      toFollowBottle += toNumber(entry.to_follow_bottle);
      toFollowBlister += toNumber(entry.to_follow_blister);
    });

    return {
      packageSummary: Array.from(summaryMap.values()),
      retailTotal,
      grandTotal,
      releasedBottle,
      releasedBlister,
      toFollowBottle,
      toFollowBlister
    };
  }, [entries]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="text-sm text-gray-600">
          {isLoading ? "Loading inventory report..." : "Inventory report"}
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50"
          >
            Print
          </button>
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
                Inventory Report
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Report Date: {reportDate}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              Entries: {entries.length}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700">
                  Package Counts
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
                    {report.packageSummary.length > 0 ? (
                      report.packageSummary.map((item) => (
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

            <div className="border border-gray-200 rounded-lg">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-700">
                  Totals
                </h2>
              </div>
              <div className="px-4 py-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Retail Total</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(report.retailTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Grand Total</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(report.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">
                Inventory Movement
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Released (Bottle)</span>
                <span className="font-semibold text-gray-900">
                  {report.releasedBottle.toLocaleString("en-PH")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Released (Blister)</span>
                <span className="font-semibold text-gray-900">
                  {report.releasedBlister.toLocaleString("en-PH")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">To Follow (Bottle)</span>
                <span className="font-semibold text-gray-900">
                  {report.toFollowBottle.toLocaleString("en-PH")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">To Follow (Blister)</span>
                <span className="font-semibold text-gray-900">
                  {report.toFollowBlister.toLocaleString("en-PH")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
