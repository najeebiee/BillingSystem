import { FormEvent, useMemo, useState } from "react";
import { DailySalesDialog } from "@/components/daily-sales/DailySalesDialog";
import "@/components/daily-sales/DailySalesEncoder.css";
import {
  encoderDiscountOptions,
  getPaymentTypeOptions,
  primaryPaymentModes,
  secondaryPaymentModes,
} from "@/components/daily-sales/shared";
import {
  dailySalesDiscountMatrix,
  encoderPackageOptions,
  getDailySalesPackageBlisterCount,
  getDailySalesPackageBottleCount,
  getDailySalesPackageConfig,
  getDailySalesPackagePrice,
  hasBundledPackageBlisters,
} from "@/lib/dailySalesPackages";
import { saveDailySalesEntry } from "@/services/dailySales.service";
import type {
  EncoderBlisterOption,
  EncoderFormModel,
  EncoderMemberTypeOption,
  EncoderPackageTypeOption,
  EncoderPaymentModeOption,
} from "@/types/dailySales";

type ManualOverrideKey =
  | "oneTimeDiscount"
  | "price"
  | "sales"
  | "released"
  | "releasedBlpk"
  | "toFollow"
  | "toFollowBlpk"
  | "salesTwo";

type ManualOverrides = Record<ManualOverrideKey, boolean>;

type NumericField =
  | "quantity"
  | "discount"
  | "price"
  | "oneTimeDiscount"
  | "sales"
  | "released"
  | "releasedBlpk"
  | "toFollow"
  | "toFollowBlpk"
  | "salesTwo";

const today = new Date().toISOString().slice(0, 10);

const initialManualOverrides: ManualOverrides = {
  oneTimeDiscount: false,
  price: false,
  sales: false,
  released: false,
  releasedBlpk: false,
  toFollow: false,
  toFollowBlpk: false,
  salesTwo: false,
};

const encoderInputClassName = "daily-sales-encoder__input";
const encoderReadonlyInputClassName =
  "daily-sales-encoder__input daily-sales-encoder__input--readonly";

function applyMemberPackageRules(
  current: EncoderFormModel,
  memberType: EncoderMemberTypeOption,
  packageType: EncoderPackageTypeOption,
): EncoderFormModel {
  const packageConfig = getDailySalesPackageConfig(packageType);

  return {
    ...current,
    memberType,
    packageType,
    originalPrice: packageConfig.originalPrice,
    discount: dailySalesDiscountMatrix[memberType][packageType],
    isToBlister: packageConfig.defaultIsToBlister,
  };
}

function buildInitialForm(): EncoderFormModel {
  const base: EncoderFormModel = {
    event: "DAVAO",
    date: today,
    pofNumber: "",
    name: "",
    username: "",
    newMember: "1",
    memberType: "DISTRIBUTOR",
    packageType: "SILVER",
    isToBlister: getDailySalesPackageConfig("SILVER").defaultIsToBlister,
    originalPrice: getDailySalesPackagePrice("SILVER"),
    quantity: 1,
    blisterCount: 0,
    discount: 0,
    price: getDailySalesPackagePrice("SILVER"),
    oneTimeDiscount: 0,
    noOfBottles: 1,
    sales: getDailySalesPackagePrice("SILVER"),
    paymentMode: "CASH",
    paymentType: "N/A",
    referenceNo: "N/A",
    paymentModeTwo: "N/A",
    paymentTypeTwo: "N/A",
    referenceNoTwo: "N/A",
    salesTwo: 0,
    released: 1,
    releasedBlpk: 0,
    toFollow: 0,
    toFollowBlpk: 0,
    remarks: "",
    receivedBy: "Hanna Jean Fernandez",
    collectedBy: "Jake Roldan Laurente",
  };

  return applyMemberPackageRules(base, base.memberType, base.packageType);
}

