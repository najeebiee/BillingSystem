import React, { useEffect, useState } from "react";
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

const storageKey = "event-request-form";

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

type EventRequestFormProps = {
  showBackButton?: boolean;
  embedded?: boolean;
  showToolbar?: boolean;
  onRegisterActions?: (actions: {
    save: () => void;
    load: () => void;
    clear: () => void;
    print: () => void;
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

  const updateField = <K extends keyof EventRequestFormState>(
    key: K,
    value: EventRequestFormState[K],
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(formState));
  };

  const handleLoad = () => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<EventRequestFormState>;
      setFormState({
        ...initialState,
        ...parsed,
      });
    } catch {
      // Ignore malformed storage data.
    }
  };

  const handleClear = () => {
    setFormState(initialState);
    localStorage.removeItem(storageKey);
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    onRegisterActions?.({
      save: handleSave,
      load: handleLoad,
      clear: handleClear,
      print: handlePrint,
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
              <h1>EVENT REQUEST FORM</h1>
              <p>
                IMPORTANT: ALL EVENT REQUEST SHOULD BE DONE 5 DAYS PRIOR AND ARE OPEN TO ALL
                GRINDERS GUILD DISTRIBUTORS.
              </p>
            </header>

            <div className="event-request-grid">
              <div className="event-request-col">
                <section className="event-request-section">
                  <h2>1. CONTACT INFORMATION</h2>
                  <label className="event-request-row">
                    <span>Name</span>
                    <input value={formState.name} onChange={(e) => updateField("name", e.target.value)} />
                  </label>
                  <label className="event-request-row">
                    <span>Organization/Department</span>
                    <input
                      value={formState.organizationDepartment}
                      onChange={(e) => updateField("organizationDepartment", e.target.value)}
                    />
                  </label>
                  <label className="event-request-row">
                    <span>Phone No.</span>
                    <input value={formState.phoneNo} onChange={(e) => updateField("phoneNo", e.target.value)} />
                  </label>
                  <label className="event-request-row">
                    <span>Email Address</span>
                    <input
                      value={formState.emailAddress}
                      onChange={(e) => updateField("emailAddress", e.target.value)}
                    />
                  </label>
                </section>

                <section className="event-request-section">
                  <h2>2. EVENT DETAILS</h2>
                  <label className="event-request-row">
                    <span>Event Title</span>
                    <input
                      value={formState.eventTitle}
                      onChange={(e) => updateField("eventTitle", e.target.value)}
                    />
                  </label>
                  <label className="event-request-row event-request-row--stacked">
                    <span>Event Description</span>
                    <textarea
                      rows={3}
                      value={formState.eventDescription}
                      onChange={(e) => updateField("eventDescription", e.target.value)}
                    />
                  </label>

                  <div className="event-request-group">
                    <div className="event-request-group-title">Event Type (Check One)</div>
                    <label className="event-request-check">
                      <input
                        type="checkbox"
                        checked={formState.eventType === "meeting"}
                        onChange={(e) => updateField("eventType", e.target.checked ? "meeting" : "")}
                      />
                      <span>Meeting - GBP Product Presentation</span>
                    </label>
                    <label className="event-request-check">
                      <input
                        type="checkbox"
                        checked={formState.eventType === "workshop"}
                        onChange={(e) => updateField("eventType", e.target.checked ? "workshop" : "")}
                      />
                      <span>Workshop - Grinders Distributors Orientation</span>
                    </label>
                  </div>

                  <label className="event-request-row">
                    <span>Date(s)</span>
                    <input
                      placeholder="dd/mm/yyyy"
                      value={formState.eventDate}
                      onChange={(e) => updateField("eventDate", e.target.value)}
                    />
                  </label>

                  <div className="event-request-inline">
                    <span className="event-request-inline-label">Time</span>
                    <label>
                      <span>From</span>
                      <input value={formState.timeFrom} onChange={(e) => updateField("timeFrom", e.target.value)} />
                    </label>
                    <label>
                      <span>To</span>
                      <input value={formState.timeTo} onChange={(e) => updateField("timeTo", e.target.value)} />
                    </label>
                  </div>

                  <div className="event-request-group">
                    <div className="event-request-group-title">Is this a recurring event?</div>
                    <div className="event-request-radio-row">
                      <label className="event-request-check">
                        <input
                          type="radio"
                          name="recurring"
                          checked={formState.recurring === "yes"}
                          onChange={() => updateField("recurring", "yes")}
                        />
                        <span>YES</span>
                      </label>
                      <label className="event-request-check">
                        <input
                          type="radio"
                          name="recurring"
                          checked={formState.recurring === "no"}
                          onChange={() => updateField("recurring", "no")}
                        />
                        <span>NO</span>
                      </label>
                    </div>
                    <label className="event-request-row">
                      <span>If YES, please specify recurrence</span>
                      <input
                        value={formState.recurrenceDetails}
                        onChange={(e) => updateField("recurrenceDetails", e.target.value)}
                      />
                    </label>
                  </div>
                </section>

                <section className="event-request-section">
                  <h2>3. LOCATION &amp; SET-UP NEEDS</h2>
                  <label className="event-request-row">
                    <span>Preferred Venue/Room</span>
                    <input
                      value={formState.preferredVenueRoom}
                      onChange={(e) => updateField("preferredVenueRoom", e.target.value)}
                    />
                  </label>
                  <label className="event-request-row">
                    <span>Expected attendance</span>
                    <input
                      value={formState.expectedAttendance}
                      onChange={(e) => updateField("expectedAttendance", e.target.value)}
                    />
                  </label>

                  <div className="event-request-group">
                    <div className="event-request-group-title">Room Set-Up Required</div>
                    <label className="event-request-check">
                      <input
                        type="checkbox"
                        checked={formState.roomSetupClassroomStyle}
                        onChange={(e) => updateField("roomSetupClassroomStyle", e.target.checked)}
                      />
                      <span>Classroom Style</span>
                    </label>
                  </div>

                  <div className="event-request-group">
                    <div className="event-request-group-title">Audio/Visual Requirements</div>
                    <label className="event-request-check">
                      <input
                        type="checkbox"
                        checked={formState.avProjector}
                        onChange={(e) => updateField("avProjector", e.target.checked)}
                      />
                      <span>Projector</span>
                    </label>
                    <label className="event-request-check">
                      <input
                        type="checkbox"
                        checked={formState.avMicrophone}
                        onChange={(e) => updateField("avMicrophone", e.target.checked)}
                      />
                      <span>Microphone</span>
                    </label>
                    <label className="event-request-check">
                      <input
                        type="checkbox"
                        checked={formState.avSpeakers}
                        onChange={(e) => updateField("avSpeakers", e.target.checked)}
                      />
                      <span>Speakers</span>
                    </label>
                    <label className="event-request-check">
                      <input
                        type="checkbox"
                        checked={formState.avLaptopComputer}
                        onChange={(e) => updateField("avLaptopComputer", e.target.checked)}
                      />
                      <span>Laptop/Computer</span>
                    </label>
                    <label className="event-request-check">
                      <input
                        type="checkbox"
                        checked={formState.avZoomStreamingSupport}
                        onChange={(e) => updateField("avZoomStreamingSupport", e.target.checked)}
                      />
                      <span>Zoom/Streaming Support</span>
                    </label>
                    <label className="event-request-row">
                      <span>Others</span>
                      <input value={formState.avOthers} onChange={(e) => updateField("avOthers", e.target.value)} />
                    </label>
                  </div>

                  <div className="event-request-note">
                    <div className="event-request-note__title">NOTE: For Speakers Attire :</div>
                    <div>At least polo shirt</div>
                    <div>If T-Shirt w/ round neck, use blazer/coat</div>
                  </div>
                </section>
              </div>

              <div className="event-request-col">
                <section className="event-request-section">
                  <h2>4. ADDITIONAL SERVICES (IF Applicable)</h2>

                  <div className="event-request-group">
                    <div className="event-request-inline-line">
                      <span>Catering Needed</span>
                      <label className="event-request-check">
                        <input
                          type="radio"
                          name="catering-needed"
                          checked={formState.cateringNeeded === "yes"}
                          onChange={() => updateField("cateringNeeded", "yes")}
                        />
                        <span>YES</span>
                      </label>
                      <label className="event-request-check">
                        <input
                          type="radio"
                          name="catering-needed"
                          checked={formState.cateringNeeded === "no"}
                          onChange={() => updateField("cateringNeeded", "no")}
                        />
                        <span>NO</span>
                      </label>
                    </div>
                    <label className="event-request-row">
                      <span>IF YES, specify</span>
                      <input
                        value={formState.cateringSpecify}
                        onChange={(e) => updateField("cateringSpecify", e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="event-request-inline-line">
                    <span>Security</span>
                    <label className="event-request-check">
                      <input
                        type="radio"
                        name="security-needed"
                        checked={formState.securityNeeded === "yes"}
                        onChange={() => updateField("securityNeeded", "yes")}
                      />
                      <span>YES</span>
                    </label>
                    <label className="event-request-check">
                      <input
                        type="radio"
                        name="security-needed"
                        checked={formState.securityNeeded === "no"}
                        onChange={() => updateField("securityNeeded", "no")}
                      />
                      <span>NO</span>
                    </label>
                  </div>
                </section>

                <section className="event-request-section">
                  <h2>5. AUTHORIZATION &amp; SUBMISSION</h2>
                  <label className="event-request-row">
                    <span>Requested By</span>
                    <input
                      value={formState.requestedBy}
                      onChange={(e) => updateField("requestedBy", e.target.value)}
                    />
                  </label>
                  <label className="event-request-row">
                    <span>Date Of Request</span>
                    <input
                      placeholder="dd/mm/yyyy"
                      value={formState.dateOfRequest}
                      onChange={(e) => updateField("dateOfRequest", e.target.value)}
                    />
                  </label>
                  <label className="event-request-row">
                    <span>Signature</span>
                    <input
                      value={formState.signature}
                      onChange={(e) => updateField("signature", e.target.value)}
                    />
                  </label>
                  <label className="event-request-row">
                    <span>Organizer</span>
                    <input
                      value={formState.organizer}
                      onChange={(e) => updateField("organizer", e.target.value)}
                    />
                  </label>
                  <label className="event-request-row">
                    <span>Prayer/Technical</span>
                    <input
                      value={formState.prayerTechnical}
                      onChange={(e) => updateField("prayerTechnical", e.target.value)}
                    />
                  </label>
                  <label className="event-request-row">
                    <span>Host</span>
                    <input value={formState.host} onChange={(e) => updateField("host", e.target.value)} />
                  </label>
                  <label className="event-request-row">
                    <span>Speaker</span>
                    <input value={formState.speaker} onChange={(e) => updateField("speaker", e.target.value)} />
                  </label>

                  <div className="event-request-group">
                    <div className="event-request-group-title">Testimony:</div>
                    <label className="event-request-row">
                      <span>1.)</span>
                      <input
                        value={formState.testimony1}
                        onChange={(e) => updateField("testimony1", e.target.value)}
                      />
                    </label>
                    <label className="event-request-row">
                      <span>2.)</span>
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
