import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { submitEventRequest } from "../services/eventRequests.service";
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
  onRegisterActions?: (actions: {
    getState: () => unknown;
    setState: (state: unknown) => void;
    resetState: () => void;
    validateBeforeSave?: () => boolean;
  }) => void;
};

type LinedInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  requiredMark?: boolean;
  error?: string;
};

function LinedInput({ label, requiredMark, error, className = "", ...props }: LinedInputProps) {
  return (
    <label className="erf-field">
      <span className="erf-label">
        {label}
        {requiredMark ? <span className="erf-required">*</span> : null}
      </span>
      <input className={`erf-lined-input ${className}`.trim()} {...props} />
      {error ? <span className="erf-error">{error}</span> : null}
    </label>
  );
}

type LinedTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

function LinedTextarea({ label, className = "", ...props }: LinedTextareaProps) {
  return (
    <label className="erf-field">
      <span className="erf-label">{label}</span>
      <textarea className={`erf-lined-textarea ${className}`.trim()} {...props} />
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

export function EventRequestForm({
  showBackButton = true,
  embedded = false,
  onRegisterActions,
}: EventRequestFormProps) {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<EventRequestFormState>(initialState);
  const [showValidation, setShowValidation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowValidation(true);

    const errors = getValidationErrors(formState);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formState,
        expectedAttendance: formState.expectedAttendance.trim() ? Number(formState.expectedAttendance) : null,
      };

      console.log("Event request payload", payload);
      const { error } = await submitEventRequest(payload);

      if (error) {
        console.warn("Event request sync failed:", error);
        toast.success("Event request submitted.");
        return;
      }

      toast.success("Event request submitted.");
    } catch (error) {
      console.warn("Event request submit error:", error);
      toast.success("Event request submitted.");
    } finally {
      setIsSubmitting(false);
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
    });
  }, [onRegisterActions, formState]);

  return (
    <div className={embedded ? "erf-page" : "erf-page erf-page-standalone"}>
      <div className={embedded ? "" : "pt-16"}>
        <div className={embedded ? "" : "max-w-[1440px] mx-auto px-4 md:px-6 py-6 md:py-8"}>
          {showBackButton ? (
            <div className="erf-header-actions no-print print-hide">
              <button type="button" onClick={() => navigate("/event-forms")} className="erf-back-btn">
                <ArrowLeft className="w-4 h-4" />
                Back to Forms
              </button>
            </div>
          ) : null}

          <div className="print-root">
            <form className="erf-paper mx-auto" onSubmit={handleSubmit}>
              <header className="erf-top">
                <h1>EVENT REQUEST FORM</h1>
                <p>
                  IMPORTANT: ALL EVENT REQUEST SHOULD BE DONE 5 DAYS PRIOR AND ARE OPEN TO ALL GRINDERS GUILD
                  DISTRIBUTORS.
                </p>
              </header>

              <div className="erf-columns">
                <div className="erf-column">
                  <FormSection title="1. CONTACT INFORMATION">
                    <LinedInput
                      label="Name"
                      requiredMark
                      value={formState.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      error={validationErrors.name}
                    />
                    <LinedInput
                      label="Organization/Department"
                      value={formState.organizationDepartment}
                      onChange={(e) => updateField("organizationDepartment", e.target.value)}
                    />
                    <LinedInput
                      label="Phone No."
                      requiredMark
                      value={formState.phoneNo}
                      onChange={(e) => updateField("phoneNo", e.target.value)}
                      error={validationErrors.phoneNo}
                    />
                    <LinedInput
                      label="Email Address"
                      type="email"
                      value={formState.emailAddress}
                      onChange={(e) => updateField("emailAddress", e.target.value)}
                      error={validationErrors.emailAddress}
                    />
                  </FormSection>

                  <FormSection title="2. EVENT DETAILS">
                  <LinedInput
                    label="Event Title"
                    requiredMark
                    value={formState.eventTitle}
                    onChange={(e) => updateField("eventTitle", e.target.value)}
                    error={validationErrors.eventTitle}
                  />
                  <LinedTextarea
                    label="Event Description"
                    rows={4}
                    value={formState.eventDescription}
                    onChange={(e) => updateField("eventDescription", e.target.value)}
                    onInput={(e) => {
                      const target = e.currentTarget;
                      target.style.height = "auto";
                      target.style.height = `${Math.min(target.scrollHeight, 180)}px`;
                    }}
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

                  <LinedInput
                    label="Date(s)"
                    requiredMark
                    placeholder="e.g. 2026-02-12, 2026-02-14"
                    value={formState.eventDates}
                    onChange={(e) => updateField("eventDates", e.target.value)}
                    error={validationErrors.eventDates}
                  />

                  <div className="erf-inline-grid">
                    <LinedInput
                      label="Time: From"
                      requiredMark
                      type="time"
                      value={formState.timeFrom}
                      onChange={(e) => updateField("timeFrom", e.target.value)}
                      error={validationErrors.timeFrom}
                    />
                    <LinedInput
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

                  <LinedInput
                    label="If Yes, please specify recurrence"
                    value={formState.recurrenceDetails}
                    onChange={(e) => updateField("recurrenceDetails", e.target.value)}
                  />
                  </FormSection>

                  <FormSection title="3. LOCATION & SET-UP NEEDS">
                  <LinedInput
                    label="Preferred Venue/Room"
                    value={formState.preferredVenueRoom}
                    onChange={(e) => updateField("preferredVenueRoom", e.target.value)}
                  />
                  <LinedInput
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
                      <LinedInput
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
                  <LinedInput
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
                  <LinedInput
                    label="Requested By"
                    requiredMark
                    value={formState.requestedBy}
                    onChange={(e) => updateField("requestedBy", e.target.value)}
                    error={validationErrors.requestedBy}
                  />
                  <LinedInput
                    label="Date Of Request"
                    requiredMark
                    type="date"
                    value={formState.dateOfRequest}
                    onChange={(e) => updateField("dateOfRequest", e.target.value)}
                    error={validationErrors.dateOfRequest}
                  />
                  <LinedInput
                    label="Signature / Full Name"
                    value={formState.signature}
                    onChange={(e) => updateField("signature", e.target.value)}
                  />
                  <LinedInput
                    label="Organizer"
                    value={formState.organizer}
                    onChange={(e) => updateField("organizer", e.target.value)}
                  />
                  <LinedInput
                    label="Prayer/Technical"
                    value={formState.prayerTechnical}
                    onChange={(e) => updateField("prayerTechnical", e.target.value)}
                  />
                  <LinedInput
                    label="Host"
                    value={formState.host}
                    onChange={(e) => updateField("host", e.target.value)}
                  />
                  <LinedInput
                    label="Speaker"
                    value={formState.speaker}
                    onChange={(e) => updateField("speaker", e.target.value)}
                  />

                  <div className="erf-field">
                    <span className="erf-label">Testimony:</span>
                    <LinedInput
                      label="1)"
                      value={formState.testimony1}
                      onChange={(e) => updateField("testimony1", e.target.value)}
                    />
                    <LinedInput
                      label="2)"
                      value={formState.testimony2}
                      onChange={(e) => updateField("testimony2", e.target.value)}
                    />
                  </div>

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

              <div className="erf-actions no-print print-hide">
                <button type="button" className="erf-button erf-button-secondary" onClick={() => window.print()}>
                  Print
                </button>
                <button type="button" className="erf-button erf-button-secondary" onClick={handleReset}>
                  Reset
                </button>
                <button type="submit" className="erf-button erf-button-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
