import React, { useEffect, useState } from "react";
import { FormField } from "./form-field";
import { FormSelect } from "./form-select";

type FormData = {
  event: string;
  date: string;
  pgfNumber: string;
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

const PACKAGE_PRICE_MAP: Record<string, number> = {
  "Silver (1 bottle)": 3500,
  "Gold (3 bottles)": 10500,
  "Platinum (10 bottles)": 35000,
  "Retail (1 bottle)": 2280,
  "Blister (1 blister pack)": 779,
};

const DISCOUNT_OPTIONS: Array<{ label: string; value: number }> = [
  { label: "No Discount", value: 0 },
  { label: "₱50", value: 50 },
  { label: "₱60", value: 60 },
  { label: "₱80", value: 80 },
  { label: "₱150", value: 150 },
  { label: "₱180", value: 180 },
  { label: "₱240", value: 240 },
  { label: "₱500", value: 500 },
  { label: "₱600", value: 600 },
  { label: "₱800", value: 800 },
  { label: "₱1748", value: 1748 },
  { label: "40% (₱1,520)", value: 1520 },
  { label: "45% (₱1,710)", value: 1710 },
  { label: "47.5% (₱1,805)", value: 1805 },
  { label: "50% (₱1,900)", value: 1900 },
  { label: "40% (₱520)", value: 520 },
  { label: "45% (₱585)", value: 585 },
  { label: "47.5% (₱618)", value: 618 },
  { label: "50% (₱650)", value: 650 },
];

const initialFormData: FormData = {
  event: "Davao City",
  date: "",
  pgfNumber: "",
  memberName: "",
  username: "",
  newMember: "",
  memberType: "Distributor",
  packageType: "Silver (1 bottle)",
  toBlister: "",
  originalPrice: "3500",
  quantity: "",
  blisterCount: "",
  discount: "0",
  priceAfterDiscount: "3500",
  oneTimeDiscount: "",
  totalSales: "",
  modeOfPayment: "",
  paymentModeType: "",
  referenceNumber: "",
  modeOfPayment2: "",
  paymentModeType2: "",
  referenceNumber2: "",
  amount2: "",
  releasedBottles: "",
  releasedBlister: "",
  toFollowBottles: "",
  toFollowBlister: "",
  remarks: "",
  receivedBy: "",
  collectedBy: "",
};

const headingStyle: React.CSSProperties = {
  color: "#2E3A8C",
  fontSize: "20px",
  lineHeight: "28px",
  fontWeight: 500,
  marginBottom: "24px",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: "8px",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  fontFamily: "Inter, sans-serif",
};

const textareaLabelStyle: React.CSSProperties = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: 400,
};

const textareaBaseStyle: React.CSSProperties = {
  borderWidth: "1px",
  borderStyle: "solid",
  borderRadius: "8px",
  minHeight: "80px",
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: 400,
  outline: "none",
};

const actionButtonStyle: React.CSSProperties = {
  height: "44px",
  padding: "0 24px",
  borderRadius: "8px",
  color: "#FFFFFF",
  border: "none",
  cursor: "pointer",
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: 500,
};