function applyComputedFields(input: EncoderFormModel, manualOverrides: ManualOverrides): EncoderFormModel {
  const quantity = Math.max(input.quantity, 0);
  const discount = Math.max(input.discount, 0);
  const oneTimeDiscount = manualOverrides.oneTimeDiscount
    ? input.oneTimeDiscount
    : Math.max(input.oneTimeDiscount, 0);
  const price = manualOverrides.price ? input.price : Math.max(input.originalPrice - discount, 0);
  const blisterCount = getDailySalesPackageBlisterCount(
    input.packageType,
    quantity,
    input.isToBlister,
  );
  const noOfBottles = getDailySalesPackageBottleCount(input.packageType, quantity);
  const sales = manualOverrides.sales ? input.sales : Math.max(price * quantity - oneTimeDiscount, 0);
  const normalizedSalesTwo = manualOverrides.salesTwo
    ? input.salesTwo
    : input.paymentMode === "EPOINTS"
    ? sales
    : Math.min(Math.max(input.salesTwo, 0), sales);

  return {
    ...input,
    quantity,
    discount,
    oneTimeDiscount,
    blisterCount,
    noOfBottles,
    price,
    sales,
    salesTwo: normalizedSalesTwo,
  };
}

export function EncoderTab({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState<EncoderFormModel>(() =>
    applyComputedFields(buildInitialForm(), initialManualOverrides),
  );
  const [manualOverrides, setManualOverrides] = useState<ManualOverrides>(initialManualOverrides);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState("Daily sales entry saved successfully.");
  const [paymentModeTwoError, setPaymentModeTwoError] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isBundledPackage = hasBundledPackageBlisters(form.packageType);

  const primaryPaymentTypeOptions = useMemo(
    () => getPaymentTypeOptions(form.paymentMode),
    [form.paymentMode],
  );
  const secondaryPaymentTypeOptions = useMemo(
    () => getPaymentTypeOptions(form.paymentModeTwo),
    [form.paymentModeTwo],
  );
  const primaryTypeIsReadOnly =
    primaryPaymentTypeOptions.length === 1 && primaryPaymentTypeOptions[0].value === "N/A";
  const secondaryTypeIsReadOnly =
    secondaryPaymentTypeOptions.length === 1 && secondaryPaymentTypeOptions[0].value === "N/A";

  const resetForm = () => {
    setForm(applyComputedFields(buildInitialForm(), initialManualOverrides));
    setManualOverrides(initialManualOverrides);
    setPaymentModeTwoError("");
  };

  const updateField = <K extends keyof EncoderFormModel>(key: K, value: EncoderFormModel[K]) => {
    setForm((prev) => applyComputedFields({ ...prev, [key]: value }, manualOverrides));
  };

  const updateNumericField = (key: NumericField, value: string, manualKey?: ManualOverrideKey) => {
    const parsed = Number(value || 0);
    const numericValue = Number.isFinite(parsed) ? parsed : 0;
    const nextOverrides = manualKey ? { ...manualOverrides, [manualKey]: true } : manualOverrides;

    if (manualKey) {
      setManualOverrides(nextOverrides);
    }

    setForm((prev) => applyComputedFields({ ...prev, [key]: numericValue }, nextOverrides));
  };

  const onPaymentModeChange = (value: Exclude<EncoderPaymentModeOption, "N/A">) => {
    setForm((prev) => {
      const nextOptions = getPaymentTypeOptions(value);
      const nextPaymentType = nextOptions[0]?.value ?? "N/A";
      const nextReferenceNo = nextPaymentType === "N/A" ? "N/A" : "";
      const nextSalesTwo = manualOverrides.salesTwo ? prev.salesTwo : value === "EPOINTS" ? prev.sales : prev.salesTwo;

      if (prev.paymentModeTwo !== "N/A" && prev.paymentModeTwo === value) {
        setPaymentModeTwoError("Secondary payment mode cannot match primary mode.");
        return applyComputedFields(
          {
            ...prev,
            paymentMode: value,
            paymentType: nextPaymentType,
            referenceNo: nextReferenceNo,
            salesTwo: nextSalesTwo,
            paymentModeTwo: "N/A",
            paymentTypeTwo: "N/A",
            referenceNoTwo: "N/A",
          },
          manualOverrides,
        );
      }

      setPaymentModeTwoError("");
      return applyComputedFields(
        {
          ...prev,
          paymentMode: value,
          paymentType: nextPaymentType,
          referenceNo: nextReferenceNo,
          salesTwo: nextSalesTwo,
        },
        manualOverrides,
      );
    });
  };

  const onPaymentModeTwoChange = (value: EncoderPaymentModeOption) => {
    if (value !== "N/A" && value === form.paymentMode) {
      setPaymentModeTwoError("Secondary payment mode cannot match primary mode.");
      setForm((prev) =>
        applyComputedFields(
          {
            ...prev,
            paymentModeTwo: "N/A",
            paymentTypeTwo: "N/A",
            referenceNoTwo: "N/A",
          },
          manualOverrides,
        ),
      );
      return;
    }

    setPaymentModeTwoError("");
    const nextOptions = getPaymentTypeOptions(value);
    const nextPaymentType = nextOptions[0]?.value ?? "N/A";
    const nextReferenceNo = nextPaymentType === "N/A" ? "N/A" : "";

    setForm((prev) =>
      applyComputedFields(
        {
          ...prev,
          paymentModeTwo: value,
          paymentTypeTwo: nextPaymentType,
          referenceNoTwo: nextReferenceNo,
        },
        manualOverrides,
      ),
    );
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    try {
      const result = await saveDailySalesEntry(form);
      setSavedMessage(
        result.source === "remote"
          ? "Daily sales entry saved successfully."
          : "Daily sales entry saved locally. Backend wiring for this dataset still needs setup.",
      );
      setIsSavedOpen(true);
      resetForm();
      onSaved();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save daily sales entry.");
    }
  };

  return (
    <>
      <section className="daily-sales-encoder">
        <div className="daily-sales-encoder__card">
          <h2 className="daily-sales-encoder__title">Encoder</h2>
          {submitError ? <p className="daily-sales-encoder__error">{submitError}</p> : null}
          <form
            className="daily-sales-encoder__form"
            onSubmit={onSubmit}
            onReset={(event) => {
              event.preventDefault();
              resetForm();
            }}
          >
            <div className="daily-sales-encoder__grid">
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Event</label>
                <input
                  value={form.event}
                  onChange={(event) => updateField("event", event.target.value)}
                  className={encoderInputClassName}
                />
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => updateField("date", event.target.value)}
                  className={encoderInputClassName}
                />
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">POF Number</label>
                <input
                  value={form.pofNumber}
                  onChange={(event) => updateField("pofNumber", event.target.value)}
                  className={encoderInputClassName}
                />
              </div>

              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Member Name</label>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className={encoderInputClassName}
                />
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Username</label>
                <input
                  value={form.username}
                  onChange={(event) => updateField("username", event.target.value)}
                  className={encoderInputClassName}
                />
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">New Member?</label>
                <select
                  value={form.newMember}
                  onChange={(event) => updateField("newMember", event.target.value as "1" | "0")}
                  className={encoderInputClassName}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>

              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Member Type</label>
                <select
                  value={form.memberType}
                  onChange={(event) =>
                    setForm((prev) =>
                      applyComputedFields(
                        applyMemberPackageRules(
                          prev,
                          event.target.value as EncoderMemberTypeOption,
                          prev.packageType,
                        ),
                        manualOverrides,
                      ),
                    )
                  }
                  className={encoderInputClassName}
                >
                  <option value="DISTRIBUTOR">Distributor</option>
                  <option value="STOCKIST">Mobile Stockist</option>
                  <option value="CENTER">Center</option>
                  <option value="NON-MEMBER">Non-member</option>
                </select>
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Package Type</label>
                <select
                  value={form.packageType}
                  onChange={(event) =>
                    setForm((prev) =>
                      applyComputedFields(
                        applyMemberPackageRules(
                          prev,
                          prev.memberType,
                          event.target.value as EncoderPackageTypeOption,
                        ),
                        manualOverrides,
                      ),
                    )
                  }
                  className={encoderInputClassName}
                >
                  {encoderPackageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">To Blister?</label>
                <select
                  value={form.isToBlister}
                  onChange={(event) =>
                    updateField("isToBlister", event.target.value as EncoderBlisterOption)
                  }
                  disabled={isBundledPackage}
                  className={isBundledPackage ? encoderReadonlyInputClassName : encoderInputClassName}
                >
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
                {isBundledPackage ? (
                  <span className="daily-sales-encoder__helper">
                    Package bundles already include blister counts.
                  </span>
                ) : null}
              </div>

              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Original Price</label>
                <input
                  type="number"
                  readOnly
                  value={form.originalPrice}
                  className={encoderReadonlyInputClassName}
                />
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(event) => updateNumericField("quantity", event.target.value)}
                  className={encoderInputClassName}
                />
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Blister Count</label>
                <input
                  type="number"
                  readOnly
                  value={form.blisterCount}
                  className={encoderReadonlyInputClassName}
                />
              </div>

              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Discount</label>
                <select
                  value={form.discount}
                  onChange={(event) => updateNumericField("discount", event.target.value)}
                  className={encoderInputClassName}
                >
                  {encoderDiscountOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Price</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(event) => updateNumericField("price", event.target.value, "price")}
                  className={encoderInputClassName}
                />
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">One-time Discount</label>
                <input
                  type="number"
                  min="0"
                  value={form.oneTimeDiscount}
                  onChange={(event) =>
                    updateNumericField("oneTimeDiscount", event.target.value, "oneTimeDiscount")
                  }
                  className={encoderInputClassName}
                />
              </div>

              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Number of Bottles</label>
                <input
                  type="number"
                  readOnly
                  value={form.noOfBottles}
                  className={encoderReadonlyInputClassName}
                />
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Total Sales</label>
                <input
                  type="number"
                  value={form.sales}
                  onChange={(event) => updateNumericField("sales", event.target.value, "sales")}
                  className={encoderInputClassName}
                />
              </div>
            </div>

            <div className="daily-sales-encoder__grid daily-sales-encoder__grid--quad">
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Mode of Payment</label>
                <select
                  value={form.paymentMode}
                  onChange={(event) =>
                    onPaymentModeChange(
                      event.target.value as Exclude<EncoderPaymentModeOption, "N/A">,
                    )
                  }
                  className={encoderInputClassName}
                >
                  {primaryPaymentModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode === "AR(LEADERSUPPORT)" ? "AR (LEADER SUPPORT)" : mode}
                    </option>
                  ))}
                </select>
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Payment Mode Type</label>
                <select
                  value={form.paymentType}
                  onChange={(event) => updateField("paymentType", event.target.value)}
                  disabled={primaryTypeIsReadOnly}
                  className={
                    primaryTypeIsReadOnly ? encoderReadonlyInputClassName : encoderInputClassName
                  }
                >
                  {primaryPaymentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Reference Number</label>
                <input
                  value={form.referenceNo}
                  readOnly={primaryTypeIsReadOnly}
                  onChange={(event) => updateField("referenceNo", event.target.value)}
                  className={
                    primaryTypeIsReadOnly ? encoderReadonlyInputClassName : encoderInputClassName
                  }
                />
              </div>

              <div className="daily-sales-encoder__field daily-sales-encoder__field--desktop-row-start">
                <label className="daily-sales-encoder__label">Mode of Payment (2)</label>
                <select
                  value={form.paymentModeTwo}
                  onChange={(event) =>
                    onPaymentModeTwoChange(event.target.value as EncoderPaymentModeOption)
                  }
                  className={encoderInputClassName}
                >
                  {secondaryPaymentModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode === "AR(LEADERSUPPORT)" ? "AR (LEADER SUPPORT)" : mode}
                    </option>
                  ))}
                </select>
                {paymentModeTwoError ? (
                  <span className="daily-sales-encoder__helper daily-sales-encoder__helper--error">
                    {paymentModeTwoError}
                  </span>
                ) : null}
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Payment Mode Type (2)</label>
                <select
                  value={form.paymentTypeTwo}
                  onChange={(event) => updateField("paymentTypeTwo", event.target.value)}
                  disabled={secondaryTypeIsReadOnly}
                  className={
                    secondaryTypeIsReadOnly
                      ? encoderReadonlyInputClassName
                      : encoderInputClassName
                  }
                >
                  {secondaryPaymentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Reference Number (2)</label>
                <input
                  value={form.referenceNoTwo}
                  readOnly={secondaryTypeIsReadOnly}
                  onChange={(event) => updateField("referenceNoTwo", event.target.value)}
                  className={
                    secondaryTypeIsReadOnly
                      ? encoderReadonlyInputClassName
                      : encoderInputClassName
                  }
                />
              </div>

              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Amount (2)</label>
                <input
                  type="number"
                  min="0"
                  value={form.salesTwo}
                  onChange={(event) =>
                    updateNumericField("salesTwo", event.target.value, "salesTwo")
                  }
                  className={encoderInputClassName}
                />
              </div>
            </div>

            <div className="daily-sales-encoder__grid daily-sales-encoder__grid--quad">
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Released (Bottle)</label>
                <input
                  type="number"
                  min="0"
                  value={form.released}
                  onChange={(event) => updateNumericField("released", event.target.value, "released")}
                  className={encoderInputClassName}
                />
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">Released (Blister)</label>
                <input
                  type="number"
                  min="0"
                  value={form.releasedBlpk}
                  onChange={(event) =>
                    updateNumericField("releasedBlpk", event.target.value, "releasedBlpk")
                  }
                  className={encoderInputClassName}
                />
              </div>
              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">To Follow (Bottle)</label>
                <input
                  type="number"
                  min="0"
                  value={form.toFollow}
                  onChange={(event) => updateNumericField("toFollow", event.target.value, "toFollow")}
                  className={encoderInputClassName}
                />
              </div>

              <div className="daily-sales-encoder__field">
                <label className="daily-sales-encoder__label">To Follow (Blister)</label>
                <input
                  type="number"
                  min="0"
                  value={form.toFollowBlpk}
                  onChange={(event) =>
                    updateNumericField("toFollowBlpk", event.target.value, "toFollowBlpk")
                  }
                  className={encoderInputClassName}
                />
              </div>
            </div>

            <div className="daily-sales-encoder__grid">
              <div className="daily-sales-encoder__field daily-sales-encoder__full">
                <label className="daily-sales-encoder__label">Remarks</label>
                <textarea
                  value={form.remarks}
                  onChange={(event) => updateField("remarks", event.target.value)}
                  className="daily-sales-encoder__textarea"
                  rows={4}
                />
              </div>

              <div className="daily-sales-encoder__full">
                <div className="daily-sales-encoder__pair">
                  <div className="daily-sales-encoder__field">
                    <label className="daily-sales-encoder__label">Received By</label>
                    <input
                      value={form.receivedBy}
                      onChange={(event) => updateField("receivedBy", event.target.value)}
                      className={encoderInputClassName}
                    />
                  </div>
                  <div className="daily-sales-encoder__field">
                    <label className="daily-sales-encoder__label">Collected By</label>
                    <input
                      value={form.collectedBy}
                      onChange={(event) => updateField("collectedBy", event.target.value)}
                      className={encoderInputClassName}
                    />
                  </div>
                </div>
              </div>

              <div className="daily-sales-encoder__full daily-sales-encoder__actions">
                <button
                  type="reset"
                  className="daily-sales-encoder__action daily-sales-encoder__action--secondary"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  className="daily-sales-encoder__action daily-sales-encoder__action--primary"
                >
                  Save Entry
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <DailySalesDialog isOpen={isSavedOpen} title="Saved" onClose={() => setIsSavedOpen(false)}>
        {savedMessage}
      </DailySalesDialog>
    </>
  );
}

