import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { PcfApproveRejectModal } from "../components/PcfApproveRejectModal";
import { PcfVoidModal } from "../components/PcfVoidModal";
import {
  getPcfTransactionById,
  setPcfLiquidationState,
  updatePcfTransactionStatus
} from "../services/pcf.service";
import type {
  PcfTransaction,
  PcfTransactionStatus,
  PcfTransactionType
} from "../types/billing";

const formatPeso = (amount: number) =>
  `\u20b1${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const getDisplayValue = (value?: string | null) => {
  const normalized = (value ?? "").trim();
  return normalized || "-";
};

const formatTransactionType = (value?: PcfTransactionType) => {
  switch (value) {
    case "beginning_balance":
      return "Beginning Balance";
    case "replenishment":
      return "Replenishment";
    case "expense":
      return "Expense";
    default:
      return value || "-";
  }
};

const formatStatus = (value?: PcfTransactionStatus) => {
  switch (value) {
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
      return value || "-";
  }
};

const getStatusColor = (status?: PcfTransactionStatus) => {
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

const getTypeColor = (value?: PcfTransactionType) => {
  switch (value) {
    case "beginning_balance":
      return "bg-gray-100 text-gray-700";
    case "replenishment":
      return "bg-blue-100 text-blue-700";
    case "expense":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export function ViewPcfPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<PcfTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [approveRejectModal, setApproveRejectModal] = useState({
    isOpen: false,
    action: "approve" as "approve" | "reject"
  });

  useEffect(() => {
    let isMounted = true;

    if (!id) {
      setIsLoading(false);
      setErrorMessage("PCV not found.");
      return;
    }

    setIsLoading(true);
    getPcfTransactionById(id)
      .then((result) => {
        if (!isMounted) return;

        if (result.error || !result.data) {
          setTransaction(null);
          setErrorMessage(result.error || "PCV not found.");
        } else {
          setTransaction(result.data);
          setErrorMessage(null);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setTransaction(null);
        setErrorMessage(error.message || "Failed to load petty cash transaction.");
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
    if (transaction?.pcv_number) {
      document.title = `${transaction.pcv_number} | GuildLedger`;
      return;
    }

    document.title = "PCV Details | GuildLedger";
  }, [transaction?.pcv_number]);

  const handleStatusChange = async (status: PcfTransactionStatus) => {
    if (!transaction || isUpdating) return;

    setActionError(null);
    setIsUpdating(true);
    const result = await updatePcfTransactionStatus(transaction.id, status);
    setIsUpdating(false);

    if (result.error || !result.data) {
      setActionError(result.error || "Failed to update petty cash status.");
      return;
    }

    setTransaction(result.data);
    toast.success(`PCV marked as ${formatStatus(status).toLowerCase()}`);
  };

  const handleLiquidationToggle = async (isLiquidated: boolean) => {
    if (!transaction || isUpdating) return;

    setActionError(null);
    setIsUpdating(true);
    const result = await setPcfLiquidationState(transaction.id, isLiquidated);
    setIsUpdating(false);

    if (result.error || !result.data) {
      setActionError(result.error || "Failed to update liquidation state.");
      return;
    }

    setTransaction(result.data);
    toast.success(isLiquidated ? "PCV liquidated" : "PCV unliquidated");
  };

  const handleOpenApprove = () => {
    setApproveRejectModal({ isOpen: true, action: "approve" });
  };

  const handleOpenReject = () => {
    setApproveRejectModal({ isOpen: true, action: "reject" });
  };

  const handleConfirmApproveReject = async () => {
    if (!transaction || isUpdating) return;

    const nextStatus =
      approveRejectModal.action === "approve" ? "approved" : "rejected";

    setActionError(null);
    setIsUpdating(true);
    const result = await updatePcfTransactionStatus(transaction.id, nextStatus);
    setIsUpdating(false);

    if (result.error || !result.data) {
      setActionError(result.error || "Failed to update petty cash status.");
      return;
    }

    setTransaction(result.data);
    setApproveRejectModal({ isOpen: false, action: "approve" });
    toast.success(`PCV marked as ${formatStatus(nextStatus).toLowerCase()}`);
  };

  const handleOpenVoid = () => {
    setIsVoidModalOpen(true);
  };

  const handleConfirmVoid = async () => {
    if (!transaction || isUpdating) return;

    setActionError(null);
    setIsUpdating(true);
    const result = await updatePcfTransactionStatus(transaction.id, "void");
    setIsUpdating(false);

    if (result.error || !result.data) {
      setActionError(result.error || "Failed to update petty cash status.");
      return;
    }

    setTransaction(result.data);
    setIsVoidModalOpen(false);
    toast.success("PCV marked as void");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-gray-600">
            Loading petty cash transaction...
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">PCV not found</h1>
            <p className="text-gray-600 mb-4">
              {errorMessage || "The petty cash transaction you are looking for does not exist."}
            </p>
            <Link to="/pcf" className="text-blue-600 hover:text-blue-700 font-medium">
              Back to Petty Cash
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const topRightActions = (
    <div className="flex items-center gap-3 flex-wrap justify-end">
      {transaction.transaction_type !== "beginning_balance" && transaction.status !== "void" && (
        <button
          onClick={() => navigate(`/pcf/${transaction.id}/edit`)}
          className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors font-medium flex items-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
      )}
      {transaction.status !== "paid" && transaction.status !== "void" && (
        <button
          onClick={handleOpenVoid}
          disabled={isUpdating}
          className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors font-medium disabled:opacity-60"
        >
          Void
        </button>
      )}
    </div>
  );

  const footerActions = (
    <div className="mt-8 flex items-center justify-end gap-3 pb-8 flex-wrap">
      <button
        onClick={() => navigate("/pcf")}
        className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
      >
        Back to List
      </button>

      {transaction.status === "draft" && (
        <button
          onClick={() => handleStatusChange("awaiting_approval")}
          disabled={isUpdating}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium disabled:opacity-60"
        >
          Submit
        </button>
      )}

      {transaction.status === "awaiting_approval" && (
        <>
          <button
            onClick={handleOpenReject}
            disabled={isUpdating}
            className="px-5 py-2.5 border border-orange-600 text-orange-600 rounded-md hover:bg-orange-50 transition-colors font-medium disabled:opacity-60"
          >
            Reject
          </button>
          <button
            onClick={handleOpenApprove}
            disabled={isUpdating}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium disabled:opacity-60"
          >
            Approve
          </button>
        </>
      )}

      {transaction.status === "rejected" && (
        <button
          onClick={() => handleStatusChange("awaiting_approval")}
          disabled={isUpdating}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium disabled:opacity-60"
        >
          Resubmit
        </button>
      )}

      {transaction.status === "approved" && (
        <>
          <button
            onClick={() => handleLiquidationToggle(!transaction.is_liquidated)}
            disabled={isUpdating}
            className="px-5 py-2.5 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors font-medium disabled:opacity-60"
          >
            {transaction.is_liquidated ? "Unliquidate" : "Liquidate"}
          </button>
          <button
            onClick={() => handleStatusChange("paid")}
            disabled={isUpdating}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium disabled:opacity-60"
          >
            Mark as Paid
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <button onClick={() => navigate("/pcf")} className="hover:text-blue-600">
              Petty Cash
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">PCV Details</span>
          </div>

          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-semibold text-gray-900">Petty Cash Voucher</h1>
                <span
                  className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                    transaction.status
                  )}`}
                >
                  {formatStatus(transaction.status)}
                </span>
                {transaction.status === "approved" && transaction.is_liquidated && (
                  <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-emerald-100 text-emerald-700">
                    Liquidated
                  </span>
                )}
                <span className="text-lg text-gray-600 font-medium">
                  {getDisplayValue(transaction.pcv_number)}
                </span>
              </div>
            </div>

            {topRightActions}
          </div>

          {actionError && (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Entry Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Date</div>
                  <div className="text-base text-gray-900">{getDisplayValue(transaction.date)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">PCV No.</div>
                  <div className="text-base text-gray-900 font-medium">
                    {getDisplayValue(transaction.pcv_number)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Payee</div>
                  <div className="text-base text-gray-900">{getDisplayValue(transaction.payee)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Invoice No.</div>
                  <div className="text-base text-gray-900">
                    {getDisplayValue(transaction.invoice_no)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Type</div>
                  <div>
                    <span
                      className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${getTypeColor(
                        transaction.transaction_type
                      )}`}
                    >
                      {formatTransactionType(transaction.transaction_type)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Liquidated At</div>
                  <div className="text-base text-gray-900">
                    {getDisplayValue(transaction.liquidated_at)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
              <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {transaction.description?.trim() || "No description provided"}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Amounts</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Amount In</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {formatPeso(Number(transaction.amount_in ?? 0))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Amount Out</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {formatPeso(Number(transaction.amount_out ?? 0))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Balance</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {formatPeso(Number(transaction.balance ?? 0))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {footerActions}
        </div>
      </div>

      <PcfVoidModal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        onConfirm={handleConfirmVoid}
        pcvNumber={getDisplayValue(transaction.pcv_number)}
        payee={getDisplayValue(transaction.payee)}
        amount={Number(transaction.amount_out || transaction.amount_in || 0)}
      />

      <PcfApproveRejectModal
        isOpen={approveRejectModal.isOpen}
        onClose={() => setApproveRejectModal({ isOpen: false, action: "approve" })}
        onConfirm={handleConfirmApproveReject}
        action={approveRejectModal.action}
        pcvNumber={getDisplayValue(transaction.pcv_number)}
        payee={getDisplayValue(transaction.payee)}
        amount={Number(transaction.amount_out || transaction.amount_in || 0)}
      />
    </div>
  );
}
