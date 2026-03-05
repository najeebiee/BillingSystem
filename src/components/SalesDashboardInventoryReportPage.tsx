import React from "react";

const sampleRows = [
  { item: "Synbiotic Bottle", beginning: 120, received: 40, released: 30, ending: 130 },
  { item: "Synbiotic Blister", beginning: 80, received: 20, released: 15, ending: 85 },
  { item: "Packaging Supplies", beginning: 300, received: 100, released: 60, ending: 340 }
];

export function SalesDashboardInventoryReportPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Inventory Report</h1>
        <p className="text-sm text-gray-600">UI-only inventory report view.</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="date"
            className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-blue-500"
          />
          <select className="h-10 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-blue-500">
            <option>All Items</option>
            <option>Finished Goods</option>
            <option>Supplies</option>
          </select>
          <button className="h-10 rounded-md border border-blue-400 px-4 text-sm font-medium text-blue-600 hover:bg-blue-50">
            Export Inventory UI
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">
                  Item
                </th>
                <th className="border border-gray-200 px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600">
                  Beginning
                </th>
                <th className="border border-gray-200 px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600">
                  Received
                </th>
                <th className="border border-gray-200 px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600">
                  Released
                </th>
                <th className="border border-gray-200 px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600">
                  Ending
                </th>
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((row) => (
                <tr key={row.item}>
                  <td className="border border-gray-200 px-3 py-2 text-sm text-gray-800">{row.item}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right text-sm text-gray-800">{row.beginning}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right text-sm text-gray-800">{row.received}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right text-sm text-gray-800">{row.released}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right text-sm font-semibold text-gray-900">{row.ending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
