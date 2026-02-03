import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { VoidBillModal } from "./VoidBillModal";
import { ChevronRight, AlertCircle, Plus, X, Upload } from "lucide-react";
import { getBillById, updateBill } from "../services/bills.service";
import { createVendor, listVendors } from "../services/vendors.service";
import type { PaymentMethod, PriorityLevel, Vendor } from "../types/billing";

interface PaymentBreakdown {
  id: string;
  category: string;
  description: string;
  amount: string;
}

export function EditBillPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [billStatus, setBillStatus] = useState<string | null>(null);

  const [vendorInput, setVendorInput] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorOptions, setVendorOptions] = useState<Vendor[]>([]);
  const [isVendorLoading, setIsVendorLoading] = useState(false);

  const [referenceNumber, setReferenceNumber] = useState("");
  const [requestDate, setRequestDate] = useState("");
  const [priority, setPriority] = useState("Standard");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [reasonForPayment, setReasonForPayment] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const [breakdowns, setBreakdowns] = useState<PaymentBreakdown[]>([]);

  const priorityMap: Record<string, PriorityLevel> = useMemo(
    () => ({
      Urgent: "urgent",
      High: "high",
      Standard: "standard",
      Low: "low"
    }),
    []
  );

  const paymentMethodMap: Record<string, PaymentMethod> = useMemo(
    () => ({
      "Bank Transfer": "bank_transfer",
      Check: "check",
      Cash: "cash",
      Other: "other"
    }),
    []
  );

  const canEdit = billStatus === "draft" || billStatus === "awaiting_approval";

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
          return;
        }

        const { bill, vendor, breakdowns: lineItems } = result.data;
        setBillStatus(bill.status);
        setVendorInput(vendor.name);
        setSelectedVendor(vendor);
        setReferenceNumber(bill.reference_no);
        setRequestDate(bill.request_date);
        setPriority(
          bill.priority_level === "urgent"
            ? "Urgent"
            : bill.priority_level === "high"
            ? "High"
            : bill.priority_level === "low"
            ? "Low"
            : "Standard"
        );
        setPaymentMethod(
          bill.payment_method === "bank_transfer"
            ? "Bank Transfer"
            : bill.payment_method === "check"
            ? "Check"
            : bill.payment_method === "cash"
            ? "Cash"
            : "Other"
        );
        setBankName(bill.bank_name || "");
        setAccountHolder(bill.bank_account_name || "");
        setAccountNumber(bill.bank_account_no || "");
        setReasonForPayment(bill.remarks || "");
        setAttachments([]);
        setBreakdowns(
          lineItems.map((b, idx) => ({
            id: b.id || idx.toString(),
            category: b.category,
            description: b.description || "",
            amount: String(b.amount ?? "")
          }))
        );
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(error.message || "Failed to load bill.");
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

  const getStatusColor = (status: string) => {
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

  const formatStatus = (status: string | null) => {
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
        return "—";
    }
  };

  const addBreakdownLine = () => {
    setBreakdowns([
      ...breakdowns,
      { id: Date.now().toString(), category: "Savings", description: "", amount: "" }
    ]);
  };

  const removeBreakdownLine = (lineId: string) => {
    if (breakdowns.length > 1) {
      setBreakdowns(breakdowns.filter((b) => b.id !== lineId));
    }
  };

  const updateBreakdown = (lineId: string, field: keyof PaymentBreakdown, value: string) => {
    setBreakdowns(breakdowns.map((b) => (b.id === lineId ? { ...b, [field]: value } : b)));
  };

  const calculateTotal = () => {
    return breakdowns.reduce((sum, b) => {
      const amount = parseFloat(b.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setNewFiles([...newFiles, ...filesArray]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const removeNewFile = (index: number) => {
    setNewFiles(newFiles.filter((_, i) => i !== index));
  };

  const handleSaveChanges = async () => {
    if (!id) return;
    if (!canEdit) {
      setErrorMessage("This bill can no longer be edited.");
      return;
    }
    setErrorMessage(null);
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

    const totalAmount = calculateTotal();

    const payload = {
      bill: {
        vendor_id: vendorId,
        reference_no: referenceNumber,
        request_date: requestDate,
        priority_level: priorityMap[priority] || "standard",
        payment_method: paymentMethodMap[paymentMethod] || "bank_transfer",
        bank_name: bankName || null,
        bank_account_name: accountHolder || null,
        bank_account_no: accountNumber || null,
        remarks: reasonForPayment || null,
        total_amount: totalAmount
      },
      breakdowns: breakdowns.map((b) => ({
        category: b.category,
        description: b.description ? b.description : "",
        amount: parseFloat(b.amount) || 0
      }))
    };

    const result = await updateBill(id, payload);
    setIsSaving(false);

    if (result.error) {
      setErrorMessage(result.error || "Failed to update bill.");
      return;
    }

    navigate(`/bills/${id}`);
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel? All unsaved changes will be lost.")) {
      navigate("/bills");
    }
  };

  const handleConfirmVoid = () => {
    if (!id) return;
    console.log("Voiding bill...", {
      vendorInput,
      requestDate,
      priority,
      paymentMethod,
      bankName,
      accountHolder,
      accountNumber,
      breakdowns,
      reasonForPayment,
      attachments,
      newFiles
    });
    setIsVoidModalOpen(false);
    navigate("/bills");
  };

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

  if (errorMessage && !billStatus) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-[1440px] mx-auto px-6 py-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Bill not found</h1>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
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
          {/* Edit Mode Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Editing Payment Request</span>
          </div>

          {!canEdit && (
            <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              This bill is {formatStatus(billStatus)} and can no longer be edited.
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

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
                    billStatus || ""
                  )}`}
                >
                  {formatStatus(billStatus)}
                </span>
              </div>
              <p className="text-lg text-gray-600">{referenceNumber}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel Edit
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={!canEdit || isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveChanges(); }}>
            <fieldset disabled={!canEdit || isSaving} className="space-y-6">
              {/* SECTION 1 — Payee & Reference */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payee & Reference</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <label className="block text-sm font-medium text-gray-500 mb-1.5">
                      Reference Number
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                      {referenceNumber}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Reference number cannot be edited</p>
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

              {/* SECTION 2 — Payment Method */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>

                <div className="space-y-3 mb-4">
                  {["Bank Transfer", "Check", "Cash", "Other"].map((method) => (
                    <label key={method} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">{method}</span>
                    </label>
                  ))}
                </div>

                {paymentMethod === "Bank Transfer" && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1.5">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          id="bankName"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., BDO, BPI, Metrobank"
                        />
                      </div>

                      <div>
                        <label htmlFor="accountHolder" className="block text-sm font-medium text-gray-700 mb-1.5">
                          Account Holder Name
                        </label>
                        <input
                          type="text"
                          id="accountHolder"
                          value={accountHolder}
                          onChange={(e) => setAccountHolder(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Full name as registered"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1.5">
                          Bank Account Number
                        </label>
                        <input
                          type="text"
                          id="accountNumber"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Account number"
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {breakdowns.map((breakdown) => (
                        <tr key={breakdown.id}>
                          <td className="px-4 py-3">
                            <select
                              value={breakdown.category}
                              onChange={(e) => updateBreakdown(breakdown.id, "category", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                              <option value="Savings">Savings</option>
                              <option value="Loan Assistance">Loan Assistance</option>
                              <option value="Car Amortization">Car Amortization</option>
                              <option value="SMS Allowance">SMS Allowance</option>
                              <option value="Gas Allowance">Gas Allowance</option>
                              <option value="Other">Other</option>
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

              {/* SECTION 4 — Reason for Payment */}
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

              {/* SECTION 5 — Attachments */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>

                {/* Existing Attachments */}
                {attachments.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Existing Attachments</p>
                    <div className="space-y-2">
                      {attachments.map((attachment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
                        >
                          <span className="text-sm text-gray-900">{attachment}</span>
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
                  </div>
                )}

                {/* New File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
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

                {newFiles.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">New Attachments</p>
                    <div className="space-y-2">
                      {newFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-md border border-blue-200">
                          <span className="text-sm text-gray-900">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeNewFile(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-500 mt-3">Attach scanned forms or proof</p>
              </div>

              {/* SECTION 6 — Request & Approval Info (Read-only) */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Request & Approval Info</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Requested By</div>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                      —
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Submitted Date</div>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                      {requestDate}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Checked By</div>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                      —
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Approved By</div>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                      —
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Approval information is read-only and cannot be modified
                </p>
              </div>
            </fieldset>

            {/* Footer Actions */}
            <div className="mt-8 flex items-center justify-end gap-3 pb-8">
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canEdit || isSaving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Void Bill Modal */}
      <VoidBillModal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        onConfirm={handleConfirmVoid}
        billReference={referenceNumber}
        billVendor={vendorInput}
        billAmount={calculateTotal()}
      />
    </div>
  );
}
