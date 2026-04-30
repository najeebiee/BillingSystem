import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  getPcfTransactionById,
  updatePcfTransaction
} from "../services/pcf.service";
import type { PcfTransaction } from "../types/billing";

type EditPcfDraft = {
  date: string;
  pcvNo: string;
  payee: string;
  invoiceNo: string;
  description: string;
  amountIn: string;
  amountOut: string;
};

const emptyDraft: EditPcfDraft = {
  date: "",
  pcvNo: "",
  payee: "",
  invoiceNo: "",
  description: "",
  amountIn: "",
  amountOut: ""
};

const getDraftStorageKey = (id: string) => `pcf.editEntryDraft.${id}`;

const normalizeDraft = (value: unknown): EditPcfDraft => {
  if (!value || typeof value !== "object") return emptyDraft;

  const parsed = value as Partial<EditPcfDraft>;

  return {
    date: typeof parsed.date === "string" ? parsed.date : "",
    pcvNo: typeof parsed.pcvNo === "string" ? parsed.pcvNo : "",
    payee: typeof parsed.payee === "string" ? parsed.payee : "",
    invoiceNo: typeof parsed.invoiceNo === "string" ? parsed.invoiceNo : "",
    description: typeof parsed.description === "string" ? parsed.description : "",
    amountIn: typeof parsed.amountIn === "string" ? parsed.amountIn : "",
    amountOut: typeof parsed.amountOut === "string" ? parsed.amountOut : ""
  };
};

const mapTransactionToDraft = (transaction: PcfTransaction): EditPcfDraft => ({
  date: transaction.date ?? "",
  pcvNo: transaction.pcv_number ?? "",
  payee: transaction.payee ?? "",
  invoiceNo: transaction.invoice_no ?? "",
  description: transaction.description ?? "",
  amountIn: Number(transaction.amount_in ?? 0) > 0 ? String(transaction.amount_in) : "",
  amountOut: Number(transaction.amount_out ?? 0) > 0 ? String(transaction.amount_out) : ""
});

export function EditPcfPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<EditPcfDraft>(emptyDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadedTransaction, setLoadedTransaction] = useState<PcfTransaction | null>(null);

  const draftStorageKey = useMemo(
    () => (id ? getDraftStorageKey(id) : null),
    [id]
  );

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
          setLoadedTransaction(null);
          setErrorMessage(result.error || "PCV not found.");
          return;
        }

        setLoadedTransaction(result.data);
        setErrorMessage(null);

        const savedDraft = draftStorageKey
          ? window.sessionStorage.getItem(draftStorageKey)
          : null;

        if (savedDraft) {
          setDraft(normalizeDraft(JSON.parse(savedDraft)));
          return;
        }

        setDraft(mapTransactionToDraft(result.data));
      })
      .catch((error) => {
        if (!isMounted) return;
        setLoadedTransaction(null);
        setErrorMessage(error.message || "Failed to load petty cash transaction.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [draftStorageKey, id]);

  useEffect(() => {
    document.title = loadedTransaction?.pcv_number
      ? `Edit ${loadedTransaction.pcv_number} | GuildLedger`
      : "Edit PCV | GuildLedger";
  }, [loadedTransaction?.pcv_number]);

  useEffect(() => {
    if (!draftStorageKey || !loadedTransaction) return;
    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [draft, draftStorageKey, loadedTransaction]);

  const updateDraftField = (field: keyof EditPcfDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    if (draftStorageKey) {
      window.sessionStorage.removeItem(draftStorageKey);
    }

    if (id) {
      navigate(`/pcf/${id}`);
      return;
    }

    navigate("/pcf");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) {
      setErrorMessage("PCV not found.");
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      const result = await updatePcfTransaction(id, {
        date: draft.date,
        pcv_number: draft.pcvNo,
        payee: draft.payee,
        invoice_no: draft.invoiceNo,
        description: draft.description,
        amount_in: Number(draft.amountIn || 0),
        amount_out: Number(draft.amountOut || 0)
      });

      if (result.error || !result.data) {
        setErrorMessage(result.error || "Failed to update petty cash transaction.");
        return;
      }

      if (draftStorageKey) {
        window.sessionStorage.removeItem(draftStorageKey);
      }

      toast.success("PCV updated.");
      navigate(`/pcf/${id}`);
    } finally {
      setIsSaving(false);
    }
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

  if (errorMessage && !loadedTransaction) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">PCV not found</h1>
            <p className="text-gray-600 mb-4">
              {errorMessage || "The petty cash transaction you are looking for does not exist."}
            </p>
            <button
              onClick={() => navigate("/pcf")}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to Petty Cash
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <button onClick={() => navigate("/pcf")} className="hover:text-blue-600">
              Petty Cash
            </button>
            <ChevronRight className="w-4 h-4" />
            {id ? (
              <button onClick={() => navigate(`/pcf/${id}`)} className="hover:text-blue-600">
                PCV Details
              </button>
            ) : (
              <span>PCV Details</span>
            )}
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">Edit</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Edit PCV Entry</h1>
            <p className="text-gray-600 mt-1">Update this petty cash voucher entry</p>
          </div>

          <form onSubmit={handleSave}>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Entry Details</h2>

              {errorMessage && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={draft.date}
                    onChange={(e) => updateDraftField("date", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="pcvNo" className="block text-sm font-medium text-gray-700 mb-1.5">
                    PCV No.
                  </label>
                  <input
                    id="pcvNo"
                    type="text"
                    value={draft.pcvNo}
                    onChange={(e) => updateDraftField("pcvNo", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter PCV number"
                  />
                </div>

                <div>
                  <label htmlFor="payee" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Payee
                  </label>
                  <input
                    id="payee"
                    type="text"
                    value={draft.payee}
                    onChange={(e) => updateDraftField("payee", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter payee"
                  />
                </div>

                <div>
                  <label htmlFor="invoiceNo" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Invoice No.
                  </label>
                  <input
                    id="invoiceNo"
                    type="text"
                    value={draft.invoiceNo}
                    onChange={(e) => updateDraftField("invoiceNo", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter invoice number"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={draft.description}
                    onChange={(e) => updateDraftField("description", e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Enter description"
                  />
                </div>

                <div>
                  <label htmlFor="amountIn" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Amount In
                  </label>
                  <input
                    id="amountIn"
                    type="number"
                    step="0.01"
                    value={draft.amountIn}
                    onChange={(e) => updateDraftField("amountIn", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label htmlFor="amountOut" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Amount Out
                  </label>
                  <input
                    id="amountOut"
                    type="number"
                    step="0.01"
                    value={draft.amountOut}
                    onChange={(e) => updateDraftField("amountOut", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

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
                disabled={isSaving}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
