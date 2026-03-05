
import React, { useState } from "react";
import type { SaleEntry } from "../types/sales";

type SalesDashboardSalesReportPageProps = {
  salesEntries: SaleEntry[];
};

const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.25] as const;

const formatMoney = (value: number) =>
  value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PRICE = {
  platinum: 35000,
  gold: 10500,
  silver: 3500,
  bottle: 2280,
  blister: 779
};

const ZERO_QTY = 0;
const ZERO_AMOUNT = 0;

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

function SalesRow({ label, price }: { label: string; price: number }) {
  return (
    <tr>
      <td className="border border-black px-2 py-1">{label}</td>
      <td className="border border-black px-2 py-1 text-right">{ZERO_QTY}</td>
      <td className="border border-black px-2 py-1 text-right">{formatMoney(price)}</td>
      <td className="border border-black px-2 py-1 text-right">{formatMoney(ZERO_AMOUNT)}</td>
    </tr>
  );
}

function TotalRow({ label }: { label: string }) {
  return (
    <tr>
      <td className="border border-black px-2 py-1 font-bold" colSpan={3}>
        {label}
      </td>
      <td className="border border-black px-2 py-1 text-right font-bold">{formatMoney(0)}</td>
    </tr>
  );
}

export function SalesDashboardSalesReportPage({ salesEntries }: SalesDashboardSalesReportPageProps) {
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [preparedBy, setPreparedBy] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [cashPieces, setCashPieces] = useState<Record<string, string>>(() =>
    Object.fromEntries(DENOMINATIONS.map((denom) => [String(denom), "0"]))
  );

  void salesEntries;

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

      <div id="sales-report-print">
        <div className="border border-black p-2">
          <div className="text-center font-bold">Company Name</div>
          <div className="text-center font-bold">Daily Sales Report</div>
          <div className="text-center">Date: {reportDate}</div>

          <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: "58% 42%" }}>
            <div className="space-y-2">
              <table className="w-full border-collapse border border-black">
                <SalesTableHeader cols={["PACKAGE SALES (Member Type)", "QTY", "PRICE", "AMOUNT TOTAL"]} />
                <tbody>
                  <SalesRow label="Mobile Stockist" price={0} />
                  <SalesRow label="Platinum" price={PRICE.platinum} />
                  <SalesRow label="Gold" price={PRICE.gold} />
                  <SalesRow label="Silver" price={PRICE.silver} />
                  <TotalRow label="Total Package Sales" />
                </tbody>
              </table>

              <table className="w-full border-collapse border border-black">
                <SalesTableHeader cols={["MOBILE STOCKIST PACKAGE", "QTY", "PRICE", "AMOUNT TOTAL"]} />
                <tbody>
                  <SalesRow label="Platinum" price={PRICE.platinum} />
                  <SalesRow label="Gold" price={PRICE.gold} />
                  <SalesRow label="Silver" price={PRICE.silver} />
                  <TotalRow label="Total Mobile Stockist Package Sales" />
                </tbody>
              </table>

              <table className="w-full border-collapse border border-black">
                <SalesTableHeader cols={["DEPOT PACKS", "QTY", "PRICE", "AMOUNT TOTAL"]} />
                <tbody>
                  <SalesRow label="Platinum" price={PRICE.platinum} />
                  <SalesRow label="Gold" price={PRICE.gold} />
                  <SalesRow label="Silver" price={PRICE.silver} />
                  <TotalRow label="Total Depot Package Sales" />
                </tbody>
              </table>

              <table className="w-full border-collapse border border-black">
                <SalesTableHeader cols={["RETAIL ITEM", "QTY", "PRICE", "AMOUNT TOTAL"]} />
                <tbody>
                  <SalesRow label="Synbiotic+ (Bottle)" price={PRICE.bottle} />
                  <SalesRow label="Synbiotic+ (Blister)" price={PRICE.blister} />
                  <SalesRow label="Employee Discount" price={0} />
                  <TotalRow label="Total Retail Sales" />
                </tbody>
              </table>

              <table className="w-full border-collapse border border-black">
                <SalesTableHeader cols={["MOBILE STOCKIST RETAIL", "QTY", "PRICE", "AMOUNT TOTAL"]} />
                <tbody>
                  <SalesRow label="Synbiotic+ (Bottle)" price={PRICE.bottle} />
                  <TotalRow label="Total Mobile Stockist Retail Sales" />
                </tbody>
              </table>

              <table className="w-full border-collapse border border-black">
                <SalesTableHeader cols={["DEPOT RETAIL", "QTY", "PRICE", "AMOUNT TOTAL"]} />
                <tbody>
                  <SalesRow label="Synbiotic+ (Bottle)" price={PRICE.bottle} />
                  <TotalRow label="Total Depot Retail Sales" />
                </tbody>
              </table>

              <table className="w-full border-collapse border border-black">
                <tbody>
                  <tr className="bg-gray-100">
                    <td className="border border-black px-2 py-1 font-bold">GRAND TOTAL</td>
                    <td className="border border-black px-2 py-1 text-right font-bold">{formatMoney(0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <table className="w-full border-collapse border border-black">
                <SalesTableHeader cols={["DENOMINATION", "PIECES", "AMOUNT"]} />
                <tbody>
                  {DENOMINATIONS.map((denom) => (
                    <tr key={denom}>
                      <td className="border border-black px-2 py-1">{denom === 0.25 ? "0.25" : String(denom)}</td>
                      <td className="border border-black px-2 py-1">
                        <input
                          type="number"
                          min="0"
                          value={cashPieces[String(denom)] || "0"}
                          onChange={(event) =>
                            setCashPieces((prev) => ({
                              ...prev,
                              [String(denom)]: event.target.value
                            }))
                          }
                          className="w-full border-0 p-0 text-right text-[11px] outline-none"
                        />
                      </td>
                      <td className="border border-black px-2 py-1 text-right">{formatMoney(0)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="border border-black px-2 py-1 font-bold" colSpan={2}>Total Cash</td>
                    <td className="border border-black px-2 py-1 text-right font-bold">{formatMoney(0)}</td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full border-collapse border border-black">
                <SalesTableHeader cols={["PAYMENT METHOD", "AMOUNT"]} />
                <tbody>
                  {[
                    "Cash on Hand",
                    "E-Wallet",
                    "Bank Transfer",
                    "Maya",
                    "GCash",
                    "Cheque"
                  ].map((method) => (
                    <tr key={method}>
                      <td className="border border-black px-2 py-1">{method}</td>
                      <td className="border border-black px-2 py-1 text-right">{formatMoney(0)}</td>
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
                  <th className="border border-black px-2 py-1 text-left font-bold" colSpan={2}>NEW ACCOUNTS</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-black px-2 py-1">Silver</td><td className="border border-black px-2 py-1 text-right">0</td></tr>
                <tr><td className="border border-black px-2 py-1">Gold</td><td className="border border-black px-2 py-1 text-right">0</td></tr>
                <tr><td className="border border-black px-2 py-1">Platinum</td><td className="border border-black px-2 py-1 text-right">0</td></tr>
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
                <tr><td className="border border-black px-2 py-1">Total Upgrades</td><td className="border border-black px-2 py-1 text-right">0</td></tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-2">
            <table className="w-full border-collapse border border-black">
              <thead>
                <tr><th className="border border-black px-2 py-1 text-left font-bold" colSpan={3}>BANK TRANSFER DETAILS</th></tr>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1 text-left font-bold">Member Name</th>
                  <th className="border border-black px-2 py-1 text-left font-bold">Reference No</th>
                  <th className="border border-black px-2 py-1 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-black px-2 py-1">-</td><td className="border border-black px-2 py-1">-</td><td className="border border-black px-2 py-1 text-right">{formatMoney(0)}</td></tr>
              </tbody>
            </table>

            <table className="w-full border-collapse border border-black">
              <thead>
                <tr><th className="border border-black px-2 py-1 text-left font-bold" colSpan={3}>MAYA DETAILS</th></tr>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1 text-left font-bold">Member Name</th>
                  <th className="border border-black px-2 py-1 text-left font-bold">Reference No</th>
                  <th className="border border-black px-2 py-1 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-black px-2 py-1">-</td><td className="border border-black px-2 py-1">-</td><td className="border border-black px-2 py-1 text-right">{formatMoney(0)}</td></tr>
              </tbody>
            </table>

            <table className="w-full border-collapse border border-black">
              <thead>
                <tr><th className="border border-black px-2 py-1 text-left font-bold" colSpan={3}>GCASH DETAILS</th></tr>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1 text-left font-bold">Member Name</th>
                  <th className="border border-black px-2 py-1 text-left font-bold">Reference No</th>
                  <th className="border border-black px-2 py-1 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-black px-2 py-1">-</td><td className="border border-black px-2 py-1">-</td><td className="border border-black px-2 py-1 text-right">{formatMoney(0)}</td></tr>
              </tbody>
            </table>
          </div>

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
