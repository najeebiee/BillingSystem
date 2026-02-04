import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface VoidBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  billReference: string;
  billVendor: string;
  billAmount: number;
}

export function VoidBillModal({
  isOpen,
  onClose,
  onConfirm,
  billReference,
  billVendor,
  billAmount
}: VoidBillModalProps) {
  const [voidReason, setVoidReason] = useState('');

  // Reset reason when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setVoidReason('');
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
    if (voidReason.trim()) {
      onConfirm(voidReason);
      setVoidReason('');
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
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Void Payment Request</h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Warning Message */}
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">
              Voiding this payment request will permanently cancel it.
              This action cannot be undone and the request will no longer be payable.
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

            <div>
              <div className="text-xs text-gray-500 mb-1">Vendor / Payee</div>
              <div className="text-sm font-medium text-gray-900">{billVendor}</div>
            </div>
          </div>

          {/* Void Reason Input */}
          <div>
            <label htmlFor="voidReason" className="block text-sm font-medium text-gray-900 mb-1.5">
              Reason for Voiding <span className="text-red-600">*</span>
            </label>
            <textarea
              id="voidReason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              placeholder="Enter the reason for voiding this payment request..."
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Please provide a reason for audit purposes.
            </p>
          </div>

          {/* Additional Warning */}
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <p>
              Voided requests are retained for audit history but cannot be edited or paid.
            </p>
          </div>
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
            disabled={!voidReason.trim()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
          >
            Confirm Void
          </button>
        </div>
      </div>
    </div>
  );
}
