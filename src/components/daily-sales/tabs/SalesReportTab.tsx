import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DailySalesDialog } from "@/components/daily-sales/DailySalesDialog";
import { SectionPrintPreviewDialog } from "@/components/daily-sales/SectionPrintPreviewDialog";
import "@/components/daily-sales/DailySalesSalesReport.css";
import {
  AmountRow,
  cashDenominations,
  defaultCashPieces,
  formatCurrency,
  formatDateDMYY,
  paymentTypeTableIds,
  type PackageRow,
} from "@/components/daily-sales/shared";
import { getPrintableHtmlById } from "@/lib/printElement";
import {
  getDailySalesNetPrice,
  getDailySalesPackagePrice,
  normalizeDailySalesPackageType,
} from "@/lib/dailySalesPackages";
import {
  getCashOnHandTotal,
  listDailySalesEntries,
  loadCashOnHand,
  persistCashOnHandLocally,
} from "@/services/dailySales.service";
import type { CashFieldId, CashOnHandPieces, DailySalesRecord } from "@/types/dailySales";

function buildPackageBreakdown(
  rows: DailySalesRecord[],
  memberType: "ALL" | "STOCKIST" | "CENTER",
): PackageRow[] {
  const scoped = rows.filter((row) => {
    const normalizedMember = row.memberType.trim().toUpperCase();
    if (memberType === "ALL") return true;
    return normalizedMember === memberType;
  });

  return [
    {
      label: "Platinum",
      qty: scoped
        .filter((row) => (normalizeDailySalesPackageType(row.packageType) ?? "") === "PLATINUM")
        .reduce((sum, row) => sum + row.quantity, 0),
      price:
        memberType === "STOCKIST"
          ? getDailySalesNetPrice("STOCKIST", "PLATINUM")
          : memberType === "CENTER"
            ? getDailySalesNetPrice("CENTER", "PLATINUM")
            : getDailySalesPackagePrice("PLATINUM"),
    },
    {
      label: "Gold",
      qty: scoped
        .filter((row) => (normalizeDailySalesPackageType(row.packageType) ?? "") === "GOLD")
        .reduce((sum, row) => sum + row.quantity, 0),
      price:
        memberType === "STOCKIST"
          ? getDailySalesNetPrice("STOCKIST", "GOLD")
          : memberType === "CENTER"
            ? getDailySalesNetPrice("CENTER", "GOLD")
            : getDailySalesPackagePrice("GOLD"),
    },
    {
      label: "Silver",
      qty: scoped
        .filter((row) => (normalizeDailySalesPackageType(row.packageType) ?? "") === "SILVER")
        .reduce((sum, row) => sum + row.quantity, 0),
      price:
        memberType === "STOCKIST"
          ? getDailySalesNetPrice("STOCKIST", "SILVER")
          : memberType === "CENTER"
            ? getDailySalesNetPrice("CENTER", "SILVER")
            : getDailySalesPackagePrice("SILVER"),
    },
  ];
}

function buildRetailBreakdown(rows: DailySalesRecord[]): PackageRow[] {
  return [
    {
      label: "SynBIOTIC+ (Bottle)",
      qty: rows
        .filter((row) => (normalizeDailySalesPackageType(row.packageType) ?? "") === "RETAIL")
        .reduce((sum, row) => sum + row.bottles, 0),
      price: 2280,
    },
    {
      label: "SynBIOTIC+ (Blister)",
      qty: rows
        .filter((row) => (normalizeDailySalesPackageType(row.packageType) ?? "") === "BLISTER")
        .reduce((sum, row) => sum + row.blisters, 0),
      price: 1299,
    },
    {
      label: "Employees Discount",
      qty: 0,
      price: 1200,
    },
  ];
}

