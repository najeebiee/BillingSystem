import React from "react";

type PageId =
  | "dashboard"
  | "encoder"
  | "reports"
  | "inventory-report"
  | "sales-report"
  | "users"
  | "metrics";

interface NavigationProps {
  activePage: string;
  onPageChange: (page: PageId) => void;
}

export function Navigation({ activePage, onPageChange }: NavigationProps) {
  const tabs: { id: PageId; label: string; enabled: boolean }[] = [
    { id: "encoder", label: "Encoder", enabled: true },
    { id: "reports", label: "Reports", enabled: true },
    { id: "inventory-report", label: "Inventory Report", enabled: true },
    { id: "sales-report", label: "Sales Report", enabled: true },
    { id: "users", label: "Users", enabled: false }
  ];

  return (
    <nav
      style={{
        backgroundColor: "white",
        borderBottom: "1px solid #E5E7EB"
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          paddingLeft: "24px",
          paddingRight: "24px",
          display: "flex",
          alignItems: "stretch",
          height: "48px"
        }}
      >
        {tabs.map((tab) => {
          const isActive = activePage === tab.id;
          const isDisabled = !tab.enabled;

          return (
            <button
              key={tab.id}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) {
                  onPageChange(tab.id);
                }
              }}
              onMouseEnter={(event) => {
                if (!isDisabled && !isActive) {
                  event.currentTarget.style.color = "#374151";
                }
              }}
              onMouseLeave={(event) => {
                if (!isDisabled && !isActive) {
                  event.currentTarget.style.color = "#6B7280";
                }
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0 16px",
                height: "100%",
                fontSize: "14px",
                fontWeight: isActive ? 600 : 400,
                color: isDisabled ? "#9CA3AF" : isActive ? "#2E86C1" : "#6B7280",
                backgroundColor: "transparent",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                borderBottom: isActive ? "2px solid #2E86C1" : "2px solid transparent",
                cursor: isDisabled ? "default" : "pointer",
                outline: "none",
                whiteSpace: "nowrap",
                transition: "color 0.15s, border-color 0.15s"
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
