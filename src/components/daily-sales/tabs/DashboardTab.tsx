import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  downloadExcel,
  formatPaymentModes,
  formatCurrency,
  getLocalDateIso,
  isDateWithinRange,
  matchesSearch,
  paymentModes,
} from "@/components/daily-sales/shared";
import { listDailySalesEntries } from "@/services/dailySales.service";
import type { DailySalesRecord, PaymentMode } from "@/types/dailySales";

export function DashboardTab({ refreshTick }: { refreshTick: number }) {
  const today = getLocalDateIso();
  const [rows, setRows] = useState<DailySalesRecord[]>([]);
  const [pendingFromDate, setPendingFromDate] = useState(today);
  const [pendingToDate, setPendingToDate] = useState(today);
  const [pendingPaymentMode, setPendingPaymentMode] = useState<PaymentMode>("ALL");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRows = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextRows = await listDailySalesEntries();
        if (isMounted) {
          setRows(nextRows);
        }
      } catch (error) {
        if (isMounted) {
          setRows([]);
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load daily sales.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadRows();

    return () => {
      isMounted = false;
    };
  }, [refreshTick]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (!isDateWithinRange(row.date, fromDate, toDate)) {
        return false;
      }

      if (
        paymentMode !== "ALL" &&
        row.paymentMode !== paymentMode &&
        row.paymentModeTwo !== paymentMode
      ) {
        return false;
      }

      return matchesSearch(
        [
          row.pofNumber,
          row.memberName,
          row.ggTransNo,
          formatPaymentModes(row.paymentMode, row.paymentModeTwo),
          row.packageType,
          row.sales,
          row.zeroOne,
        ],
        searchQuery,
      );
    });
  }, [fromDate, paymentMode, rows, searchQuery, toDate]);

  const summary = {
    totalSales: filteredRows.reduce((sum, row) => sum + row.sales, 0),
    totalOrders: filteredRows.length,
    totalNewMembers: filteredRows.filter((row) => row.newMember).length,
    totalBottles: filteredRows.reduce((sum, row) => sum + row.bottles, 0),
    totalBlisters: filteredRows.reduce((sum, row) => sum + row.blisters, 0),
  };

  const summaryItems = [
    { label: "Total Sales", value: formatCurrency(summary.totalSales) },
    { label: "Total Orders", value: summary.totalOrders.toLocaleString() },
    { label: "New Members", value: summary.totalNewMembers.toLocaleString() },
    {
      label: "Total Bottles Sold",
      value: summary.totalBottles.toLocaleString(),
    },
    {
      label: "Total Blister Sold",
      value: summary.totalBlisters.toLocaleString(),
    },
  ];

  return (
    <section className="daily-sales-dashboard">
      <div className="daily-sales-dashboard__card daily-sales-dashboard__filter-card">
        <div className="daily-sales-dashboard__filters">
          <div className="daily-sales-dashboard__filter">
            <label className="daily-sales-dashboard__label" htmlFor="dashboard-from-date">
              From
            </label>
            <input
              id="dashboard-from-date"
              type="date"
              value={pendingFromDate}
              onChange={(event) => setPendingFromDate(event.target.value)}
              className="daily-sales-dashboard__field"
            />
          </div>

          <div className="daily-sales-dashboard__filter">
            <label className="daily-sales-dashboard__label" htmlFor="dashboard-to-date">
              To
            </label>
            <input
              id="dashboard-to-date"
              type="date"
              value={pendingToDate}
              onChange={(event) => setPendingToDate(event.target.value)}
              className="daily-sales-dashboard__field"
            />
          </div>

          <div className="daily-sales-dashboard__filter">
            <label
              className="daily-sales-dashboard__label"
              htmlFor="dashboard-payment-mode"
            >
              Mode of Payment
            </label>
            <select
              id="dashboard-payment-mode"
              value={pendingPaymentMode}
              onChange={(event) =>
                setPendingPaymentMode(event.target.value as PaymentMode)
              }
              className="daily-sales-dashboard__field"
            >
              {paymentModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>

          <div className="daily-sales-dashboard__button-wrap">
            <Button
              variant="outline"
              className="daily-sales-dashboard__apply"
              onClick={() => {
                setFromDate(pendingFromDate);
                setToDate(pendingToDate);
                setPaymentMode(pendingPaymentMode);
              }}
            >
              Apply
            </Button>
          </div>

          <div className="daily-sales-dashboard__filter daily-sales-dashboard__search">
            <label className="daily-sales-dashboard__label" htmlFor="dashboard-search">
              Search
            </label>
            <input
              id="dashboard-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search recent sales..."
              className="daily-sales-dashboard__field"
            />
          </div>
        </div>
      </div>

      <div className="daily-sales-dashboard__summary-grid">
        {summaryItems.map((item) => (
          <div key={item.label} className="daily-sales-dashboard__summary-card">
            <p className="daily-sales-dashboard__summary-label">{item.label}</p>
            <p className="daily-sales-dashboard__summary-value">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="daily-sales-dashboard__card daily-sales-dashboard__table-card">
        <div className="daily-sales-dashboard__table-header">
          <h2 className="daily-sales-dashboard__title">Recent Sales</h2>
          <Button
            size="sm"
            className="daily-sales-dashboard__export"
            onClick={() =>
              void downloadExcel(
                "daily-sales-dashboard.xlsx",
                "Dashboard",
                [
                  "POF Number",
                  "Date",
                  "Member Name",
                  "Zero One",
                  "Package",
                  "Bottles",
                  "Blisters",
                  "Sales",
                  "Mode of Payment",
                  "Status",
                ],
                filteredRows.map((row) => [
                  row.pofNumber,
                  row.date,
                  row.memberName,
                  row.zeroOne,
                  row.packageType,
                  row.bottles,
                  row.blisters,
                  row.sales,
                  formatPaymentModes(row.paymentMode, row.paymentModeTwo),
                  row.status,
                ]),
              )
            }
          >
            Excel
          </Button>
        </div>

        {isLoading ? (
          <p className="daily-sales-dashboard__message">Loading daily sales...</p>
        ) : null}
        {errorMessage ? (
          <p className="daily-sales-dashboard__message daily-sales-dashboard__message--error">
            {errorMessage}
          </p>
        ) : null}

        <Table className="daily-sales-dashboard__table">
          <TableHeader>
            <TableRow>
              <TableHead>POF NUMBER</TableHead>
              <TableHead>DATE</TableHead>
              <TableHead>MEMBER NAME</TableHead>
              <TableHead>ZERO ONE</TableHead>
              <TableHead>PACKAGE</TableHead>
              <TableHead>BOTTLES</TableHead>
              <TableHead>BLISTERS</TableHead>
              <TableHead>SALES</TableHead>
              <TableHead>MODE OF PAYMENT</TableHead>
              <TableHead>STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="daily-sales-dashboard__empty">
                  {rows.length === 0 && !isLoading
                    ? "No recent sales are available yet."
                    : "No recent sales found for the selected filters."}
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="daily-sales-dashboard__cell-primary">
                    {row.pofNumber}
                  </TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.memberName}</TableCell>
                  <TableCell>{row.zeroOne}</TableCell>
                  <TableCell>{row.packageType}</TableCell>
                  <TableCell>{row.bottles}</TableCell>
                  <TableCell>{row.blisters}</TableCell>
                  <TableCell className="daily-sales-dashboard__cell-sales">
                    {formatCurrency(row.sales)}
                  </TableCell>
                  <TableCell>{formatPaymentModes(row.paymentMode, row.paymentModeTwo)}</TableCell>
                  <TableCell>
                    <span className="daily-sales-dashboard__status">{row.status}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