function buildPaymentBreakdown(rows: DailySalesRecord[], cashTotal: number): AmountRow[] {
  const sums = new Map<string, number>();

  for (const row of rows) {
    sums.set(row.paymentMode, (sums.get(row.paymentMode) ?? 0) + (row.sales - row.salesTwo));
    if (row.paymentModeTwo !== "N/A" && row.salesTwo > 0) {
      sums.set(row.paymentModeTwo, (sums.get(row.paymentModeTwo) ?? 0) + row.salesTwo);
    }
  }

  return [
    { label: "Cash on hand", amount: cashTotal },
    { label: "E-Wallet", amount: sums.get("EWALLET") ?? 0 },
    { label: "Bank Transfer - Security Bank", amount: sums.get("BANK") ?? 0 },
    { label: "Maya (IGI)", amount: sums.get("MAYA(IGI)") ?? 0 },
    { label: "Maya (ATC)", amount: sums.get("MAYA(ATC)") ?? 0 },
    { label: "SB Collect (IGI)", amount: sums.get("SBCOLLECT(IGI)") ?? 0 },
    { label: "SB Collect (ATC)", amount: sums.get("SBCOLLECT(ATC)") ?? 0 },
    { label: "Accounts Receivable - CSA", amount: sums.get("AR(CSA)") ?? 0 },
    { label: "Accounts Receivable - Leaders Support", amount: sums.get("AR(LEADERSUPPORT)") ?? 0 },
    { label: "Cheque", amount: sums.get("CHEQUE") ?? 0 },
    { label: "E-Points", amount: sums.get("EPOINTS") ?? 0 },
  ];
}

function buildPaymentTypeRows(rows: DailySalesRecord[]) {
  const sums = new Map<string, number>();

  for (const row of rows) {
    sums.set(row.paymentMode, (sums.get(row.paymentMode) ?? 0) + (row.sales - row.salesTwo));
    if (row.paymentModeTwo !== "N/A" && row.salesTwo > 0) {
      sums.set(row.paymentModeTwo, (sums.get(row.paymentModeTwo) ?? 0) + row.salesTwo);
    }
  }

  return paymentTypeTableIds.map((table) => {
    let amount = 0;
    if (table.title === "Ewallet") amount = sums.get("EWALLET") ?? 0;
    if (table.title === "Bank") amount = sums.get("BANK") ?? 0;
    if (table.title === "Maya(IGI)") amount = sums.get("MAYA(IGI)") ?? 0;
    if (table.title === "Maya(ATC)") amount = sums.get("MAYA(ATC)") ?? 0;
    if (table.title === "SbCollect(IGI)") amount = sums.get("SBCOLLECT(IGI)") ?? 0;
    if (table.title === "SbCollect(ATC)") amount = sums.get("SBCOLLECT(ATC)") ?? 0;
    if (table.title === "AR(CSA)") amount = sums.get("AR(CSA)") ?? 0;
    if (table.title === "AR Leader Support") amount = sums.get("AR(LEADERSUPPORT)") ?? 0;
    if (table.title === "Cheque") amount = sums.get("CHEQUE") ?? 0;
    if (table.title === "Epoints") amount = sums.get("EPOINTS") ?? 0;
    return { ...table, rows: [{ label: table.label, amount }] };
  });
}

function getPackageTotal(rows: PackageRow[]) {
  return rows.reduce((sum, row) => sum + row.qty * row.price, 0);
}

function ReportBox({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="daily-sales-sales-report__box">
      <div className="daily-sales-sales-report__box-title">{title}</div>
      {children}
    </section>
  );
}

