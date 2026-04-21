import React, { useState } from "react";
import { toast } from "sonner";
import { fetchBillsForExport } from "../../services/billsExportFetch";
import { exportBills, type ExportFormat } from "../../utils/billsExport";

type BillsExportButtonsProps = {
  activeTab: string;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
};

type ExportOption = {
  key: ExportFormat;
  label: string;
};

const EXPORT_OPTIONS: ExportOption[] = [
  { key: "csv", label: "CSV" },
  { key: "xlsx", label: "Excel" },
  { key: "pdf", label: "PDF" }
];

export function BillsExportButtons({
  activeTab,
  searchQuery,
  dateFrom,
  dateTo
}: BillsExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const result = await fetchBillsForExport({
        activeTab,
        searchQuery,
        dateFrom,
        dateTo
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (!result.data.length) {
        toast.error("No records found for the selected filters.");
        return;
      }

      await exportBills(result.data, format);
      toast.success(`Exported ${result.data.length} record(s) to ${format.toUpperCase()}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export payment requests.";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {EXPORT_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => handleExport(option.key)}
          disabled={isExporting}
          className="px-3 py-1.5 text-sm font-medium rounded-full border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
