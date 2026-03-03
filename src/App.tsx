import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Navigation } from './components/Navigation';
import { LoginPage } from './components/LoginPage';
import { BillsPage } from './components/BillsPage';
import { CreateBillPage } from './components/CreateBillPage';
import { ViewBillPage } from './components/ViewBillPage';
import { EditBillPage } from './components/EditBillPage';
import { EventFormsHome } from './components/EventFormsHome';
import { EventRequestForm } from './components/EventRequestForm';
import { ProspectInvitationForm } from './components/ProspectInvitationForm';
import { SpecialCompanyEventsForm } from './components/SpecialCompanyEventsForm';
import { SalesDashboardLayout } from './components/SalesDashboardLayout';
import { SalesDashboardEncoderPage } from './components/SalesDashboardEncoderPage';
import { SalesDashboardSalesReportPage } from './components/SalesDashboardSalesReportPage';
import { SalesDashboardInventoryReportPage } from './components/SalesDashboardInventoryReportPage';
import { SalesDashboardReportsPage } from './components/SalesDashboardReportsPage';
import { SalesDashboardUsersPage } from './components/SalesDashboardUsersPage';
import { SalesDashboardSalesMetricsPage } from './components/SalesDashboardSalesMetricsPage';

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const PublicLayout = () => <Outlet />;

  const AppLayout = () => (
    <>
      <Navigation />
      <Outlet />
    </>
  );

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route element={<PublicLayout />}>
        <Route
          path="/login"
          element={
            isLoading ? (
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-600">Loading...</div>
              </div>
            ) : isAuthenticated ? (
              <Navigate to="/bills" replace />
            ) : (
              <LoginPage />
            )
          }
        />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/bills" element={<BillsPage />} />
          <Route path="/bills/new" element={<CreateBillPage />} />
          <Route path="/bills/:id" element={<ViewBillPage />} />
          <Route path="/bills/:id/edit" element={<EditBillPage />} />
          <Route path="/event-forms" element={<EventFormsHome />} />
          <Route path="/forms/event-request" element={<EventRequestForm />} />
          <Route path="/forms/prospect-invitation" element={<ProspectInvitationForm />} />
          <Route path="/forms/special-company-events" element={<SpecialCompanyEventsForm />} />
          <Route path="/sales-dashboard" element={<SalesDashboardLayout />}>
            <Route index element={<Navigate to="encoder" replace />} />
            <Route path="encoder" element={<SalesDashboardEncoderPage />} />
            <Route path="sales-report" element={<SalesDashboardSalesReportPage />} />
            <Route path="inventory-report" element={<SalesDashboardInventoryReportPage />} />
            <Route path="reports" element={<SalesDashboardReportsPage />} />
            <Route path="users" element={<SalesDashboardUsersPage />} />
            <Route path="sales-metrics" element={<SalesDashboardSalesMetricsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
