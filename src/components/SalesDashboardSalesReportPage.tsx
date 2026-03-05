import React, { useMemo, useState } from "react";
import type { SaleEntry } from "../types/sales";

type SalesDashboardSalesReportPageProps = {
  salesEntries: SaleEntry[];
};

type PaymentKey = "cash" | "ewallet" | "bank" | "maya" | "gcash" | "cheque";
type PaymentPart = { mode: string; type: string; reference: string; amount: number };

const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.25] as const;

const PRICE_MAP: Record<string, number> = {
  silver: 3500,
  gold: 10500,
  platinum: 35000,
  distributor: 0,
  retail: 2280,
  bottle: 2280,
  "synbiotic (bottle)": 2280,
  blister: 779,
  "synbiotic (blister)": 779,
  "blister (1 blister pack)": 779,
  "employee discount": 0,
  "total mobile stockist retail sales": 2280,
  "total depot retail sales": 2280,
};

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalize = (value: string) => value.trim().toLowerCase();

const getPrice = (label: string) => PRICE_MAP[normalize(label)] ?? 0;

const formatMoney = (value: number) =>
  value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const titleCase = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");

function computeTotal(entry: SaleEntry) {
  const totalSales = toNumber(entry.totalSales);
  if (totalSales > 0) return totalSales;

  const quantity = parseInt(entry.quantity, 10) || 1;
  const price = toNumber(entry.priceAfterDiscount) || toNumber(entry.originalPrice) || 0;
  const oneTimeDiscount = toNumber(entry.oneTimeDiscount);
  return Math.max(0, quantity * price - oneTimeDiscount);
}

function getPaymentParts(entry: SaleEntry): PaymentPart[] {
  const total = computeTotal(entry);
  const amount2 = toNumber(entry.amount2);
  const hasSplit = Boolean(normalize(entry.modeOfPayment2)) && amount2 > 0;
  const amount1 = Math.max(0, total - (hasSplit ? amount2 : 0));

  const parts: PaymentPart[] = [
    {
      mode: normalize(entry.modeOfPayment),
      type: normalize(entry.paymentModeType),
      reference: entry.referenceNumber,
      amount: amount1,
    },
  ];

  if (hasSplit) {
    parts.push({
      mode: normalize(entry.modeOfPayment2),
      type: normalize(entry.paymentModeType2),
      reference: entry.referenceNumber2,
      amount: amount2,
    });
  }

  return parts;
}

function matchPayment(mode: string, type: string, key: PaymentKey) {
  switch (key) {
    case "cash":
      return mode === "cash" || mode === "";
    case "bank":
      return mode === "bank";
    case "ewallet":
      return mode === "ewallet" && type !== "maya";
    case "maya":
      return type === "maya";
    case "gcash":
      return type === "gcash";
    case "cheque":
      return mode === "cheque";
    default:
      return false;
  }
}

function getPaymentTotal(entries: SaleEntry[], key: PaymentKey) {
  return entries.reduce((sum, entry) => {
    const partTotal = getPaymentParts(entry).reduce((partSum, part) => {
      return matchPayment(part.mode, part.type, key) ? partSum + part.amount : partSum;
    }, 0);
    return sum + partTotal;
  }, 0);
}

function getPaymentDetailRows(entries: SaleEntry[], key: PaymentKey) {
  const rows: Array<{ memberName: string; reference: string; amount: number }> = [];
  entries.forEach((entry) => {
    getPaymentParts(entry).forEach((part) => {
      if (matchPayment(part.mode, part.type, key)) {
        rows.push({
          memberName: entry.memberName || "-",
          reference: part.reference || "-",
          amount: part.amount,
        });
      }
    });
  });
  return rows;
}

