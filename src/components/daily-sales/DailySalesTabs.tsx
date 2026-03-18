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
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        {tabItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all ${
              activeTab === item.id
                ? "bg-[#0f1b3d] text-white shadow-[0_10px_24px_rgba(15,27,61,0.18)]"
                : "text-slate-700 hover:bg-[#eef2f8] hover:text-[#0f1b3d]"
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
