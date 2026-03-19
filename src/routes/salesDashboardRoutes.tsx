import React from "react";
import { Navigate, Route } from "react-router-dom";
import { SalesDashboardLayout } from "../components/SalesDashboardLayout";
import { DailySalesPage } from "../components/DailySalesPage";

const redirectToDailySalesTab = (tab: string) => (
  <Navigate to={`/sales-dashboard/daily-sales?tab=${encodeURIComponent(tab)}`} replace />
);

export const salesDashboardRoutes = (
  <Route path="/sales-dashboard" element={<SalesDashboardLayout />}>
    <Route index element={<Navigate to="daily-sales" replace />} />
    <Route path="daily-sales" element={<DailySalesPage />} />
    <Route path="encoder" element={redirectToDailySalesTab("encoder")} />
    <Route path="reports" element={redirectToDailySalesTab("reports")} />
    <Route
      path="inventory-report"
      element={redirectToDailySalesTab("inventory-report")}
    />
    <Route path="sales-report" element={redirectToDailySalesTab("sales-report")} />
    <Route path="users" element={redirectToDailySalesTab("users")} />
  </Route>
);
