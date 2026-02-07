import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Printer, Save, Trash2 } from "lucide-react";

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
  eventDate: string;
  timeFrom: string;
  timeTo: string;
  recurring: YesNo;
  recurrenceDetails: string;
  preferredVenueRoom: string;
  expectedAttendance: string;
  roomSetupClassroomStyle: boolean;
  avProjector: boolean;
  avMicrophone: boolean;
  avSpeakers: boolean;
  avLaptopComputer: boolean;
  avZoomStreamingSupport: boolean;
  avOthers: string;
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

type EventRequestValidationErrors = Partial<
  Record<"name" | "eventTitle" | "eventDate" | "preferredVenueRoom" | "requestedBy", string>
>;

const storageKey = "eventForms.eventRequest";

const initialState: EventRequestFormState = {
  name: "",
  organizationDepartment: "",
  phoneNo: "",
  emailAddress: "",
  eventTitle: "",
  eventDescription: "",
  eventType: "",
  eventDate: "",
  timeFrom: "",
  timeTo: "",
  recurring: "",
  recurrenceDetails: "",
  preferredVenueRoom: "",
  expectedAttendance: "",
  roomSetupClassroomStyle: false,
  avProjector: false,
  avMicrophone: false,
  avSpeakers: false,
  avLaptopComputer: false,
  avZoomStreamingSupport: false,
  avOthers: "",
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
  };
};

