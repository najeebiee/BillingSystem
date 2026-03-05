import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, X, Upload } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { createBill, type ServiceError } from "../services/bills.service";
import { uploadBillAttachments } from "../services/billAttachments.service";
import { createVendor, listVendors } from "../services/vendors.service";
import type { PaymentMethod, PriorityLevel, Vendor } from "../types/billing";
interface PaymentBreakdown {
  id: string;
  payment_method: PaymentMethod;
  description: string;
  amount: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_no: string;
}
export function CreateBillPage() {
  const [vendorInput, setVendorInput] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorOptions, setVendorOptions] = useState<Vendor[]>([]);
  const [isVendorLoading, setIsVendorLoading] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [requestDate, setRequestDate] = useState("");
  const [priority, setPriority] = useState("Standard");
  const [reasonForPayment, setReasonForPayment] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [breakdowns, setBreakdowns] = useState<PaymentBreakdown[]>([
    {
      id: "1",
      payment_method: "bank_transfer",
      description: "",
      amount: "",
      bank_name: "",
      bank_account_name: "",
      bank_account_no: ""
    }
  ]);
  const priorityMap: Record<string, PriorityLevel> = useMemo(
    () => ({
      Urgent: "urgent",
      High: "high",
      Standard: "standard",
      Low: "low"
    }),
    []
  );
  useEffect(() => {
    document.title = "Create New Bill | GuildLedger";
  }, []);
  const formatPaymentMethod = (method: PaymentMethod) => {
    switch (method) {
      case "bank_transfer":
        return "Bank Transfer";
      case "check":
        return "Check";
      case "cash":
        return "Cash";
      default:
        return "Other";
    }
  };
  useEffect(() => {
    let isMounted = true;
    if (!vendorInput.trim()) {
      setVendorOptions([]);
      return;
    }
    setIsVendorLoading(true);
    listVendors(vendorInput)
      .then((result) => {
        if (!isMounted) return;
        if (result.error) {
          setVendorOptions([]);
        } else {
          setVendorOptions(result.data);
        }
      })
      .finally(() => {
        if (!isMounted) return;
        setIsVendorLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [vendorInput]);
  const isDuplicatePrfError = (error: string | ServiceError | null | undefined) =>
    typeof error === "object" && error?.code === "DUPLICATE_PRF";
  const addBreakdownLine = () => {
    setBreakdowns([
      ...breakdowns,
      {
        id: Date.now().toString(),
        payment_method: "bank_transfer",
        description: "",
        amount: "",
        bank_name: "",
        bank_account_name: "",
        bank_account_no: ""
      }
    ]);
  };
  const removeBreakdownLine = (id: string) => {
    if (breakdowns.length > 1) {
      setBreakdowns(breakdowns.filter((b) => b.id !== id));
    }
  };
  const updateBreakdown = (id: string, field: keyof PaymentBreakdown, value: string) => {
    setBreakdowns(
      breakdowns.map((b) => {
        if (b.id !== id) return b;
        if (field === "payment_method" && value !== "bank_transfer") {
          return {
            ...b,
            payment_method: value as PaymentMethod,
            bank_name: "",
            bank_account_name: "",
            bank_account_no: ""
          };
        }
        return { ...b, [field]: value };
      })
    );
  };
  const calculateTotal = () => {
    return roundMoney(
      breakdowns.reduce((sum, b) => {
        const amount = roundMoney(b.amount);
        return sum + amount;
      }, 0)
    );
  };
  const addFiles = (files: FileList | File[]) => {
    const nextFiles = Array.from(files);
    if (nextFiles.length === 0) return;
    setAttachments((prev) => [...prev, ...nextFiles]);
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(e.target.files);
    e.target.value = "";
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (!e.dataTransfer.files) return;
    addFiles(e.dataTransfer.files);
  };
  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };
  const createBillRecord = async (status: "draft" | "awaiting_approval") => {
    setErrorMessage(null);
    setReferenceError(null);
    if (!user) {
      setErrorMessage("You must be logged in to create a bill.");
      return;
    }
    if (!vendorInput.trim()) {
      setErrorMessage("Vendor name is required.");
      return;
    }
    if (!requestDate) {
      setErrorMessage("Request date is required.");
      return;
    }
    if (breakdowns.length === 0) {
      setErrorMessage("At least one breakdown line is required.");
      return;
    }
    const missingBankDetails = breakdowns.some(
      (b) =>
        b.payment_method === "bank_transfer" &&
        (!b.bank_name.trim() || !b.bank_account_name.trim() || !b.bank_account_no.trim())
    );
    if (missingBankDetails) {
      setErrorMessage("Bank name, account holder, and account number are required for Bank Transfer lines.");
      return;
    }
    const hasInvalidAmount = breakdowns.some((b) => {
      const parsed = parseFloat(b.amount);
      return !Number.isFinite(parsed) || parsed <= 0;
    });
    if (hasInvalidAmount) {
      setErrorMessage("All breakdown amounts must be greater than 0.");
      return;
    }
    const totalAmount = calculateTotal();
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setErrorMessage("Total amount must be greater than 0.");
      return;
    }
    setIsSaving(true);
    let vendorId = selectedVendor?.id;
    if (!vendorId) {
      const vendorResult = await createVendor(vendorInput.trim());
      if (vendorResult.error || !vendorResult.data) {
        setIsSaving(false);
        setErrorMessage(vendorResult.error || "Failed to create vendor.");
        return;
      }
      vendorId = vendorResult.data.id;
    }
    const primaryPaymentMethod = breakdowns[0]?.payment_method ?? "other";
    const payload = {
      bill: {
        vendor_id: vendorId,
        reference_no: referenceNumber,
        request_date: requestDate,
        priority_level: priorityMap[priority] || "standard",
        payment_method: primaryPaymentMethod,
        bank_name: null,
        bank_account_name: null,
        bank_account_no: null,
        status,
        remarks: reasonForPayment || null,
        total_amount: totalAmount,
        created_by: user.id
      },
      breakdowns: breakdowns.map((b) => ({
        payment_method: b.payment_method,
        description: b.description ? b.description : "",
        amount: roundMoney(b.amount),
        bank_name: b.payment_method === "bank_transfer" ? b.bank_name || null : null,
        bank_account_name: b.payment_method === "bank_transfer" ? b.bank_account_name || null : null,
        bank_account_no: b.payment_method === "bank_transfer" ? b.bank_account_no || null : null
      }))
    };
    const result = await createBill(payload);
    if (result.error || !result.data) {
      setIsSaving(false);
      if (isDuplicatePrfError(result.error)) {
        setReferenceError(
          "Warning: PRF already existing. Please choose another PRF or leave blank to auto-generate."
        );
        return;
      }
      const message = typeof result.error === "string" ? result.error : result.error?.message;
      setErrorMessage(message || "Failed to create bill.");
      return;
    }

    if (attachments.length > 0) {
      const attachmentResult = await uploadBillAttachments(result.data.id, attachments, user.id);
      if (attachmentResult.error) {
        setIsSaving(false);
        navigate(`/bills/${result.data.id}`, {
          state: {
            attachmentError: `Bill created, but attachment upload failed: ${attachmentResult.error}`
          }
        });
        return;
      }
    }

    setIsSaving(false);
    navigate(`/bills/${result.data.id}`);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createBillRecord("awaiting_approval");
  };
  const handleSaveDraft = async () => {
    await createBillRecord("draft");
  };
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
            <span className="text-gray-900">New Bill</span>
          </div>
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Create New Bill</h1>
            <p className="text-gray-600 mt-1">Create a new payment request for approval</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* SECTION 1 — Payee & Reference */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payee & Reference</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vendor" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Vendor / Payee <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="vendor"
                      value={vendorInput}
                      onChange={(e) => {
                        setVendorInput(e.target.value);
                        setSelectedVendor(null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Select or type vendor name"
                      required
                    />
                    {isVendorLoading && (
                      <div className="text-xs text-gray-500 mt-1">Searching vendors...</div>
                    )}
                    {vendorOptions.length > 0 && !selectedVendor && (
                      <div className="mt-2 border border-gray-200 rounded-md bg-white shadow-sm max-h-40 overflow-auto">
                        {vendorOptions.map((vendor) => (
                          <button
                            type="button"
                            key={vendor.id}
                            onClick={() => {
                              setSelectedVendor(vendor);
                              setVendorInput(vendor.name);
                              setVendorOptions([]);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                          >
                            {vendor.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      id="reference"
                      value={referenceNumber}
                      onChange={(e) => {
                        setReferenceNumber(e.target.value);
                        setReferenceError(null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optional"
                    />
                    {referenceError ? (
                      <p className="text-xs text-red-600 mt-1">{referenceError}</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">Leave blank to auto-generate.</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Format hint: MMDDYY-###</p>
                  </div>
                  <div>
                    <label htmlFor="requestDate" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Request Date <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      id="requestDate"
                      value={requestDate}
                      onChange={(e) => setRequestDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Priority Level
                    </label>
                    <select
                      id="priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Urgent">Urgent</option>
                      <option value="High">High</option>
                      <option value="Standard">Standard</option>
                      <option value="Low">Low</option>
                    </select>
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
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {breakdowns.map((breakdown) => (
                        <React.Fragment key={breakdown.id}>
                          <tr>
                            <td className="px-4 py-3">
                              <select
                                value={breakdown.payment_method}
                                onChange={(e) =>
                                  updateBreakdown(breakdown.id, "payment_method", e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              >
                                {(["bank_transfer", "check", "cash", "other"] as PaymentMethod[]).map((method) => (
                                  <option key={method} value={method}>
                                    {formatPaymentMethod(method)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={breakdown.description}
                                onChange={(e) => updateBreakdown(breakdown.id, "description", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="Brief description"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                value={breakdown.amount}
                                onChange={(e) => updateBreakdown(breakdown.id, "amount", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-right"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => removeBreakdownLine(breakdown.id)}
                                disabled={breakdowns.length === 1}
                                className="text-red-600 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                          {breakdown.payment_method === "bank_transfer" && (
                            <tr>
                              <td colSpan={4} className="px-4 pb-4">
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Bank Name
                                      </label>
                                      <input
                                        type="text"
                                        value={breakdown.bank_name}
                                        onChange={(e) =>
                                          updateBreakdown(breakdown.id, "bank_name", e.target.value)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., BDO, BPI, Metrobank"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Account Holder Name
                                      </label>
                                      <input
                                        type="text"
                                        value={breakdown.bank_account_name}
                                        onChange={(e) =>
                                          updateBreakdown(breakdown.id, "bank_account_name", e.target.value)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Full name as registered"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Bank Account Number
                                      </label>
                                      <input
                                        type="text"
                                        value={breakdown.bank_account_no}
                                        onChange={(e) =>
                                          updateBreakdown(breakdown.id, "bank_account_no", e.target.value)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Account number"
                                      />
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
                <button
                  type="button"
                  onClick={addBreakdownLine}
                  className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Breakdown Line
                </button>
                {/* Total Amount */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                    <div className="text-2xl font-semibold text-gray-900">
                      ₱{calculateTotal().toLocaleString("en-PH", {
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
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Reason for Payment / Remarks
                  </label>
                  <textarea
                    id="reason"
                    value={reasonForPayment}
                    onChange={(e) => setReasonForPayment(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Brief explanation or supporting details..."
                  />
                  <p className="text-sm text-gray-500 mt-1.5">Brief explanation or supporting details</p>
                </div>
              </div>
              {/* SECTION 4 -- Attachments */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300"
                  }`}
                >
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <div className="text-sm text-gray-600 mb-2">
                    <label htmlFor="file-upload" className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                      Click to upload
                    </label>{" "}
                    or drag and drop
                  </div>
                  <p className="text-xs text-gray-500">PDF, JPG, PNG (max 10MB each)</p>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <span className="text-sm text-gray-900">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-3">Attach scanned forms or proof</p>
              </div>
              {/* SECTION 5 -- Request & Approval Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Request & Approval Info</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Requested By
                    </label>
                    <input
                      type="text"
                      value={user?.email || "Current User"}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Checked By
                    </label>
                    <input
                      type="text"
                      value="—"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Approved By
                    </label>
                    <input
                      type="text"
                      value="—"
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-400"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Approval fields will be populated after submission
                </p>
              </div>
            </div>
            {/* Footer Actions */}
            {errorMessage && (
              <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
            <div className="mt-8 flex items-center justify-end gap-3 pb-8">
              <button
                type="button"
                onClick={() => navigate("/bills")}
                className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Save as Draft
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Submit for Approval"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function roundMoney(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
