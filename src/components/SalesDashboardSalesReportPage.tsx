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

const formatReportDate = (value: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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

  const packageTotal = packageRows.reduce((sum, row) => sum + row.amount, 0);
  const grandTotal = packageTotal;

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

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=900,height=650");
    if (!printWindow) return;

    const platinumSummary = packageRows.find((row) => row.label === "Platinum");
    const goldSummary = packageRows.find((row) => row.label === "Gold");
    const silverSummary = packageRows.find((row) => row.label === "Silver");
    const mobileStockistSummaryQty = mobileStockistPackageSection.rows.reduce((sum, row) => sum + row.qty, 0);
    const mobileStockistSummaryAmount = mobileStockistPackageSection.total;
    const mobileStockistSummaryPrice =
      mobileStockistSummaryQty > 0 ? mobileStockistSummaryAmount / mobileStockistSummaryQty : 0;

    const packageSummaryRows = [
      {
        label: "Mobile Stockist",
        qty: mobileStockistSummaryQty,
        price: mobileStockistSummaryPrice,
        amount: mobileStockistSummaryAmount,
      },
      {
        label: "Platinum",
        qty: platinumSummary?.qty ?? 0,
        price: platinumSummary?.price ?? getPrice("Platinum"),
        amount: platinumSummary?.amount ?? 0,
      },
      {
        label: "Gold",
        qty: goldSummary?.qty ?? 0,
        price: goldSummary?.price ?? getPrice("Gold"),
        amount: goldSummary?.amount ?? 0,
      },
      {
        label: "Silver",
        qty: silverSummary?.qty ?? 0,
        price: silverSummary?.price ?? getPrice("Silver"),
        amount: silverSummary?.amount ?? 0,
      },
    ];
    const packageSummaryTotal = packageSummaryRows.reduce((sum, row) => sum + row.amount, 0);

    const retailRowsForPrint = [
      {
        label: "Synbiotic+ (Bottle)",
        qty: bottleQty,
        price: getPrice("Synbiotic (Bottle)"),
        amount: bottleQty * getPrice("Synbiotic (Bottle)"),
      },
      {
        label: "Synbiotic+ (Blister)",
        qty: blisterQty,
        price: getPrice("Synbiotic (Blister)"),
        amount: blisterQty * getPrice("Synbiotic (Blister)"),
      },
      {
        label: "Employees Discount",
        qty: 0,
        price: getPrice("Employee Discount"),
        amount: 0,
      },
    ];
    const retailPrintTotal = retailRowsForPrint.reduce((sum, row) => sum + row.amount, 0);

    const mobileStockistRetailRowsForPrint = [
      {
        label: "Synbiotic+ (Bottle)",
        qty: mobileStockistRetailQty,
        price: mobileStockistRetailPrice,
        amount: mobileStockistRetailTotal,
      },
    ];

    const depotRetailRowsForPrint = [
      {
        label: "Synbiotic+ (Bottle)",
        qty: depotRetailQty,
        price: depotRetailPrice,
        amount: depotRetailTotal,
      },
    ];

    const paymentTotalsByKey: Record<PaymentKey, number> = {
      cash: getPaymentTotal(filteredEntries, "cash"),
      ewallet: getPaymentTotal(filteredEntries, "ewallet"),
      bank: getPaymentTotal(filteredEntries, "bank"),
      maya: getPaymentTotal(filteredEntries, "maya"),
      gcash: getPaymentTotal(filteredEntries, "gcash"),
      cheque: getPaymentTotal(filteredEntries, "cheque"),
    };

    const paymentBreakdownRows = [
      { label: "Cash on hand", amount: paymentTotalsByKey.cash },
      { label: "E-Wallet", amount: paymentTotalsByKey.ewallet + paymentTotalsByKey.gcash },
      { label: "Bank Transfer - Security Bank", amount: paymentTotalsByKey.bank },
      { label: "Maya (IGI)", amount: paymentTotalsByKey.maya },
      { label: "Maya (ATC)", amount: 0 },
      { label: "SB Collect (IGI)", amount: 0 },
      { label: "SB Collect (ATC)", amount: 0 },
      { label: "Accounts Receivable - CSA", amount: 0 },
      { label: "Accounts Receivable - Leaders Support", amount: 0 },
      { label: "Consignment", amount: 0 },
      { label: "Cheque", amount: paymentTotalsByKey.cheque },
      { label: "E-Points", amount: 0 },
    ];
    const paymentBreakdownTotal = paymentBreakdownRows.reduce((sum, row) => sum + row.amount, 0);

    const cashRows = DENOMINATIONS.map((denom) => {
      const pieces = toNumber(cashPieces[String(denom)] || "0");
      return {
        label: denom === 0.25 ? "0.25" : String(denom),
        pieces,
        amount: denom * pieces,
      };
    });

    const sbCollectIgiDetails = filteredEntries
      .filter((entry) => normalize(entry.remarks).includes("sb collect (igi)"))
      .map((entry) => ({
        reference: entry.referenceNumber || "-",
        amount: computeTotal(entry),
      }));

    const sbCollectAtcDetails = filteredEntries
      .filter((entry) => normalize(entry.remarks).includes("sb collect (atc)"))
      .map((entry) => ({
        reference: entry.referenceNumber || "-",
        amount: computeTotal(entry),
      }));

    const arCsaDetails = filteredEntries
      .filter((entry) => normalize(entry.remarks).includes("ar csa"))
      .map((entry) => ({
        memberName: entry.memberName || "-",
        pof: entry.pgfNumber || "-",
        amount: computeTotal(entry),
      }));

    const renderPackageRows = (rows: Array<{ label: string; qty: number; price: number; amount: number }>) =>
      rows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.label)}</td>
              <td class="right">${row.qty}</td>
              <td class="right">${formatMoney(row.price)}</td>
              <td class="right">${formatMoney(row.amount)}</td>
            </tr>
          `
        )
        .join("");

    const renderNamedAmountRows = (rows: Array<{ label: string; amount: number }>) =>
      rows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.label)}</td>
              <td class="right">${formatMoney(row.amount)}</td>
            </tr>
          `
        )
        .join("");

    const renderDetailRows = (rows: Array<{ name: string; reference: string; amount: number }>) => {
      if (!rows.length) {
        return `
          <tr>
            <td>-</td>
            <td>-</td>
            <td class="right">${formatMoney(0)}</td>
          </tr>
        `;
      }

      return rows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.name)}</td>
              <td>${escapeHtml(row.reference)}</td>
              <td class="right">${formatMoney(row.amount)}</td>
            </tr>
          `
        )
        .join("");
    };

    const bankDetailRows = bankDetails.map((row) => ({
      name: row.memberName || "-",
      reference: row.reference || "-",
      amount: row.amount,
    }));
    const mayaDetailRows = mayaDetails.map((row) => ({
      name: row.memberName || "-",
      reference: row.reference || "-",
      amount: row.amount,
    }));
    const bankTotal = bankDetailRows.reduce((sum, row) => sum + row.amount, 0);
    const mayaTotal = mayaDetailRows.reduce((sum, row) => sum + row.amount, 0);
    const sbCollectIgiTotal = sbCollectIgiDetails.reduce((sum, row) => sum + row.amount, 0);
    const sbCollectAtcTotal = sbCollectAtcDetails.reduce((sum, row) => sum + row.amount, 0);
    const arCsaTotal = arCsaDetails.reduce((sum, row) => sum + row.amount, 0);

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Daily Sales Report</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #111; }
            #printPage { width: 190mm; height: 277mm; overflow: hidden; }
            #printContent { width: 100%; transform-origin: top left; }
            .title { text-align: center; margin-bottom: 4px; }
            .title h1 { font-size: 12px; margin: 0; font-weight: 700; }
            .title h2 { font-size: 11px; margin: 1px 0 0; font-weight: 700; }
            .title .date { font-size: 9.5px; margin-top: 1px; }
            .topGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
            .stack > table { margin-top: 4px; }
            .stack > table:first-child { margin-top: 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #444; padding: 2px 3px; font-size: 9px; line-height: 1.1; }
            th { font-weight: 700; text-transform: uppercase; background: #f3f4f6; }
            .noUpper th { text-transform: none; }
            .sectionTitle { font-weight: 700; background: #eceff3; }
            .right { text-align: right; }
            .center { text-align: center; }
            .miniGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
            .detailGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
            .signGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; font-size: 9px; }
            .signBox { min-height: 28px; }
            .line { border-bottom: 1px solid #222; margin-top: 12px; }
            table, tr, td, th { page-break-inside: avoid; break-inside: avoid; }
          </style>
        </head>
        <body>
          <div id="printPage">
            <div id="printContent">
              <div class="title">
                <h1>Company Name</h1>
                <h2>Daily Sales Report</h2>
                <div class="date">${escapeHtml(formatReportDate(reportDate))}</div>
              </div>

              <div class="topGrid">
                <div class="stack">
                  <table>
                    <thead>
                      <tr>
                        <th>Package</th>
                        <th class="right">Qty</th>
                        <th class="right">Price</th>
                        <th class="right">Amount Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${renderPackageRows(packageSummaryRows)}
                      <tr>
                        <td class="sectionTitle" colspan="3">Total Package Sales</td>
                        <td class="right sectionTitle">${formatMoney(packageSummaryTotal)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <table>
                    <thead>
                      <tr>
                        <th>Mobile Stockist Package</th>
                        <th class="right">Qty</th>
                        <th class="right">Price</th>
                        <th class="right">Amount Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${renderPackageRows(mobileStockistPackageSection.rows)}
                      <tr>
                        <td class="sectionTitle" colspan="3">Total Mobile Stockist Package Sales</td>
                        <td class="right sectionTitle">${formatMoney(mobileStockistPackageSection.total)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <table>
                    <thead>
                      <tr>
                        <th>Depot Package</th>
                        <th class="right">Qty</th>
                        <th class="right">Price</th>
                        <th class="right">Amount Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${renderPackageRows(depotPackageSection.rows)}
                      <tr>
                        <td class="sectionTitle" colspan="3">Total Depot Package Sales</td>
                        <td class="right sectionTitle">${formatMoney(depotPackageSection.total)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <table>
                    <thead>
                      <tr>
                        <th>Retail</th>
                        <th class="right">Qty</th>
                        <th class="right">Price</th>
                        <th class="right">Amount Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${renderPackageRows(retailRowsForPrint)}
                      <tr>
                        <td class="sectionTitle" colspan="3">Total Retail Sales</td>
                        <td class="right sectionTitle">${formatMoney(retailPrintTotal)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <table>
                    <thead>
                      <tr>
                        <th>Mobile Stockist Retail Detail</th>
                        <th class="right">Qty</th>
                        <th class="right">Price</th>
                        <th class="right">Amount Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${renderPackageRows(mobileStockistRetailRowsForPrint)}
                      <tr>
                        <td class="sectionTitle" colspan="3">Total Mobile Stockist Retail Sales</td>
                        <td class="right sectionTitle">${formatMoney(mobileStockistRetailTotal)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <table>
                    <thead>
                      <tr>
                        <th>Depot Retail</th>
                        <th class="right">Qty</th>
                        <th class="right">Price</th>
                        <th class="right">Amount Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${renderPackageRows(depotRetailRowsForPrint)}
                      <tr>
                        <td class="sectionTitle" colspan="3">Total Depot Retail Sales</td>
                        <td class="right sectionTitle">${formatMoney(depotRetailTotal)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <table>
                    <tbody>
                      <tr>
                        <td class="sectionTitle" colspan="3">Grand Total</td>
                        <td class="right sectionTitle">${formatMoney(legacyGrandTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="stack">
                  <table class="noUpper">
                    <thead>
                      <tr>
                        <th>Cash on Hand</th>
                        <th class="right">Pieces</th>
                        <th class="right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${cashRows
                        .map(
                          (row) => `
                            <tr>
                              <td>${row.label}</td>
                              <td class="right">${row.pieces}</td>
                              <td class="right">${formatMoney(row.amount)}</td>
                            </tr>
                          `
                        )
                        .join("")}
                      <tr>
                        <td class="sectionTitle" colspan="2">Total Cash on Hand</td>
                        <td class="right sectionTitle">${formatMoney(cashTotal)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <table class="noUpper">
                    <thead>
                      <tr>
                        <th>Payment Method</th>
                        <th class="right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${renderNamedAmountRows(paymentBreakdownRows)}
                      <tr>
                        <td class="sectionTitle">Total</td>
                        <td class="right sectionTitle">${formatMoney(paymentBreakdownTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="miniGrid">
                <table class="noUpper">
                  <thead>
                    <tr><th colspan="2">New Accounts</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Silver</td><td class="right">${newSilver}</td></tr>
                    <tr><td>Gold</td><td class="right">${newGold}</td></tr>
                    <tr><td>Platinum</td><td class="right">${newPlatinum}</td></tr>
                  </tbody>
                </table>

                <table class="noUpper">
                  <thead>
                    <tr><th colspan="2">Upgrades</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Silver</td><td class="right">0</td></tr>
                    <tr><td>Gold</td><td class="right">0</td></tr>
                    <tr><td>Platinum</td><td class="right">0</td></tr>
                  </tbody>
                </table>
              </div>

              <div class="detailGrid">
                <table class="noUpper">
                  <thead>
                    <tr><th>Bank</th><th>Reference #</th><th class="right">Amount</th></tr>
                  </thead>
                  <tbody>
                    ${renderDetailRows(bankDetailRows)}
                    <tr>
                      <td class="sectionTitle" colspan="2">Total</td>
                      <td class="right sectionTitle">${formatMoney(bankTotal)}</td>
                    </tr>
                  </tbody>
                </table>

                <table class="noUpper">
                  <thead>
                    <tr><th>Maya (IGI)</th><th>Reference #</th><th class="right">Amount</th></tr>
                  </thead>
                  <tbody>
                    ${renderDetailRows(mayaDetailRows)}
                    <tr>
                      <td class="sectionTitle" colspan="2">Total</td>
                      <td class="right sectionTitle">${formatMoney(mayaTotal)}</td>
                    </tr>
                  </tbody>
                </table>

                <table class="noUpper">
                  <thead>
                    <tr><th colspan="2">SB Collect (IGI)</th></tr>
                    <tr><th>Reference #</th><th class="right">Amount</th></tr>
                  </thead>
                  <tbody>
                    ${
                      sbCollectIgiDetails.length
                        ? sbCollectIgiDetails
                            .map(
                              (row) => `
                                <tr>
                                  <td>${escapeHtml(row.reference)}</td>
                                  <td class="right">${formatMoney(row.amount)}</td>
                                </tr>
                              `
                            )
                            .join("")
                        : `<tr><td>-</td><td class="right">${formatMoney(0)}</td></tr>`
                    }
                    <tr>
                      <td class="sectionTitle">Total</td>
                      <td class="right sectionTitle">${formatMoney(sbCollectIgiTotal)}</td>
                    </tr>
                  </tbody>
                </table>

                <table class="noUpper">
                  <thead>
                    <tr><th colspan="2">SB Collect (ATC)</th></tr>
                    <tr><th>Reference #</th><th class="right">Amount</th></tr>
                  </thead>
                  <tbody>
                    ${
                      sbCollectAtcDetails.length
                        ? sbCollectAtcDetails
                            .map(
                              (row) => `
                                <tr>
                                  <td>${escapeHtml(row.reference)}</td>
                                  <td class="right">${formatMoney(row.amount)}</td>
                                </tr>
                              `
                            )
                            .join("")
                        : `<tr><td>-</td><td class="right">${formatMoney(0)}</td></tr>`
                    }
                    <tr>
                      <td class="sectionTitle">Total</td>
                      <td class="right sectionTitle">${formatMoney(sbCollectAtcTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <table class="noUpper" style="margin-top:6px;">
                <thead>
                  <tr><th>AR CSA (Member Name)</th><th>POF #</th><th class="right">Amount</th></tr>
                </thead>
                <tbody>
                  ${
                    arCsaDetails.length
                      ? arCsaDetails
                          .map(
                            (row) => `
                              <tr>
                                <td>${escapeHtml(row.memberName)}</td>
                                <td>${escapeHtml(row.pof)}</td>
                                <td class="right">${formatMoney(row.amount)}</td>
                              </tr>
                            `
                          )
                          .join("")
                      : `<tr><td>-</td><td>-</td><td class="right">${formatMoney(0)}</td></tr>`
                  }
                  <tr>
                    <td class="sectionTitle" colspan="2">Total</td>
                    <td class="right sectionTitle">${formatMoney(arCsaTotal)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="signGrid">
                <div class="signBox">
                  <div>Prepared By:</div>
                  <div class="line">${escapeHtml(preparedBy || "")}</div>
                  <div>Encoder</div>
                </div>
                <div class="signBox">
                  <div>Checked By:</div>
                  <div class="line">${escapeHtml(checkedBy || "")}</div>
                  <div>Supervisor</div>
                </div>
              </div>
            </div>
          </div>
          <script>
            function fitToOnePage() {
              const page = document.getElementById('printPage');
              const content = document.getElementById('printContent');
              if (!page || !content) return;

              content.style.transform = 'none';
              content.style.width = '100%';

              const pageW = page.clientWidth;
              const pageH = page.clientHeight;
              const contentW = content.scrollWidth;
              const contentH = content.scrollHeight;

              if (!contentW || !contentH) return;

              const scaleW = pageW / contentW;
              const scaleH = pageH / contentH;
              const scale = Math.min(scaleW, scaleH, 1);

              content.style.transformOrigin = 'top left';
              content.style.transform = 'scale(' + scale + ')';
              page.style.overflow = 'hidden';
            }

            window.onload = function() {
              fitToOnePage();
              setTimeout(function() {
                window.focus();
                window.print();
                setTimeout(function() { window.close(); }, 300);
              }, 200);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4" style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}>
      <div className="mb-4 flex items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-2">
          <span>Report Date:</span>
          <input
            type="date"
            value={reportDate}
            onChange={(event) => setReportDate(event.target.value || new Date().toISOString().slice(0, 10))}
            className="border border-black px-2 py-1"
          />
        </div>
        <div className="flex items-center justify-end gap-2 no-print">
          <button
            type="button"
            onClick={() => setShowEncodedEntries((prev) => !prev)}
            className="rounded border border-black px-3 py-1"
          >
            {showEncodedEntries ? "Hide Encoded Entries" : "Show Encoded Entries"}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded border border-black px-3 py-1"
          >
            Print Report
          </button>
        </div>
      </div>

      <div id="sales-report-print" className="report-root">
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
    </div>
  );
}
