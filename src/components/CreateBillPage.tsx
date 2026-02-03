import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, X, Upload } from 'lucide-react';

interface PaymentBreakdown {
  id: string;
  category: string;
  description: string;
  amount: string;
}

export function CreateBillPage() {
  const [vendor, setVendor] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [priority, setPriority] = useState('Standard');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [reasonForPayment, setReasonForPayment] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const navigate = useNavigate();

  const [breakdowns, setBreakdowns] = useState<PaymentBreakdown[]>([
    { id: '1', category: 'Savings', description: '', amount: '' }
  ]);

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
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting bill...');
    // Handle form submission
    navigate('/bills');
  };

  const handleSaveDraft = () => {
    console.log('Saving draft...');
    navigate('/bills');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <div className="max-w-[1440px] mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <button onClick={() => navigate('/bills')} className="hover:text-blue-600">
              Bills
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">New Bill</span>
          </div>

          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">New Payment Request</h1>
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
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Select or type vendor name"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Reference Number <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="reference"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="PRF-MMDDYY-XXX"
                      required
                    />
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

              {/* SECTION 6 — Request & Approval Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Request & Approval Info</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Requested By
                    </label>
                    <input
                      type="text"
                      value="Kenny (Current User)"
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
            <div className="mt-8 flex items-center justify-end gap-3 pb-8">
              <button
                type="button"
                onClick={() => navigate('/bills')}
                className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Save as Draft
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium"
              >
                Submit for Approval
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
