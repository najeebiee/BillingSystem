import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { VoidBillModal } from './VoidBillModal';
import { ChevronRight, AlertCircle, Plus, X, Upload } from 'lucide-react';
import { Bill, getBillById } from '../data/mockBills';

interface PaymentBreakdown {
  id: string;
  category: string;
  description: string;
  amount: string;
}

export function EditBillPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bill = id ? getBillById(id) : undefined;

  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-[1440px] mx-auto px-6 py-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Bill not found</h1>
            <p className="text-gray-600 mb-4">
              The bill you are trying to edit does not exist.
            </p>
            <Link to="/bills" className="text-blue-600 hover:text-blue-700 font-medium">
              Back to Bills
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [vendor, setVendor] = useState(bill.vendor);
  const [requestDate, setRequestDate] = useState(bill.date);
  const [priority, setPriority] = useState(bill.priority);
  const [paymentMethod, setPaymentMethod] = useState(bill.paymentMethod);
  const [bankName, setBankName] = useState(bill.bankName || '');
  const [accountHolder, setAccountHolder] = useState(bill.accountHolder || '');
  const [accountNumber, setAccountNumber] = useState(bill.accountNumber || '');
  const [reasonForPayment, setReasonForPayment] = useState(bill.reasonForPayment);
  const [attachments, setAttachments] = useState<string[]>(bill.attachments);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const [breakdowns, setBreakdowns] = useState<PaymentBreakdown[]>(
    bill.breakdowns.map((b, idx) => ({
      id: idx.toString(),
      category: b.category,
      description: b.description,
      amount: b.amount.toString()
    }))
  );

  const getStatusColor = (status: Bill['status']) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-700';
      case 'Awaiting Approval':
        return 'bg-yellow-100 text-yellow-700';
      case 'Approved':
        return 'bg-blue-100 text-blue-700';
      case 'Paid':
        return 'bg-green-100 text-green-700';
      case 'Void':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const addBreakdownLine = () => {
    setBreakdowns([
      ...breakdowns,
      { id: Date.now().toString(), category: 'Savings', description: '', amount: '' }
    ]);
  };

  const removeBreakdownLine = (id: string) => {
    if (breakdowns.length > 1) {
      setBreakdowns(breakdowns.filter(b => b.id !== id));
    }
  };

  const updateBreakdown = (id: string, field: keyof PaymentBreakdown, value: string) => {
    setBreakdowns(breakdowns.map(b => 
      b.id === id ? { ...b, [field]: value } : b
    ));
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

  const handleSaveChanges = () => {
    console.log('Saving changes...', {
      vendor,
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
    navigate(`/bills/${bill.id}`);
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      navigate('/bills');
    }
  };

  const handleConfirmVoid = () => {
    console.log('Voiding bill...', {
      vendor,
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
    navigate('/bills');
    setIsVoidModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <div className="max-w-[1440px] mx-auto px-6 py-8">
          {/* Edit Mode Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Editing Payment Request</span>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <button onClick={() => navigate('/bills')} className="hover:text-blue-600">
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
                  {bill.status}
                </span>
              </div>
              <p className="text-lg text-gray-600">{bill.reference}</p>
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveChanges(); }}>
            <div className="space-y-6">
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
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Select or type vendor name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1.5">
                      Reference Number
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                      {bill.reference}
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
                      onChange={(e) => setPriority(e.target.value as Bill['priority'])}
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
                  {['Bank Transfer', 'Check', 'Cash', 'Other'].map((method) => (
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

                {paymentMethod === 'Bank Transfer' && (
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
                              onChange={(e) => updateBreakdown(breakdown.id, 'category', e.target.value)}
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
                              onChange={(e) => updateBreakdown(breakdown.id, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="Brief description"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              value={breakdown.amount}
                              onChange={(e) => updateBreakdown(breakdown.id, 'amount', e.target.value)}
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
                      ₱{calculateTotal().toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    </label>
                    {' '}or drag and drop
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
                      {bill.requestedBy}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Submitted Date</div>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                      {bill.submittedDate || bill.date}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Checked By</div>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                      {bill.checkedBy || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Approved By</div>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                      {bill.approvedBy || '—'}
                    </div>
                  </div>
                  {bill.approvedDate && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Approved Date</div>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                        {bill.approvedDate}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Approval information is read-only and cannot be modified
                </p>
              </div>
            </div>

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
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
              >
                Save Changes
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
        billReference={bill.reference}
        billVendor={bill.vendor}
        billAmount={calculateTotal()}
      />
    </div>
  );
}