export function SalesDashboardSalesReportPage({ salesEntries }: SalesDashboardSalesReportPageProps) {
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showEncodedEntries, setShowEncodedEntries] = useState(false);
  const [cashPieces, setCashPieces] = useState<Record<string, string>>(() =>
    Object.fromEntries(DENOMINATIONS.map((denom) => [String(denom), "0"]))
  );
  const [preparedBy, setPreparedBy] = useState("");
  const [checkedBy, setCheckedBy] = useState("");

  const filteredEntries = useMemo(
    () => salesEntries.filter((entry) => entry.date === reportDate),
    [salesEntries, reportDate]
  );

  const packageRows = useMemo(() => {
    const memberKeys: Array<{ key: SaleEntry["memberType"]; label: string }> = [
      { key: "distributor", label: "Distributor" },
      { key: "platinum", label: "Platinum" },
      { key: "gold", label: "Gold" },
      { key: "silver", label: "Silver" },
    ];

    return memberKeys.map(({ key, label }) => {
      const entries = filteredEntries.filter((entry) => normalize(entry.memberType) === key);
      const qty = entries.reduce((sum, entry) => sum + (parseInt(entry.quantity, 10) || 1), 0);
      const price = getPrice(label);
      const amount = qty * price;
      return { label, qty, price, amount };
    });
  }, [filteredEntries]);

  const bottleQty = filteredEntries.reduce((sum, entry) => sum + (parseInt(entry.releasedBottles, 10) || 0), 0);
  const blisterQty = filteredEntries.reduce((sum, entry) => sum + (parseInt(entry.releasedBlister, 10) || 0), 0);
  const retailRows = [
    { label: "Bottle", qty: bottleQty, price: getPrice("Bottle"), amount: bottleQty * getPrice("Bottle") },
    { label: "Blister", qty: blisterQty, price: getPrice("Blister"), amount: blisterQty * getPrice("Blister") },
    { label: "Employee Discount", qty: 0, price: getPrice("Employee Discount"), amount: 0 },
  ];

  const packageTotal = packageRows.reduce((sum, row) => sum + row.amount, 0);
  const retailTotal = retailRows.reduce((sum, row) => sum + row.amount, 0);
  const grandTotal = packageTotal + retailTotal;

  const legacyTierRows: Array<{ key: SaleEntry["memberType"]; label: string }> = [
    { key: "platinum", label: "Platinum" },
    { key: "gold", label: "Gold" },
    { key: "silver", label: "Silver" },
  ];

  const summarizeLegacyPackageSection = (keyword: string) => {
    const rows = legacyTierRows.map((tier) => {
      const rowsForTier = filteredEntries.filter(
        (entry) =>
          normalize(entry.packageType).includes(keyword) &&
          normalize(entry.memberType) === tier.key
      );
      const qty = rowsForTier.reduce((sum, entry) => sum + (parseInt(entry.quantity, 10) || 1), 0);
      const price = getPrice(tier.label);
      const amount = qty * price;
      return { label: tier.label, qty, price, amount };
    });

    return {
      rows,
      total: rows.reduce((sum, row) => sum + row.amount, 0),
    };
  };

  const mobileStockistPackageSection = summarizeLegacyPackageSection("mobile stockist");
  const depotPackageSection = summarizeLegacyPackageSection("depot");

  const legacyRetailRows = [
    {
      label: "Synbiotic (Bottle)",
      qty: bottleQty,
      price: getPrice("Synbiotic (Bottle)"),
      amount: bottleQty * getPrice("Synbiotic (Bottle)"),
    },
    {
      label: "Synbiotic (Blister)",
      qty: blisterQty,
      price: getPrice("Synbiotic (Blister)"),
      amount: blisterQty * getPrice("Synbiotic (Blister)"),
    },
    { label: "Employee Discount", qty: 0, price: getPrice("Employee Discount"), amount: 0 },
  ];
  const legacyRetailTotal = legacyRetailRows.reduce((sum, row) => sum + row.amount, 0);

  const mobileStockistRetailQty = filteredEntries
    .filter((entry) => normalize(entry.packageType).includes("mobile stockist retail"))
    .reduce((sum, entry) => sum + (parseInt(entry.quantity, 10) || 1), 0);
  const mobileStockistRetailPrice = getPrice("Total Mobile Stockist Retail Sales");
  const mobileStockistRetailTotal = mobileStockistRetailQty * mobileStockistRetailPrice;

  const depotRetailQty = filteredEntries
    .filter((entry) => normalize(entry.packageType).includes("depot retail"))
    .reduce((sum, entry) => sum + (parseInt(entry.quantity, 10) || 1), 0);
  const depotRetailPrice = getPrice("Total Depot Retail Sales");
  const depotRetailTotal = depotRetailQty * depotRetailPrice;

  const legacyGrandTotal =
    mobileStockistPackageSection.total +
    depotPackageSection.total +
    legacyRetailTotal +
    mobileStockistRetailTotal +
    depotRetailTotal;

  const paymentRows: Array<{ label: string; key: PaymentKey }> = [
    { label: "Cash on Hand", key: "cash" },
    { label: "E-Wallet", key: "ewallet" },
    { label: "Bank Transfer", key: "bank" },
    { label: "Maya", key: "maya" },
    { label: "GCash", key: "gcash" },
    { label: "Cheque", key: "cheque" },
  ];

  const paymentTotals = paymentRows.map((row) => ({
    ...row,
    amount: getPaymentTotal(filteredEntries, row.key),
  }));

  const bankDetails = getPaymentDetailRows(filteredEntries, "bank");
  const mayaDetails = getPaymentDetailRows(filteredEntries, "maya");
  const gcashDetails = getPaymentDetailRows(filteredEntries, "gcash");

  const newSilver = filteredEntries.filter(
    (entry) => normalize(entry.newMember) === "yes" && normalize(entry.memberType) === "silver"
  ).length;
  const newGold = filteredEntries.filter(
    (entry) => normalize(entry.newMember) === "yes" && normalize(entry.memberType) === "gold"
  ).length;
  const newPlatinum = filteredEntries.filter(
    (entry) => normalize(entry.newMember) === "yes" && normalize(entry.memberType) === "platinum"
  ).length;

  const cashTotal = DENOMINATIONS.reduce((sum, denom) => {
    return sum + denom * toNumber(cashPieces[String(denom)] || "0");
  }, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4" style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span>Report Date:</span>
          <input
            type="date"
            value={reportDate}
            onChange={(event) => setReportDate(event.target.value || new Date().toISOString().slice(0, 10))}
            className="border border-black px-2 py-1"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowEncodedEntries((prev) => !prev)}
          className="rounded border border-black px-3 py-1"
        >
          {showEncodedEntries ? "Hide Encoded Entries" : "Show Encoded Entries"}
        </button>
      </div>

      <div className="border border-black p-3">
        <div className="text-center font-bold">Company Name</div>
        <div className="text-center font-bold">Daily Sales Report</div>
        <div className="text-center">Date: {reportDate}</div>

        <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: "56% 44%" }}>
          <div className="space-y-3">
            <table className="w-full border border-black border-collapse">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left">Package Sales (Member Type)</th>
                  <th className="border border-black px-2 py-1 text-right">Qty</th>
                  <th className="border border-black px-2 py-1 text-right">Price</th>
                  <th className="border border-black px-2 py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {packageRows.map((row) => (
                  <tr key={row.label}>
                    <td className="border border-black px-2 py-1">{row.label}</td>
                    <td className="border border-black px-2 py-1 text-right">{row.qty}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatMoney(row.price)}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatMoney(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="w-full border border-black border-collapse">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left">Retail Sales</th>
                  <th className="border border-black px-2 py-1 text-right">Qty</th>
                  <th className="border border-black px-2 py-1 text-right">Price</th>
                  <th className="border border-black px-2 py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {retailRows.map((row) => (
                  <tr key={row.label}>
                    <td className="border border-black px-2 py-1">{row.label}</td>
                    <td className="border border-black px-2 py-1 text-right">{row.qty}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatMoney(row.price)}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatMoney(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="w-full border border-black border-collapse mt-3">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1 text-left">MOBILE STOCKIST PACKAGE</th>
                  <th className="border border-black px-2 py-1 text-right">QTY</th>
                  <th className="border border-black px-2 py-1 text-right">PRICE</th>
                  <th className="border border-black px-2 py-1 text-right">AMOUNT TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {mobileStockistPackageSection.rows.map((row) => (
                  <tr key={`mobile-stockist-${row.label}`}>
                    <td className="border border-black px-2 py-1">{row.label}</td>
                    <td className="border border-black px-2 py-1 text-right">{row.qty}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatMoney(row.price)}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatMoney(row.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-black px-2 py-1 font-bold" colSpan={3}>
                    Total Mobile Stockist Package Sales
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-bold">
                    {formatMoney(mobileStockistPackageSection.total)}
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border border-black border-collapse mt-3">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1 text-left">DEPOT PACKS</th>
                  <th className="border border-black px-2 py-1 text-right">QTY</th>
                  <th className="border border-black px-2 py-1 text-right">PRICE</th>
                  <th className="border border-black px-2 py-1 text-right">AMOUNT TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {depotPackageSection.rows.map((row) => (
                  <tr key={`depot-${row.label}`}>
                    <td className="border border-black px-2 py-1">{row.label}</td>
                    <td className="border border-black px-2 py-1 text-right">{row.qty}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatMoney(row.price)}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatMoney(row.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-black px-2 py-1 font-bold" colSpan={3}>
                    Total Depot Package Sales
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-bold">
                    {formatMoney(depotPackageSection.total)}
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border border-black border-collapse mt-3">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1 text-left">RETAIL</th>
                  <th className="border border-black px-2 py-1 text-right">QTY</th>
                  <th className="border border-black px-2 py-1 text-right">PRICE</th>
                  <th className="border border-black px-2 py-1 text-right">AMOUNT TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {legacyRetailRows.map((row) => (
                  <tr key={`legacy-retail-${row.label}`}>
                    <td className="border border-black px-2 py-1">{row.label}</td>
                    <td className="border border-black px-2 py-1 text-right">{row.qty}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatMoney(row.price)}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatMoney(row.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-black px-2 py-1 font-bold" colSpan={3}>
                    Total Retail Sales
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-bold">
                    {formatMoney(legacyRetailTotal)}
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border border-black border-collapse mt-3">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1 text-left">MOBILE STOCKIST RETAIL</th>
                  <th className="border border-black px-2 py-1 text-right">QTY</th>
                  <th className="border border-black px-2 py-1 text-right">PRICE</th>
                  <th className="border border-black px-2 py-1 text-right">AMOUNT TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-2 py-1">Total Mobile Stockist Retail Sales</td>
                  <td className="border border-black px-2 py-1 text-right">{mobileStockistRetailQty}</td>
                  <td className="border border-black px-2 py-1 text-right">{formatMoney(mobileStockistRetailPrice)}</td>
                  <td className="border border-black px-2 py-1 text-right">{formatMoney(mobileStockistRetailTotal)}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border border-black border-collapse mt-3">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1 text-left">DEPOT RETAIL</th>
                  <th className="border border-black px-2 py-1 text-right">QTY</th>
                  <th className="border border-black px-2 py-1 text-right">PRICE</th>
                  <th className="border border-black px-2 py-1 text-right">AMOUNT TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-2 py-1">Total Depot Retail Sales</td>
                  <td className="border border-black px-2 py-1 text-right">{depotRetailQty}</td>
                  <td className="border border-black px-2 py-1 text-right">{formatMoney(depotRetailPrice)}</td>
                  <td className="border border-black px-2 py-1 text-right">{formatMoney(depotRetailTotal)}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border border-black border-collapse mt-3">
              <tbody>
                <tr className="bg-gray-100">
                  <td className="border border-black px-2 py-1 font-bold" colSpan={3}>
                    GRAND TOTAL
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-bold">
                    {formatMoney(legacyGrandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end border border-black px-2 py-1 font-bold">
              Grand Total: {formatMoney(grandTotal)}
            </div>
          </div>

          <div className="space-y-3">
            <table className="w-full border border-black border-collapse">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left">Cash Count</th>
                  <th className="border border-black px-2 py-1 text-right">Pieces</th>
                  <th className="border border-black px-2 py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {DENOMINATIONS.map((denom) => {
                  const pieces = toNumber(cashPieces[String(denom)] || "0");
                  return (
                    <tr key={denom}>
                      <td className="border border-black px-2 py-1">{formatMoney(denom)}</td>
                      <td className="border border-black px-2 py-1">
                        <input
                          type="number"
                          min="0"
                          value={cashPieces[String(denom)] || "0"}
                          onChange={(event) =>
                            setCashPieces((prev) => ({ ...prev, [String(denom)]: event.target.value }))
                          }
                          className="w-full px-1"
                        />
                      </td>
                      <td className="border border-black px-2 py-1 text-right">{formatMoney(denom * pieces)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="border border-black px-2 py-1 font-bold" colSpan={2}>
                    Total
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-bold">{formatMoney(cashTotal)}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border border-black border-collapse">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left">Payment Breakdown</th>
                  <th className="border border-black px-2 py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paymentTotals.map((row) => (
                  <tr key={row.label}>
                    <td className="border border-black px-2 py-1">{row.label}</td>
                    <td className="border border-black px-2 py-1 text-right">{formatMoney(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <table className="w-full border border-black border-collapse">
            <thead>
              <tr><th className="border border-black px-2 py-1 text-left" colSpan={2}>New Accounts</th></tr>
            </thead>
            <tbody>
              <tr><td className="border border-black px-2 py-1">Silver</td><td className="border border-black px-2 py-1 text-right">{newSilver}</td></tr>
              <tr><td className="border border-black px-2 py-1">Gold</td><td className="border border-black px-2 py-1 text-right">{newGold}</td></tr>
              <tr><td className="border border-black px-2 py-1">Platinum</td><td className="border border-black px-2 py-1 text-right">{newPlatinum}</td></tr>
            </tbody>
          </table>
          <table className="w-full border border-black border-collapse">
            <thead>
              <tr><th className="border border-black px-2 py-1 text-left">Upgrades</th><th className="border border-black px-2 py-1 text-right">Count</th></tr>
            </thead>
            <tbody>
              <tr><td className="border border-black px-2 py-1">Total Upgrades</td><td className="border border-black px-2 py-1 text-right">0</td></tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <table className="w-full border border-black border-collapse">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 text-left" colSpan={3}>Bank Transfer Details</th>
              </tr>
              <tr>
                <th className="border border-black px-2 py-1 text-left">Member Name</th>
                <th className="border border-black px-2 py-1 text-left">Reference No</th>
                <th className="border border-black px-2 py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(bankDetails.length ? bankDetails : [{ memberName: "-", reference: "-", amount: 0 }]).map((row, index) => (
                <tr key={`bank-${index}`}>
                  <td className="border border-black px-2 py-1">{row.memberName}</td>
                  <td className="border border-black px-2 py-1">{row.reference}</td>
                  <td className="border border-black px-2 py-1 text-right">{formatMoney(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <table className="w-full border border-black border-collapse">
            <thead>
              <tr><th className="border border-black px-2 py-1 text-left" colSpan={3}>Maya Details</th></tr>
              <tr>
                <th className="border border-black px-2 py-1 text-left">Member Name</th>
                <th className="border border-black px-2 py-1 text-left">Reference No</th>
                <th className="border border-black px-2 py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(mayaDetails.length ? mayaDetails : [{ memberName: "-", reference: "-", amount: 0 }]).map((row, index) => (
                <tr key={`maya-${index}`}>
                  <td className="border border-black px-2 py-1">{row.memberName}</td>
                  <td className="border border-black px-2 py-1">{row.reference}</td>
                  <td className="border border-black px-2 py-1 text-right">{formatMoney(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <table className="w-full border border-black border-collapse">
            <thead>
              <tr><th className="border border-black px-2 py-1 text-left" colSpan={3}>GCash Details</th></tr>
              <tr>
                <th className="border border-black px-2 py-1 text-left">Member Name</th>
                <th className="border border-black px-2 py-1 text-left">Reference No</th>
                <th className="border border-black px-2 py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(gcashDetails.length ? gcashDetails : [{ memberName: "-", reference: "-", amount: 0 }]).map((row, index) => (
                <tr key={`gcash-${index}`}>
                  <td className="border border-black px-2 py-1">{row.memberName}</td>
                  <td className="border border-black px-2 py-1">{row.reference}</td>
                  <td className="border border-black px-2 py-1 text-right">{formatMoney(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showEncodedEntries && (
          <div className="mt-4">
            <table className="w-full border border-black border-collapse">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left">#</th>
                  <th className="border border-black px-2 py-1 text-left">PGF No.</th>
                  <th className="border border-black px-2 py-1 text-left">Member Name</th>
                  <th className="border border-black px-2 py-1 text-left">Member Type</th>
                  <th className="border border-black px-2 py-1 text-left">Pkg Type</th>
                  <th className="border border-black px-2 py-1 text-right">Qty</th>
                  <th className="border border-black px-2 py-1 text-right">Total Sales</th>
                  <th className="border border-black px-2 py-1 text-left">Payment 1</th>
                  <th className="border border-black px-2 py-1 text-left">Payment 2</th>
                  <th className="border border-black px-2 py-1 text-left">Released B/Bl</th>
                  <th className="border border-black px-2 py-1 text-left">Received By</th>
                </tr>
              </thead>
              <tbody>
                {(filteredEntries.length ? filteredEntries : []).map((entry, index) => {
                  const parts = getPaymentParts(entry);
                  const part1 = parts[0];
                  const part2 = parts[1];
                  return (
                    <tr key={entry.id}>
                      <td className="border border-black px-2 py-1">{index + 1}</td>
                      <td className="border border-black px-2 py-1">{entry.pgfNumber}</td>
                      <td className="border border-black px-2 py-1">{entry.memberName}</td>
                      <td className="border border-black px-2 py-1">{titleCase(entry.memberType || "-")}</td>
                      <td className="border border-black px-2 py-1">{entry.packageType}</td>
                      <td className="border border-black px-2 py-1 text-right">{parseInt(entry.quantity, 10) || 1}</td>
                      <td className="border border-black px-2 py-1 text-right">{formatMoney(computeTotal(entry))}</td>
                      <td className="border border-black px-2 py-1">
                        {part1 ? `${titleCase(part1.mode || "cash")} ${part1.reference ? `(${part1.reference})` : ""} - ${formatMoney(part1.amount)}` : "-"}
                      </td>
                      <td className="border border-black px-2 py-1">
                        {part2 ? `${titleCase(part2.mode)} ${part2.reference ? `(${part2.reference})` : ""} - ${formatMoney(part2.amount)}` : "-"}
                      </td>
                      <td className="border border-black px-2 py-1">{`${entry.releasedBottles || "0"} / ${entry.releasedBlister || "0"}`}</td>
                      <td className="border border-black px-2 py-1">{entry.receivedBy || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-8">
          <div>
            <div>Prepared By:</div>
            <input
              type="text"
              value={preparedBy}
              onChange={(event) => setPreparedBy(event.target.value)}
              className="mt-3 w-full border-b border-black py-1 outline-none"
            />
          </div>
          <div>
            <div>Checked By:</div>
            <input
              type="text"
              value={checkedBy}
              onChange={(event) => setCheckedBy(event.target.value)}
              className="mt-3 w-full border-b border-black py-1 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
