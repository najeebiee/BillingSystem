type DailySalesTabId =
  | "dashboard"
  | "encoder"
  | "reports"
  | "inventory-report"
  | "sales-report"
  | "users"
  | "sales-metrics";

const tabItems: Array<{ id: DailySalesTabId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "encoder", label: "Encoder" },
  { id: "reports", label: "Reports" },
  { id: "inventory-report", label: "Inventory Report" },
  { id: "sales-report", label: "Sales Report" },
  { id: "users", label: "Users" },
  { id: "sales-metrics", label: "Sales Metrics" },
];

export type { DailySalesTabId };

export function DailySalesTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: DailySalesTabId;
  onTabChange: (tabId: DailySalesTabId) => void;
}) {
  return (
    <div>
      <div className="daily-sales-tabs-row">
        {tabItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`daily-sales-tab ${
              activeTab === item.id ? "daily-sales-tab--active" : ""
            }`}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
