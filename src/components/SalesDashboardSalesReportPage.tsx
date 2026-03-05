import React from "react";

const packageRows = [
  { package: "Platinum", qty: 2, price: "35,000.00", amount: "70,000.00" },
  { package: "Gold", qty: 3, price: "10,500.00", amount: "31,500.00" },
  { package: "Silver", qty: 5, price: "3,500.00", amount: "17,500.00" }
];

const paymentRows = [
  { label: "Cash on Hand", amount: "40,000.00" },
  { label: "E-Wallet", amount: "18,500.00" },
  { label: "Bank Transfer", amount: "60,500.00" },
  { label: "Maya", amount: "0.00" },
  { label: "GCash", amount: "0.00" },
  { label: "Cheque", amount: "0.00" }
];

export function SalesDashboardSalesReportPage() {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-4" style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span>Report Date:</span>
          <input type="date" className="border border-black px-2 py-1" />
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded border border-black px-3 py-1">Show Encoded Entries</button>
          <button className="rounded border border-black px-3 py-1" onClick={() => window.print()}>
            Print Report
          </button>
        </div>
      </div>

      <div id="sales-report-print" className="border border-black p-3">
        <div className="text-center font-bold">Company Name</div>
        <div className="text-center font-bold">Daily Sales Report</div>
        <div className="text-center">Date: YYYY-MM-DD</div>

        <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: "56% 44%" }}>
          <div className="space-y-3">
            <table className="w-full border border-black border-collapse">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left">PACKAGE</th>
                  <th className="border border-black px-2 py-1 text-right">QTY</th>
                  <th className="border border-black px-2 py-1 text-right">PRICE</th>
                  <th className="border border-black px-2 py-1 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {packageRows.map((row) => (
                  <tr key={row.package}>
                    <td className="border border-black px-2 py-1">{row.package}</td>
                    <td className="border border-black px-2 py-1 text-right">{row.qty}</td>
                    <td className="border border-black px-2 py-1 text-right">{row.price}</td>
                    <td className="border border-black px-2 py-1 text-right">{row.amount}</td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-black px-2 py-1 font-bold" colSpan={3}>TOTAL PACKAGE SALES</td>
                  <td className="border border-black px-2 py-1 text-right font-bold">119,000.00</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border border-black border-collapse">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left">RETAIL</th>
                  <th className="border border-black px-2 py-1 text-right">QTY</th>
                  <th className="border border-black px-2 py-1 text-right">PRICE</th>
                  <th className="border border-black px-2 py-1 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-2 py-1">Synbiotic+ (Bottle)</td>
                  <td className="border border-black px-2 py-1 text-right">12</td>
                  <td className="border border-black px-2 py-1 text-right">2,280.00</td>
                  <td className="border border-black px-2 py-1 text-right">27,360.00</td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-1">Synbiotic+ (Blister)</td>
                  <td className="border border-black px-2 py-1 text-right">8</td>
                  <td className="border border-black px-2 py-1 text-right">779.00</td>
                  <td className="border border-black px-2 py-1 text-right">6,232.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <table className="w-full border border-black border-collapse">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left">PAYMENT BREAKDOWN</th>
                  <th className="border border-black px-2 py-1 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.map((row) => (
                  <tr key={row.label}>
                    <td className="border border-black px-2 py-1">{row.label}</td>
                    <td className="border border-black px-2 py-1 text-right">{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="w-full border border-black border-collapse">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left" colSpan={2}>NEW ACCOUNTS</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-black px-2 py-1">Silver</td><td className="border border-black px-2 py-1 text-right">0</td></tr>
                <tr><td className="border border-black px-2 py-1">Gold</td><td className="border border-black px-2 py-1 text-right">0</td></tr>
                <tr><td className="border border-black px-2 py-1">Platinum</td><td className="border border-black px-2 py-1 text-right">0</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-8">
          <div>
            <div>Prepared By:</div>
            <input type="text" className="mt-3 w-full border-b border-black py-1 outline-none" />
          </div>
          <div>
            <div>Checked By:</div>
            <input type="text" className="mt-3 w-full border-b border-black py-1 outline-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
