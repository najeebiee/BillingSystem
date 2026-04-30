import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthContext";
import { getUserDisplayName } from "../auth/userDisplayName";
import { listBills, listBillsForExport } from "../services/bills.service";
import type { BillStatus } from "../types/billing";
import {
  exportBillsToCSV,
  exportBillsToExcel,
  exportBillsToPDF
} from "../utils/billsExport";

type BillRow = {
  id: string;
  request_date: string;
  reference_no: string;
  vendor?: { id: string; name: string };
  payment_method?: string;
  payment_methods: string[];
  categories?: string[];
  priority_level: string;
  total_amount: number;
  status: string;
  created_by: string;
  remarks?: string | null;
};

export function BillsPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | "pdf" | null>(null);
  const { user } = useAuth();
  const currentUserDisplayName = getUserDisplayName(user);
  const navigate = useNavigate();

  const tabs = ["All", "Draft", "Awaiting Approval", "Rejected", "Approved", "Paid", "Void"];

  const statusFilter = useMemo<BillStatus | undefined>(() => {
    switch (activeTab) {
      case "Draft":
        return "draft";
      case "Awaiting Approval":
        return "awaiting_approval";
      case "Rejected":
        return "rejected";
      case "Approved":
        return "approved";
      case "Paid":
        return "paid";
      case "Void":
        return "void";
      default:
        return undefined;
    }
  }, [activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-700";
      case "awaiting_approval":
        return "bg-yellow-100 text-yellow-700";
      case "rejected":
        return "bg-orange-100 text-orange-700";
      case "approved":
        return "bg-blue-100 text-blue-700";
      case "paid":
        return "bg-green-100 text-green-700";
      case "void":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-700";
      case "high":
        return "bg-orange-100 text-orange-700";
      case "standard":
        return "bg-blue-100 text-blue-700";
      case "low":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "draft":
        return "Draft";
      case "awaiting_approval":
        return "Awaiting Approval";
      case "rejected":
        return "Rejected";
      case "approved":
        return "Approved";
      case "paid":
        return "Paid";
      case "void":
        return "Void";
      default:
        return status;
    }
  };

  const formatPriority = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "Urgent";
      case "high":
        return "High";
      case "standard":
        return "Standard";
      case "low":
        return "Low";
      default:
        return priority;
    }
  };

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case "bank_transfer":
        return "Bank Transfer";
      case "check":
        return "Check";
      case "cash":
        return "Cash";
      case "other":
        return "Other";
      default:
        return method;
    }
  };

  const renderPaymentMethods = (methods: string[]) => {
    const uniqueMethods = Array.from(new Set(methods.filter(Boolean)));
    const labels = uniqueMethods.map(formatPaymentMethod);
    const visible = labels.slice(0, 2);
    const extra = labels.length - visible.length;

    return (
      <div className="flex flex-wrap gap-2" title={labels.join(", ")}>
        {visible.map((label) => (
          <span
            key={label}
            className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700"
          >
            {label}
          </span>
        ))}
        {extra > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
            +{extra}
          </span>
        )}
        {labels.length === 0 && <span className="text-sm text-gray-500">—</span>}
      </div>
    );
  };

  const renderCategories = (categories: string[] = []) => {
    const uniqueCategories = Array.from(
      new Set(categories.map((value) => value.trim()).filter(Boolean))
    );
    const visible = uniqueCategories.slice(0, 2);
    const extra = uniqueCategories.length - visible.length;

    return (
      <div className="flex flex-wrap gap-2" title={uniqueCategories.join(", ")}>
        {visible.map((label) => (
          <span
            key={label}
            className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700"
          >
            {label}
          </span>
        ))}
        {extra > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
            +{extra}
          </span>
        )}
        {uniqueCategories.length === 0 && <span className="text-sm text-gray-500">—</span>}
      </div>
    );
  };

  useEffect(() => {
    document.title = "Bills | GuildLedger";
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    listBills({
      status: statusFilter,
      search: searchQuery,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize
    })
      .then((result) => {
        if (!isMounted) return;
        if (result.error) {
          setErrorMessage(result.error);
          setBills([]);
          setTotalCount(0);
        } else {
          setBills(result.data as BillRow[]);
          setTotalCount(result.count);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load bills.");
        setBills([]);
        setTotalCount(0);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [statusFilter, searchQuery, dateFrom, dateTo, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = totalCount === 0 ? 0 : Math.min(totalCount, (page - 1) * pageSize + bills.length);

  const pageWindow = 5;
  const halfWindow = Math.floor(pageWindow / 2);
  let windowStart = Math.max(1, page - halfWindow);
  let windowEnd = Math.min(totalPages, windowStart + pageWindow - 1);
  if (windowEnd - windowStart + 1 < pageWindow) {
    windowStart = Math.max(1, windowEnd - pageWindow + 1);
  }

  const visiblePages: number[] = [];
  for (let p = windowStart; p <= windowEnd; p += 1) {
    visiblePages.push(p);
  }

  const fetchBillsForExport = async () => {
    const result = await listBillsForExport({
      status: statusFilter,
      search: searchQuery,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined
    });

    if (result.error) {
      throw new Error(result.error);
    }

    return result.data;
  };

  const getFilterSummary = () => {
    const filters: string[] = [];
    if (activeTab !== "All") filters.push(`Status: ${activeTab}`);
    if (searchQuery.trim()) filters.push(`Search: ${searchQuery.trim()}`);
    if (dateFrom) filters.push(`From: ${dateFrom}`);
    if (dateTo) filters.push(`To: ${dateTo}`);
    return filters.length ? filters.join(" | ") : "All records";
  };

  const handleExport = async (type: "csv" | "xlsx" | "pdf") => {
    setExporting(type);
    try {
      const exportBills = await fetchBillsForExport();
      if (!exportBills.length) {
        toast.error("No rows to export");
        return;
      }

      if (type === "csv") exportBillsToCSV(exportBills);
      if (type === "xlsx") exportBillsToExcel(exportBills);
      if (type === "pdf") exportBillsToPDF(exportBills, { filters: getFilterSummary() });

      toast.success(`Exported ${exportBills.length} rows`);
    } catch (error) {
      console.error(error);
      toast.error("Export failed");
    } finally {
      setExporting(null);
    }
  };

  const exportButtonClass =
    "rounded-full border border-blue-400 bg-white text-blue-500 px-5 py-2 text-sm hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Payment Requests</h1>
              <p className="text-gray-600 mt-1">View and manage payment requests</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExport("csv")}
                  disabled={exporting !== null}
                  className={exportButtonClass}
                >
                  {exporting === "csv" ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Exporting...
                    </span>
                  ) : (
                    "CSV"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("xlsx")}
                  disabled={exporting !== null}
                  className={exportButtonClass}
                >
                  {exporting === "xlsx" ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Exporting...
                    </span>
                  ) : (
                    "Excel"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("pdf")}
                  disabled={exporting !== null}
                  className={exportButtonClass}
                >
                  {exporting === "pdf" ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Exporting...
                    </span>
                  ) : (
                    "PDF"
                  )}
                </button>
              </div>
              <button
                onClick={() => navigate("/bills/new")}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Bill
              </button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setPage(1);
                }}
                className={`px-4 py-3 font-medium transition-colors relative ${
                  activeTab === tab
                    ? "text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by vendor, reference, or purpose summary"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="From"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="To"
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-center">
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setDateFrom("");
                    setDateTo("");
                    setPage(1);
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Bills Table */}
          {isLoading ? (
            <div className="bg-white rounded-lg border border-gray-200 py-16 text-center">
              <p className="text-gray-600">Loading bills...</p>
            </div>
          ) : errorMessage ? (
            <div className="bg-white rounded-lg border border-gray-200 py-16 text-center">
              <p className="text-red-600">{errorMessage}</p>
            </div>
          ) : bills.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Reference No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Payee / Vendor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Purpose Summary
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Payment Method
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Total Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Requested By
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bills.map((bill, index) => (
                      <tr
                        key={bill.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        }`}
                      >
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {bill.request_date}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                          {bill.reference_no}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {bill.vendor?.name || "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {bill.remarks || "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {renderPaymentMethods(
                            bill.payment_methods?.length
                              ? bill.payment_methods
                              : bill.payment_method
                              ? [bill.payment_method]
                              : []
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {renderCategories(bill.categories)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                              bill.priority_level
                            )}`}
                          >
                            {formatPriority(bill.priority_level)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-semibold text-right">
                          ₱{Number(bill.total_amount).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              bill.status
                            )}`}
                          >
                            {formatStatus(bill.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {bill.created_by === user?.id ? currentUserDisplayName : bill.created_by}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => navigate(`/bills/${bill.id}`)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {startItem}-{endItem} of {totalCount} results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {windowStart > 1 && (
                      <>
                        <button
                          onClick={() => setPage(1)}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                        >
                          1
                        </button>
                        {windowStart > 2 && (
                          <span className="px-2 text-sm text-gray-500">...</span>
                        )}
                      </>
                    )}

                    {visiblePages.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1 rounded-md text-sm ${
                          p === page
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    {windowEnd < totalPages && (
                      <>
                        {windowEnd < totalPages - 1 && (
                          <span className="px-2 text-sm text-gray-500">...</span>
                        )}
                        <button
                          onClick={() => setPage(totalPages)}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white rounded-lg border border-gray-200 py-16 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No payment requests found
              </h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your filters or create a new bill
              </p>
              <button
                onClick={() => navigate("/bills/new")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create New Bill
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
