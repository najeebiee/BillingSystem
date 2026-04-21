import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle, X } from "lucide-react";

interface PcfApproveRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: "approve" | "reject";
  pcvNumber: string;
  payee: string;
  amount: number;
}

export function PcfApproveRejectModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  pcvNumber,
  payee,
  amount
}: PcfApproveRejectModalProps) {
  const isApprove = action === "approve";

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
              {isApprove ? "Approve Petty Cash Voucher" : "Reject Petty Cash Voucher"}
            </h2>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div
            className={`border rounded-md p-4 ${
              isApprove
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-orange-50 border-orange-200 text-orange-800"
            }`}
          >
            <p className="text-sm">
              {isApprove
                ? "You are about to approve this petty cash voucher for release."
                : "You are about to reject this petty cash voucher and return it for changes."}
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
            className={`px-4 py-2 text-sm text-white rounded-md transition-colors font-medium ${
              isApprove ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isApprove ? "Confirm Approval" : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