export function EncoderForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isRemarksFocused, setIsRemarksFocused] = useState(false);
  const [isSaveHovered, setIsSaveHovered] = useState(false);
  const [isClearHovered, setIsClearHovered] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string) => {
    if (field === "event" || field === "originalPrice" || field === "priceAfterDiscount") {
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (formData.event !== "Davao City") {
      setFormData((prev) => ({ ...prev, event: "Davao City" }));
    }
  }, [formData.event]);

  useEffect(() => {
    const price = PACKAGE_PRICE_MAP[formData.packageType] ?? 0;
    const nextPrice = String(price);
    setFormData((prev) => {
      if (prev.originalPrice === nextPrice) {
        return prev;
      }
      return { ...prev, originalPrice: nextPrice };
    });
  }, [formData.packageType]);

  useEffect(() => {
    const original = Number(formData.originalPrice || 0);
    const discountAmount = Number(formData.discount || 0);
    const net = Math.max(0, original - discountAmount);
    const nextPriceAfterDiscount = String(net);

    setFormData((prev) => {
      if (prev.priceAfterDiscount === nextPriceAfterDiscount) {
        return prev;
      }
      return { ...prev, priceAfterDiscount: nextPriceAfterDiscount };
    });
  }, [formData.originalPrice, formData.discount]);

  const handleClear = () => {
    setFormData(initialFormData);
  };

  const handleSave = () => {
    // eslint-disable-next-line no-console
    console.log(formData);
    alert("Entry saved successfully!");
  };

  return (
    <div
      className="w-full min-h-screen p-6"
      style={{
        backgroundColor: "#F4F6F9",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <h1 style={headingStyle}>New Sale Entry</h1>

      <div className="p-8" style={cardStyle}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <label className="block">
            <span
              className="block mb-2"
              style={{
                color: "#374151",
                fontSize: "14px",
                lineHeight: "20px",
                fontWeight: 400,
              }}
            >
              Event
            </span>
            <input
              type="text"
              value="Davao City"
              readOnly
              className="w-full px-3"
              style={{
                height: "44px",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "#D0D5DD",
                borderRadius: "8px",
                outline: "none",
                backgroundColor: "#F9FAFB",
                color: "#374151",
                fontSize: "14px",
                lineHeight: "20px",
                fontWeight: 400,
              }}
            />
            <input type="hidden" name="event" value={formData.event} />
          </label>
          <FormField
            label="Date"
            type="date"
            value={formData.date}
            onChange={(value) => handleInputChange("date", value)}
          />
          <FormField
            label="PGF Number"
            value={formData.pgfNumber}
            onChange={(value) => handleInputChange("pgfNumber", value)}
            placeholder="0224cthc"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormField
            label="Member Name"
            value={formData.memberName}
            onChange={(value) => handleInputChange("memberName", value)}
            placeholder="Enter member name"
          />
          <FormField
            label="Username"
            value={formData.username}
            onChange={(value) => handleInputChange("username", value)}
            placeholder="Enter username"
          />
          <FormSelect
            label="New Member?"
            value={formData.newMember}
            onChange={(value) => handleInputChange("newMember", value)}
            options={[
              { value: "", label: "Select" },
              { value: "Yes", label: "Yes" },
              { value: "No", label: "No" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <FormSelect
            label="Member Type"
            value={formData.memberType}
            onChange={(value) => handleInputChange("memberType", value)}
            options={[
              { value: "Distributor", label: "Distributor" },
              { value: "Mobile Stockist", label: "Mobile Stockist" },
              { value: "City Stockist", label: "City Stockist" },
              { value: "Center", label: "Center" },
              { value: "Non-member", label: "Non-member" },
            ]}
          />
          <FormSelect
            label="Package Type"
            value={formData.packageType}
            onChange={(value) => handleInputChange("packageType", value)}
            options={[
              { value: "Silver (1 bottle)", label: "Silver (1 bottle)" },
              { value: "Gold (3 bottles)", label: "Gold (3 bottles)" },
              { value: "Platinum (10 bottles)", label: "Platinum (10 bottles)" },
              { value: "Retail (1 bottle)", label: "Retail (1 bottle)" },
              { value: "Blister (1 blister pack)", label: "Blister (1 blister pack)" },
            ]}
          />
          <FormSelect
            label="To Blister?"
            value={formData.toBlister}
            onChange={(value) => handleInputChange("toBlister", value)}
            options={[
              { value: "No", label: "No" },
              { value: "Yes", label: "Yes" },
            ]}
          />
          <FormField
            label="Original Price"
            value={formData.originalPrice}
            onChange={(value) => handleInputChange("originalPrice", value)}
            placeholder="3000"
            readOnly
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <FormField
            label="Quantity"
            type="number"
            value={formData.quantity}
            onChange={(value) => handleInputChange("quantity", value)}
            placeholder="0"
          />
          <FormField
            label="Blister Count"
            type="number"
            value={formData.blisterCount}
            onChange={(value) => handleInputChange("blisterCount", value)}
            placeholder="0"
          />
          <FormSelect
            label="Discount"
            value={formData.discount}
            onChange={(value) => handleInputChange("discount", value)}
            options={DISCOUNT_OPTIONS.map((option) => ({
              label: option.label,
              value: String(option.value),
            }))}
          />
          <FormField
            label="Price After Discount"
            value={formData.priceAfterDiscount}
            onChange={(value) => handleInputChange("priceAfterDiscount", value)}
            placeholder="3000"
            readOnly
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <FormField
            label="One-time Discount"
            type="number"
            value={formData.oneTimeDiscount}
            onChange={(value) => handleInputChange("oneTimeDiscount", value)}
            placeholder="0"
          />
          <FormField
            label="Total Sales"
            type="number"
            value={formData.totalSales}
            onChange={(value) => handleInputChange("totalSales", value)}
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormSelect
            label="Mode of Payment"
            value={formData.modeOfPayment}
            onChange={(value) => handleInputChange("modeOfPayment", value)}
            options={[
              { value: "Cash", label: "Cash" },
              { value: "Bank Transfer", label: "Bank Transfer" },
              { value: "E-Wallet", label: "E-Wallet" },
              { value: "Cheque", label: "Cheque" },
            ]}
          />
          <FormSelect
            label="Payment Mode Type"
            value={formData.paymentModeType}
            onChange={(value) => handleInputChange("paymentModeType", value)}
            options={[
              { value: "N/A", label: "N/A" },
              { value: "Maya", label: "Maya" },
              { value: "GCash", label: "GCash" },
              { value: "BDO", label: "BDO" },
              { value: "BPI", label: "BPI" },
            ]}
          />
          <FormField
            label="Reference Number"
            value={formData.referenceNumber}
            onChange={(value) => handleInputChange("referenceNumber", value)}
            placeholder="Enter reference number"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <FormSelect
            label="Mode of Payment (2)"
            value={formData.modeOfPayment2}
            onChange={(value) => handleInputChange("modeOfPayment2", value)}
            options={[
              { value: "N/A", label: "N/A" },
              { value: "Cash", label: "Cash" },
              { value: "Bank Transfer", label: "Bank Transfer" },
              { value: "E-Wallet", label: "E-Wallet" },
            ]}
          />
          <FormSelect
            label="Payment Mode Type (2)"
            value={formData.paymentModeType2}
            onChange={(value) => handleInputChange("paymentModeType2", value)}
            options={[
              { value: "N/A", label: "N/A" },
              { value: "Maya", label: "Maya" },
              { value: "GCash", label: "GCash" },
            ]}
          />
          <FormField
            label="Reference Number (2)"
            value={formData.referenceNumber2}
            onChange={(value) => handleInputChange("referenceNumber2", value)}
            placeholder="Enter reference number"
          />
          <FormField
            label="Amount (2)"
            type="number"
            value={formData.amount2}
            onChange={(value) => handleInputChange("amount2", value)}
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <FormField
            label="Released (Bottles)"
            type="number"
            value={formData.releasedBottles}
            onChange={(value) => handleInputChange("releasedBottles", value)}
            placeholder="0"
          />
          <FormField
            label="Released (Blister)"
            type="number"
            value={formData.releasedBlister}
            onChange={(value) => handleInputChange("releasedBlister", value)}
            placeholder="0"
          />
          <FormField
            label="To Follow (Bottles)"
            type="number"
            value={formData.toFollowBottles}
            onChange={(value) => handleInputChange("toFollowBottles", value)}
            placeholder="0"
          />
          <FormField
            label="To Follow (Blister)"
            type="number"
            value={formData.toFollowBlister}
            onChange={(value) => handleInputChange("toFollowBlister", value)}
            placeholder="0"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2" style={textareaLabelStyle}>
            Remarks
          </label>
          <textarea
            value={formData.remarks}
            onChange={(event) => handleInputChange("remarks", event.target.value)}
            onFocus={() => setIsRemarksFocused(true)}
            onBlur={() => setIsRemarksFocused(false)}
            placeholder="Enter any additional remarks or notes..."
            className="w-full px-3 py-2"
            style={{
              ...textareaBaseStyle,
              borderColor: isRemarksFocused ? "#2E3A8C" : "#D0D5DD",
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormField
            label="Received By"
            value={formData.receivedBy}
            onChange={(value) => handleInputChange("receivedBy", value)}
            placeholder="Enter receiver name"
          />
          <FormField
            label="Collected By"
            value={formData.collectedBy}
            onChange={(value) => handleInputChange("collectedBy", value)}
            placeholder="Enter collector name"
          />
        </div>

        <div className="flex flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={handleSave}
            onMouseEnter={() => setIsSaveHovered(true)}
            onMouseLeave={() => setIsSaveHovered(false)}
            style={{
              ...actionButtonStyle,
              backgroundColor: isSaveHovered ? "#16A34A" : "#22C55E",
            }}
          >
            Save Entry
          </button>
          <button
            type="button"
            onClick={handleClear}
            onMouseEnter={() => setIsClearHovered(true)}
            onMouseLeave={() => setIsClearHovered(false)}
            style={{
              ...actionButtonStyle,
              backgroundColor: isClearHovered ? "#DC2626" : "#EF4444",
            }}
          >
            Clear Form
          </button>
        </div>
      </div>
    </div>
  );
}