const getValidationErrors = (state: EventRequestFormState): EventRequestValidationErrors => {
  const errors: EventRequestValidationErrors = {};

  if (!state.name.trim()) errors.name = "Name is required.";
  if (!state.eventTitle.trim()) errors.eventTitle = "Event title is required.";
  if (!state.eventDate.trim()) errors.eventDate = "Date(s) is required.";
  if (!state.preferredVenueRoom.trim()) errors.preferredVenueRoom = "Preferred venue/room is required.";
  if (!state.requestedBy.trim()) errors.requestedBy = "Requested by is required.";

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

export function EventRequestForm({
  showBackButton = true,
  embedded = false,
  showToolbar = true,
  onRegisterActions,
}: EventRequestFormProps) {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<EventRequestFormState>(initialState);
  const [showValidation, setShowValidation] = useState(false);

  const validationErrors = useMemo(
    () => (showValidation ? getValidationErrors(formState) : {}),
    [showValidation, formState],
  );

  const updateField = <K extends keyof EventRequestFormState>(
    key: K,
    value: EventRequestFormState[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const validateBeforeSave = () => {
    setShowValidation(true);
    return Object.keys(getValidationErrors(formState)).length === 0;
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
    setShowValidation(false);
    setFormState(initialState);
    localStorage.removeItem(storageKey);
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    onRegisterActions?.({
      getState: () => formState,
      setState: (nextState) => {
        setShowValidation(false);
        setFormState(normalizeEventRequestFormState(nextState));
      },
      resetState: () => {
        setShowValidation(false);
        setFormState(initialState);
      },
      validateBeforeSave,
    });
  }, [onRegisterActions, formState]);

  return (
    <div className={embedded ? "event-request-page" : "event-request-page min-h-screen bg-gray-50"}>
      <div className={embedded ? "" : "pt-16"}>
        <div className={embedded ? "" : "max-w-[1440px] mx-auto px-6 py-8"}>
          {showToolbar && (
            <div className="form-toolbar">
              {showBackButton ? (
                <div className="form-toolbar__left">
                  <button onClick={() => navigate("/event-forms")} className="toolbar-btn toolbar-btn--back">
                    <ArrowLeft className="form-btn__icon" />
                    Back to Forms
                  </button>
                </div>
              ) : (
                <div />
              )}
              <div className="form-toolbar__right">
                <button onClick={handleSave} className="toolbar-btn">
                  <Save className="form-btn__icon" />
                  Save
                </button>
                <button onClick={handleLoad} className="toolbar-btn">
                  <Download className="form-btn__icon" />
                  Load
                </button>
                <button onClick={handleClear} className="toolbar-btn">
                  <Trash2 className="form-btn__icon" />
                  Clear
                </button>
                <button onClick={handlePrint} className="toolbar-btn">
                  <Printer className="form-btn__icon" />
                  Print
                </button>
              </div>
            </div>
          )}

          <div className="event-request-paper event-request-print-area mx-auto">
            <header className="event-request-header">
              <h1>Event Request Form</h1>
              <p>
                Submit at least 5 days before the event date. Use clear details for faster review.
              </p>
            </header>

            <div className="event-request-grid twoColWrap">
              <div className="event-request-col">
                <section className="event-request-section">
                  <h2>1. Contact Information</h2>
                  <label className="event-request-field">
                    <span className="event-request-label">
                      Name <span className="event-request-required">*</span>
                    </span>
                    <input
                      value={formState.name}
                      onChange={(e) => updateField("name", e.target.value)}
                    />
                    {validationErrors.name && <span className="event-request-error">{validationErrors.name}</span>}
                  </label>
                  <label className="event-request-field">
                    <span className="event-request-label">Organization/Department</span>
                    <input
                      value={formState.organizationDepartment}
                      onChange={(e) => updateField("organizationDepartment", e.target.value)}
                    />
                  </label>
                  <label className="event-request-field">
                    <span className="event-request-label">Phone No.</span>
                    <input
                      value={formState.phoneNo}
                      onChange={(e) => updateField("phoneNo", e.target.value)}
                    />
                  </label>
                  <label className="event-request-field">
                    <span className="event-request-label">Email Address</span>
                    <input
                      value={formState.emailAddress}
                      onChange={(e) => updateField("emailAddress", e.target.value)}
                    />
                  </label>
                </section>

                <section className="event-request-section">
                  <h2>2. Event Details</h2>
                  <label className="event-request-field">
                    <span className="event-request-label">
                      Event Title <span className="event-request-required">*</span>
                    </span>
                    <input
                      value={formState.eventTitle}
                      onChange={(e) => updateField("eventTitle", e.target.value)}
                    />
                    {validationErrors.eventTitle && (
                      <span className="event-request-error">{validationErrors.eventTitle}</span>
                    )}
                  </label>
                  <label className="event-request-field">
                    <span className="event-request-label">Event Description</span>
                    <textarea
                      rows={4}
                      value={formState.eventDescription}
                      onChange={(e) => updateField("eventDescription", e.target.value)}
                    />
                  </label>

                  <fieldset className="event-request-choice-group">
                    <legend>Event Type</legend>
                    <label className="event-request-choice">
                      <input
                        type="radio"
                        name="event-type"
                        checked={formState.eventType === "meeting"}
                        onChange={() => updateField("eventType", "meeting")}
                      />
                      <span>Meeting - GBP Product Presentation</span>
                    </label>
                    <label className="event-request-choice">
                      <input
                        type="radio"
                        name="event-type"
                        checked={formState.eventType === "workshop"}
                        onChange={() => updateField("eventType", "workshop")}
                      />
                      <span>Workshop - Grinders Distributors Orientation</span>
                    </label>
                  </fieldset>

                  <label className="event-request-field">
                    <span className="event-request-label">
                      Date(s) <span className="event-request-required">*</span>
                    </span>
                    <input
                      placeholder="dd/mm/yyyy"
                      value={formState.eventDate}
                      onChange={(e) => updateField("eventDate", e.target.value)}
                    />
                    {validationErrors.eventDate && (
                      <span className="event-request-error">{validationErrors.eventDate}</span>
                    )}
                  </label>

                  <div className="event-request-inline-grid">
                    <label className="event-request-field">
                      <span className="event-request-label">Time From</span>
                      <input
                        value={formState.timeFrom}
                        onChange={(e) => updateField("timeFrom", e.target.value)}
                      />
                    </label>
                    <label className="event-request-field">
                      <span className="event-request-label">Time To</span>
                      <input
                        value={formState.timeTo}
                        onChange={(e) => updateField("timeTo", e.target.value)}
                      />
                    </label>
                  </div>

                  <fieldset className="event-request-choice-group">
                    <legend>Recurring Event?</legend>
                    <div className="event-request-yesno-row">
                      <label className="event-request-choice">
                        <input
                          type="radio"
                          name="recurring"
                          checked={formState.recurring === "yes"}
                          onChange={() => updateField("recurring", "yes")}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="event-request-choice">
                        <input
                          type="radio"
                          name="recurring"
                          checked={formState.recurring === "no"}
                          onChange={() => updateField("recurring", "no")}
                        />
                        <span>No</span>
                      </label>
                    </div>
                    <label className="event-request-field">
                      <span className="event-request-label">If yes, specify recurrence</span>
                      <input
                        value={formState.recurrenceDetails}
                        onChange={(e) => updateField("recurrenceDetails", e.target.value)}
                      />
                    </label>
                  </fieldset>
                </section>

                <section className="event-request-section">
                  <h2>3. Location &amp; Set-up Needs</h2>
                  <label className="event-request-field">
                    <span className="event-request-label">
                      Preferred Venue/Room <span className="event-request-required">*</span>
                    </span>
                    <input
                      value={formState.preferredVenueRoom}
                      onChange={(e) => updateField("preferredVenueRoom", e.target.value)}
                    />
                    {validationErrors.preferredVenueRoom && (
                      <span className="event-request-error">{validationErrors.preferredVenueRoom}</span>
                    )}
                  </label>
                  <label className="event-request-field">
                    <span className="event-request-label">Expected Attendance</span>
                    <input
                      value={formState.expectedAttendance}
                      onChange={(e) => updateField("expectedAttendance", e.target.value)}
                    />
                  </label>

                  <fieldset className="event-request-choice-group">
                    <legend>Room Set-up</legend>
                    <label className="event-request-choice">
                      <input
                        type="checkbox"
                        checked={formState.roomSetupClassroomStyle}
                        onChange={(e) => updateField("roomSetupClassroomStyle", e.target.checked)}
                      />
                      <span>Classroom style</span>
                    </label>
                  </fieldset>

                  <fieldset className="event-request-choice-group">
                    <legend>Audio/Visual Requirements</legend>
                    <div className="event-request-checkbox-grid">
                      <label className="event-request-choice">
                        <input
                          type="checkbox"
                          checked={formState.avProjector}
                          onChange={(e) => updateField("avProjector", e.target.checked)}
                        />
                        <span>Projector</span>
                      </label>
                      <label className="event-request-choice">
                        <input
                          type="checkbox"
                          checked={formState.avMicrophone}
                          onChange={(e) => updateField("avMicrophone", e.target.checked)}
                        />
                        <span>Microphone</span>
                      </label>
                      <label className="event-request-choice">
                        <input
                          type="checkbox"
                          checked={formState.avSpeakers}
                          onChange={(e) => updateField("avSpeakers", e.target.checked)}
                        />
                        <span>Speakers</span>
                      </label>
                      <label className="event-request-choice">
                        <input
                          type="checkbox"
                          checked={formState.avLaptopComputer}
                          onChange={(e) => updateField("avLaptopComputer", e.target.checked)}
                        />
                        <span>Laptop/Computer</span>
                      </label>
                      <label className="event-request-choice">
                        <input
                          type="checkbox"
                          checked={formState.avZoomStreamingSupport}
                          onChange={(e) => updateField("avZoomStreamingSupport", e.target.checked)}
                        />
                        <span>Zoom/Streaming Support</span>
                      </label>
                    </div>
                    <label className="event-request-field">
                      <span className="event-request-label">Others</span>
                      <input
                        value={formState.avOthers}
                        onChange={(e) => updateField("avOthers", e.target.value)}
                      />
                    </label>
                  </fieldset>

                  <div className="event-request-info">
                    <div className="event-request-info__title">Speaker Attire Note</div>
                    <p>At least polo shirt. If using a round-neck shirt, pair it with a blazer or coat.</p>
                  </div>
                </section>
              </div>

              <div className="event-request-col event-request-right-col">
                <section className="event-request-section">
                  <h2>4. Additional Services</h2>

                  <fieldset className="event-request-choice-group">
                    <legend>Catering Needed?</legend>
                    <div className="event-request-yesno-row">
                      <label className="event-request-choice">
                        <input
                          type="radio"
                          name="catering-needed"
                          checked={formState.cateringNeeded === "yes"}
                          onChange={() => updateField("cateringNeeded", "yes")}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="event-request-choice">
                        <input
                          type="radio"
                          name="catering-needed"
                          checked={formState.cateringNeeded === "no"}
                          onChange={() => updateField("cateringNeeded", "no")}
                        />
                        <span>No</span>
                      </label>
                    </div>
                    <label className="event-request-field">
                      <span className="event-request-label">If yes, specify</span>
                      <input
                        value={formState.cateringSpecify}
                        onChange={(e) => updateField("cateringSpecify", e.target.value)}
                      />
                    </label>
                  </fieldset>

                  <fieldset className="event-request-choice-group">
                    <legend>Security Needed?</legend>
                    <div className="event-request-yesno-row">
                      <label className="event-request-choice">
                        <input
                          type="radio"
                          name="security-needed"
                          checked={formState.securityNeeded === "yes"}
                          onChange={() => updateField("securityNeeded", "yes")}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="event-request-choice">
                        <input
                          type="radio"
                          name="security-needed"
                          checked={formState.securityNeeded === "no"}
                          onChange={() => updateField("securityNeeded", "no")}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </fieldset>
                </section>

                <section className="event-request-section rightColSection">
                  <h2>5. Authorization &amp; Submission</h2>
                  <label className="event-request-field">
                    <span className="event-request-label">
                      Requested By <span className="event-request-required">*</span>
                    </span>
                    <input
                      value={formState.requestedBy}
                      onChange={(e) => updateField("requestedBy", e.target.value)}
                    />
                    {validationErrors.requestedBy && (
                      <span className="event-request-error">{validationErrors.requestedBy}</span>
                    )}
                  </label>
                  <label className="event-request-field">
                    <span className="event-request-label">Date of Request</span>
                    <input
                      placeholder="dd/mm/yyyy"
                      value={formState.dateOfRequest}
                      onChange={(e) => updateField("dateOfRequest", e.target.value)}
                    />
                  </label>
                  <label className="event-request-field">
                    <span className="event-request-label">Signature</span>
                    <input
                      value={formState.signature}
                      onChange={(e) => updateField("signature", e.target.value)}
                    />
                  </label>
                  <label className="event-request-field">
                    <span className="event-request-label">Organizer</span>
                    <input
                      value={formState.organizer}
                      onChange={(e) => updateField("organizer", e.target.value)}
                    />
                  </label>
                  <label className="event-request-field">
                    <span className="event-request-label">Prayer/Technical</span>
                    <input
                      value={formState.prayerTechnical}
                      onChange={(e) => updateField("prayerTechnical", e.target.value)}
                    />
                  </label>
                  <label className="event-request-field">
                    <span className="event-request-label">Host</span>
                    <input
                      value={formState.host}
                      onChange={(e) => updateField("host", e.target.value)}
                    />
                  </label>
                  <label className="event-request-field">
                    <span className="event-request-label">Speaker</span>
                    <input
                      value={formState.speaker}
                      onChange={(e) => updateField("speaker", e.target.value)}
                    />
                  </label>

                  <div className="event-request-choice-group testimonyBlock">
                    <div className="event-request-label">Testimony</div>
                    <label className="event-request-field fieldRowTight">
                      <span className="event-request-label">1.)</span>
                      <input
                        value={formState.testimony1}
                        onChange={(e) => updateField("testimony1", e.target.value)}
                      />
                    </label>
                    <label className="event-request-field fieldRowTight testimonyRow">
                      <span className="event-request-label">2.)</span>
                      <input
                        value={formState.testimony2}
                        onChange={(e) => updateField("testimony2", e.target.value)}
                      />
                    </label>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
