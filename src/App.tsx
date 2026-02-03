import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { LoginPage } from './components/LoginPage';
import { BillsPage } from './components/BillsPage';
import { CreateBillPage } from './components/CreateBillPage';
import { ViewBillPage } from './components/ViewBillPage';
import { EditBillPage } from './components/EditBillPage';

export default function App() {
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
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/bills" element={<BillsPage />} />
        <Route path="/bills/new" element={<CreateBillPage />} />
        <Route path="/bills/:id" element={<ViewBillPage />} />
        <Route path="/bills/:id/edit" element={<EditBillPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
