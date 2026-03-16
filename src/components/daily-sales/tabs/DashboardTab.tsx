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
  "mb-1 block text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500";
const filterFieldClassName =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400";

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
    <section className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2.5">
            <label className="block sm:w-[172px]">
              <span className={filterLabelClassName}>FROM</span>
              <input
                type="date"
                value={pendingFromDate}
                onChange={(event) => setPendingFromDate(event.target.value)}
                className={filterFieldClassName}
              />
            </label>

            <label className="block sm:w-[172px]">
              <span className={filterLabelClassName}>TO</span>
              <input
                type="date"
                value={pendingToDate}
                onChange={(event) => setPendingToDate(event.target.value)}
                className={filterFieldClassName}
              />
            </label>

            <label className="block sm:w-[180px]">
              <span className={filterLabelClassName}>MODE OF PAYMENT</span>
              <select
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
            </label>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="h-9 w-full rounded-md border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 sm:w-auto"
                onClick={() => {
                  setFromDate(pendingFromDate);
                  setToDate(pendingToDate);
                  setPaymentMode(pendingPaymentMode);
                }}
              >
                Apply
              </Button>
            </div>
          </div>

          <label className="block lg:w-[170px] xl:w-[172px]">
            <span className={filterLabelClassName}>SEARCH</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search table..."
              className={filterFieldClassName}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-[10px] font-medium text-slate-500">{item.label}</p>
            <p className="mt-2 text-[17px] font-semibold leading-none text-slate-950">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-sm font-medium text-slate-900">Recent Sales</h2>
          <Button
            size="sm"
            className="h-8 rounded-md bg-slate-950 px-3 text-xs font-medium text-white hover:bg-slate-900"
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
          <p className="px-6 pb-2 text-xs text-slate-500">Loading daily sales...</p>
        ) : null}
        {errorMessage ? (
          <p className="px-6 pb-2 text-xs text-amber-600">{errorMessage}</p>
        ) : null}

        <Table className="min-w-[1080px] text-xs">
          <TableHeader className="bg-slate-50">
            <TableRow className="border-b border-slate-200 hover:bg-slate-50">
              <TableHead className="h-10 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                POF NUMBER
              </TableHead>
              <TableHead className="h-10 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                DATE
              </TableHead>
              <TableHead className="h-10 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                MEMBER NAME
              </TableHead>
              <TableHead className="h-10 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                ZERO ONE
              </TableHead>
              <TableHead className="h-10 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                PACKAGE
              </TableHead>
              <TableHead className="h-10 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                BOTTLES
              </TableHead>
              <TableHead className="h-10 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                BLISTERS
              </TableHead>
              <TableHead className="h-10 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                SALES
              </TableHead>
              <TableHead className="h-10 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                MODE OF PAYMENT
              </TableHead>
              <TableHead className="h-10 px-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                STATUS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasRealRows && filteredRows.length === 0 ? (
              <TableRow className="hover:bg-white">
                <TableCell
                  colSpan={10}
                  className="px-5 py-10 text-center text-sm text-slate-500"
                >
                  No recent sales found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-slate-200 bg-white hover:bg-slate-50/50"
                >
                  <TableCell className="px-5 py-3 text-xs text-slate-900">
                    {row.pofNumber}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-xs text-slate-900">
                    {row.date}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-xs text-slate-900">
                    {row.memberName}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-xs text-slate-900">
                    {row.zeroOne}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-xs text-slate-900">
                    {row.packageType}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-xs text-slate-900">
                    {row.bottles}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-xs text-slate-900">
                    {row.blisters}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-xs text-slate-900">
                    {formatCurrency(row.sales)}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-xs text-slate-900">
                    {row.paymentMode}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-xs text-slate-900">
                    {row.status}
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
