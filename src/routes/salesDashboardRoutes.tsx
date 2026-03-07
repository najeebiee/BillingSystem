import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, Route } from "react-router-dom";
import { SalesDashboardLayout } from "../components/SalesDashboardLayout";
import { SalesDashboardEncoderPage } from "../components/SalesDashboardEncoderPage";
import { SalesDashboardSalesReportPage } from "../components/SalesDashboardSalesReportPage";
import { SalesDashboardUsersPage } from "../components/SalesDashboardUsersPage";
import { InventoryReportPage } from "../components/inventory-report-page";
import { ReportsPage } from "../components/reports-page";
import type { SaleEntry } from "../types/sales";
import {
  deleteSalesEntry,
  fetchSalesEntriesCount,
  fetchSalesEntryInventoryRows,
  fetchSalesEntryPaymentRows,
  fetchSalesEntryRows,
  saveSalesEntry,
  type SalesDashboardRawRow
} from "../services/salesDashboard.service";

type SalesDashboardEntriesContextValue = {
  savedCount: number;
  onSaveEntry: (entry: SaleEntry) => Promise<void>;
  refreshSavedCount: () => Promise<void>;
};

const toText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const toNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const pickString = (row: SalesDashboardRawRow, keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const pickNumber = (row: SalesDashboardRawRow, keys: string[]): number => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return toNumber(value);
  }
  return 0;
};

const toDateKey = (value: string): string => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const mapSalesEntryToReportEntry = (
  row: SalesDashboardRawRow,
  inventoryByEntryId: Map<string, SalesDashboardRawRow>,
  paymentsByEntryId: Map<string, SalesDashboardRawRow[]>
): SaleEntry => {
  const id = String(row.id ?? "");
  const inventoryRow = inventoryByEntryId.get(id);
  const paymentRows = [...(paymentsByEntryId.get(id) ?? [])].sort(
    (left, right) => pickNumber(left, ["payment_no"]) - pickNumber(right, ["payment_no"])
  );
  const primaryPayment =
    paymentRows.find((payment) => pickNumber(payment, ["payment_no"]) === 1) ?? paymentRows[0] ?? null;
  const secondaryPayment = paymentRows.find((payment) => pickNumber(payment, ["payment_no"]) === 2) ?? null;
  const entryDate =
    pickString(row, ["report_date", "entry_date", "sale_date", "date"]) ||
    toDateKey(pickString(row, ["created_at"]));

  return {
    id,
    savedAt: pickString(row, ["created_at", "saved_at"]),
    event: pickString(row, ["event"]),
    date: entryDate,
    pgfNumber: pickString(row, ["pof_number", "po_number", "pgf_number"]),
    memberName: pickString(row, ["member_name"]),
    username: pickString(row, ["username"]),
    newMember: pickString(row, ["new_member", "is_new_member"]),
    memberType: pickString(row, ["member_type"]),
    packageType: pickString(row, ["package_type"]),
    toBlister: pickString(row, ["to_blister"]),
    originalPrice: String(pickNumber(row, ["original_price"])),
    quantity: String(pickNumber(row, ["quantity"])),
    blisterCount: String(pickNumber(row, ["blister_count"])),
    discount: pickString(row, ["discount_label", "discount_rate", "discount_percent"]),
    priceAfterDiscount: String(pickNumber(row, ["price_after_discount"])),
    oneTimeDiscount: String(pickNumber(row, ["one_time_discount"])),
    totalSales: String(pickNumber(row, ["total_sales"])),
    modeOfPayment:
      pickString(primaryPayment ?? {}, ["payment_mode", "mode"]) ||
      pickString(row, ["primary_payment_mode"]),
    paymentModeType: pickString(primaryPayment ?? {}, ["payment_type", "mode_type"]),
    referenceNumber:
      pickString(primaryPayment ?? {}, ["reference_number", "reference_no"]) ||
      pickString(row, ["reference_number", "reference_no"]),
    modeOfPayment2: pickString(secondaryPayment ?? {}, ["payment_mode", "mode"]),
    paymentModeType2: pickString(secondaryPayment ?? {}, ["payment_type", "mode_type"]),
    referenceNumber2: pickString(secondaryPayment ?? {}, ["reference_number", "reference_no"]),
    amount2: String(pickNumber(secondaryPayment ?? {}, ["amount"])),
    releasedBottles: String(
      pickNumber(inventoryRow ?? {}, ["released_bottles", "released_bottle"])
    ),
    releasedBlister: String(
      pickNumber(inventoryRow ?? {}, ["released_blisters", "released_blister"])
    ),
    toFollowBottles: String(
      pickNumber(inventoryRow ?? {}, ["to_follow_bottles", "to_follow_bottle"])
    ),
    toFollowBlister: String(
      pickNumber(inventoryRow ?? {}, ["to_follow_blisters", "to_follow_blister"])
    ),
    remarks: pickString(row, ["remarks"]),
    receivedBy: pickString(row, ["received_by"]),
    collectedBy: pickString(row, ["collected_by"])
  };
};

