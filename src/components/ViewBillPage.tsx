import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { VoidBillModal } from './VoidBillModal';
import { ApproveRejectModal } from './ApproveRejectModal';
import { ChevronRight, Printer, Download, Edit2 } from 'lucide-react';
import { Bill, getBillById } from '../data/mockBills';

export function ViewBillPage() {
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
              The bill you are looking for does not exist.
            </p>
            <Link to="/bills" className="text-blue-600 hover:text-blue-700 font-medium">
              Back to Bills
            </Link>
          </div>
        </div>
      </div>
    );
  }
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

  const getPriorityColor = (priority: Bill['priority']) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 text-red-700';
      case 'High':
        return 'bg-orange-100 text-orange-700';
      case 'Standard':
        return 'bg-blue-100 text-blue-700';
      case 'Low':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return '****' + accountNumber.slice(-4);
  };

  const handleApprove = () => {
    setApproveRejectModal({ isOpen: true, action: 'approve' });
  };

  const handleReject = () => {
    setApproveRejectModal({ isOpen: true, action: 'reject' });
  };

  const handleConfirmApproveReject = (notes: string) => {
    console.log(`${approveRejectModal.action}ing bill:`, bill.id, 'Notes:', notes);
    // Handle approve/reject action
    setApproveRejectModal({ isOpen: false, action: 'approve' });
    navigate('/bills');
  };

  const handleMarkAsPaid = () => {
    console.log('Marking as paid:', bill.id);
    // Handle mark as paid action
    navigate('/bills');
  };

  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);

  const handleVoid = () => {
    setIsVoidModalOpen(true);
  };

  const handleConfirmVoid = (reason: string) => {
    console.log('Voiding bill:', bill.id, 'Reason:', reason);
    // Handle void action
    setIsVoidModalOpen(false);
    navigate('/bills');
  };

  const handleEdit = () => {
    console.log('Editing bill:', bill.id);
    navigate(`/bills/${bill.id}/edit`);
  };

  const handlePrint = () => {
    window.print();
  };

  const [approveRejectModal, setApproveRejectModal] = useState({
    isOpen: false,
    action: 'approve' as 'approve' | 'reject'
  });

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
              {bill.status !== 'Paid' && bill.status !== 'Void' && (
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
                  <div className="text-base text-gray-900">{bill.vendor}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Reference Number</div>
                  <div className="text-base text-gray-900 font-medium">{bill.reference}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Request Date</div>
                  <div className="text-base text-gray-900">{bill.date}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Priority Level</div>
                  <div>
                    <span
                      className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${getPriorityColor(
                        bill.priority
                      )}`}
                    >
                      {bill.priority}
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
                  <div className="text-base text-gray-900">{bill.paymentMethod}</div>
                </div>

                {bill.paymentMethod === 'Bank Transfer' && (
                  <>
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Bank Name</div>
                      <div className="text-base text-gray-900">{bill.bankName || '—'}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Account Holder Name</div>
                      <div className="text-base text-gray-900">{bill.accountHolder || '—'}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Bank Account Number</div>
                      <div className="text-base text-gray-900 font-mono">
                        {bill.accountNumber ? maskAccountNumber(bill.accountNumber) : '—'}
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
                    {bill.breakdowns.map((breakdown, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {breakdown.category}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {breakdown.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                          ₱{breakdown.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    ₱{bill.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4 — Reason for Payment */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Reason for Payment</h2>
              <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {bill.reasonForPayment || 'No remarks provided'}
                </p>
              </div>
            </div>

            {/* SECTION 5 — Attachments */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>
              {bill.attachments.length > 0 ? (
                <div className="space-y-2">
                  {bill.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <span className="text-sm text-gray-900">{attachment}</span>
                      <Download className="w-4 h-4 text-gray-600" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No attachments</p>
              )}
            </div>

            {/* SECTION 6 — Request & Approval Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Request & Approval Info</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Requested By</div>
                  <div className="text-base text-gray-900">{bill.requestedBy}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Submitted Date</div>
                  <div className="text-base text-gray-900">{bill.submittedDate || bill.date}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Checked By</div>
                  <div className="text-base text-gray-900">{bill.checkedBy || '—'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Approved By</div>
                  <div className="text-base text-gray-900">{bill.approvedBy || '—'}</div>
                </div>
                {bill.approvedDate && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Approved Date</div>
                    <div className="text-base text-gray-900">{bill.approvedDate}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions (contextual based on status) */}
          <div className="mt-8 flex items-center justify-end gap-3 pb-8">
            <button
              onClick={() => navigate('/bills')}
              className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Back to List
            </button>

            {bill.status === 'Awaiting Approval' && (
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

            {bill.status === 'Approved' && (
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
        billReference={bill.reference}
        billVendor={bill.vendor}
        billAmount={bill.amount}
      />

      {/* Approve/Reject Modal */}
      <ApproveRejectModal
        isOpen={approveRejectModal.isOpen}
        onClose={() => setApproveRejectModal({ isOpen: false, action: 'approve' })}
        onConfirm={handleConfirmApproveReject}
        action={approveRejectModal.action}
        billReference={bill.reference}
        billVendor={bill.vendor}
        billAmount={bill.amount}
        billPriority={bill.priority}
      />
    </div>
  );
}
