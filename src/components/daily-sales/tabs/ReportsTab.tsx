import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DailySalesDialog } from "@/components/daily-sales/DailySalesDialog";
import { ModifyGgTransNoDialog } from "@/components/daily-sales/ModifyGgTransNoDialog";
import { PrintPreviewDialog } from "@/components/daily-sales/PrintPreviewDialog";
import "@/components/daily-sales/DailySalesReports.css";
import {
  calculateRange,
  downloadCsv,
  formatPaymentModes,
  formatPesoShort,
  getLocalDateIso,
  matchesSearch,
  type ReportRangeType,
} from "@/components/daily-sales/shared";
import { listDailySalesEntries, removeDailySalesRecord, updateDailySalesGgTransNo } from "@/services/dailySales.service";
import type { DailySalesRecord, PrintLineItem, PrintTransaction } from "@/types/dailySales";
import { Table } from "@/components/ui/table";

export function ReportsTab({
  refreshTick,
  onChanged,
}: {
  refreshTick: number;
  onChanged: () => void;
}) {
  const today = getLocalDateIso();
  const [rows, setRows] = useState<DailySalesRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<ReportRangeType>("daily");
  const [pendingStartDate, setPendingStartDate] = useState(today);
  const [pendingEndDate, setPendingEndDate] = useState(today);
  const [searchQuery, setSearchQuery] = useState("");
  const [reportType, setReportType] = useState<ReportRangeType>("daily");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedModifyRow, setSelectedModifyRow] = useState<DailySalesRecord | null>(null);
  const [isSavingGgTransNo, setIsSavingGgTransNo] = useState(false);
  const [printTransaction, setPrintTransaction] = useState<PrintTransaction | null>(null);
  const [printLineItems, setPrintLineItems] = useState<PrintLineItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadRows = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextRows = await listDailySalesEntries();
        if (isMounted) setRows(nextRows);
      } catch (error) {
        if (isMounted) {
          setRows([]);
          setErrorMessage(error instanceof Error ? error.message : "Failed to load sales report.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadRows();
    return () => {
      isMounted = false;
    };
  }, [refreshTick]);

  const activeRange = useMemo(
    () => calculateRange(reportType, startDate, endDate, today),
    [endDate, reportType, startDate, today],
  );

  const filteredRows = useMemo(() => {
    if (!hasGenerated) return [];

    return rows.filter((row) => {
      if (row.date < activeRange.from || row.date > activeRange.to) return false;

      return matchesSearch(
        [
          row.date,
          row.pofNumber,
          row.ggTransNo,
          row.memberName,
          formatPaymentModes(row.paymentMode, row.paymentModeTwo),
          row.sales,
          row.bottles,
          row.blisters,
        ],
        searchQuery,
      );
    });
  }, [activeRange.from, activeRange.to, hasGenerated, rows, searchQuery]);

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, row) => ({
          totalSales: acc.totalSales + row.sales,
          totalBottles: acc.totalBottles + row.bottles,
          totalBlisters: acc.totalBlisters + row.blisters,
        }),
        { totalSales: 0, totalBottles: 0, totalBlisters: 0 },
      ),
    [filteredRows],
  );

  const onReportTypeChange = (nextType: ReportRangeType) => {
    setPendingType(nextType);
  };

  const onGenerateReport = () => {
    if (!pendingStartDate || (pendingType === "custom" && !pendingEndDate)) {
      setWarningOpen(true);
      return;
    }

    const nextRange = calculateRange(pendingType, pendingStartDate, pendingEndDate, today);
    setReportType(pendingType);
    setStartDate(nextRange.from);
    setEndDate(nextRange.to);
    setHasGenerated(true);
  };

  const onSaveModifyGgTransNo = async (newValue: string) => {
    if (!selectedModifyRow || !newValue.trim()) return;

    setIsSavingGgTransNo(true);
    try {
      await updateDailySalesGgTransNo(selectedModifyRow.id, newValue.trim());
      setNotice(`GG Transaction Number updated for ${selectedModifyRow.pofNumber}.`);
      setSelectedModifyRow(null);
      onChanged();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to modify GG transaction number.");
    } finally {
      setIsSavingGgTransNo(false);
    }
  };

  const onRemoveRow = async (row: DailySalesRecord) => {
    try {
      await removeDailySalesRecord(row.id);
      setNotice(`Removed ${row.pofNumber}.`);
      onChanged();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to remove the row.");
    }
  };

  const onPrintRow = (row: DailySalesRecord) => {
    setPrintTransaction({
      date: row.date,
      pofNumber: row.pofNumber,
      customer: row.memberName || "N/A",
      ggTransNo: row.ggTransNo,
      modeOfPayment: formatPaymentModes(row.paymentMode, row.paymentModeTwo),
      encoder: row.zeroOne || row.ggTransNo || "N/A",
    });
    setPrintLineItems([
      {
        id: `line-${row.id}`,
        productPackage: row.packageType || "N/A",
        srp: row.originalPrice,
        discount: row.discount,
        discountedPrice: row.discountedPrice,
        quantity: row.quantity,
        amount: row.sales,
        releasedBottle: row.releasedBottle,
        releasedBlister: row.releasedBlister,
        balanceBottle: row.balanceBottle,
        balanceBlister: row.balanceBlister,
      },
    ]);
  };

  return (
    <>
      <section className="daily-sales-reports">
        <div className="daily-sales-reports__panel">
          <div className="daily-sales-reports__filters">
            <div className="daily-sales-reports__field">
              <label className="daily-sales-reports__label">Report Type</label>
              <select
                value={pendingType}
                onChange={(event) => onReportTypeChange(event.target.value as ReportRangeType)}
                className="daily-sales-reports__input"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            <div className="daily-sales-reports__field">
              <label className="daily-sales-reports__label">Start Date</label>
              <input
                type="date"
                value={pendingStartDate}
                onChange={(event) => setPendingStartDate(event.target.value)}
                className="daily-sales-reports__input"
              />
            </div>
            <div className="daily-sales-reports__field">
              <label className="daily-sales-reports__label">End Date</label>
              <input
                type="date"
                value={pendingEndDate}
                onChange={(event) => setPendingEndDate(event.target.value)}
                className="daily-sales-reports__input"
              />
            </div>
            <div className="daily-sales-reports__actions">
              <button
                type="button"
                className="daily-sales-reports__generate"
                onClick={onGenerateReport}
              >
                Generate Report
              </button>
            </div>
            <div className="daily-sales-reports__field daily-sales-reports__search">
              <label className="daily-sales-reports__label">Search</label>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search table..."
                className="daily-sales-reports__input"
              />
            </div>
          </div>
        </div>

        <div className="daily-sales-reports__table-panel">
          <div className="daily-sales-reports__table-toolbar">
            <button
              type="button"
              className="daily-sales-reports__export"
              onClick={() =>
                downloadCsv(
                  "daily-sales-reports.csv",
                  [
                    "Date",
                    "POF Number",
                    "GG Trans No.",
                    "Total Sales",
                    "Mode of Payment",
                    "Total Bottles",
                    "Total Blisters",
                  ],
                  filteredRows.map((row) => [
                    row.date,
                    row.pofNumber,
                    row.ggTransNo,
                    row.sales,
                    formatPaymentModes(row.paymentMode, row.paymentModeTwo),
                    row.bottles,
                    row.blisters,
                  ]),
                )
              }
            >
              Export CSV
            </button>
          </div>
          {isLoading ? (
            <p className="daily-sales-reports__message">Loading sales report...</p>
          ) : null}
          {errorMessage ? (
            <p className="daily-sales-reports__message daily-sales-reports__message--error">
              {errorMessage}
            </p>
          ) : null}
          <div className="daily-sales-reports__table-wrap">
            <Table className="daily-sales-reports__table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>POF Number</th>
                  <th>GG Trans No.</th>
                  <th>Total Sales</th>
                  <th>Mode of Payment</th>
                  <th>Total Bottles</th>
                  <th>Total Blisters</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="daily-sales-reports__empty">
                      {hasGenerated
                        ? "No report rows found for the selected filters."
                        : "Generate a report to load rows for the selected date range."}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.date}</td>
                      <td>{row.pofNumber}</td>
                      <td>{row.ggTransNo}</td>
                      <td>{formatPesoShort(row.sales)}</td>
                      <td>{formatPaymentModes(row.paymentMode, row.paymentModeTwo)}</td>
                      <td>{row.bottles}</td>
                      <td>{row.blisters}</td>
                      <td>
                        <div className="daily-sales-reports__row-actions">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedModifyRow(row)}
                          >
                            Trans No.
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => onPrintRow(row)}>
                            Print
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void onRemoveRow(row)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total:</td>
                  <td />
                  <td />
                  <td>{formatPesoShort(totals.totalSales)}</td>
                  <td />
                  <td>{totals.totalBottles}</td>
                  <td>{totals.totalBlisters}</td>
                  <td />
                </tr>
              </tfoot>
            </Table>
          </div>
        </div>
      </section>

      <DailySalesDialog isOpen={warningOpen} title="Warning!" onClose={() => setWarningOpen(false)}>
        Please input valid date.
      </DailySalesDialog>
      <DailySalesDialog isOpen={Boolean(notice)} title="Info" onClose={() => setNotice(null)}>
        {notice ?? ""}
      </DailySalesDialog>
      <ModifyGgTransNoDialog
        isOpen={Boolean(selectedModifyRow)}
        row={selectedModifyRow ? { id: selectedModifyRow.id, pofNumber: selectedModifyRow.pofNumber, ggTransNo: selectedModifyRow.ggTransNo } : null}
        onSave={onSaveModifyGgTransNo}
        onClose={() => setSelectedModifyRow(null)}
        isSaving={isSavingGgTransNo}
      />
      <PrintPreviewDialog isOpen={Boolean(printTransaction)} transaction={printTransaction} lineItems={printLineItems} onClose={() => setPrintTransaction(null)} />
    </>
  );
}

