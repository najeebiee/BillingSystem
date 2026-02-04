import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ApproveRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  action: 'approve' | 'reject';
  billReference: string;
  billVendor: string;
  billAmount: number;
  billPriority: 'Urgent' | 'High' | 'Standard' | 'Low';
}

export function ApproveRejectModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  billReference,
  billVendor,
  billAmount,
  billPriority
}: ApproveRejectModalProps) {
  const [notes, setNotes] = useState('');

  const isApprove = action === 'approve';

  // Reset notes when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setNotes('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleConfirm = () => {
    // For reject, require notes
    if (!isApprove && !notes.trim()) {
      return;
    }
    onConfirm(notes);
    setNotes('');
  };

  const getPriorityColor = (priority: string) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: 0.5, backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {isApprove ? (
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
            )}
            <h2 className="text-xl font-semibold text-gray-900">
              {isApprove ? 'Approve Payment Request' : 'Reject Payment Request'}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Context Message */}
          <div className={`${isApprove ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} border rounded-md p-4`}>
            <p className={`text-sm ${isApprove ? 'text-green-800' : 'text-orange-800'}`}>
              {isApprove
                ? 'You are about to approve this payment request for processing.'
                : 'You are about to reject this payment request and return it to the requester.'}
            </p>
          </div>

          {/* Bill Details */}
          <div className="bg-gray-50 rounded-md p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Request Details</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Reference Number</div>
                <div className="text-sm font-medium text-gray-900">{billReference}</div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500 mb-1">Total Amount</div>
                <div className="text-sm font-semibold text-gray-900">
                  ₱{billAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Vendor / Payee</div>
                <div className="text-sm font-medium text-gray-900">{billVendor}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Priority Level</div>
                <div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(billPriority)}`}>
                    {billPriority}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes/Reason Input */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-900 mb-1.5">
              {isApprove ? 'Approval Notes' : 'Rejection Reason'}
              {!isApprove && <span className="text-red-600"> *</span>}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 ${
                isApprove ? 'focus:ring-green-500' : 'focus:ring-orange-500'
              } focus:border-transparent resize-none`}
              placeholder={
                isApprove
                  ? 'Optional notes for audit reference...'
                  : 'Enter the reason for rejection...'
              }
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1.5">
              {isApprove
                ? 'Optional notes for audit reference.'
                : 'Please provide a reason for rejection.'}
            </p>
          </div>

          {/* Additional Info for Approval */}
          {isApprove && (
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <p>
                Once approved, this payment request will be ready for payment processing.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isApprove && !notes.trim()}
            className={`px-4 py-2 text-sm text-white rounded-md transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
              isApprove
                ? 'bg-green-600 hover:bg-green-700 disabled:hover:bg-green-600'
                : 'bg-red-600 hover:bg-red-700 disabled:hover:bg-red-600'
            }`}
          >
            {isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
}
