import React, { useMemo, useState } from "react";
import { FormField } from "./form-field";
import { FormSelect } from "./form-select";

type EncoderFormState = {
  event: string;
  date: string;
  pofNumber: string;
  memberName: string;
  username: string;
  newMember: string;
  memberType: string;
  packageType: string;
  toBlister: string;
  originalPrice: string;
  quantity: string;
  blisterCount: string;
  discount: string;
  priceAfterDiscount: string;
  oneTimeDiscount: string;
  totalSales: string;
  modeOfPayment: string;
  paymentModeType: string;
  referenceNumber: string;
  modeOfPayment2: string;
  paymentModeType2: string;
  referenceNumber2: string;
  amount2: string;
  releasedBottles: string;
  releasedBlister: string;
  toFollowBottles: string;
  toFollowBlister: string;
  remarks: string;
  receivedBy: string;
  collectedBy: string;
};

const INITIAL_FORM: EncoderFormState = {
  event: "Davao City",
  date: "",
  pofNumber: "",
  memberName: "",
  username: "",
  newMember: "",
  memberType: "Distributor",
  packageType: "Silver (1 bottle)",
  toBlister: "No",
  originalPrice: "3500",
  quantity: "",
  blisterCount: "",
  discount: "0",
  priceAfterDiscount: "3500",
  oneTimeDiscount: "",
  totalSales: "",
  modeOfPayment: "Cash",
  paymentModeType: "N/A",
  referenceNumber: "",
  modeOfPayment2: "N/A",
  paymentModeType2: "N/A",
  referenceNumber2: "",
  amount2: "",
  releasedBottles: "",
  releasedBlister: "",
  toFollowBottles: "",
  toFollowBlister: "",
  remarks: "",
  receivedBy: "",
  collectedBy: ""
};

