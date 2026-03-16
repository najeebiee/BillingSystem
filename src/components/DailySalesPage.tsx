import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailySalesTabs, type DailySalesTabId } from "@/components/daily-sales/DailySalesTabs";
import { DashboardTab } from "@/components/daily-sales/tabs/DashboardTab";
import { EncoderTab } from "@/components/daily-sales/tabs/EncoderTab";
import { ReportsTab } from "@/components/daily-sales/tabs/ReportsTab";
import { InventoryReportTab } from "@/components/daily-sales/tabs/InventoryReportTab";
import { SalesReportTab } from "@/components/daily-sales/tabs/SalesReportTab";
import { UsersTab } from "@/components/daily-sales/tabs/UsersTab";
import { SalesMetricsTab } from "@/components/daily-sales/tabs/SalesMetricsTab";

const validTabIds: DailySalesTabId[] = [
  "dashboard",
  "encoder",
  "reports",
  "inventory-report",
  "sales-report",
  "users",
  "sales-metrics",
];

function isDailySalesTabId(value: string | null): value is DailySalesTabId {
  return value !== null && validTabIds.includes(value as DailySalesTabId);
}

export function DailySalesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [refreshTick, setRefreshTick] = useState(0);

  const activeTab = useMemo<DailySalesTabId>(() => {
    const requestedTab = searchParams.get("tab");
    return isDailySalesTabId(requestedTab) ? requestedTab : "dashboard";
  }, [searchParams]);

  const onTabChange = (tabId: DailySalesTabId) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);

      if (tabId === "dashboard") {
        nextParams.delete("tab");
      } else {
        nextParams.set("tab", tabId);
      }

      return nextParams;
    });
  };

  const triggerRefresh = () => setRefreshTick((value) => value + 1);

  return (
    <main className="mx-auto max-w-7xl space-y-3">
      <Card className="gap-0 rounded-lg border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-xl font-semibold text-slate-900">
            Daily Sales
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <DailySalesTabs activeTab={activeTab} onTabChange={onTabChange} />
        </CardContent>
      </Card>

      {activeTab === "dashboard" ? <DashboardTab refreshTick={refreshTick} /> : null}
      {activeTab === "encoder" ? <EncoderTab onSaved={triggerRefresh} /> : null}
      {activeTab === "reports" ? (
        <ReportsTab refreshTick={refreshTick} onChanged={triggerRefresh} />
      ) : null}
      {activeTab === "inventory-report" ? (
        <InventoryReportTab refreshTick={refreshTick} />
      ) : null}
      {activeTab === "sales-report" ? (
        <SalesReportTab refreshTick={refreshTick} />
      ) : null}
      {activeTab === "users" ? <UsersTab /> : null}
      {activeTab === "sales-metrics" ? (
        <SalesMetricsTab refreshTick={refreshTick} />
      ) : null}
    </main>
  );
}
