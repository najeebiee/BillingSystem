import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Printer, Save, Trash2 } from "lucide-react";
import { AutoGrowTextarea } from "./AutoGrowTextarea";
import { FormActionButton } from "./ui/FormActionButton";
import { toast } from "sonner";
import {
  fetchRecentPrints,
  fetchSubmissionById,
  logPrint,
  upsertSubmissionForPrint,
  type RecentPrintRow,
} from "../services/formPrintTracking.service";
import { RecentPrintsTable } from "./forms/RecentPrintsTable";
import "./EventRequestForm.css";

type EventType = "" | "meeting" | "workshop";
type YesNo = "" | "yes" | "no";

type EventRequestFormState = {
  name: string;
  organizationDepartment: string;
  phoneNo: string;
  emailAddress: string;
  eventTitle: string;
  eventDescription: string;
  eventType: EventType;
  eventDates: string;
  timeFrom: string;
  timeTo: string;
  recurringEvent: YesNo;
  recurrenceDetails: string;
  preferredVenueRoom: string;
  expectedAttendance: string;
  roomSetupClassroomStyle: boolean;
  avProjector: boolean;
  avMicrophone: boolean;
  avSpeakers: boolean;
  avLaptopComputer: boolean;
  avZoomStreamingSupport: boolean;
  avOthersChecked: boolean;
  avOthersText: string;
  cateringNeeded: YesNo;
  cateringSpecify: string;
  securityNeeded: YesNo;
  requestedBy: string;
  dateOfRequest: string;
  signature: string;
  organizer: string;
  prayerTechnical: string;
  host: string;
  speaker: string;
  testimony1: string;
  testimony2: string;
};

type EventRequestValidationErrors = Partial<Record<keyof EventRequestFormState, string>>;

const initialState: EventRequestFormState = {
  name: "",
  organizationDepartment: "",
  phoneNo: "",
  emailAddress: "",
  eventTitle: "",
  eventDescription: "",
  eventType: "",
  eventDates: "",
  timeFrom: "",
  timeTo: "",
  recurringEvent: "",
  recurrenceDetails: "",
  preferredVenueRoom: "",
  expectedAttendance: "",
  roomSetupClassroomStyle: false,
  avProjector: false,
  avMicrophone: false,
  avSpeakers: false,
  avLaptopComputer: false,
  avZoomStreamingSupport: false,
  avOthersChecked: false,
  avOthersText: "",
  cateringNeeded: "",
  cateringSpecify: "",
  securityNeeded: "",
  requestedBy: "",
  dateOfRequest: "",
  signature: "",
  organizer: "",
  prayerTechnical: "",
  host: "",
  speaker: "",
  testimony1: "",
  testimony2: "",
};

const storageKey = "eventForms.eventRequest";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEventRequestFormState = (value: unknown): EventRequestFormState => {
  if (!value || typeof value !== "object") return initialState;
  const parsed = value as Partial<EventRequestFormState>;

  return {
    ...initialState,
    ...parsed,
    roomSetupClassroomStyle: Boolean(parsed.roomSetupClassroomStyle),
    avProjector: Boolean(parsed.avProjector),
    avMicrophone: Boolean(parsed.avMicrophone),
    avSpeakers: Boolean(parsed.avSpeakers),
    avLaptopComputer: Boolean(parsed.avLaptopComputer),
    avZoomStreamingSupport: Boolean(parsed.avZoomStreamingSupport),
    avOthersChecked: Boolean(parsed.avOthersChecked),
  };
};

