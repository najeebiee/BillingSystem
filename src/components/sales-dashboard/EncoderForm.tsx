import React, { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabaseClient";

type FormState = {
  event: string;
  date: string;
  poNumber: string;
  memberName: string;
  username: string;
  newMember: "yes" | "no";
  memberType: string;
  packageType: string;
  toBlister: string;

  quantity: string;
  blisterCount: string;
  originalPrice: string;
  discountRate: string;
  oneTimeDiscount: string;

  paymentMode: string;
  paymentModeType: string;
  referenceNumber: string;

  paymentMode2: string;
  paymentModeType2: string;
  referenceNumber2: string;
  paymentAmount2: string;

  releasedBottle: string;
  releasedBlister: string;
  toFollowBottle: string;
  toFollowBlister: string;

  remarks: string;
};

const initialFormState: FormState = {
  event: "",
  date: "",
  poNumber: "",
  memberName: "",
  username: "",
  newMember: "no",
  memberType: "",
  packageType: "",
  toBlister: "",

  quantity: "0",
  blisterCount: "0",
  originalPrice: "0.00",
  discountRate: "0",
  oneTimeDiscount: "0.00",

  paymentMode: "",
  paymentModeType: "",
  referenceNumber: "",

  paymentMode2: "",
  paymentModeType2: "",
  referenceNumber2: "",
  paymentAmount2: "0.00",

  releasedBottle: "0",
  releasedBlister: "0",
  toFollowBottle: "0",
  toFollowBlister: "0",

  remarks: "",
};

const toNumber = (value: unknown) => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm";
const selectClass = inputClass;
const readOnlyClass = `${inputClass} bg-gray-50 text-gray-500`;

export function EncoderForm() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const savingRef = useRef(false);

  const updateField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const setNewMember = (value: "yes" | "no") => {
    setForm((prev) => ({ ...prev, newMember: value }));
  };

  const resetForm = () => setForm(initialFormState);

  const totals = useMemo(() => {
    const quantity = toNumber(form.quantity);
    const originalPrice = toNumber(form.originalPrice);
    const discountRate = toNumber(form.discountRate);
    const oneTimeDiscount = toNumber(form.oneTimeDiscount);

    const gross = quantity * originalPrice;
    const discountAmount = gross * discountRate;
    const priceAfterDiscount = Math.max(0, originalPrice - originalPrice * discountRate);
    const totalSales = Math.max(0, gross - discountAmount - oneTimeDiscount);

    return {
      priceAfterDiscount,
      totalSales,
    };
  }, [form.quantity, form.originalPrice, form.discountRate, form.oneTimeDiscount]);

  const handleSave = async () => {
    if (savingRef.current) return;

    const saleDate = form.date?.trim();
    if (!saleDate) {
      toast.error("Sale date is required.");
      return;
    }

    const quantity = toNumber(form.quantity);
    const unitPrice = toNumber(form.originalPrice);
    const gross = quantity * unitPrice;

    const discountRate = toNumber(form.discountRate);
    const discountAmount = gross * discountRate;

    const oneTimeDiscount = toNumber(form.oneTimeDiscount);
    const totalSales = Math.max(0, gross - discountAmount - oneTimeDiscount);

    const paymentAmount2 = toNumber(form.paymentAmount2);
    if (paymentAmount2 > totalSales) {
      toast.error("Secondary payment exceeds total sales.");
      return;
    }

    const primaryAmount = Math.max(0, totalSales - paymentAmount2);

    if (!form.paymentMode && primaryAmount > 0) {
      toast.error("Primary payment mode is required.");
      return;
    }

    if (paymentAmount2 > 0 && !form.paymentMode2) {
      toast.error("Secondary payment mode is required.");
      return;
    }

    const entryPayload = {
      sale_date: saleDate,
      event: form.event || null,
      po_number: form.poNumber || null,
      member_name: form.memberName || null,
      username: form.username || null,
      new_member: form.newMember === "yes",
      member_type: form.memberType || null,
      package_type: form.packageType || null,
      to_blister: form.toBlister ? form.toBlister === "yes" : null,

      quantity,
      blister_count: toNumber(form.blisterCount),

      original_price: gross,
      discount_amount: discountAmount,
      one_time_discount: oneTimeDiscount,
      total_sales: totalSales,

      released_bottle: toNumber(form.releasedBottle),
      released_blister: toNumber(form.releasedBlister),
      to_follow_bottle: toNumber(form.toFollowBottle),
      to_follow_blister: toNumber(form.toFollowBlister),

      remarks: form.remarks || null,
    };

    savingRef.current = true;
    try {
      const { data, error } = await supabase
        .from("sales_entries")
        .insert(entryPayload)
        .select("id")
        .single();

      if (error) throw error;

      const saleEntryId = data?.id;
      if (!saleEntryId) throw new Error("Failed to create sales entry.");

      const payments: Array<{
        sale_entry_id: string;
        mode: string;
        mode_type: string | null;
        reference_no: string | null;
        amount: number;
      }> = [];

      if (form.paymentMode && primaryAmount > 0) {
        payments.push({
          sale_entry_id: saleEntryId,
          mode: form.paymentMode,
          mode_type: form.paymentModeType || null,
          reference_no: form.referenceNumber || null,
          amount: primaryAmount,
        });
      }

      if (form.paymentMode2 && paymentAmount2 > 0) {
        payments.push({
          sale_entry_id: saleEntryId,
          mode: form.paymentMode2,
          mode_type: form.paymentModeType2 || null,
          reference_no: form.referenceNumber2 || null,
          amount: paymentAmount2,
        });
      }

      if (payments.length > 0) {
        const { error: paymentError } = await supabase
          .from("sales_entry_payments")
          .insert(payments);
        if (paymentError) throw paymentError;
      }

      toast.success("Sale entry saved.");
      resetForm();
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to save entry.");
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-semibold text-[#2E3A8C] mb-6">New Sale Entry</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
          {/* Row 1 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Event</label>
            <select name="event" value={form.event} onChange={updateField} className={selectClass}>
              <option value="" disabled>
                Select event
              </option>
              <option value="expo">Expo</option>
              <option value="onsite">Onsite</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input type="date" name="date" value={form.date} onChange={updateField} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">POF Number</label>
            <input
              type="text"
              name="poNumber"
              placeholder="Enter PO number"
              value={form.poNumber}
              onChange={updateField}
              className={inputClass}
            />
          </div>

          <div className="hidden lg:block" />

          {/* Row 2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Member Name</label>
            <input
              type="text"
              name="memberName"
              placeholder="Enter member name"
              value={form.memberName}
              onChange={updateField}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
            <input
              type="text"
              name="username"
              placeholder="Enter username"
              value={form.username}
              onChange={updateField}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Member?</label>
            <div className="inline-flex border border-gray-300 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setNewMember("yes")}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  form.newMember === "yes" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setNewMember("no")}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                  form.newMember === "no" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                No
              </button>
            </div>
          </div>

          <div className="hidden lg:block" />

          {/* Row 3 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Member Type</label>
            <select name="memberType" value={form.memberType} onChange={updateField} className={selectClass}>
              <option value="" disabled>
                Select type
              </option>
              <option value="regular">Regular</option>
              <option value="vip">VIP</option>
              <option value="guest">Guest</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Package Type</label>
            <select name="packageType" value={form.packageType} onChange={updateField} className={selectClass}>
              <option value="" disabled>
                Select package
              </option>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">To Blister?</label>
            <select name="toBlister" value={form.toBlister} onChange={updateField} className={selectClass}>
              <option value="" disabled>
                Select option
              </option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Original Price</label>
            <input type="number" name="originalPrice" value={form.originalPrice} readOnly className={readOnlyClass} />
          </div>

          {/* Row 4 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
            <input type="number" name="quantity" value={form.quantity} onChange={updateField} className={inputClass} min={0} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Blister Count</label>
            <input
              type="number"
              name="blisterCount"
              value={form.blisterCount}
              onChange={updateField}
              className={inputClass}
              min={0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount</label>
            <select name="discountRate" value={form.discountRate} onChange={updateField} className={selectClass}>
              <option value="0">No discount</option>
              <option value="0.1">10% discount</option>
              <option value="0.2">20% discount</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Price After Discount</label>
            <input
              type="number"
              name="priceAfterDiscount"
              value={totals.priceAfterDiscount.toFixed(2)}
              readOnly
              className={readOnlyClass}
            />
          </div>

          {/* Row 5 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">One-Time Discount</label>
            <input
              type="number"
              name="oneTimeDiscount"
              value={form.oneTimeDiscount}
              onChange={updateField}
              className={inputClass}
              min={0}
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Sales</label>
            <input type="number" name="totalSales" value={totals.totalSales.toFixed(2)} readOnly className={readOnlyClass} />
          </div>

          <div className="hidden lg:block" />
          <div className="hidden lg:block" />

          <div className="col-span-1 md:col-span-2 lg:col-span-4 pt-2 mt-2 border-t border-[#E5E7EB]" />

          {/* Payments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mode of Payment</label>
            <select name="paymentMode" value={form.paymentMode} onChange={updateField} className={selectClass}>
              <option value="" disabled>
                Select mode
              </option>
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="gcash">GCash</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Mode Type</label>
            <select name="paymentModeType" value={form.paymentModeType} onChange={updateField} className={selectClass}>
              <option value="" disabled>
                Select type
              </option>
              <option value="full">Full Payment</option>
              <option value="partial">Partial</option>
              <option value="installment">Installment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference Number</label>
            <input
              type="text"
              name="referenceNumber"
              placeholder="Enter reference number"
              value={form.referenceNumber}
              onChange={updateField}
              className={inputClass}
            />
          </div>

          <div className="hidden lg:block" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mode of Payment (2)</label>
            <select name="paymentMode2" value={form.paymentMode2} onChange={updateField} className={selectClass}>
              <option value="" disabled>
                Select mode
              </option>
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="gcash">GCash</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Mode Type (2)</label>
            <select name="paymentModeType2" value={form.paymentModeType2} onChange={updateField} className={selectClass}>
              <option value="" disabled>
                Select type
              </option>
              <option value="full">Full Payment</option>
              <option value="partial">Partial</option>
              <option value="installment">Installment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference Number (2)</label>
            <input
              type="text"
              name="referenceNumber2"
              placeholder="Enter reference number"
              value={form.referenceNumber2}
              onChange={updateField}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (2)</label>
            <input
              type="number"
              name="paymentAmount2"
              value={form.paymentAmount2}
              onChange={updateField}
              className={inputClass}
              min={0}
              step="0.01"
            />
          </div>

          {/* Release / Follow-up */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Released (Bottle)</label>
            <input
              type="number"
              name="releasedBottle"
              value={form.releasedBottle}
              onChange={updateField}
              className={inputClass}
              min={0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Released (Blister)</label>
            <input
              type="number"
              name="releasedBlister"
              value={form.releasedBlister}
              onChange={updateField}
              className={inputClass}
              min={0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">To Follow (Bottle)</label>
            <input
              type="number"
              name="toFollowBottle"
              value={form.toFollowBottle}
              onChange={updateField}
              className={inputClass}
              min={0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">To Follow (Blister)</label>
            <input
              type="number"
              name="toFollowBlister"
              value={form.toFollowBlister}
              onChange={updateField}
              className={inputClass}
              min={0}
            />
          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Remarks</label>
            <textarea
              name="remarks"
              placeholder="Enter any additional remarks or notes..."
              value={form.remarks}
              onChange={updateField}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Received By</label>
            <input type="text" name="receivedBy" placeholder="Enter name" className={inputClass} />
          </div>

          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Collected By</label>
            <input type="text" name="collectedBy" placeholder="Enter name" className={inputClass} />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={handleSave} className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded">
            Save Entry
          </button>
          <button type="button" onClick={resetForm} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded">
            Clear Form
          </button>
        </div>
      </div>
    </div>
  );
}