const SalesDashboardEntriesContext = createContext<SalesDashboardEntriesContextValue | null>(null);

function SalesDashboardStateShell() {
  const [savedCount, setSavedCount] = useState(0);

  const refreshSavedCount = useCallback(async () => {
    const count = await fetchSalesEntriesCount();
    setSavedCount(count);
  }, []);

  useEffect(() => {
    void refreshSavedCount();
  }, [refreshSavedCount]);

  const onSaveEntry = useCallback(
    async (entry: SaleEntry) => {
      await saveSalesEntry(entry);
      await refreshSavedCount();
    },
    [refreshSavedCount]
  );

  const value = useMemo<SalesDashboardEntriesContextValue>(
    () => ({
      savedCount,
      onSaveEntry,
      refreshSavedCount
    }),
    [savedCount, onSaveEntry, refreshSavedCount]
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
  const { savedCount, onSaveEntry } = useSalesDashboardEntries();
  return <SalesDashboardEncoderPage onSave={onSaveEntry} savedCount={savedCount} />;
}

function SalesDashboardSalesReportRoute() {
  return <SalesDashboardSalesReportPage />;
}

function SalesDashboardUsersRoute() {
  return <SalesDashboardUsersPage />;
}

function SalesDashboardReportsRoute() {
  const { refreshSavedCount } = useSalesDashboardEntries();
  const [salesEntries, setSalesEntries] = useState<SaleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [entryRows, inventoryRows, paymentRows] = await Promise.all([
        fetchSalesEntryRows(),
        fetchSalesEntryInventoryRows(),
        fetchSalesEntryPaymentRows()
      ]);

      const inventoryByEntryId = new Map<string, SalesDashboardRawRow>();
      for (const row of inventoryRows) {
        const entryId = String(row.sales_entry_id ?? row.sale_entry_id ?? "");
        if (!entryId) continue;
        inventoryByEntryId.set(entryId, row);
      }

      const paymentsByEntryId = new Map<string, SalesDashboardRawRow[]>();
      for (const row of paymentRows) {
        const entryId = String(row.sales_entry_id ?? row.sale_entry_id ?? "");
        if (!entryId) continue;
        const current = paymentsByEntryId.get(entryId) ?? [];
        current.push(row);
        paymentsByEntryId.set(entryId, current);
      }

      setSalesEntries(
        entryRows.map((row) => mapSalesEntryToReportEntry(row, inventoryByEntryId, paymentsByEntryId))
      );
    } catch (error) {
      console.error("REPORT FETCH ERROR", error);
      const message =
        error instanceof Error ? error.message : "Failed to load sales report entries.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const handleRemoveEntry = useCallback(
    async (id: string) => {
      await deleteSalesEntry(id);
      await Promise.all([loadEntries(), refreshSavedCount()]);
    },
    [loadEntries, refreshSavedCount]
  );

  if (isLoading) {
    return (
      <ReportsPage
        salesEntries={salesEntries}
        onRemoveEntry={handleRemoveEntry}
        isLoading
        errorMessage={errorMessage}
        onRefresh={loadEntries}
      />
    );
  }

  return (
    <ReportsPage
      salesEntries={salesEntries}
      onRemoveEntry={handleRemoveEntry}
      isLoading={isLoading}
      errorMessage={errorMessage}
      onRefresh={loadEntries}
    />
  );
}

export const salesDashboardRoutes = (
  <Route path="/sales-dashboard" element={<SalesDashboardStateShell />}>
    <Route index element={<Navigate to="encoder" replace />} />
    <Route path="encoder" element={<SalesDashboardEncoderRoute />} />
    <Route path="inventory-report" element={<InventoryReportPage />} />
    <Route path="sales-report" element={<SalesDashboardSalesReportRoute />} />
    <Route path="reports" element={<SalesDashboardReportsRoute />} />
    <Route path="users" element={<SalesDashboardUsersRoute />} />
  </Route>
);
