import React from "react";
import { NavLink, useLocation } from "react-router-dom";

export function SalesDashboardNavItem() {
  const location = useLocation();
  const isSalesDashboardRoute = location.pathname.startsWith("/sales-dashboard");

  return (
    <NavLink
      to="/sales-dashboard"
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        isSalesDashboardRoute
          ? "bg-blue-600 text-white"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      Sales Dashboard
    </NavLink>
  );
}