const getValidationErrors = (state: EventRequestFormState): EventRequestValidationErrors => {
  const errors: EventRequestValidationErrors = {};

  if (!state.name.trim()) errors.name = "Name is required.";
  if (!state.phoneNo.trim()) errors.phoneNo = "Phone No. is required.";
  if (!state.eventTitle.trim()) errors.eventTitle = "Event Title is required.";
  if (!state.eventDates.trim()) errors.eventDates = "Date(s) is required.";
  if (!state.timeFrom.trim()) errors.timeFrom = "From time is required.";
  if (!state.timeTo.trim()) errors.timeTo = "To time is required.";
  if (!state.requestedBy.trim()) errors.requestedBy = "Requested By is required.";
  if (!state.dateOfRequest.trim()) errors.dateOfRequest = "Date of Request is required.";

  if (state.emailAddress.trim() && !emailPattern.test(state.emailAddress.trim())) {
    errors.emailAddress = "Enter a valid email address.";
  }

  if (state.expectedAttendance.trim()) {
    const value = Number(state.expectedAttendance);
    if (!Number.isFinite(value) || value < 0) {
      errors.expectedAttendance = "Expected attendance must be 0 or greater.";
    }
  }

  if (state.avOthersChecked && !state.avOthersText.trim()) {
    errors.avOthersText = "Please specify others.";
  }

  return errors;
};

type EventRequestFormProps = {
  showBackButton?: boolean;
  embedded?: boolean;
  showToolbar?: boolean;
  showPrintRoot?: boolean;
  showActions?: boolean;
  onRegisterActions?: (actions: {
    getState: () => unknown;
    setState: (state: unknown) => void;
    resetState: () => void;
    validateBeforeSave?: () => boolean;
    save?: () => void;
    load?: () => void;
    clear?: () => void;
    print?: () => void;
  }) => void;
};

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  requiredMark?: boolean;
  error?: string;
};

function FormInput({ label, requiredMark, error, className = "", ...props }: FormInputProps) {
  return (
    <label className="erf-field">
      <span className="erf-label">
        {label}
        {requiredMark ? <span className="erf-required">*</span> : null}
      </span>
      <input className={`erf-input ${className}`.trim()} {...props} />
      {error ? <span className="erf-error">{error}</span> : null}
    </label>
  );
}

type FormTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

function FormTextarea({ label, className = "", ...props }: FormTextareaProps) {
  return (
    <label className="erf-field">
      <span className="erf-label">{label}</span>
      <AutoGrowTextarea className={`erf-textarea ${className}`.trim()} {...props} />
    </label>
  );
}

type FormSectionProps = {
  title: string;
  children: React.ReactNode;
};

