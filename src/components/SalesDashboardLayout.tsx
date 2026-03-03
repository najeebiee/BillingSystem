import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { label: "Encoder", to: "/sales-dashboard/encoder" },
  { label: "Inventory Report", to: "/sales-dashboard/inventory-report" },
  { label: "Sales Report", to: "/sales-dashboard/sales-report" }
];

export function SalesDashboardLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <div className="max-w-[1440px] mx-auto px-6 py-6">
          <div className="border-b border-gray-200">
            <div className="flex flex-wrap gap-6">
              {tabs.map((tab) => (
                <NavLink
                  key={tab.label}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `relative pb-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-blue-600 font-semibold"
                        : "text-gray-600 hover:text-gray-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {tab.label}
                      {isActive ? (
                        <span className="absolute left-0 right-0 -bottom-[1px] h-0.5 bg-blue-600" />
                      ) : null}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
