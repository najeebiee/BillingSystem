import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { VoidBillModal } from "./VoidBillModal";
import { ApproveRejectModal } from "./ApproveRejectModal";
import { ChevronRight, Printer, Download, Edit2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getUserDisplayName } from "../auth/userDisplayName";
import { getBillById, updateBillStatus } from "../services/bills.service";
import type { BillDetails } from "../types/billing";
import { buildReceiptHtml as buildPrintReceiptHtml } from "../print/receiptTemplate";
import { printReceipt } from "../print/printReceipt";
import {
  buildA4Html,
  buildReceiptHtml as buildReceiptPdfHtml,
  type PdfTemplateData
} from "../pdf/pdfTemplates";
import { exportHtmlToPdf } from "../pdf/exportPdf";
import { downloadBillAttachment } from "../services/billAttachments.service";

export function ViewBillPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [billDetails, setBillDetails] = useState<BillDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
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

  useEffect(() => {
    const state = location.state as { attachmentError?: string } | null;
    if (state?.attachmentError) {
      setActionError(state.attachmentError);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const bill = billDetails?.bill;
  const vendor = billDetails?.vendor;
  const breakdowns = billDetails?.breakdowns ?? [];
  const attachments = billDetails?.attachments ?? [];

  const getStatusColor = (status?: string) => {
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
      case "rejected":
        return "Rejected";
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

  const handleConfirmApproveReject = async (notes: string) => {
    if (!bill) return;
    if (isUpdatingStatus) return;

    const nextStatus = approveRejectModal.action === "approve" ? "approved" : "rejected";
    setActionError(null);
    setIsUpdatingStatus(true);
    const result = await updateBillStatus(
      bill.id,
      nextStatus,
      approveRejectModal.action === "reject" ? notes : null
    );
    setIsUpdatingStatus(false);

    if (result.error) {
      setActionError(result.error);
      return;
    }

    setBillDetails((prev) =>
      prev
        ? {
            ...prev,
            bill: {
              ...prev.bill,
              status: nextStatus,
              rejection_reason: nextStatus === "rejected" ? notes.trim() : null
            }
          }
        : prev
    );
    setApproveRejectModal({ isOpen: false, action: "approve" });
  };

  const handleMarkAsPaid = async () => {
    if (!bill) return;
    if (isUpdatingStatus) return;
    setActionError(null);
    setIsUpdatingStatus(true);
    const result = await updateBillStatus(bill.id, "paid");
    setIsUpdatingStatus(false);

    if (result.error) {
      setActionError(result.error);
      return;
    }

    setBillDetails((prev) =>
      prev ? { ...prev, bill: { ...prev.bill, status: "paid" } } : prev
    );
  };

  const handleVoid = () => {
    setIsVoidModalOpen(true);
  };

  const handleConfirmVoid = async (_reason: string) => {
    if (!bill) return;
    if (isUpdatingStatus) return;

    setActionError(null);
    setIsUpdatingStatus(true);
    const result = await updateBillStatus(bill.id, "void");
    setIsUpdatingStatus(false);

    if (result.error) {
      setActionError(result.error);
      return;
    }

    setBillDetails((prev) =>
      prev ? { ...prev, bill: { ...prev.bill, status: "void" } } : prev
    );
    setIsVoidModalOpen(false);
  };

  const handleEdit = () => {
    if (!bill) return;
    navigate(`/bills/${bill.id}/edit`);
  };

  const totalAmount = roundMoney(
    breakdowns.reduce((sum, b) => sum + roundMoney(b.amount), 0)
  );
  const resolvedTotalAmount = roundMoney(bill?.total_amount) > 0 ? roundMoney(bill?.total_amount) : totalAmount;
  const currentUserDisplayName = getUserDisplayName(user);
  const requestedByDisplay =
    bill?.created_by === user?.id ? currentUserDisplayName : bill?.created_by || "-";

  useEffect(() => {
    if (bill?.reference_no) {
      document.title = `${bill.reference_no} | GuildLedger`;
      return;
    }
    document.title = "Bill Details | GuildLedger";
  }, [bill?.reference_no]);

  const buildPdfTemplateData = (): PdfTemplateData | null => {
    if (!bill || !vendor) return;

    return {
      reference_no: bill.reference_no,
      request_date: bill.request_date,
      status: bill.status,
      vendor_name: vendor.name,
      requester_name: requestedByDisplay,
      checked_by: "-",
      approved_by: "-",
      breakdowns: breakdowns.map((breakdown) => ({
        description: breakdown.description,
        amount: breakdown.amount,
        payment_method: breakdown.payment_method,
        bank_name: breakdown.bank_name,
        bank_account_name: breakdown.bank_account_name,
        bank_account_no: breakdown.bank_account_no
      })),
      total_amount: resolvedTotalAmount,
      remarks: bill.remarks || "",
      attachments: attachments.map((attachment) => attachment.file_name),
      company_name: "GuildLedger"
    };
  };

  const handlePrintReceipt = () => {
    const templateData = buildPdfTemplateData();
    if (!templateData) return;

    const receiptHtml = buildPrintReceiptHtml(
      {
        reference_no: templateData.reference_no,
        request_date: templateData.request_date,
        status: templateData.status,
        vendor_name: templateData.vendor_name,
        requester_name: templateData.requester_name,
        breakdowns: templateData.breakdowns,
        total_amount: templateData.total_amount,
        remarks: templateData.remarks,
        company_name: templateData.company_name
      },
      { paper: "80mm" }
    );

    printReceipt(receiptHtml);
  };

  const handleDownloadA4Pdf = async () => {
    const templateData = buildPdfTemplateData();
    if (!templateData) return;

    const a4Html = buildA4Html(templateData);
    await exportHtmlToPdf({
      html: a4Html,
      filename: `PRF-${templateData.reference_no}-A4.pdf`,
      preset: "A4"
    });
  };

  const handleDownloadReceiptPdf = async () => {
    const templateData = buildPdfTemplateData();
    if (!templateData) return;

    const receiptHtml = buildReceiptPdfHtml(templateData, { paper: "80mm" });
    await exportHtmlToPdf({
      html: receiptHtml,
      filename: `PRF-${templateData.reference_no}-RECEIPT-80mm.pdf`,
      preset: "RECEIPT_80"
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
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
        <div className="max-w-[1600px] mx-auto px-6 py-8">
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
        <div className="max-w-[1600px] mx-auto px-6 py-8">
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
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-semibold text-gray-900">Payment Request</h1>
                <span
                  className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                    bill.status
                  )}`}
                >
                  {formatStatus(bill.status)}
                </span>
                <span className="text-lg text-gray-600 font-medium">{bill.reference_no}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrintReceipt}
                disabled={!billDetails}
                className="p-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                title="Print Receipt"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                onClick={handleDownloadA4Pdf}
                disabled={!billDetails}
                className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
                title="Download A4 PDF"
              >
                <span className="inline-flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download PDF
                </span>
              </button>
              <button
                onClick={handleDownloadReceiptPdf}
                disabled={!billDetails}
                className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
                title="Download Receipt PDF"
              >
                <span className="inline-flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download Receipt PDF
                </span>
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

          {actionError && (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}

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

            {/* SECTION 2 -- Payment Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Breakdown</h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Payment Method
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
                      <React.Fragment key={breakdown.id || index}>
                        <tr>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatPaymentMethod(breakdown.payment_method)}
                          </td>
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
                        {breakdown.payment_method === "bank_transfer" && (
                          <tr>
                            <td colSpan={3} className="px-4 pb-4">
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-sm font-medium text-gray-500 mb-1">Bank Name</div>
                                    <div className="text-base text-gray-900">
                                      {breakdown.bank_name || "—"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-500 mb-1">Account Holder Name</div>
                                    <div className="text-base text-gray-900">
                                      {breakdown.bank_account_name || "—"}
                                    </div>
                                  </div>
                                  <div className="md:col-span-2">
                                    <div className="text-sm font-medium text-gray-500 mb-1">Bank Account Number</div>
                                    <div className="text-base text-gray-900 font-mono">
                                      {breakdown.bank_account_no
                                        ? maskAccountNumber(breakdown.bank_account_no)
                                        : "—"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Amount */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    ₱{resolvedTotalAmount.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3 -- Reason for Payment */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reason for Payment</h2>
              <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {bill.remarks || "No remarks provided"}
                </p>
              </div>
            </div>

            {bill.status === "rejected" && bill.rejection_reason && (
              <div className="bg-white rounded-lg border border-orange-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Rejection Reason</h2>
                <div className="bg-orange-50 rounded-md p-4 border border-orange-200">
                  <p className="text-sm text-orange-900 whitespace-pre-wrap">
                    {bill.rejection_reason}
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 4 -- Attachments */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>
              {attachments.length === 0 ? (
                <p className="text-sm text-gray-500">No attachments</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
                    >
                      <span className="text-sm text-gray-900">{attachment.file_name}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await downloadBillAttachment(
                            attachment.file_path,
                            attachment.file_name
                          );
                          if (result.error) {
                            setActionError(result.error);
                          }
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 5 -- Request & Approval Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Request & Approval Info</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Requested By</div>
                  <div className="text-base text-gray-900">{requestedByDisplay}</div>
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
                disabled={isUpdatingStatus}
                className="px-5 py-2.5 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors font-medium"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={isUpdatingStatus}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium"
              >
                Approve
              </button>
            </>
          )}

            {bill.status === "approved" && (
              <button
                onClick={handleMarkAsPaid}
                disabled={isUpdatingStatus}
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
        billAmount={resolvedTotalAmount}
      />

      {/* Approve/Reject Modal */}
      <ApproveRejectModal
        isOpen={approveRejectModal.isOpen}
        onClose={() => setApproveRejectModal({ isOpen: false, action: "approve" })}
        onConfirm={handleConfirmApproveReject}
        action={approveRejectModal.action}
        billReference={bill.reference_no}
        billVendor={vendor.name}
        billAmount={resolvedTotalAmount}
        billPriority={formatPriority(bill.priority_level) as "Urgent" | "High" | "Standard" | "Low"}
      />
    </div>
  );
}

function roundMoney(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
