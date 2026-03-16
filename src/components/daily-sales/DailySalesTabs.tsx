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
    <div className="w-full overflow-x-auto">
      <div className="flex min-w-max items-center gap-1.5">
        {tabItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`h-7 rounded-md px-3 text-[12px] font-medium transition-colors ${
              activeTab === item.id
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
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
