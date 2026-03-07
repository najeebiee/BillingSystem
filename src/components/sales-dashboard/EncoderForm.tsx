
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FormField } from "./form-field";
import { FormSelect } from "./form-select";
import {
  fetchSalesDashboardUsers,
  type SalesDashboardUser
} from "../../services/salesDashboard.service";
import type { SaleEntry } from "../../types/sales";

const PAYMENT_MODES = [
  "CASH",
  "GCASH",
  "MAYA",
  "BANK TRANSFER",
  "CHECK",
  "CREDIT CARD",
  "MIXED",
] as const;

const SPLIT_PAYMENT_MODES = PAYMENT_MODES.filter((mode) => mode !== "MIXED");
const CARD_TYPES = ["VISA", "MASTERCARD", "JCB", "AMEX"] as const;

type PaymentMode = (typeof PAYMENT_MODES)[number];
type SplitPaymentMode = (typeof SPLIT_PAYMENT_MODES)[number];

type EncoderFormProps = {
  onSave: (entry: SaleEntry) => Promise<void> | void;
  savedCount: number;
};

type FormData = {
  event: string;
  date: string;
  pofDigits: string;
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
  modeOfPayment: PaymentMode | "";
  paymentAmount: string;
  referenceNumber: string;
  bankName: string;
  checkDate: string;
  cardType: string;
  modeOfPayment1: Exclude<PaymentMode, "MIXED"> | "";
  modeOfPayment2: Exclude<PaymentMode, "MIXED"> | "";
  paymentAmount2: string;
  referenceNumber2: string;
  bankName2: string;
  checkDate2: string;
  cardType2: string;
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

const MEMBER_TYPE_OPTIONS = [
  { value: "Distributor", label: "Distributor" },
  { value: "Mobile Stockist", label: "Mobile Stockist" },
  { value: "City Stockist", label: "City Stockist" },
  { value: "Center", label: "Center" },
  { value: "Non-member", label: "Non-member" }
] as const;

const DISCOUNT_OPTIONS: Array<{ label: string; value: number }> = [
  { label: "No Discount", value: 0 },
  { label: "\u20B150", value: 50 },
  { label: "\u20B160", value: 60 },
  { label: "\u20B180", value: 80 },
  { label: "\u20B1150", value: 150 },
  { label: "\u20B1180", value: 180 },
  { label: "\u20B1240", value: 240 },
  { label: "\u20B1500", value: 500 },
  { label: "\u20B1600", value: 600 },
  { label: "\u20B1800", value: 800 },
  { label: "\u20B11748", value: 1748 },
  { label: "40% (\u20B11,520)", value: 1520 },
  { label: "45% (\u20B11,710)", value: 1710 },
  { label: "47.5% (\u20B11,805)", value: 1805 },
  { label: "50% (\u20B11,900)", value: 1900 },
  { label: "40% (\u20B1520)", value: 520 },
  { label: "45% (\u20B1585)", value: 585 },
  { label: "47.5% (\u20B1618)", value: 618 },
  { label: "50% (\u20B1650)", value: 650 },
];

const POF_PREFIX = "POF-";
const isEncoderSaveDebugEnabled =
  import.meta.env.DEV || import.meta.env.VITE_DEBUG_SALES_SAVE === "true";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatPof(digits: string) {
  const raw = onlyDigits(digits).slice(0, 9);
  const part1 = raw.slice(0, 6);
  const part2 = raw.slice(6, 9);

  if (!raw.length) return "";
  if (raw.length <= 6) return `${POF_PREFIX}${part1}`;
  return `${POF_PREFIX}${part1}-${part2}`;
}

function formatPofForSave(digits: string) {
  const raw = onlyDigits(digits).slice(0, 9);
  if (raw.length !== 9) return "";
  return `${POF_PREFIX}${raw.slice(0, 6)}-${raw.slice(6, 9)}`;
}

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toWholeNumber(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function requiresReference(mode: string) {
  return mode === "GCASH" || mode === "MAYA" || mode === "BANK TRANSFER" || mode === "CHECK" || mode === "CREDIT CARD";
}

function requiresBankName(mode: string) {
  return mode === "BANK TRANSFER" || mode === "CHECK";
}

function requiresCardType(mode: string) {
  return mode === "CREDIT CARD";
}

function normalizeMemberType(value: string): SaleEntry["memberType"] {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";

  const normalizedMap: Record<string, string> = {
    distributor: "distributor",
    "mobile stockist": "mobile stockist",
    "city stockist": "city stockist",
    center: "center",
    "non-member": "non-member",
    // Legacy values kept for safe edit/load compatibility.
    platinum: "platinum",
    gold: "gold",
    silver: "silver",
    discount: "discount"
  };

  return normalizedMap[normalized] ?? normalized;
}

function mapPayment(mode: SplitPaymentMode | ""): {
  modeOfPayment: SaleEntry["modeOfPayment"];
  paymentModeType: SaleEntry["paymentModeType"];
} {
  switch (mode) {
    case "CASH":
      return { modeOfPayment: "cash", paymentModeType: "na" };
    case "BANK TRANSFER":
      return { modeOfPayment: "bank", paymentModeType: "na" };
    case "GCASH":
      return { modeOfPayment: "ewallet", paymentModeType: "gcash" };
    case "MAYA":
      return { modeOfPayment: "ewallet", paymentModeType: "maya" };
    case "CHECK":
      return { modeOfPayment: "cheque", paymentModeType: "na" };
    case "CREDIT CARD":
      return { modeOfPayment: "ewallet", paymentModeType: "na" };
    default:
      return { modeOfPayment: "", paymentModeType: "" };
  }
}

function mapSaveErrorToMessage(error: unknown): string {
  const fallback = "Unable to save entry. Please check required fields and try again.";
  if (!error || typeof error !== "object") return fallback;

  const saveError = error as {
    code?: string;
    message?: string;
    details?: string;
    status?: number;
    saveStep?: string | null;
  };

  const joined = [saveError.message, saveError.details]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
  const columnMatch = joined.match(/column ['"]?([a-zA-Z0-9_]+)['"]?/i);
  const columnName = columnMatch?.[1] ?? null;
  const humanizeColumn = (value: string | null) => {
    if (!value) return null;
    const labels: Record<string, string> = {
      pof_number: "POF Number",
      po_number: "POF Number",
      member_name: "Member Name",
      username: "Username",
      member_type: "Member Type",
      package_type: "Package Type",
      quantity: "Quantity",
      original_price: "Original Price",
      price_after_discount: "Price After Discount",
      total_sales: "Total Sales",
      primary_payment_mode: "Mode of Payment",
      primary_payment_amount: "Amount",
      report_date: "Date",
      entry_date: "Date",
      sale_date: "Date"
    };
    return labels[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  };

  if (saveError.code === "23502") {
    const field = humanizeColumn(columnName);
    return field
      ? `Unable to save entry. ${field} is required.`
      : "Unable to save entry. A required field is missing.";
  }

  if (saveError.code === "23505") {
    return "Unable to save entry. A duplicate record already exists.";
  }

  if (saveError.code === "23503") {
    return "Unable to save entry. A related record is missing or invalid.";
  }

  if (saveError.code === "23514") {
    return "Unable to save entry. One or more values failed a database validation rule.";
  }

  if (saveError.code === "22P02") {
    return "Unable to save entry. One of the numeric or date fields has an invalid value.";
  }

  if (saveError.code === "42501" || saveError.status === 401 || saveError.status === 403) {
    return "Unable to save entry. You do not have permission to perform this action.";
  }

  if (saveError.code === "PGRST204") {
    return "Unable to save entry due to a database schema mismatch. Please contact the administrator.";
  }

  if (saveError.message && /network|fetch|failed to fetch/i.test(saveError.message)) {
    return "Unable to save entry due to a network/configuration issue. Please try again.";
  }

  if (saveError.message && /users_directory/i.test(saveError.message)) {
    return "Unable to save entry because the Users directory table is missing. Run the latest database migration first.";
  }

  if (saveError.message) {
    const stepLabel = saveError.saveStep ? ` during ${saveError.saveStep}` : "";
    const details = saveError.details ? ` ${saveError.details}` : "";
    return `Unable to save entry${stepLabel}: ${saveError.message}.${details}`.trim();
  }

  return fallback;
}

function getExpectedTotal(formData: FormData): number {
  const quantity = toWholeNumber(formData.quantity);
  const afterDiscount = toNumber(formData.priceAfterDiscount);
  const oneTimeDiscount = toNumber(formData.oneTimeDiscount);
  if (quantity <= 0 || afterDiscount <= 0) return 0;
  return Math.max(0, quantity * afterDiscount - oneTimeDiscount);
}

function validateFormData(formData: FormData): string[] {
  const errors: string[] = [];
  const quantity = toWholeNumber(formData.quantity);
  const totalSales = getExpectedTotal(formData);
  const primaryAmount = toNumber(formData.paymentAmount);
  const secondaryAmount = toNumber(formData.paymentAmount2);
  const releasedBottles = toWholeNumber(formData.releasedBottles);
  const releasedBlister = toWholeNumber(formData.releasedBlister);
  const toFollowBottles = toWholeNumber(formData.toFollowBottles);
  const toFollowBlister = toWholeNumber(formData.toFollowBlister);

  if (!formData.date) errors.push("Date is required.");
  if (!formatPofForSave(formData.pofDigits)) errors.push("POF Number must contain exactly 9 digits.");
  if (!formData.memberName.trim()) errors.push("Member Name is required.");
  if (!formData.username.trim()) errors.push("Username is required.");
  if (!formData.newMember) errors.push("New Member selection is required.");
  if (!formData.memberType.trim()) errors.push("Member Type is required.");
  if (!formData.packageType.trim()) errors.push("Package Type is required.");
  if (quantity <= 0) errors.push("Quantity must be greater than 0.");
  if (!formData.modeOfPayment) errors.push("Mode of Payment is required.");
  if (totalSales <= 0) errors.push("Total Sales must be greater than 0.");

  if (
    releasedBottles < 0 ||
    releasedBlister < 0 ||
    toFollowBottles < 0 ||
    toFollowBlister < 0
  ) {
    errors.push("Released and To Follow quantities cannot be negative.");
  }

  if (formData.modeOfPayment && formData.modeOfPayment !== "MIXED") {
    if (requiresReference(formData.modeOfPayment) && !formData.referenceNumber.trim()) {
      errors.push("Reference No is required for the selected mode of payment.");
    }
    if (requiresBankName(formData.modeOfPayment) && !formData.bankName.trim()) {
      errors.push("Bank Name is required for the selected mode of payment.");
    }
    if (requiresCardType(formData.modeOfPayment) && !formData.cardType) {
      errors.push("Card Type is required for Credit Card payments.");
    }
    if (primaryAmount <= 0) {
      errors.push("Amount must be greater than 0.");
    }
  }

  if (formData.modeOfPayment === "MIXED") {
    if (!formData.modeOfPayment1 || !formData.modeOfPayment2) {
      errors.push("Both payment modes are required for mixed payments.");
    }
    if (requiresReference(formData.modeOfPayment1) && !formData.referenceNumber.trim()) {
      errors.push("Payment 1 reference number is required.");
    }
    if (requiresReference(formData.modeOfPayment2) && !formData.referenceNumber2.trim()) {
      errors.push("Payment 2 reference number is required.");
    }
    if (requiresBankName(formData.modeOfPayment1) && !formData.bankName.trim()) {
      errors.push("Payment 1 bank name is required.");
    }
    if (requiresBankName(formData.modeOfPayment2) && !formData.bankName2.trim()) {
      errors.push("Payment 2 bank name is required.");
    }
    if (requiresCardType(formData.modeOfPayment1) && !formData.cardType) {
      errors.push("Payment 1 card type is required.");
    }
    if (requiresCardType(formData.modeOfPayment2) && !formData.cardType2) {
      errors.push("Payment 2 card type is required.");
    }
    if (primaryAmount <= 0 || secondaryAmount <= 0) {
      errors.push("Both mixed payment amounts must be greater than 0.");
    }
    if (Math.abs(primaryAmount + secondaryAmount - totalSales) > 0.001) {
      errors.push("Mixed payment amounts must equal Total Sales.");
    }
  }

  return Array.from(new Set(errors));
}

function formatValidationMessage(errors: string[]): string {
  if (errors.length <= 3) return errors.join("\n");
  return `${errors.slice(0, 3).join("\n")}\n...and ${errors.length - 3} more issue(s).`;
}

const initialFormData: FormData = {
  event: "Davao City",
  date: getTodayLocalDate(),
  pofDigits: "",
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
  paymentAmount: "",
  referenceNumber: "",
  bankName: "",
  checkDate: "",
  cardType: "",
  modeOfPayment1: "",
  modeOfPayment2: "",
  paymentAmount2: "",
  referenceNumber2: "",
  bankName2: "",
  checkDate2: "",
  cardType2: "",
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
  marginBottom: 0,
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

export function EncoderForm({ onSave, savedCount }: EncoderFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isRemarksFocused, setIsRemarksFocused] = useState(false);
  const [isSaveHovered, setIsSaveHovered] = useState(false);
  const [isClearHovered, setIsClearHovered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<SalesDashboardUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [usersLoadError, setUsersLoadError] = useState<string | null>(null);
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isUsernameDropdownOpen, setIsUsernameDropdownOpen] = useState(false);
  const usernameFieldRef = useRef<HTMLLabelElement | null>(null);

  const handleInputChange = (field: keyof FormData, value: string) => {
    if (field === "event" || field === "originalPrice" || field === "priceAfterDiscount") {
      return;
    }
    setFormData((prev) => {
      if (field === "modeOfPayment") {
        if (value !== "MIXED") {
          return {
            ...prev,
            modeOfPayment: value as FormData["modeOfPayment"],
            modeOfPayment1: "",
            modeOfPayment2: "",
            paymentAmount2: "",
            referenceNumber2: "",
            bankName2: "",
            checkDate2: "",
            cardType2: "",
          };
        }
        return { ...prev, modeOfPayment: value as FormData["modeOfPayment"] };
      }
      return { ...prev, [field]: value };
    });
  };

  const loadUsers = React.useCallback(async () => {
    setIsUsersLoading(true);
    setUsersLoadError(null);

    try {
      const rows = await fetchSalesDashboardUsers();
      if (isEncoderSaveDebugEnabled) {
        console.log("USERNAME OPTIONS RAW", rows);
      }
      setUsers(rows);
    } catch (error) {
      console.error("USERNAME OPTIONS ERROR", error);
      const message = error instanceof Error ? error.message : "Failed to load usernames.";
      setUsersLoadError(message);
      setUsers([]);
    } finally {
      setIsUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (formData.event !== "Davao City") {
      setFormData((prev) => ({ ...prev, event: "Davao City" }));
    }
  }, [formData.event]);

  const shouldUseExistingUserDropdown = formData.newMember.trim().toLowerCase() === "no";

  useEffect(() => {
    if (shouldUseExistingUserDropdown) return;
    setIsUsernameDropdownOpen(false);
  }, [shouldUseExistingUserDropdown]);

  useEffect(() => {
    if (shouldUseExistingUserDropdown && isUsernameFocused) {
      setIsUsernameDropdownOpen(true);
    }
  }, [shouldUseExistingUserDropdown, isUsernameFocused]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!usernameFieldRef.current) return;
      if (usernameFieldRef.current.contains(event.target as Node)) return;
      setIsUsernameDropdownOpen(false);
      setIsUsernameFocused(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const netAmount = useMemo(() => {
    return getExpectedTotal(formData);
  }, [formData]);

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

  useEffect(() => {
    setFormData((prev) => {
      const nextTotal = String(netAmount);
      const nextPaymentAmount = prev.modeOfPayment === "MIXED" ? prev.paymentAmount : nextTotal;
      const nextPaymentAmount2 = prev.modeOfPayment === "MIXED" ? prev.paymentAmount2 : "";
      if (
        prev.totalSales === nextTotal &&
        prev.paymentAmount === nextPaymentAmount &&
        prev.paymentAmount2 === nextPaymentAmount2
      ) {
        return prev;
      }
      return {
        ...prev,
        totalSales: nextTotal,
        paymentAmount: nextPaymentAmount,
        paymentAmount2: nextPaymentAmount2,
      };
    });
  }, [netAmount, formData.modeOfPayment]);

  const filteredUsers = useMemo(() => {
    const query = formData.username.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => {
      const username = user.username.toLowerCase();
      const memberName = (user.member_name ?? "").toLowerCase();
      return username.includes(query) || memberName.includes(query);
    });
  }, [users, formData.username]);

  useEffect(() => {
    if (!isEncoderSaveDebugEnabled) return;
    console.log("USERNAME INPUT", formData.username);
    console.log("FILTERED USERNAMES", filteredUsers);
    console.log("DROPDOWN OPEN", isUsernameDropdownOpen);
  }, [formData.username, filteredUsers, isUsernameDropdownOpen]);

  const handleUsernameChange = (value: string) => {
    handleInputChange("username", value);
    if (shouldUseExistingUserDropdown) {
      setIsUsernameDropdownOpen(true);
    }
  };

  const handleClear = () => {
    setFormData(initialFormData);
  };

  const handleSave = async () => {
    if (isSaving) return;

    const validationErrors = validateFormData(formData);
    if (isEncoderSaveDebugEnabled) {
      console.log("ENCODER FORM STATE", formData);
    }
    if (validationErrors.length > 0) {
      console.warn("VALIDATION FAILED", validationErrors);
      alert(formatValidationMessage(validationErrors));
      return;
    }

    const pofNumber = formatPofForSave(formData.pofDigits);

    const isMixed = formData.modeOfPayment === "MIXED";
    const primaryAmount = toNumber(formData.paymentAmount);
    const secondaryAmount = toNumber(formData.paymentAmount2);
    const paymentMode1 = isMixed ? formData.modeOfPayment1 : formData.modeOfPayment;
    const paymentMode2 = isMixed ? formData.modeOfPayment2 : "";

    const primaryPayment = mapPayment(paymentMode1 as SplitPaymentMode | "");
    const secondaryPayment = mapPayment(paymentMode2 as SplitPaymentMode | "");

    const entry: SaleEntry = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      savedAt: new Date().toISOString(),
      event: formData.event,
      date: formData.date,
      pgfNumber: pofNumber,
      memberName: formData.memberName,
      username: formData.username,
      newMember: formData.newMember.toLowerCase(),
      memberType: normalizeMemberType(formData.memberType),
      packageType: formData.packageType,
      toBlister: formData.toBlister.toLowerCase(),
      originalPrice: formData.originalPrice,
      quantity: formData.quantity,
      blisterCount: formData.blisterCount,
      discount: formData.discount,
      priceAfterDiscount: formData.priceAfterDiscount,
      oneTimeDiscount: formData.oneTimeDiscount,
      totalSales: String(netAmount),
      modeOfPayment: primaryPayment.modeOfPayment,
      paymentModeType: primaryPayment.paymentModeType,
      referenceNumber: formData.referenceNumber,
      modeOfPayment2: isMixed ? secondaryPayment.modeOfPayment : "",
      paymentModeType2: isMixed ? secondaryPayment.paymentModeType : "",
      referenceNumber2: isMixed ? formData.referenceNumber2 : "",
      amount2: isMixed ? String(secondaryAmount) : "",
      releasedBottles: formData.releasedBottles,
      releasedBlister: formData.releasedBlister,
      toFollowBottles: formData.toFollowBottles,
      toFollowBlister: formData.toFollowBlister,
      remarks: formData.remarks,
      receivedBy: formData.receivedBy,
      collectedBy: formData.collectedBy,
    };

    if (isEncoderSaveDebugEnabled) {
      console.log("ENCODER PAYLOAD", entry);
    }

    try {
      setIsSaving(true);
      await onSave(entry);
      await loadUsers();
      alert("Entry saved successfully!");
      handleClear();
    } catch (error) {
      console.error("ENCODER SAVE ERROR", error);
      alert(mapSaveErrorToMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="w-full min-h-screen p-6"
      style={{
        backgroundColor: "#F4F6F9",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div className="mb-6 flex items-center justify-between">
        <h1 style={headingStyle}>New Sale Entry</h1>
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
          style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
        >
          Saved Entries: {savedCount}
        </span>
      </div>

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
              POF Number
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="POF-000000-000"
              value={formatPof(formData.pofDigits)}
              onChange={(event) => {
                const digits = onlyDigits(event.target.value).slice(0, 9);
                setFormData((prev) => ({ ...prev, pofDigits: digits }));
              }}
              className="w-full px-3"
              style={{
                height: "44px",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "#D0D5DD",
                borderRadius: "8px",
                outline: "none",
                backgroundColor: "#FFFFFF",
                color: "#111827",
                fontSize: "14px",
                lineHeight: "20px",
                fontWeight: 400,
              }}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FormField
            label="Member Name"
            value={formData.memberName}
            onChange={(value) => handleInputChange("memberName", value)}
            placeholder="Enter member name"
          />
          <label className="block relative" ref={usernameFieldRef}>
            <span
              className="block mb-2"
              style={{
                color: "#374151",
                fontSize: "14px",
                lineHeight: "20px",
                fontWeight: 400,
              }}
            >
              Username
            </span>
            <input
              type="text"
              value={formData.username}
              onChange={(event) => handleUsernameChange(event.target.value)}
              onFocus={() => {
                setIsUsernameFocused(true);
                if (shouldUseExistingUserDropdown) {
                  setIsUsernameDropdownOpen(true);
                }
              }}
              onClick={() => {
                if (shouldUseExistingUserDropdown) {
                  setIsUsernameDropdownOpen(true);
                }
              }}
              onBlur={() => setIsUsernameFocused(false)}
              placeholder={
                shouldUseExistingUserDropdown
                  ? "Search or select username"
                  : "Enter username"
              }
              className="w-full px-3"
              style={{
                height: "44px",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: isUsernameFocused ? "#2E3A8C" : "#D0D5DD",
                borderRadius: "8px",
                outline: "none",
                backgroundColor: "#FFFFFF",
                color: "#111827",
                fontSize: "14px",
                lineHeight: "20px",
                fontWeight: 400
              }}
            />
            {shouldUseExistingUserDropdown && isUsernameDropdownOpen ? (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  zIndex: 30,
                  backgroundColor: "#FFFFFF",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "#D0D5DD",
                  borderRadius: "8px",
                  boxShadow: "0 10px 24px rgba(0, 0, 0, 0.10)",
                  maxHeight: "220px",
                  overflowY: "auto"
                }}
              >
                {isUsersLoading ? (
                  <div
                    style={{
                      padding: "10px 12px",
                      fontSize: "14px",
                      lineHeight: "20px",
                      color: "#6B7280"
                    }}
                  >
                    Loading usernames...
                  </div>
                ) : usersLoadError ? (
                  <div
                    style={{
                      padding: "10px 12px",
                      fontSize: "14px",
                      lineHeight: "20px",
                      color: "#B91C1C"
                    }}
                  >
                    {usersLoadError}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div
                    style={{
                      padding: "10px 12px",
                      fontSize: "14px",
                      lineHeight: "20px",
                      color: "#6B7280"
                    }}
                  >
                    No matching usernames
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        handleInputChange("username", user.username);
                        if (!formData.memberName && user.member_name) {
                          handleInputChange("memberName", user.member_name);
                        }
                        setIsUsernameDropdownOpen(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        textAlign: "left",
                        backgroundColor:
                          formData.username.trim().toLowerCase() === user.username.trim().toLowerCase()
                            ? "#EFF6FF"
                            : "#FFFFFF",
                        color: "#111827",
                        borderTop: "none",
                        borderRight: "none",
                        borderBottom: "1px solid #E5E7EB",
                        borderLeft: "none",
                        cursor: "pointer",
                        fontSize: "14px",
                        lineHeight: "20px"
                      }}
                    >
                      <div>{user.username}</div>
                      {user.member_name ? (
                        <div
                          style={{
                            fontSize: "12px",
                            lineHeight: "18px",
                            color: "#6B7280"
                          }}
                        >
                          {user.member_name}
                        </div>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </label>
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
            options={MEMBER_TYPE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label
            }))}
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
              { value: "", label: "Select payment mode" },
              ...PAYMENT_MODES.map((mode) => ({ value: mode, label: mode })),
            ]}
          />
          {formData.modeOfPayment === "MIXED" ? (
            <>
              <FormSelect
                label="Payment 1 Mode"
                value={formData.modeOfPayment1}
                onChange={(value) => handleInputChange("modeOfPayment1", value)}
                options={[
                  { value: "", label: "Select mode" },
                  ...SPLIT_PAYMENT_MODES.map((mode) => ({ value: mode, label: mode })),
                ]}
              />
              <FormSelect
                label="Payment 2 Mode"
                value={formData.modeOfPayment2}
                onChange={(value) => handleInputChange("modeOfPayment2", value)}
                options={[
                  { value: "", label: "Select mode" },
                  ...SPLIT_PAYMENT_MODES.map((mode) => ({ value: mode, label: mode })),
                ]}
              />
            </>
          ) : (
            <>
              <FormField
                label="Amount"
                type="number"
                value={formData.paymentAmount}
                onChange={(value) => handleInputChange("paymentAmount", value)}
                placeholder="0"
                readOnly={formData.modeOfPayment === "CASH"}
              />
            </>
          )}
        </div>

        {formData.modeOfPayment && formData.modeOfPayment !== "MIXED" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {requiresBankName(formData.modeOfPayment) && (
              <FormField
                label="Bank Name"
                value={formData.bankName}
                onChange={(value) => handleInputChange("bankName", value)}
                placeholder="Enter bank name"
              />
            )}
            {requiresCardType(formData.modeOfPayment) && (
              <FormSelect
                label="Card Type"
                value={formData.cardType}
                onChange={(value) => handleInputChange("cardType", value)}
                options={[
                  { value: "", label: "Select card type" },
                  ...CARD_TYPES.map((cardType) => ({ value: cardType, label: cardType })),
                ]}
              />
            )}
            {requiresReference(formData.modeOfPayment) && (
              <FormField
                label={formData.modeOfPayment === "CHECK" ? "Check No" : formData.modeOfPayment === "CREDIT CARD" ? "Auth/Ref No" : "Reference No"}
                value={formData.referenceNumber}
                onChange={(value) => handleInputChange("referenceNumber", value)}
                placeholder="Enter reference number"
              />
            )}
            {formData.modeOfPayment === "CHECK" && (
              <FormField
                label="Check Date"
                type="date"
                value={formData.checkDate}
                onChange={(value) => handleInputChange("checkDate", value)}
              />
            )}
          </div>
        )}

        {formData.modeOfPayment === "MIXED" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="border rounded-lg p-4" style={{ borderColor: "#D0D5DD" }}>
              <div
                className="mb-3"
                style={{ color: "#2E3A8C", fontSize: "14px", lineHeight: "20px", fontWeight: 500 }}
              >
                Payment 1
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requiresBankName(formData.modeOfPayment1) && (
                  <FormField
                    label="Bank Name"
                    value={formData.bankName}
                    onChange={(value) => handleInputChange("bankName", value)}
                    placeholder="Enter bank name"
                  />
                )}
                {requiresCardType(formData.modeOfPayment1) && (
                  <FormSelect
                    label="Card Type"
                    value={formData.cardType}
                    onChange={(value) => handleInputChange("cardType", value)}
                    options={[
                      { value: "", label: "Select card type" },
                      ...CARD_TYPES.map((cardType) => ({ value: cardType, label: cardType })),
                    ]}
                  />
                )}
                {requiresReference(formData.modeOfPayment1) && (
                  <FormField
                    label={formData.modeOfPayment1 === "CHECK" ? "Check No" : formData.modeOfPayment1 === "CREDIT CARD" ? "Auth/Ref No" : "Reference No"}
                    value={formData.referenceNumber}
                    onChange={(value) => handleInputChange("referenceNumber", value)}
                    placeholder="Enter reference number"
                  />
                )}
                {formData.modeOfPayment1 === "CHECK" && (
                  <FormField
                    label="Check Date"
                    type="date"
                    value={formData.checkDate}
                    onChange={(value) => handleInputChange("checkDate", value)}
                  />
                )}
                <FormField
                  label="Amount"
                  type="number"
                  value={formData.paymentAmount}
                  onChange={(value) => handleInputChange("paymentAmount", value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="border rounded-lg p-4" style={{ borderColor: "#D0D5DD" }}>
              <div
                className="mb-3"
                style={{ color: "#2E3A8C", fontSize: "14px", lineHeight: "20px", fontWeight: 500 }}
              >
                Payment 2
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requiresBankName(formData.modeOfPayment2) && (
                  <FormField
                    label="Bank Name"
                    value={formData.bankName2}
                    onChange={(value) => handleInputChange("bankName2", value)}
                    placeholder="Enter bank name"
                  />
                )}
                {requiresCardType(formData.modeOfPayment2) && (
                  <FormSelect
                    label="Card Type"
                    value={formData.cardType2}
                    onChange={(value) => handleInputChange("cardType2", value)}
                    options={[
                      { value: "", label: "Select card type" },
                      ...CARD_TYPES.map((cardType) => ({ value: cardType, label: cardType })),
                    ]}
                  />
                )}
                {requiresReference(formData.modeOfPayment2) && (
                  <FormField
                    label={formData.modeOfPayment2 === "CHECK" ? "Check No" : formData.modeOfPayment2 === "CREDIT CARD" ? "Auth/Ref No" : "Reference No"}
                    value={formData.referenceNumber2}
                    onChange={(value) => handleInputChange("referenceNumber2", value)}
                    placeholder="Enter reference number"
                  />
                )}
                {formData.modeOfPayment2 === "CHECK" && (
                  <FormField
                    label="Check Date"
                    type="date"
                    value={formData.checkDate2}
                    onChange={(value) => handleInputChange("checkDate2", value)}
                  />
                )}
                <FormField
                  label="Amount"
                  type="number"
                  value={formData.paymentAmount2}
                  onChange={(value) => handleInputChange("paymentAmount2", value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}

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
            disabled={isSaving}
            onClick={handleSave}
            onMouseEnter={() => setIsSaveHovered(true)}
            onMouseLeave={() => setIsSaveHovered(false)}
            style={{
              ...actionButtonStyle,
              opacity: isSaving ? 0.7 : 1,
              backgroundColor: isSaveHovered ? "#16A34A" : "#22C55E",
            }}
          >
            {isSaving ? "Saving..." : "Save Entry"}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleClear}
            onMouseEnter={() => setIsClearHovered(true)}
            onMouseLeave={() => setIsClearHovered(false)}
            style={{
              ...actionButtonStyle,
              opacity: isSaving ? 0.7 : 1,
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