function FormSection({ title, children }: FormSectionProps) {
  return (
    <section className="erf-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function mark(checked: boolean) {
  return checked ? "\u2611" : "\u2610";
}

function printText(value: string) {
  return value.trim() || "\u00A0";
}

type PrintFieldProps = {
  label: string;
  value: string;
  multiline?: boolean;
};

function PrintField({ label, value, multiline = false }: PrintFieldProps) {
  return (
    <div className={`print-field ${multiline ? "print-field-multiline" : ""}`}>
      <div className="print-label">{label}</div>
      <div className={`print-line ${multiline ? "print-line-multiline" : ""}`}>
        <span className="print-value">{printText(value)}</span>
      </div>
    </div>
  );
}

export function EventRequestForm({
  showBackButton = true,
  embedded = false,
  showToolbar = true,
  showPrintRoot = true,
  showActions = true,
  onRegisterActions,
}: EventRequestFormProps) {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<EventRequestFormState>(initialState);
  const [showValidation, setShowValidation] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [referenceNo, setReferenceNo] = useState<string | null>(null);
  const [printedAt, setPrintedAt] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [recentPrints, setRecentPrints] = useState<RecentPrintRow[]>([]);

  const validationErrors = useMemo(
    () => (showValidation ? getValidationErrors(formState) : {}),
    [showValidation, formState],
  );

  const updateField = <K extends keyof EventRequestFormState>(key: K, value: EventRequestFormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const validateBeforeSave = () => {
    setShowValidation(true);
    return Object.keys(getValidationErrors(formState)).length === 0;
  };

  const handleReset = () => {
    setShowValidation(false);
    setFormState(initialState);
    localStorage.removeItem(storageKey);
  };

  const handleSave = () => {
    if (!validateBeforeSave()) return;
    localStorage.setItem(storageKey, JSON.stringify(formState));
  };

  const handleLoad = () => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      window.alert("No saved data yet.");
      return;
    }

    try {
      setShowValidation(false);
      setFormState(normalizeEventRequestFormState(JSON.parse(saved)));
    } catch {
      window.alert("No saved data yet.");
    }
  };

  const handleClear = () => {
    if (!window.confirm("Clear this form?")) return;
    handleReset();
  };

  const loadRecentPrints = useCallback(async () => {
    const result = await fetchRecentPrints({ formType: "ER" });
    if (!result.error) setRecentPrints(result.data);
  }, []);

  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    const now = new Date().toLocaleString();
    setPrintedAt(now);

    try {
      const upsert = await upsertSubmissionForPrint({
        submissionId,
        formType: "ER",
        payload: formState as Record<string, unknown>,
      });

      if (upsert.error || !upsert.data) {
        window.alert(upsert.error || "Failed to save print submission.");
        return;
      }

      setSubmissionId(upsert.data.id);
      setReferenceNo(upsert.data.reference_no);

      const logResult = await logPrint({
        submissionId: upsert.data.id,
        formType: "ER",
        referenceNo: upsert.data.reference_no,
      });

      if (logResult.error) {
        window.alert(logResult.error);
        return;
      }

      await loadRecentPrints();
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  useEffect(() => {
    onRegisterActions?.({
      getState: () => formState,
      setState: (nextState) => {
        setShowValidation(false);
        setFormState(normalizeEventRequestFormState(nextState));
      },
      resetState: handleReset,
      validateBeforeSave,
      save: handleSave,
      load: handleLoad,
      clear: handleClear,
      print: handlePrint,
    });
  }, [onRegisterActions, formState]);

  useEffect(() => {
    loadRecentPrints();
  }, [loadRecentPrints]);

  const handleLoadSubmission = async (id: string) => {
    const result = await fetchSubmissionById(id);
    if (result.error || !result.data) {
      window.alert(result.error || "Failed to load submission.");
      return;
    }

    setShowValidation(false);
    setFormState(normalizeEventRequestFormState(result.data.payload));
    setSubmissionId(result.data.id);
    setReferenceNo(result.data.reference_no);
    toast.success(`Loaded ${result.data.reference_no}`);
  };

  const printRoot =
    showPrintRoot && typeof document !== "undefined"
      ? createPortal(
            <div id="print-root" className="print-only">
              <div className="print-section">
                <div className="print-line">
                  <span className="print-label">Reference No:</span>
                  <span className="print-value">{referenceNo ?? "\u2014"}</span>
                </div>
                <div className="print-line">
                  <span className="print-label">Date Printed:</span>
                  <span className="print-value">{printedAt ?? new Date().toLocaleString()}</span>
                </div>
              </div>
              <header className="print-header print-section">
                <h1 className="print-title">EVENT REQUEST FORM</h1>
                <p className="print-note">
                IMPORTANT: ALL EVENT REQUEST SHOULD BE DONE 5 DAYS PRIOR AND ARE OPEN TO ALL GRINDERS GUILD
                DISTRIBUTORS.
              </p>
            </header>

            <div className="print-grid">
              <div className="print-col">
                <section className="print-section form-section">
                  <h2 className="print-section-title">1. CONTACT INFORMATION</h2>
                  <PrintField label="Name" value={formState.name} />
                  <PrintField label="Organization/Department" value={formState.organizationDepartment} />
                  <PrintField label="Phone No." value={formState.phoneNo} />
                  <PrintField label="Email Address" value={formState.emailAddress} />
                </section>

                <section className="print-section form-section">
                  <h2 className="print-section-title">2. EVENT DETAILS</h2>
                  <PrintField label="Event Title" value={formState.eventTitle} />
                  <PrintField label="Event Description" value={formState.eventDescription} multiline />
                  <div className="print-check-group checkbox-group">
                    <div className="print-check-title">Event Type (check one)</div>
                    <div>{mark(formState.eventType === "meeting")} Meeting - GBP Product Presentation</div>
                    <div>{mark(formState.eventType === "workshop")} Workshop - Grinders Distributors Orientation</div>
                  </div>
                  <PrintField label="Date(s)" value={formState.eventDates} />
                  <div className="print-inline-pair">
                    <PrintField label="Time: From" value={formState.timeFrom} />
                    <PrintField label="To" value={formState.timeTo} />
                  </div>
                  <div className="print-check-group radio-group">
                    <div className="print-check-title">Is this a recurring event?</div>
                    <div>{mark(formState.recurringEvent === "yes")} Yes</div>
                    <div>{mark(formState.recurringEvent === "no")} No</div>
                  </div>
                  <PrintField label="If Yes, please specify recurrence" value={formState.recurrenceDetails} />
                </section>

                <section className="print-section form-section">
                  <h2 className="print-section-title">3. LOCATION & SET-UP NEEDS</h2>
                  <PrintField label="Preferred Venue/Room" value={formState.preferredVenueRoom} />
                  <PrintField label="Expected attendance" value={formState.expectedAttendance} />
                  <div className="print-check-group checkbox-group">
                    <div className="print-check-title">Room Set-Up Required</div>
                    <div>{mark(formState.roomSetupClassroomStyle)} Classroom Style</div>
                  </div>
                  <div className="print-check-group checkbox-group">
                    <div className="print-check-title">Audio/Visual Requirements</div>
                    <div>{mark(formState.avProjector)} Projector</div>
                    <div>{mark(formState.avMicrophone)} Microphone</div>
                    <div>{mark(formState.avSpeakers)} Speakers</div>
                    <div>{mark(formState.avLaptopComputer)} Laptop/Computer</div>
                    <div>{mark(formState.avZoomStreamingSupport)} Zoom/Streaming Support</div>
                    <div>{mark(formState.avOthersChecked)} Others</div>
                  </div>
                  <PrintField label="Others (specify)" value={formState.avOthersText} multiline />
                </section>
              </div>

              <div className="print-col">
                <section className="print-section form-section">
                  <h2 className="print-section-title">4. ADDITIONAL SERVICES (IF Applicable)</h2>
                  <div className="print-check-group radio-group">
                    <div className="print-check-title">Catering Needed?</div>
                    <div>{mark(formState.cateringNeeded === "yes")} Yes</div>
                    <div>{mark(formState.cateringNeeded === "no")} No</div>
                  </div>
                  <PrintField label="If Yes, specify" value={formState.cateringSpecify} />
                  <div className="print-check-group radio-group">
                    <div className="print-check-title">Security</div>
                    <div>{mark(formState.securityNeeded === "yes")} Yes</div>
                    <div>{mark(formState.securityNeeded === "no")} No</div>
                  </div>
                </section>

                <section className="print-section form-section">
                  <h2 className="print-section-title">5. AUTHORIZATION & SUBMISSION</h2>
                  <PrintField label="Requested By" value={formState.requestedBy} />
                  <PrintField label="Date Of Request" value={formState.dateOfRequest} />
                  <PrintField label="Signature / Full Name" value={formState.signature} />
                  <PrintField label="Organizer" value={formState.organizer} />
                  <PrintField label="Prayer/Technical" value={formState.prayerTechnical} />
                  <PrintField label="Host" value={formState.host} />
                  <PrintField label="Speaker" value={formState.speaker} />
                  <PrintField label="Testimony 1)" value={formState.testimony1} />
                  <PrintField label="Testimony 2)" value={formState.testimony2} />
                </section>

                <section className="print-section note-block">
                  <h2 className="print-section-title">NOTE: For Speakers Attire:</h2>
                  <ol className="print-note-list">
                    <li>At least polo shirt</li>
                    <li>If T-Shirt w/ round neck, use blazer/coat</li>
                  </ol>
                </section>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={
        embedded
          ? "erf-page form-page form-page--embedded"
          : "erf-page erf-page-standalone form-page form-page--standalone"
      }
    >
      <div className={embedded ? "form-page-body" : "pt-16 form-page-body"}>
        <div
          className={
            embedded ? "erf-shell form-shell" : "erf-shell form-shell max-w-[1440px] mx-auto px-4 md:px-6 py-6 md:py-8"
          }
        >
          {showToolbar && (
            <div className="erf-header-actions no-print">
              {showBackButton ? (
                <div className="form-toolbar__left no-print">
                  <FormActionButton type="button" onClick={() => navigate("/event-forms")} className="erf-back-btn">
                    <ArrowLeft className="form-btn__icon" />
                    Back to Forms
                  </FormActionButton>
                </div>
              ) : (
                <div />
              )}
            </div>
          )}

          <div className="screen-form no-print form-screen">
            <div className="form-screen__body">
              <header className="erf-screen-top">
                <h1>Event Request Form</h1>
                <p>
                  Complete the details below. This is the interactive entry form. Print preview will generate the formal
                  filled document.
                </p>
              </header>

            <div className="erf-columns">
              <div className="erf-column">
                <FormSection title="1. CONTACT INFORMATION">
                  <FormInput
                    label="Name"
                    requiredMark
                    value={formState.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    error={validationErrors.name}
                  />
                  <FormInput
                    label="Organization/Department"
                    value={formState.organizationDepartment}
                    onChange={(e) => updateField("organizationDepartment", e.target.value)}
                  />
                  <FormInput
                    label="Phone No."
                    requiredMark
                    value={formState.phoneNo}
                    onChange={(e) => updateField("phoneNo", e.target.value)}
                    error={validationErrors.phoneNo}
                  />
                  <FormInput
                    label="Email Address"
                    type="email"
                    value={formState.emailAddress}
                    onChange={(e) => updateField("emailAddress", e.target.value)}
                    error={validationErrors.emailAddress}
                  />
                </FormSection>

                <FormSection title="2. EVENT DETAILS">
                  <FormInput
                    label="Event Title"
                    requiredMark
                    value={formState.eventTitle}
                    onChange={(e) => updateField("eventTitle", e.target.value)}
                    error={validationErrors.eventTitle}
                  />
                  <FormTextarea
                    label="Event Description"
                    rows={3}
                    value={formState.eventDescription}
                    onChange={(e) => updateField("eventDescription", e.target.value)}
                  />
                  <fieldset className="erf-choice-group">
                    <legend>Event Type (check one)</legend>
                    <label className="erf-choice">
                      <input
                        type="radio"
                        name="event-type"
                        checked={formState.eventType === "meeting"}
                        onChange={() => updateField("eventType", "meeting")}
                      />
                      <span>Meeting - GBP Product Presentation</span>
                    </label>
                    <label className="erf-choice">
                      <input
                        type="radio"
                        name="event-type"
                        checked={formState.eventType === "workshop"}
                        onChange={() => updateField("eventType", "workshop")}
                      />
                      <span>Workshop - Grinders Distributors Orientation</span>
                    </label>
                  </fieldset>
                  <FormInput
                    label="Date(s)"
                    requiredMark
                    value={formState.eventDates}
                    onChange={(e) => updateField("eventDates", e.target.value)}
                    error={validationErrors.eventDates}
                  />
                  <div className="erf-inline-grid">
                    <FormInput
                      label="Time: From"
                      requiredMark
                      type="time"
                      value={formState.timeFrom}
                      onChange={(e) => updateField("timeFrom", e.target.value)}
                      error={validationErrors.timeFrom}
                    />
                    <FormInput
                      label="To"
                      requiredMark
                      type="time"
                      value={formState.timeTo}
                      onChange={(e) => updateField("timeTo", e.target.value)}
                      error={validationErrors.timeTo}
                    />
                  </div>
                  <fieldset className="erf-choice-group">
                    <legend>Is this a recurring event?</legend>
                    <div className="erf-yes-no-row">
                      <label className="erf-choice">
                        <input
                          type="radio"
                          name="recurring"
                          checked={formState.recurringEvent === "yes"}
                          onChange={() => updateField("recurringEvent", "yes")}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="erf-choice">
                        <input
                          type="radio"
                          name="recurring"
                          checked={formState.recurringEvent === "no"}
                          onChange={() => updateField("recurringEvent", "no")}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </fieldset>
                  <FormInput
                    label="If Yes, please specify recurrence"
                    value={formState.recurrenceDetails}
                    onChange={(e) => updateField("recurrenceDetails", e.target.value)}
                  />
                </FormSection>

                <FormSection title="3. LOCATION & SET-UP NEEDS">
                  <FormInput
                    label="Preferred Venue/Room"
                    value={formState.preferredVenueRoom}
                    onChange={(e) => updateField("preferredVenueRoom", e.target.value)}
                  />
                  <FormInput
                    label="Expected attendance"
                    type="number"
                    min={0}
                    value={formState.expectedAttendance}
                    onChange={(e) => updateField("expectedAttendance", e.target.value)}
                    error={validationErrors.expectedAttendance}
                  />
                  <fieldset className="erf-choice-group">
                    <legend>Room Set-Up Required</legend>
                    <label className="erf-choice">
                      <input
                        type="checkbox"
                        checked={formState.roomSetupClassroomStyle}
                        onChange={(e) => updateField("roomSetupClassroomStyle", e.target.checked)}
                      />
                      <span>Classroom Style</span>
                    </label>
                  </fieldset>
                  <fieldset className="erf-choice-group">
                    <legend>Audio/Visual Requirements</legend>
                    <div className="erf-av-list">
                      <label className="erf-choice">
                        <input
                          type="checkbox"
                          checked={formState.avProjector}
                          onChange={(e) => updateField("avProjector", e.target.checked)}
                        />
                        <span>Projector</span>
                      </label>
                      <label className="erf-choice">
                        <input
                          type="checkbox"
                          checked={formState.avMicrophone}
                          onChange={(e) => updateField("avMicrophone", e.target.checked)}
                        />
                        <span>Microphone</span>
                      </label>
                      <label className="erf-choice">
                        <input
                          type="checkbox"
                          checked={formState.avSpeakers}
                          onChange={(e) => updateField("avSpeakers", e.target.checked)}
                        />
                        <span>Speakers</span>
                      </label>
                      <label className="erf-choice">
                        <input
                          type="checkbox"
                          checked={formState.avLaptopComputer}
                          onChange={(e) => updateField("avLaptopComputer", e.target.checked)}
                        />
                        <span>Laptop/Computer</span>
                      </label>
                      <label className="erf-choice">
                        <input
                          type="checkbox"
                          checked={formState.avZoomStreamingSupport}
                          onChange={(e) => updateField("avZoomStreamingSupport", e.target.checked)}
                        />
                        <span>Zoom/Streaming Support</span>
                      </label>
                      <label className="erf-choice">
                        <input
                          type="checkbox"
                          checked={formState.avOthersChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            updateField("avOthersChecked", checked);
                            if (!checked) updateField("avOthersText", "");
                          }}
                        />
                        <span>Others</span>
                      </label>
                    </div>
                    {formState.avOthersChecked ? (
                      <FormInput
                        label="Specify others"
                        value={formState.avOthersText}
                        onChange={(e) => updateField("avOthersText", e.target.value)}
                        error={validationErrors.avOthersText}
                      />
                    ) : null}
                  </fieldset>
                </FormSection>
              </div>

              <div className="erf-column">
                <FormSection title="4. ADDITIONAL SERVICES (IF Applicable)">
                  <fieldset className="erf-choice-group">
                    <legend>Catering Needed?</legend>
                    <div className="erf-yes-no-row">
                      <label className="erf-choice">
                        <input
                          type="radio"
                          name="catering"
                          checked={formState.cateringNeeded === "yes"}
                          onChange={() => updateField("cateringNeeded", "yes")}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="erf-choice">
                        <input
                          type="radio"
                          name="catering"
                          checked={formState.cateringNeeded === "no"}
                          onChange={() => updateField("cateringNeeded", "no")}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </fieldset>
                  <FormInput
                    label="If Yes, specify"
                    value={formState.cateringSpecify}
                    onChange={(e) => updateField("cateringSpecify", e.target.value)}
                  />
                  <fieldset className="erf-choice-group">
                    <legend>Security</legend>
                    <div className="erf-yes-no-row">
                      <label className="erf-choice">
                        <input
                          type="radio"
                          name="security"
                          checked={formState.securityNeeded === "yes"}
                          onChange={() => updateField("securityNeeded", "yes")}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="erf-choice">
                        <input
                          type="radio"
                          name="security"
                          checked={formState.securityNeeded === "no"}
                          onChange={() => updateField("securityNeeded", "no")}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </fieldset>
                </FormSection>

                <FormSection title="5. AUTHORIZATION & SUBMISSION">
                  <FormInput
                    label="Requested By"
                    requiredMark
                    value={formState.requestedBy}
                    onChange={(e) => updateField("requestedBy", e.target.value)}
                    error={validationErrors.requestedBy}
                  />
                  <FormInput
                    label="Date Of Request"
                    requiredMark
                    type="date"
                    value={formState.dateOfRequest}
                    onChange={(e) => updateField("dateOfRequest", e.target.value)}
                    error={validationErrors.dateOfRequest}
                  />
                  <FormInput
                    label="Signature / Full Name"
                    value={formState.signature}
                    onChange={(e) => updateField("signature", e.target.value)}
                  />
                  <FormInput
                    label="Organizer"
                    value={formState.organizer}
                    onChange={(e) => updateField("organizer", e.target.value)}
                  />
                  <FormInput
                    label="Prayer/Technical"
                    value={formState.prayerTechnical}
                    onChange={(e) => updateField("prayerTechnical", e.target.value)}
                  />
                  <FormInput label="Host" value={formState.host} onChange={(e) => updateField("host", e.target.value)} />
                  <FormInput
                    label="Speaker"
                    value={formState.speaker}
                    onChange={(e) => updateField("speaker", e.target.value)}
                  />
                  <FormInput
                    label="Testimony 1)"
                    value={formState.testimony1}
                    onChange={(e) => updateField("testimony1", e.target.value)}
                  />
                  <FormInput
                    label="Testimony 2)"
                    value={formState.testimony2}
                    onChange={(e) => updateField("testimony2", e.target.value)}
                  />
                  <div className="erf-note-block">
                    <h3>NOTE: For Speakers Attire:</h3>
                    <ol>
                      <li>At least polo shirt</li>
                      <li>If T-Shirt w/ round neck, use blazer/coat</li>
                    </ol>
                  </div>
                </FormSection>
              </div>
            </div>

              <RecentPrintsTable formType="ER" rows={recentPrints} onLoad={handleLoadSubmission} />
            </div>

            {showActions ? (
              <div className="form-actions-bottom no-print">
                <FormActionButton type="button" onClick={handleSave}>
                  <Save className="form-btn__icon" />
                  Save
                </FormActionButton>
                <FormActionButton type="button" onClick={handleLoad}>
                  <Download className="form-btn__icon" />
                  Load
                </FormActionButton>
                <FormActionButton type="button" onClick={handleClear}>
                  <Trash2 className="form-btn__icon" />
                  Clear
                </FormActionButton>
                <FormActionButton type="button" onClick={handlePrint} disabled={isPrinting}>
                  <Printer className="form-btn__icon" />
                  Print
                </FormActionButton>
                <span className="print-hint no-print">
                  Disable Headers and Footers in the print dialog for best results.
                </span>
              </div>
            ) : null}
          </div>

          {printRoot}
        </div>
      </div>
    </div>
  );
}


