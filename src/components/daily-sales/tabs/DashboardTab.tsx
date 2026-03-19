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
  downloadCsv,
  formatCurrency,
  paymentModes,
} from "@/components/daily-sales/shared";
import { listDailySalesEntries } from "@/services/dailySales.service";
import type { DailySalesRecord, PaymentMode } from "@/types/dailySales";

const fallbackRows: DailySalesRecord[] = [
  {
    id: "fallback-1",
    dailySalesId: "fallback-1",
    pofNumber: "POF-040325-001",
    ggTransNo: "HeadEagle01",
    date: "2025-04-03",
    memberName: "Airyne Dytes Obalag",
    zeroOne: "HeadEagle01",
    memberType: "DISTRIBUTOR",
    packageType: "SILVER",
    quantity: 1,
    bottles: 1,
    blisters: 0,
    sales: 3500,
    paymentMode: "CASH",
    paymentType: "",
    referenceNo: "",
    paymentModeTwo: "N/A",
    paymentTypeTwo: "",
    referenceNoTwo: "",
    salesTwo: 0,
    status: "Released",
    newMember: false,
    originalPrice: 3500,
    discount: 0,
    discountedPrice: 3500,
    releasedBottle: 1,
    releasedBlister: 0,
    balanceBottle: 0,
    balanceBlister: 0,
    isToBlister: false,
    remarks: "",
    receivedBy: "",
    collectedBy: "",
    savedAt: "",
    source: "local",
  },
  {
    id: "fallback-2",
    dailySalesId: "fallback-2",
    pofNumber: "POF-040425-002",
    ggTransNo: "HERA01",
    date: "2025-04-04",
    memberName: "Jane Cruz",
    zeroOne: "HERA01",
    memberType: "DISTRIBUTOR",
    packageType: "GOLD",
    quantity: 1,
    bottles: 3,
    blisters: 0,
    sales: 10500,
    paymentMode: "BANK",
    paymentType: "",
    referenceNo: "",
    paymentModeTwo: "N/A",
    paymentTypeTwo: "",
    referenceNoTwo: "",
    salesTwo: 0,
    status: "Released",
    newMember: false,
    originalPrice: 10500,
    discount: 0,
    discountedPrice: 10500,
    releasedBottle: 3,
    releasedBlister: 0,
    balanceBottle: 0,
    balanceBlister: 0,
    isToBlister: false,
    remarks: "",
    receivedBy: "",
    collectedBy: "",
    savedAt: "",
    source: "local",
  },
  {
    id: "fallback-3",
    dailySalesId: "fallback-3",
    pofNumber: "POF-040525-003",
    ggTransNo: "Romar01",
    date: "2025-04-05",
    memberName: "Mark Villanueva",
    zeroOne: "Romar01",
    memberType: "DISTRIBUTOR",
    packageType: "RETAIL",
    quantity: 2,
    bottles: 2,
    blisters: 0,
    sales: 7000,
    paymentMode: "EWALLET",
    paymentType: "",
    referenceNo: "",
    paymentModeTwo: "N/A",
    paymentTypeTwo: "",
    referenceNoTwo: "",
    salesTwo: 0,
    status: "To Follow",
    newMember: false,
    originalPrice: 7000,
    discount: 0,
    discountedPrice: 7000,
    releasedBottle: 1,
    releasedBlister: 0,
    balanceBottle: 1,
    balanceBlister: 0,
    isToBlister: false,
    remarks: "",
    receivedBy: "",
    collectedBy: "",
    savedAt: "",
    source: "local",
  },
  {
    id: "fallback-4",
    dailySalesId: "fallback-4",
    pofNumber: "POF-040625-004",
    ggTransNo: "Ironman",
    date: "2025-04-06",
    memberName: "Leah Santos",
    zeroOne: "Ironman",
    memberType: "DISTRIBUTOR",
    packageType: "BLISTER",
    quantity: 8,
    bottles: 0,
    blisters: 8,
    sales: 3200,
    paymentMode: "MAYA(ATC)",
    paymentType: "",
    referenceNo: "",
    paymentModeTwo: "N/A",
    paymentTypeTwo: "",
    referenceNoTwo: "",
    salesTwo: 0,
    status: "Released",
    newMember: false,
    originalPrice: 3200,
    discount: 0,
    discountedPrice: 3200,
    releasedBottle: 0,
    releasedBlister: 8,
    balanceBottle: 0,
    balanceBlister: 0,
    isToBlister: true,
    remarks: "",
    receivedBy: "",
    collectedBy: "",
    savedAt: "",
    source: "local",
  },
];

const fallbackSummary = {
  totalSales: 24200,
  totalOrders: 4,
  totalNewMembers: 0,
  totalBottles: 6,
  totalBlisters: 8,
};

function matchesSearch(values: Array<string | number>, search: string) {
  return values.join(" ").toLowerCase().includes(search);
}

export function DashboardTab({ refreshTick }: { refreshTick: number }) {
  const today = new Date().toISOString().slice(0, 10);
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
    const search = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      if (row.date < fromDate || row.date > toDate) {
        return false;
      }

      if (paymentMode !== "ALL" && row.paymentMode !== paymentMode) {
        return false;
      }

      if (!search) {
        return true;
      }

      return matchesSearch(
        [
          row.pofNumber,
          row.memberName,
          row.ggTransNo,
          row.paymentMode,
          row.packageType,
          row.sales,
          row.zeroOne,
        ],
        search,
      );
    });
  }, [fromDate, paymentMode, rows, searchQuery, toDate]);

  const hasRealRows = rows.length > 0;
  const displayRows = hasRealRows ? filteredRows : fallbackRows;

  const computedSummary = {
    totalSales: filteredRows.reduce((sum, row) => sum + row.sales, 0),
    totalOrders: filteredRows.length,
    totalNewMembers: filteredRows.filter((row) => row.newMember).length,
    totalBottles: filteredRows.reduce((sum, row) => sum + row.bottles, 0),
    totalBlisters: filteredRows.reduce((sum, row) => sum + row.blisters, 0),
  };

  const activeSummary = hasRealRows ? computedSummary : fallbackSummary;

  const summaryItems = [
    { label: "Total Sales", value: formatCurrency(activeSummary.totalSales) },
    { label: "Total Orders", value: activeSummary.totalOrders.toLocaleString() },
    { label: "New Members", value: activeSummary.totalNewMembers.toLocaleString() },
    {
      label: "Total Bottles Sold",
      value: activeSummary.totalBottles.toLocaleString(),
    },
    {
      label: "Total Blister Sold",
      value: activeSummary.totalBlisters.toLocaleString(),
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
              downloadCsv(
                "daily-sales-dashboard.csv",
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
                displayRows.map((row) => [
                  row.pofNumber,
                  row.date,
                  row.memberName,
                  row.zeroOne,
                  row.packageType,
                  row.bottles,
                  row.blisters,
                  row.sales,
                  row.paymentMode,
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
            {hasRealRows && filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="daily-sales-dashboard__empty">
                  No recent sales found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((row) => (
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
                  <TableCell>{row.paymentMode}</TableCell>
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
