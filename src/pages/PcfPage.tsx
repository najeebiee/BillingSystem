import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  getPcfSummary,
  listPcfTransactions,
  listPcfTransactionsForExport
} from "../services/pcf.service";
import type {
  PcfSummary,
  PcfTransaction,
  PcfTransactionStatus,
  PcfTransactionType
} from "../types/billing";
import {
  exportPcfToCSV,
  exportPcfToExcel,
  exportPcfToPDF,
  formatPeso as formatExportPeso,
  type PcfExportFilterSummary
} from "../utils/pcfExport";

type ExportType = "csv" | "xlsx" | "pdf";

const tabs = [
  "All",
  "Draft",
  "Awaiting Approval",
  "Rejected",
  "Approved",
  "Paid",
  "Void"
] as const;

type PcfTab = (typeof tabs)[number];

const formatTransactionType = (value: PcfTransactionType) => {
  switch (value) {
    case "beginning_balance":
      return "Beginning Balance";
    case "replenishment":
      return "Replenishment";
    case "expense":
      return "Expense";
    default:
      return value;
  }
};

const formatStatus = (value: PcfTransactionStatus) => {
  switch (value) {
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
      return value;
  }
};

const formatPeso = (amount: number) =>
  `\u20b1${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const getDisplayValue = (value?: string | null) => {
  const normalized = (value ?? "").trim();
  return normalized || "-";
};

const getStatusColor = (status: PcfTransactionStatus) => {
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

const getTypeColor = (value: PcfTransactionType) => {
  switch (value) {
    case "beginning_balance":
      return "bg-gray-100 text-gray-700";
    case "replenishment":
      return "bg-blue-100 text-blue-700";
    case "expense":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export function PcfPage() {
  const [activeTab, setActiveTab] = useState<PcfTab>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [transactions, setTransactions] = useState<PcfTransaction[]>([]);
  const [summary, setSummary] = useState<PcfSummary>({
    beginningBalance: 0,
    totalIn: 0,
    totalOut: 0,
    endingBalance: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const navigate = useNavigate();

  const statusFilter = useMemo<PcfTransactionStatus | undefined>(() => {
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

  useEffect(() => {
    document.title = "Petty Cash Fund | GuildLedger";
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    listPcfTransactions({
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
          setTransactions([]);
          setTotalCount(0);
        } else {
          setTransactions(result.data);
          setTotalCount(result.count);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load petty cash transactions.");
        setTransactions([]);
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

  useEffect(() => {
    let isMounted = true;

    getPcfSummary({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined
    })
      .then((result) => {
        if (!isMounted) return;

        if (result.error) {
          setSummary({
            beginningBalance: 0,
            totalIn: 0,
            totalOut: 0,
            endingBalance: 0
          });
          return;
        }

        setSummary(result.data);
      })
      .catch(() => {
        if (!isMounted) return;
        setSummary({
          beginningBalance: 0,
          totalIn: 0,
          totalOut: 0,
          endingBalance: 0
        });
      });

    return () => {
      isMounted = false;
    };
  }, [dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageWindow = 5;
  const halfWindow = Math.floor(pageWindow / 2);
  let windowStart = Math.max(1, page - halfWindow);
  let windowEnd = Math.min(totalPages, windowStart + pageWindow - 1);

  if (windowEnd - windowStart + 1 < pageWindow) {
    windowStart = Math.max(1, windowEnd - pageWindow + 1);
  }

  const visiblePages: number[] = [];
  for (let currentPage = windowStart; currentPage <= windowEnd; currentPage += 1) {
    visiblePages.push(currentPage);
  }

  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem =
    totalCount === 0 ? 0 : Math.min(totalCount, (page - 1) * pageSize + transactions.length);

  const fetchPcfForExport = async () => {
    const result = await listPcfTransactionsForExport({
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

  const getFilterSummary = (exportTransactions: PcfTransaction[]): PcfExportFilterSummary => {
    const totalIn = exportTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount_in ?? 0),
      0
    );
    const totalOut = exportTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount_out ?? 0),
      0
    );
    const endingBalance = Number(
      exportTransactions[0]?.balance ?? summary.endingBalance ?? 0
    );

    return {
      status: activeTab === "All" ? "All" : activeTab,
      search: searchQuery.trim() || "All",
      from: dateFrom || "All",
      to: dateTo || "All",
      totalReplenishments: formatExportPeso(totalIn),
      totalExpenses: formatExportPeso(totalOut),
      endingBalance: formatExportPeso(endingBalance)
    };
  };

  const handleExport = async (type: ExportType) => {
    setExporting(type);
    try {
      const exportTransactions = await fetchPcfForExport();
      if (!exportTransactions.length) {
        toast.error("No rows to export");
        return;
      }

      if (type === "csv") exportPcfToCSV(exportTransactions);
      if (type === "xlsx") exportPcfToExcel(exportTransactions);
      if (type === "pdf") {
        exportPcfToPDF(exportTransactions, {
          filterSummary: getFilterSummary(exportTransactions)
        });
      }

      toast.success(`Exported ${exportTransactions.length} rows`);
    } catch (error) {
      console.error(error);
      toast.error("Export failed");
    } finally {
      setExporting(null);
    }
  };

  const exportButtonClass =
    "rounded-full border border-blue-400 bg-white text-blue-500 px-5 py-2 text-sm hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

  const {
    beginningBalance,
    totalReplenishments,
    totalExpenses,
    currentBalance
  } = useMemo(() => {
    const beginningBalanceRow = transactions.find(
      (transaction) => transaction.transaction_type === "beginning_balance"
    );
    const totalIn = transactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount_in ?? 0),
      0
    );
    const totalOut = transactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount_out ?? 0),
      0
    );
    const latestVisibleTransaction = transactions[0];

    return {
      beginningBalance:
        Number(beginningBalanceRow?.balance ?? summary.beginningBalance ?? 0),
      totalReplenishments: totalIn,
      totalExpenses: totalOut,
      currentBalance: Number(
        latestVisibleTransaction?.balance ?? summary.endingBalance ?? 0
      )
    };
  }, [transactions, summary.beginningBalance, summary.endingBalance]);

  const summaryCards = [
    { label: "Beginning Balance", value: formatPeso(beginningBalance) },
    { label: "Total Replenishments", value: formatPeso(totalReplenishments) },
    { label: "Total Expenses", value: formatPeso(totalExpenses) },
    { label: "Current Balance", value: formatPeso(currentBalance) }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Petty Cash Fund</h1>
              <p className="text-gray-600 mt-1">View and manage petty cash transactions</p>
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
                onClick={() => navigate("/pcf/new")}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New PCV Entry
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setPage(1);
                }}
                className={`px-4 py-3 font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by PCV No. or Payee"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-lg border border-gray-200 p-5"
              >
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-2">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      PCV No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Payee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Invoice No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      In
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Out
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-16 text-center text-gray-600">
                        Loading transactions...
                      </td>
                    </tr>
                  ) : errorMessage ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-16 text-center text-red-600">
                        {errorMessage}
                      </td>
                    </tr>
                  ) : transactions.length > 0 ? (
                    transactions.map((transaction, index) => (
                      <tr
                        key={transaction.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        }`}
                      >
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {getDisplayValue(transaction.date)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                          {getDisplayValue(transaction.pcv_number)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {getDisplayValue(transaction.payee)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          {getDisplayValue(transaction.invoice_no)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {getDisplayValue(transaction.description)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium text-right">
                          {formatPeso(Number(transaction.amount_in ?? 0))}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-medium text-right">
                          {formatPeso(Number(transaction.amount_out ?? 0))}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 font-semibold text-right">
                          {formatPeso(Number(transaction.balance ?? 0))}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(
                              transaction.transaction_type
                            )}`}
                          >
                            {formatTransactionType(transaction.transaction_type)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <span
                              className={`inline-flex w-fit px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                transaction.status
                              )}`}
                            >
                              {formatStatus(transaction.status)}
                            </span>
                            {transaction.status === "approved" && transaction.is_liquidated && (
                              <span className="inline-flex w-fit px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                                Liquidated
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => navigate(`/pcf/${transaction.id}`)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="px-4 py-16 text-center">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No petty cash transactions found
                        </h3>
                        <p className="text-gray-600 mb-6">
                          Try adjusting your filters or create a new PCV entry.
                        </p>
                        <button
                          onClick={() => navigate("/pcf/new")}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-flex items-center gap-2 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Create New PCV Entry
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

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

                  {visiblePages.map((visiblePage) => (
                    <button
                      key={visiblePage}
                      onClick={() => setPage(visiblePage)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        visiblePage === page
                          ? "bg-blue-600 text-white"
                          : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {visiblePage}
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
        </div>
      </div>
    </div>
  );
}
