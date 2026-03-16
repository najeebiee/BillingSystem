import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500";
const filterFieldClassName =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-none outline-none transition-colors focus:border-slate-400";

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

  const totalSales = filteredRows.reduce((sum, row) => sum + row.sales, 0);
  const totalOrders = filteredRows.length;
  const totalNewMembers = filteredRows.filter((row) => row.newMember).length;
  const totalBottles = filteredRows.reduce((sum, row) => sum + row.bottles, 0);
  const totalBlisters = filteredRows.reduce((sum, row) => sum + row.blisters, 0);

  const summaryItems = [
    { label: "Total Sales", value: formatCurrency(totalSales) },
    { label: "Total Orders", value: totalOrders.toLocaleString() },
    { label: "New Members", value: totalNewMembers.toLocaleString() },
    { label: "Total Bottles Sold", value: totalBottles.toLocaleString() },
    { label: "Total Blister Sold", value: totalBlisters.toLocaleString() },
  ];

  return (
    <section className="mt-3 space-y-3">
      <Card className="gap-0 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardContent className="p-3.5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,150px)_minmax(0,150px)_minmax(0,210px)_auto_minmax(220px,1fr)] xl:items-end">
            <label className="block">
              <span className={filterLabelClassName}>FROM</span>
              <input
                type="date"
                value={pendingFromDate}
                onChange={(event) => setPendingFromDate(event.target.value)}
                className={filterFieldClassName}
              />
            </label>

            <label className="block">
              <span className={filterLabelClassName}>TO</span>
              <input
                type="date"
                value={pendingToDate}
                onChange={(event) => setPendingToDate(event.target.value)}
                className={filterFieldClassName}
              />
            </label>

            <label className="block">
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
                className="h-9 rounded-md border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-900 hover:bg-slate-100"
                onClick={() => {
                  setFromDate(pendingFromDate);
                  setToDate(pendingToDate);
                  setPaymentMode(pendingPaymentMode);
                }}
              >
                Apply
              </Button>
            </div>

            <label className="block xl:ml-auto xl:w-full xl:max-w-xs">
              <span className={filterLabelClassName}>SEARCH</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search table..."
                className={filterFieldClassName}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryItems.map((item) => (
          <Card
            key={item.label}
            className="gap-0 rounded-lg border-slate-200 bg-white shadow-sm"
          >
            <CardContent className="p-3.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-[22px] font-semibold leading-none text-slate-900">
                {item.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="gap-0 overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Recent Sales</h2>
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
                filteredRows.map((row) => [
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
          <p className="px-4 pt-3 text-xs text-slate-500">Loading daily sales...</p>
        ) : null}
        {errorMessage ? (
          <p className="px-4 pt-3 text-xs text-amber-600">{errorMessage}</p>
        ) : null}

        <Table className="min-w-[980px] text-xs">
          <TableHeader className="bg-slate-50">
            <TableRow className="border-b border-slate-200 hover:bg-slate-50">
              <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                POF NUMBER
              </TableHead>
              <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                DATE
              </TableHead>
              <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                MEMBER NAME
              </TableHead>
              <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                ZERO ONE
              </TableHead>
              <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                PACKAGE
              </TableHead>
              <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                BOTTLES
              </TableHead>
              <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                BLISTERS
              </TableHead>
              <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                SALES
              </TableHead>
              <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                MODE OF PAYMENT
              </TableHead>
              <TableHead className="h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                STATUS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow className="hover:bg-white">
                <TableCell
                  colSpan={10}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  No recent sales found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-slate-200/80 bg-white hover:bg-slate-50/60"
                >
                  <TableCell className="px-4 py-3 text-xs text-slate-900">
                    {row.pofNumber}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-slate-900">
                    {row.date}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-slate-900">
                    {row.memberName}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-slate-900">
                    {row.zeroOne}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-slate-900">
                    {row.packageType}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-slate-900">
                    {row.bottles}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-slate-900">
                    {row.blisters}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-slate-900">
                    {formatCurrency(row.sales)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-slate-900">
                    {row.paymentMode}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-slate-900">
                    {row.status}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </section>
  );
}
