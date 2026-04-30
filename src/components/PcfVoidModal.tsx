import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

interface PcfVoidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pcvNumber: string;
  payee: string;
  amount: number;
}

export function PcfVoidModal({
  isOpen,
  onClose,
  onConfirm,
  pcvNumber,
  payee,
  amount
}: PcfVoidModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: 0.5, backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Void Petty Cash Voucher</h2>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">
              Voiding this petty cash voucher will cancel it and remove it from further approval or payment actions.
            </p>
          </div>

          <div className="bg-gray-50 rounded-md p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Petty Cash Voucher Details</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">PCV Number</div>
                <div className="text-sm font-medium text-gray-900">{pcvNumber}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Amount</div>
                <div className="text-sm font-semibold text-gray-900">
                  ₱{amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Payee</div>
              <div className="text-sm font-medium text-gray-900">{payee}</div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-600">
            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <p>Voided vouchers stay visible for history, but they should no longer be processed.</p>
          </div>
        </div>

        <div className="p-3 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors font-medium"
          >
            Confirm Void
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
