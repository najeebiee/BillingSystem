import React, { createContext, useContext, useMemo, useState } from "react";
import { Navigate, Route } from "react-router-dom";
import { SalesDashboardLayout } from "../components/SalesDashboardLayout";
import { SalesDashboardEncoderPage } from "../components/SalesDashboardEncoderPage";
import { SalesDashboardSalesReportPage } from "../components/SalesDashboardSalesReportPage";
import { InventoryReportPage } from "../app/components/inventory-report-page";
import type { SaleEntry } from "../types/sales";

type SalesDashboardEntriesContextValue = {
  salesEntries: SaleEntry[];
  onSaveEntry: (entry: SaleEntry) => void;
};

const SalesDashboardEntriesContext = createContext<SalesDashboardEntriesContextValue | null>(null);

function SalesDashboardStateShell() {
  const [salesEntries, setSalesEntries] = useState<SaleEntry[]>([]);

  const value = useMemo<SalesDashboardEntriesContextValue>(
    () => ({
      salesEntries,
      onSaveEntry: (entry) => setSalesEntries((prev) => [entry, ...prev])
    }),
    [salesEntries]
  );

  return (
    <SalesDashboardEntriesContext.Provider value={value}>
      <SalesDashboardLayout />
    </SalesDashboardEntriesContext.Provider>
  );
}

function useSalesDashboardEntries() {
  const context = useContext(SalesDashboardEntriesContext);
  if (!context) {
    throw new Error("useSalesDashboardEntries must be used within SalesDashboardStateShell.");
  }
  return context;
}

function SalesDashboardEncoderRoute() {
  const { salesEntries, onSaveEntry } = useSalesDashboardEntries();
  return <SalesDashboardEncoderPage onSave={onSaveEntry} savedCount={salesEntries.length} />;
}

function SalesDashboardSalesReportRoute() {
  const { salesEntries } = useSalesDashboardEntries();
  return <SalesDashboardSalesReportPage salesEntries={salesEntries} />;
}

export const salesDashboardRoutes = (
  <Route path="/sales-dashboard" element={<SalesDashboardStateShell />}>
    <Route index element={<Navigate to="encoder" replace />} />
    <Route path="encoder" element={<SalesDashboardEncoderRoute />} />
    <Route path="inventory-report" element={<InventoryReportPage />} />
    <Route path="sales-report" element={<SalesDashboardSalesReportRoute />} />
  </Route>
);