export function EncoderForm() {
  const [formData, setFormData] = useState<EncoderFormState>(INITIAL_FORM);

  const update = (field: keyof EncoderFormState, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const discountOptions = useMemo(
    () => [
      { label: "No Discount", value: "0" },
      { label: "₱50", value: "50" },
      { label: "₱60", value: "60" },
      { label: "₱80", value: "80" },
      { label: "₱150", value: "150" },
      { label: "₱180", value: "180" },
      { label: "₱240", value: "240" },
      { label: "₱500", value: "500" },
      { label: "₱600", value: "600" },
      { label: "₱800", value: "800" },
      { label: "₱1748", value: "1748" }
    ],
    []
  );

  return (
    <div className="rounded-lg bg-white p-8 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
        <FormField label="Event" value={formData.event} onChange={() => {}} readOnly />
        <FormField label="Date" type="date" value={formData.date} onChange={(v) => update("date", v)} />
        <FormField label="POF Number" value={formData.pofNumber} onChange={(v) => update("pofNumber", v)} placeholder="POF-000000-000" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
        <FormField label="Member Name" value={formData.memberName} onChange={(v) => update("memberName", v)} />
        <FormField label="Username" value={formData.username} onChange={(v) => update("username", v)} />
        <FormSelect
          label="New Member?"
          value={formData.newMember}
          onChange={(v) => update("newMember", v)}
          options={[
            { value: "", label: "Select" },
            { value: "Yes", label: "Yes" },
            { value: "No", label: "No" }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <FormSelect
          label="Member Type"
          value={formData.memberType}
          onChange={(v) => update("memberType", v)}
          options={[
            { value: "Distributor", label: "Distributor" },
            { value: "Mobile Stockist", label: "Mobile Stockist" },
            { value: "City Stockist", label: "City Stockist" },
            { value: "Center", label: "Center" },
            { value: "Non-member", label: "Non-member" }
          ]}
        />
        <FormSelect
          label="Package Type"
          value={formData.packageType}
          onChange={(v) => update("packageType", v)}
          options={[
            { value: "Silver (1 bottle)", label: "Silver (1 bottle)" },
            { value: "Gold (3 bottles)", label: "Gold (3 bottles)" },
            { value: "Platinum (10 bottles)", label: "Platinum (10 bottles)" },
            { value: "Retail (1 bottle)", label: "Retail (1 bottle)" },
            { value: "Blister (1 blister pack)", label: "Blister (1 blister pack)" }
          ]}
        />
        <FormSelect
          label="To Blister?"
          value={formData.toBlister}
          onChange={(v) => update("toBlister", v)}
          options={[
            { value: "No", label: "No" },
            { value: "Yes", label: "Yes" }
          ]}
        />
        <FormField label="Original Price" value={formData.originalPrice} onChange={(v) => update("originalPrice", v)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <FormField label="Quantity" type="number" value={formData.quantity} onChange={(v) => update("quantity", v)} />
        <FormField label="Blister Count" type="number" value={formData.blisterCount} onChange={(v) => update("blisterCount", v)} />
        <FormSelect label="Discount" value={formData.discount} onChange={(v) => update("discount", v)} options={discountOptions.map((d) => ({ value: d.value, label: d.label }))} />
        <FormField label="Price After Discount" value={formData.priceAfterDiscount} onChange={(v) => update("priceAfterDiscount", v)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
        <FormField label="One-time Discount" type="number" value={formData.oneTimeDiscount} onChange={(v) => update("oneTimeDiscount", v)} />
        <FormField label="Total Sales" type="number" value={formData.totalSales} onChange={(v) => update("totalSales", v)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-4">
        <FormSelect
          label="Mode of Payment"
          value={formData.modeOfPayment}
          onChange={(v) => update("modeOfPayment", v)}
          options={[
            { value: "Cash", label: "Cash" },
            { value: "Bank Transfer", label: "Bank Transfer" },
            { value: "E-Wallet", label: "E-Wallet" },
            { value: "Cheque", label: "Cheque" }
          ]}
        />
        <FormSelect
          label="Payment Mode Type"
          value={formData.paymentModeType}
          onChange={(v) => update("paymentModeType", v)}
          options={[
            { value: "N/A", label: "N/A" },
            { value: "Maya", label: "Maya" },
            { value: "GCash", label: "GCash" },
            { value: "BDO", label: "BDO" },
            { value: "BPI", label: "BPI" }
          ]}
        />
        <FormField label="Reference Number" value={formData.referenceNumber} onChange={(v) => update("referenceNumber", v)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <FormField label="Released (Bottles)" type="number" value={formData.releasedBottles} onChange={(v) => update("releasedBottles", v)} />
        <FormField label="Released (Blister)" type="number" value={formData.releasedBlister} onChange={(v) => update("releasedBlister", v)} />
        <FormField label="To Follow (Bottles)" type="number" value={formData.toFollowBottles} onChange={(v) => update("toFollowBottles", v)} />
        <FormField label="To Follow (Blister)" type="number" value={formData.toFollowBlister} onChange={(v) => update("toFollowBlister", v)} />
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm text-gray-700">Remarks</label>
        <textarea
          value={formData.remarks}
          onChange={(e) => update("remarks", e.target.value)}
          placeholder="Enter any additional remarks or notes..."
          className="min-h-[80px] w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm outline-none focus:border-[#2E3A8C]"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
        <FormField label="Received By" value={formData.receivedBy} onChange={(v) => update("receivedBy", v)} />
        <FormField label="Collected By" value={formData.collectedBy} onChange={(v) => update("collectedBy", v)} />
      </div>

      <div className="flex gap-3 pt-4">
        <button type="button" className="h-11 rounded-lg bg-green-500 px-6 text-white hover:bg-green-600">
          Save Entry
        </button>
        <button type="button" className="h-11 rounded-lg bg-red-500 px-6 text-white hover:bg-red-600">
          Clear Form
        </button>
      </div>
    </div>
  );
}
