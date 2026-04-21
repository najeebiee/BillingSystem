import { useEffect, useMemo, useState } from "react";
import { DailySalesDialog } from "@/components/daily-sales/DailySalesDialog";
import { SectionPrintPreviewDialog } from "@/components/daily-sales/SectionPrintPreviewDialog";
import "@/components/daily-sales/DailySalesInventoryReport.css";
import {
  formatCurrency,
  formatDateSlash,
  getLocalDateIso,
  matchesSearch,
  type InventoryAggregateRow,
} from "@/components/daily-sales/shared";
import { getPrintableHtmlById } from "@/lib/printElement";
import { loadInventoryReportRows } from "@/services/dailySalesReporting.service";

export function InventoryReportTab({ refreshTick }: { refreshTick: number }) {
  const today = getLocalDateIso();
  const [pendingFromDate, setPendingFromDate] = useState(today);
  const [pendingToDate, setPendingToDate] = useState(today);
  const [searchQuery, setSearchQuery] = useState("");
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reportRows, setReportRows] = useState<InventoryAggregateRow[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [appliedFromDate, setAppliedFromDate] = useState(today);
  const [appliedToDate, setAppliedToDate] = useState(today);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState("");
  const [displayDateRange, setDisplayDateRange] = useState(
    `${formatDateSlash(today)} To ${formatDateSlash(today)}`,
  );

  const generateReport = async (fromDate: string, toDate: string) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const nextRows = await loadInventoryReportRows(fromDate, toDate);
      setReportRows(nextRows);
      setAppliedFromDate(fromDate);
      setAppliedToDate(toDate);
      setDisplayDateRange(`${formatDateSlash(fromDate)} To ${formatDateSlash(toDate)}`);
      setHasGenerated(true);
    } catch (error) {
      setReportRows([]);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load inventory report.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasGenerated) {
      return;
    }

    void generateReport(appliedFromDate, appliedToDate);
  }, [appliedFromDate, appliedToDate, hasGenerated, refreshTick]);

  const filteredReportRows = useMemo(() => {
    return reportRows.filter((row) =>
      matchesSearch(
        [
          row.name,
          row.ggTransNo,
          row.pofNumber,
          row.modeOfPayment,
          row.numberOfBottles,
          row.numberOfBlisters,
          row.amount,
        ],
        searchQuery,
      ),
    );
  }, [reportRows, searchQuery]);

  const onGenerate = () => {
    if (!pendingFromDate || !pendingToDate) {
      setIsWarningOpen(true);
      return;
    }

    void generateReport(pendingFromDate, pendingToDate);
  };

  const onPrint = () => {
    const html = getPrintableHtmlById("cntnrDailyInventory");
    if (!html) return;
    setPrintPreviewHtml(html);
    setIsPrintPreviewOpen(true);
  };

  return (
    <>
      <section className="daily-sales-inventory-report">
        <div className="daily-sales-inventory-report__card daily-sales-inventory-report__toolbar-card">
          <div className="daily-sales-inventory-report__toolbar">
            <div className="daily-sales-inventory-report__field">
              <label className="daily-sales-inventory-report__label">FROM</label>
              <input
                type="date"
                value={pendingFromDate}
                onChange={(event) => setPendingFromDate(event.target.value)}
                className="daily-sales-inventory-report__input"
              />
            </div>
            <div className="daily-sales-inventory-report__field">
              <label className="daily-sales-inventory-report__label">TO</label>
              <input
                type="date"
                value={pendingToDate}
                onChange={(event) => setPendingToDate(event.target.value)}
                className="daily-sales-inventory-report__input"
              />
            </div>
            <div className="daily-sales-inventory-report__action">
              <button
                type="button"
                className="daily-sales-inventory-report__button"
                onClick={onGenerate}
                disabled={isLoading}
              >
                {isLoading ? "Generating..." : "Generate Report"}
              </button>
            </div>
            <div className="daily-sales-inventory-report__field daily-sales-inventory-report__search">
              <label className="daily-sales-inventory-report__label">SEARCH</label>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search table..."
                className="daily-sales-inventory-report__input"
              />
            </div>
          </div>
        </div>

        <div
          id="cntnrDailyInventory"
          className="daily-sales-inventory-report__card daily-sales-inventory-report__result-card"
        >
          <div className="daily-sales-inventory-report__header">
            <div className="daily-sales-inventory-report__range">{displayDateRange}</div>
            <button
              type="button"
              className="daily-sales-inventory-report__print"
              onClick={onPrint}
            >
              Print
            </button>
          </div>
          {errorMessage ? (
            <p className="daily-sales-inventory-report__message">{errorMessage}</p>
          ) : null}
          <div className="daily-sales-inventory-report__table-wrap">
            <table className="daily-sales-inventory-report__table">
              <thead>
                <tr>
                  <th rowSpan={2}>Name</th>
                  <th rowSpan={2}>GG Trans No.</th>
                  <th rowSpan={2}>POF Number</th>
                  <th colSpan={3} data-align="center">
                    Package Type
                  </th>
                  <th colSpan={4} data-align="center">
                    Retail
                  </th>
                  <th rowSpan={2}>Number of Bottles</th>
                  <th rowSpan={2}>Number of Blisters</th>
                  <th rowSpan={2}>Released (Bottle)</th>
                  <th rowSpan={2}>Released (Blister)</th>
                  <th rowSpan={2}>To Follow (Bottle)</th>
                  <th rowSpan={2}>To Follow (Blister)</th>
                  <th rowSpan={2}>Amount</th>
                  <th rowSpan={2}>Mode of Payment</th>
                </tr>
                <tr>
                  <th>Platinum</th>
                  <th>Gold</th>
                  <th>Silver</th>
                  <th>Synbiotic+ (Bottle)</th>
                  <th>Synbiotic+ (Blister)</th>
                  <th>Voucher</th>
                  <th>Employee Discount</th>
                </tr>
              </thead>
              <tbody>
                {filteredReportRows.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="daily-sales-inventory-report__empty">
                      {hasGenerated
                        ? "No inventory results for selected range"
                        : "Generate a report to load inventory rows for the selected date range."}
                    </td>
                  </tr>
                ) : (
                  filteredReportRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.ggTransNo}</td>
                      <td>{row.pofNumber}</td>
                      <td>{row.platinum}</td>
                      <td>{row.gold}</td>
                      <td>{row.silver}</td>
                      <td>{row.synbioticBottle}</td>
                      <td>{row.synbioticBlister}</td>
                      <td>{row.voucher}</td>
                      <td>{row.employeeDiscount}</td>
                      <td>{row.numberOfBottles}</td>
                      <td>{row.numberOfBlisters}</td>
                      <td>{row.releasedBottle}</td>
                      <td>{row.releasedBlister}</td>
                      <td>{row.toFollowBottle}</td>
                      <td>{row.toFollowBlister}</td>
                      <td>{formatCurrency(row.amount)}</td>
                      <td>{row.modeOfPayment}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <DailySalesDialog isOpen={isWarningOpen} title="Warning!" onClose={() => setIsWarningOpen(false)}>
        Please input valid date.
      </DailySalesDialog>
      <SectionPrintPreviewDialog isOpen={isPrintPreviewOpen} title="Print Preview" html={printPreviewHtml} onClose={() => setIsPrintPreviewOpen(false)} />
    </>
  );
}

