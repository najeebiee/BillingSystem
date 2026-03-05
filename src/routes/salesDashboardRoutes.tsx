import React from "react";
import { Navigate, Route } from "react-router-dom";
import { SalesDashboardLayout } from "../components/SalesDashboardLayout";
import { SalesDashboardEncoderPage } from "../components/SalesDashboardEncoderPage";

export const salesDashboardRoutes = (
  <Route path="/sales-dashboard" element={<SalesDashboardLayout />}>
    <Route index element={<Navigate to="encoder" replace />} />
    <Route path="encoder" element={<SalesDashboardEncoderPage />} />
  </Route>
);
