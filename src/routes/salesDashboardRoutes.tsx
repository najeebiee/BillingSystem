import React from "react";
import { Navigate, Route } from "react-router-dom";
import { SalesDashboardLayout } from "../components/SalesDashboardLayout";
import { SalesDashboardEncoderPage } from "../components/SalesDashboardEncoderPage";
import { SalesDashboardInventoryReportPage } from "../components/SalesDashboardInventoryReportPage";
import { SalesDashboardSalesReportPage } from "../components/SalesDashboardSalesReportPage";

export const salesDashboardRoutes = (
  <Route path="/sales-dashboard" element={<SalesDashboardLayout />}>
    <Route index element={<Navigate to="encoder" replace />} />
    <Route path="encoder" element={<SalesDashboardEncoderPage />} />
    <Route path="inventory-report" element={<SalesDashboardInventoryReportPage />} />
    <Route path="sales-report" element={<SalesDashboardSalesReportPage />} />
  </Route>
);
