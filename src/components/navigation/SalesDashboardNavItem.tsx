import React from "react";
import { NavLink, useLocation } from "react-router-dom";

export function SalesDashboardNavItem() {
  const location = useLocation();
  const isSalesDashboardRoute = location.pathname.startsWith("/sales-dashboard");

  return (
    <NavLink
      to="/sales-dashboard/daily-sales"
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        isSalesDashboardRoute
          ? "bg-blue-600 text-white"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      Daily Sales
    </NavLink>
  );
}
