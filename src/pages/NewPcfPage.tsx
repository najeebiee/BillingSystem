import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { createPcfTransaction } from "../services/pcf.service";

type NewPcfDraft = {
  date: string;
  pcvNo: string;
  payee: string;
  invoiceNo: string;
  description: string;
  amountIn: string;
  amountOut: string;
};

const draftStorageKey = "pcf.newEntryDraft";

const initialDraft: NewPcfDraft = {
  date: "",
  pcvNo: "",
  payee: "",
  invoiceNo: "",
  description: "",
  amountIn: "",
  amountOut: ""
};

const normalizeDraft = (value: unknown): NewPcfDraft => {
  if (!value || typeof value !== "object") return initialDraft;

  const parsed = value as Partial<NewPcfDraft>;

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

const loadDraft = (): NewPcfDraft => {
  if (typeof window === "undefined") return initialDraft;

  try {
    const savedDraft = window.sessionStorage.getItem(draftStorageKey);
    if (!savedDraft) return initialDraft;
    return normalizeDraft(JSON.parse(savedDraft));
  } catch {
    return initialDraft;
  }
};

export function NewPcfPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<NewPcfDraft>(loadDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = "New PCV Entry | GuildLedger";
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [draft]);

  const updateDraftField = (field: keyof NewPcfDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    window.sessionStorage.removeItem(draftStorageKey);
    navigate("/pcf");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const result = await createPcfTransaction({
        date: draft.date,
        pcv_number: draft.pcvNo,
        payee: draft.payee,
        invoice_no: draft.invoiceNo,
        description: draft.description,
        amount_in: Number(draft.amountIn || 0),
        amount_out: Number(draft.amountOut || 0)
      });

      if (result.error || !result.data) {
        setErrorMessage(result.error || "Failed to save petty cash transaction.");
        return;
      }

      window.sessionStorage.removeItem(draftStorageKey);
      toast.success("PCV saved.");
      navigate("/pcf");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <button onClick={() => navigate("/pcf")} className="hover:text-blue-600">
              Petty Cash Fund
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">New PCV Entry</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">New PCV Entry</h1>
            <p className="text-gray-600 mt-1">Create a new petty cash voucher entry</p>
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
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
