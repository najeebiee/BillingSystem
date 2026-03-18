import React from "react";
import { Outlet } from "react-router-dom";

export function SalesDashboardLayout() {
  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="pt-16">
        <div className="mx-auto max-w-[1360px] px-6 py-5 lg:px-7 lg:py-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
