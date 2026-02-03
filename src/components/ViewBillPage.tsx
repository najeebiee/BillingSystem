import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { VoidBillModal } from "./VoidBillModal";
import { ApproveRejectModal } from "./ApproveRejectModal";
import { ChevronRight, Printer, Download, Edit2 } from "lucide-react";
import { getBillById } from "../services/bills.service";
import type { BillDetails } from "../types/billing";

export function ViewBillPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [billDetails, setBillDetails] = useState<BillDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [approveRejectModal, setApproveRejectModal] = useState({
    isOpen: false,
    action: "approve" as "approve" | "reject"
  });

  useEffect(() => {
    let isMounted = true;
    if (!id) {
      setIsLoading(false);
      setErrorMessage("Bill not found.");
      return;
    }

    setIsLoading(true);
    getBillById(id)
      .then((result) => {
        if (!isMounted) return;
        if (result.error || !result.data) {
          setErrorMessage(result.error || "Bill not found.");
          setBillDetails(null);
        } else {
          setBillDetails(result.data);
          setErrorMessage(null);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load bill.");
        setBillDetails(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const bill = billDetails?.bill;
  const vendor = billDetails?.vendor;
  const breakdowns = billDetails?.breakdowns ?? [];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-700";
      case "awaiting_approval":
        return "bg-yellow-100 text-yellow-700";
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

  const getPriorityColor = (priority?: string) => {
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

  const formatStatus = (status?: string) => {
    switch (status) {
      case "draft":
        return "Draft";
      case "awaiting_approval":
        return "Awaiting Approval";
      case "approved":
        return "Approved";
      case "paid":
        return "Paid";
      case "void":
        return "Void";
      default:
        return status || "—";
    }
  };

  const formatPriority = (priority?: string) => {
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
        return priority || "—";
    }
  };

  const formatPaymentMethod = (method?: string) => {
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
        return method || "—";
    }
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return "****" + accountNumber.slice(-4);
  };

  const handleApprove = () => {
    setApproveRejectModal({ isOpen: true, action: "approve" });
  };

  const handleReject = () => {
    setApproveRejectModal({ isOpen: true, action: "reject" });
  };

  const handleConfirmApproveReject = (notes: string) => {
    if (!bill) return;
    console.log(`${approveRejectModal.action}ing bill:`, bill.id, "Notes:", notes);
    setApproveRejectModal({ isOpen: false, action: "approve" });
    navigate("/bills");
  };

  const handleMarkAsPaid = () => {
    if (!bill) return;
    console.log("Marking as paid:", bill.id);
    navigate("/bills");
  };

  const handleVoid = () => {
    setIsVoidModalOpen(true);
  };

  const handleConfirmVoid = (reason: string) => {
    if (!bill) return;
    console.log("Voiding bill:", bill.id, "Reason:", reason);
    setIsVoidModalOpen(false);
    navigate("/bills");
  };

  const handleEdit = () => {
    if (!bill) return;
    navigate(`/bills/${bill.id}/edit`);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalAmount = breakdowns.reduce((sum, b) => sum + Number(b.amount || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-[1440px] mx-auto px-6 py-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-gray-600">
            Loading bill...
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !bill || !vendor) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-[1440px] mx-auto px-6 py-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Bill not found</h1>
            <p className="text-gray-600 mb-4">{errorMessage || "The bill you are looking for does not exist."}</p>
            <Link to="/bills" className="text-blue-600 hover:text-blue-700 font-medium">
              Back to Bills
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <div className="max-w-[1440px] mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <button onClick={() => navigate("/bills")} className="hover:text-blue-600">
              Bills
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">Payment Request Details</span>
          </div>

          {/* Page Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold text-gray-900">Payment Request</h1>
                <span
                  className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                    bill.status
                  )}`}
                >
                  {formatStatus(bill.status)}
                </span>
              </div>
              <p className="text-lg text-gray-600">{bill.reference_no}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="p-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                title="Print"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                onClick={handlePrint}
                className="p-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                title="Download PDF"
              >
                <Download className="w-5 h-5" />
              </button>
              {bill.status !== "paid" && bill.status !== "void" && (
                <button
                  onClick={handleVoid}
                  className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors font-medium"
                >
                  Void
                </button>
              )}
              <button
                onClick={handleEdit}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors font-medium flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* SECTION 1 — Payee & Reference */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payee & Reference</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Vendor / Payee</div>
                  <div className="text-base text-gray-900">{vendor.name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Reference Number</div>
                  <div className="text-base text-gray-900 font-medium">{bill.reference_no}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Request Date</div>
                  <div className="text-base text-gray-900">{bill.request_date}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Priority Level</div>
                  <div>
                    <span
                      className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${getPriorityColor(
                        bill.priority_level
                      )}`}
                    >
                      {formatPriority(bill.priority_level)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2 — Payment Method */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Payment Method</div>
                  <div className="text-base text-gray-900">{formatPaymentMethod(bill.payment_method)}</div>
                </div>

                {bill.payment_method === "bank_transfer" && (
                  <>
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Bank Name</div>
                      <div className="text-base text-gray-900">{bill.bank_name || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Account Holder Name</div>
                      <div className="text-base text-gray-900">{bill.bank_account_name || "—"}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Bank Account Number</div>
                      <div className="text-base text-gray-900 font-mono">
                        {bill.bank_account_no ? maskAccountNumber(bill.bank_account_no) : "—"}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* SECTION 3 — Payment Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Breakdown</h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Amount (PHP)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {breakdowns.map((breakdown, index) => (
                      <tr key={breakdown.id || index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{breakdown.category}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {breakdown.description || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          ₱{Number(breakdown.amount).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Amount */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    ₱{totalAmount.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4 — Reason for Payment */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reason for Payment</h2>
              <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {bill.remarks || "No remarks provided"}
                </p>
              </div>
            </div>

            {/* SECTION 5 — Attachments */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>
              <p className="text-sm text-gray-500">No attachments</p>
            </div>

            {/* SECTION 6 — Request & Approval Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Request & Approval Info</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Requested By</div>
                  <div className="text-base text-gray-900">{bill.created_by}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Submitted Date</div>
                  <div className="text-base text-gray-900">{bill.request_date}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Checked By</div>
                  <div className="text-base text-gray-900">—</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Approved By</div>
                  <div className="text-base text-gray-900">—</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions (contextual based on status) */}
          <div className="mt-8 flex items-center justify-end gap-3 pb-8">
            <button
              onClick={() => navigate("/bills")}
              className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Back to List
            </button>

            {bill.status === "awaiting_approval" && (
              <>
                <button
                  onClick={handleReject}
                  className="px-5 py-2.5 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors font-medium"
                >
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium"
                >
                  Approve
                </button>
              </>
            )}

            {bill.status === "approved" && (
              <button
                onClick={handleMarkAsPaid}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium"
              >
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Void Bill Modal */}
      <VoidBillModal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        onConfirm={handleConfirmVoid}
        billReference={bill.reference_no}
        billVendor={vendor.name}
        billAmount={totalAmount}
      />

      {/* Approve/Reject Modal */}
      <ApproveRejectModal
        isOpen={approveRejectModal.isOpen}
        onClose={() => setApproveRejectModal({ isOpen: false, action: "approve" })}
        onConfirm={handleConfirmApproveReject}
        action={approveRejectModal.action}
        billReference={bill.reference_no}
        billVendor={vendor.name}
        billAmount={totalAmount}
        billPriority={formatPriority(bill.priority_level) as "Urgent" | "High" | "Standard" | "Low"}
      />
    </div>
  );
}