function PackageTable({
  id,
  title,
  rows,
  totalLabel,
  includeGrandTotal = false,
}: {
  id: string;
  title: string;
  rows: PackageRow[];
  totalLabel: string;
  includeGrandTotal?: boolean;
}) {
  const total = getPackageTotal(rows);

  return (
    <ReportBox title={title}>
      <table id={id} className="daily-sales-sales-report__table">
        <thead>
          <tr>
            <th>Package</th>
            <th className="daily-sales-sales-report__center">Qty</th>
            <th className="daily-sales-sales-report__numeric">Price</th>
            <th className="daily-sales-sales-report__numeric">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${id}-${row.label}`}>
              <td>{row.label}</td>
              <td className="daily-sales-sales-report__center">{row.qty}</td>
              <td className="daily-sales-sales-report__numeric">{formatCurrency(row.price)}</td>
              <td className="daily-sales-sales-report__numeric">
                {formatCurrency(row.qty * row.price)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>{totalLabel}</td>
            <td className="daily-sales-sales-report__numeric">{formatCurrency(total)}</td>
          </tr>
          {includeGrandTotal ? (
            <tr>
              <td colSpan={3}>Grand Total</td>
              <td className="daily-sales-sales-report__numeric">{formatCurrency(total)}</td>
            </tr>
          ) : null}
        </tfoot>
      </table>
    </ReportBox>
  );
}

function AmountTable({
  id,
  title,
  rows,
  totalLabel = "Total",
}: {
  id: string;
  title: string;
  rows: AmountRow[];
  totalLabel?: string;
}) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <ReportBox title={title}>
      <table id={id} className="daily-sales-sales-report__table">
        <thead>
          <tr>
            <th>Description</th>
            <th className="daily-sales-sales-report__numeric">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${id}-${row.label}`}>
              <td>{row.label}</td>
              <td className="daily-sales-sales-report__numeric">{formatCurrency(row.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>{totalLabel}</td>
            <td className="daily-sales-sales-report__numeric">{formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>
    </ReportBox>
  );
}

function TripleCountCard({
  id,
  title,
  values,
}: {
  id: string;
  title: string;
  values: { silver: number; gold: number; platinum: number };
}) {
  return (
    <section id={id} className="daily-sales-sales-report__mini-card">
      <div className="daily-sales-sales-report__mini-card-title">{title}</div>
      <div className="daily-sales-sales-report__mini-card-body">
        <table className="daily-sales-sales-report__three-col">
          <thead>
            <tr>
              <th>Silver</th>
              <th>Gold</th>
              <th>Platinum</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{values.silver}</td>
              <td>{values.gold}</td>
              <td>{values.platinum}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PaymentChannelCard({
  id,
  title,
  amount,
}: {
  id: string;
  title: string;
  amount: number;
}) {
  return (
    <section id={id} className="daily-sales-sales-report__mini-card">
      <div className="daily-sales-sales-report__mini-card-title">{title}</div>
      <div className="daily-sales-sales-report__mini-card-body">
        <div className="daily-sales-sales-report__mini-value">
          <span>Amount</span>
          <strong>{formatCurrency(amount)}</strong>
        </div>
      </div>
    </section>
  );
}

export function SalesReportTab({ refreshTick }: { refreshTick: number }) {
  const today = new Date().toISOString().slice(0, 10);
  const [allRows, setAllRows] = useState<DailySalesRecord[]>([]);
  const [selectedRows, setSelectedRows] = useState<DailySalesRecord[]>([]);
  const [transDateDailySales, setTransDateDailySales] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [cashPieces, setCashPieces] = useState<CashOnHandPieces>(defaultCashPieces);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState("");

  useEffect(() => {
    let isMounted = true;
    const loadRows = async () => {
      try {
        const nextRows = await listDailySalesEntries();
        if (isMounted) setAllRows(nextRows);
      } catch {
        if (isMounted) setAllRows([]);
      }
    };

    void loadRows();
    return () => {
      isMounted = false;
    };
  }, [refreshTick]);

  const packageRows = useMemo(() => buildPackageBreakdown(selectedRows, "ALL"), [selectedRows]);
  const msPackageRows = useMemo(
    () => buildPackageBreakdown(selectedRows, "STOCKIST"),
    [selectedRows],
  );
  const cdPackageRows = useMemo(
    () => buildPackageBreakdown(selectedRows, "CENTER"),
    [selectedRows],
  );
  const retailRows = useMemo(() => buildRetailBreakdown(selectedRows), [selectedRows]);
  const totalCashOnHand = useMemo(() => getCashOnHandTotal(cashPieces), [cashPieces]);
  const paymentBreakdownRows = useMemo(
    () => buildPaymentBreakdown(selectedRows, totalCashOnHand),
    [selectedRows, totalCashOnHand],
  );
  const paymentTypeRows = useMemo(() => buildPaymentTypeRows(selectedRows), [selectedRows]);
  const newAccounts = useMemo(
    () => ({
      silver: selectedRows.filter(
        (row) =>
          row.newMember && (normalizeDailySalesPackageType(row.packageType) ?? "") === "SILVER",
      ).length,
      gold: selectedRows.filter(
        (row) => row.newMember && (normalizeDailySalesPackageType(row.packageType) ?? "") === "GOLD",
      ).length,
      platinum: selectedRows.filter(
        (row) =>
          row.newMember && (normalizeDailySalesPackageType(row.packageType) ?? "") === "PLATINUM",
      ).length,
    }),
    [selectedRows],
  );
  const grossSales = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.sales, 0),
    [selectedRows],
  );
  const totalBottles = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.bottles, 0),
    [selectedRows],
  );
  const totalBlisters = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.blisters, 0),
    [selectedRows],
  );
  const totalNewAccounts = useMemo(
    () => newAccounts.silver + newAccounts.gold + newAccounts.platinum,
    [newAccounts],
  );

  const onGenerateDailySales = async () => {
    if (!transDateDailySales) {
      setIsWarningOpen(true);
      return;
    }

    setSelectedDate(transDateDailySales);
    setErrorMessage("");
    setIsLoading(true);
    setHasGenerated(true);

    try {
      const rows = allRows.filter((row) => row.date === transDateDailySales);
      const cashResponse = await loadCashOnHand(transDateDailySales);
      setSelectedRows(rows);
      setCashPieces(cashResponse.pieces);
    } catch (error) {
      setSelectedRows([]);
      setCashPieces(defaultCashPieces);
      setErrorMessage(error instanceof Error ? error.message : "Backend error... showing fallback");
    } finally {
      setIsLoading(false);
    }
  };

  const onCashPieceChange = (fieldId: CashFieldId, value: string) => {
    const parsed = Number(value);
    const next = {
      ...cashPieces,
      [fieldId]: Number.isFinite(parsed) ? Math.max(parsed, 0) : 0,
    };
    setCashPieces(next);
    persistCashOnHandLocally(selectedDate, next);
  };

  const onPrint = () => {
    const html = getPrintableHtmlById("cntnrDailySales");
    if (!html) return;
    setPrintPreviewHtml(html);
    setIsPrintPreviewOpen(true);
  };

  return (
    <>
      <section className="daily-sales-sales-report">
        <div className="daily-sales-sales-report__controls">
          <div className="daily-sales-sales-report__toolbar">
            <div className="daily-sales-sales-report__field">
              <label className="daily-sales-sales-report__label">Date</label>
              <input
                type="date"
                value={transDateDailySales}
                onChange={(event) => setTransDateDailySales(event.target.value)}
                className="daily-sales-sales-report__input"
              />
            </div>
            <div className="daily-sales-sales-report__toolbar-action daily-sales-sales-report__toolbar-action--center">
              <button
                type="button"
                className="daily-sales-sales-report__button"
                onClick={() => void onGenerateDailySales()}
                disabled={isLoading}
              >
                {isLoading ? "Generating..." : "Generate Report"}
              </button>
            </div>
            <div className="daily-sales-sales-report__toolbar-action daily-sales-sales-report__toolbar-action--right">
              <button
                type="button"
                className="daily-sales-sales-report__button daily-sales-sales-report__button--primary"
                onClick={onPrint}
              >
                Print
              </button>
            </div>
            <div className="daily-sales-sales-report__date-display">{formatDateDMYY(selectedDate)}</div>
          </div>
        </div>

        <div className="daily-sales-sales-report__sheet">
          <div id="cntnrDailySales" className="daily-sales-sales-report__print-shell">
            <div className="daily-sales-sales-report__report-header">
              <h2>Innovation Grand International</h2>
              <p>Daily Sales Report</p>
              <p>{formatDateDMYY(selectedDate)}</p>
            </div>

            {errorMessage ? (
              <p className="daily-sales-sales-report__message">{errorMessage}</p>
            ) : null}
            {!isLoading && hasGenerated && selectedRows.length === 0 ? (
              <p className="daily-sales-sales-report__message daily-sales-sales-report__message--muted">
                No sales entries for selected date.
              </p>
            ) : null}

            <div className="daily-sales-sales-report__main-grid">
              <div className="daily-sales-sales-report__column">
                <PackageTable
                  id="tblPackage"
                  title="Package Sales"
                  rows={packageRows}
                  totalLabel="Total Package Sales"
                />
                <PackageTable
                  id="tblMsPackage"
                  title="Mobile Stockist Package Sales"
                  rows={msPackageRows}
                  totalLabel="Total Mobile Stockist Sales"
                />
                <PackageTable
                  id="tblCdPackage"
                  title="Depot Package Sales"
                  rows={cdPackageRows}
                  totalLabel="Total Depot Package Sales"
                />
                <PackageTable
                  id="tblRetail"
                  title="Retail Sales"
                  rows={retailRows}
                  totalLabel="Total Retail Sales"
                  includeGrandTotal
                />
              </div>

              <div className="daily-sales-sales-report__column">
                <ReportBox title="Cash Breakdown">
                  <table id="tblCashOnHand" className="daily-sales-sales-report__table">
                    <thead>
                      <tr>
                        <th>Denomination</th>
                        <th className="daily-sales-sales-report__center">Pieces</th>
                        <th className="daily-sales-sales-report__numeric">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashDenominations.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.label}</td>
                          <td className="daily-sales-sales-report__center">
                            <input
                              type="number"
                              min="0"
                              value={cashPieces[entry.id]}
                              onChange={(event) => onCashPieceChange(entry.id, event.target.value)}
                              className="daily-sales-sales-report__cash-input"
                            />
                          </td>
                          <td className="daily-sales-sales-report__numeric">
                            {formatCurrency(cashPieces[entry.id] * entry.multiplier)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2}>Total Cash on Hand</td>
                        <td className="daily-sales-sales-report__numeric">
                          {formatCurrency(totalCashOnHand)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </ReportBox>

                <AmountTable
                  id="tblPaymentBreakdown"
                  title="Payment Breakdown"
                  rows={paymentBreakdownRows}
                />

                <ReportBox title="Summary">
                  <div className="daily-sales-sales-report__summary">
                    <div className="daily-sales-sales-report__summary-row">
                      <span>Total Transactions</span>
                      <strong>{selectedRows.length}</strong>
                    </div>
                    <div className="daily-sales-sales-report__summary-row">
                      <span>Total Bottles Sold</span>
                      <strong>{totalBottles}</strong>
                    </div>
                    <div className="daily-sales-sales-report__summary-row">
                      <span>Total Blisters Sold</span>
                      <strong>{totalBlisters}</strong>
                    </div>
                    <div className="daily-sales-sales-report__summary-row">
                      <span>New Accounts</span>
                      <strong>{totalNewAccounts}</strong>
                    </div>
                    <div className="daily-sales-sales-report__summary-row">
                      <span>Cash on Hand</span>
                      <strong>{formatCurrency(totalCashOnHand)}</strong>
                    </div>
                    <div className="daily-sales-sales-report__summary-row daily-sales-sales-report__summary-row--grand">
                      <span>Grand Total</span>
                      <strong>{formatCurrency(grossSales)}</strong>
                    </div>
                  </div>
                </ReportBox>
              </div>
            </div>

            <div className="daily-sales-sales-report__mini-grid">
              <TripleCountCard
                id="tblNewAccounts"
                title="New Accounts"
                values={newAccounts}
              />
              <TripleCountCard
                id="tblUpgrades"
                title="Upgrades"
                values={{ silver: 0, gold: 0, platinum: 0 }}
              />
              {paymentTypeRows.map((table) => (
                <PaymentChannelCard
                  key={table.id}
                  id={table.id}
                  title={table.title}
                  amount={table.rows[0]?.amount ?? 0}
                />
              ))}
            </div>

            <div className="daily-sales-sales-report__footer">
              <div className="daily-sales-sales-report__footer-block">
                <span>Prepared by</span>
                <strong>Alaiza Jane Emoylan</strong>
              </div>
              <div className="daily-sales-sales-report__footer-block">
                <span>Checked by</span>
                <strong>Erica Villaester</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DailySalesDialog
        isOpen={isWarningOpen}
        title="Warning!"
        onClose={() => setIsWarningOpen(false)}
      >
        Please input valid date.
      </DailySalesDialog>
      <SectionPrintPreviewDialog
        isOpen={isPrintPreviewOpen}
        title="Print Preview"
        html={printPreviewHtml}
        onClose={() => setIsPrintPreviewOpen(false)}
      />
    </>
  );
}
