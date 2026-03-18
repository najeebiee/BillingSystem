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

const filterLabelClassName =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const filterFieldClassName =
  "h-11 w-full rounded-xl border border-[#d8e0ec] bg-white px-4 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.02)] outline-none transition focus:border-[#9aa8bf] focus:ring-4 focus:ring-[#dfe9ff] placeholder:text-slate-400";
const dashboardCardClassName =
  "rounded-[22px] border border-[#e4e9f2] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]";
const summaryCardClassName =
  "rounded-[20px] border border-[#e4e9f2] bg-white px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]";

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
    <section className="w-full space-y-6">
      <div className={`${dashboardCardClassName} w-full px-5 py-5 sm:px-6 sm:py-6`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
          <div className="flex flex-col gap-2">
            <label className={filterLabelClassName} htmlFor="dashboard-from-date">
              From
            </label>
            <input
              id="dashboard-from-date"
              type="date"
              value={pendingFromDate}
              onChange={(event) => setPendingFromDate(event.target.value)}
              className={filterFieldClassName}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={filterLabelClassName} htmlFor="dashboard-to-date">
              To
            </label>
            <input
              id="dashboard-to-date"
              type="date"
              value={pendingToDate}
              onChange={(event) => setPendingToDate(event.target.value)}
              className={filterFieldClassName}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={filterLabelClassName} htmlFor="dashboard-payment-mode">
              Mode of Payment
            </label>
            <select
              id="dashboard-payment-mode"
              value={pendingPaymentMode}
              onChange={(event) =>
                setPendingPaymentMode(event.target.value as PaymentMode)
              }
              className={filterFieldClassName}
            >
              {paymentModes.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end gap-2">
            <span className="sr-only">Apply filters</span>
            <Button
              variant="outline"
              className="h-11 rounded-xl border-[#d8e0ec] bg-[#f8fafc] px-5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
              onClick={() => {
                setFromDate(pendingFromDate);
                setToDate(pendingToDate);
                setPaymentMode(pendingPaymentMode);
              }}
            >
              Apply
            </Button>
          </div>

          <div className="flex w-full flex-col gap-2">
            <label className={filterLabelClassName} htmlFor="dashboard-search">
              Search
            </label>
            <input
              id="dashboard-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search recent sales..."
              className={filterFieldClassName}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryItems.map((item) => (
          <div key={item.label} className={summaryCardClassName}>
            <p className="text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-3 text-[1.75rem] font-semibold leading-none text-[#0f1b3d]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className={`${dashboardCardClassName} w-full overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[#eef2f7] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h2 className="text-lg font-semibold text-[#0f1b3d]">Recent Sales</h2>
          <Button
            size="sm"
            className="h-9 rounded-xl bg-[#0f1b3d] px-4 text-xs font-semibold tracking-[0.08em] text-white shadow-[0_10px_24px_rgba(15,27,61,0.18)] hover:bg-[#162958] sm:self-start"
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
          <p className="px-5 pt-4 text-sm text-slate-500 sm:px-6">
            Loading daily sales...
          </p>
        ) : null}
        {errorMessage ? (
          <p className="px-5 pt-4 text-sm text-amber-600 sm:px-6">{errorMessage}</p>
        ) : null}

        <Table className="min-w-[1120px] text-sm">
          <TableHeader className="bg-[#fbfcfe]">
            <TableRow className="border-b border-[#e8edf5] hover:bg-[#fbfcfe]">
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:px-6">
                POF NUMBER
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                DATE
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                MEMBER NAME
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                ZERO ONE
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                PACKAGE
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                BOTTLES
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                BLISTERS
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                SALES
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                MODE OF PAYMENT
              </TableHead>
              <TableHead className="h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:px-6">
                STATUS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasRealRows && filteredRows.length === 0 ? (
              <TableRow className="hover:bg-white">
                <TableCell
                  colSpan={10}
                  className="px-5 py-12 text-center text-sm text-slate-500"
                >
                  No recent sales found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-[#edf2f7] bg-white hover:bg-[#f8fafc]"
                >
                  <TableCell className="px-4 py-4 text-[13px] font-medium text-slate-900 sm:px-6">
                    {row.pofNumber}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-[13px] text-slate-700">
                    {row.date}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-[13px] text-slate-800">
                    {row.memberName}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-[13px] text-slate-700">
                    {row.zeroOne}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-[13px] text-slate-700">
                    {row.packageType}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-[13px] text-slate-700">
                    {row.bottles}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-[13px] text-slate-700">
                    {row.blisters}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-[13px] font-semibold text-[#0f1b3d]">
                    {formatCurrency(row.sales)}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-[13px] text-slate-700">
                    {row.paymentMode}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-[13px] sm:px-6">
                    <span className="inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-[12px] font-medium text-[#1d3b72]">
                      {row.status}
                    </span>
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
