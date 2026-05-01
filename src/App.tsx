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
import { PcfPage } from './pages/PcfPage';
import { NewPcfPage } from './pages/NewPcfPage';
import { ViewPcfPage } from './pages/ViewPcfPage';
import { EditPcfPage } from './pages/EditPcfPage';
import { EventFormsHome } from './components/EventFormsHome';
import { EventRequestForm } from './components/EventRequestForm';
import { ProspectInvitationForm } from './components/ProspectInvitationForm';
import { SpecialCompanyEventsForm } from './components/SpecialCompanyEventsForm';

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
          <Route path="/pcf" element={<PcfPage />} />
          <Route path="/pcf/new" element={<NewPcfPage />} />
          <Route path="/pcf/:id" element={<ViewPcfPage />} />
          <Route path="/pcf/:id/edit" element={<EditPcfPage />} />
          <Route path="/event-forms" element={<EventFormsHome />} />
          <Route path="/forms/event-request" element={<EventRequestForm />} />
          <Route path="/forms/prospect-invitation" element={<ProspectInvitationForm />} />
          <Route path="/forms/special-company-events" element={<SpecialCompanyEventsForm />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
