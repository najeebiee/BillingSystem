import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Printer, Save, Trash2 } from "lucide-react";

type ChecklistRow = {
  id: string;
  step: string;
  assigned: string;
  isSpeaker?: boolean;
};

const checklistRows: ChecklistRow[] = [
  { id: "event-request", step: "Event Request", assigned: "by (01)" },
  { id: "review", step: "Review", assigned: "(Revs, Jake)" },
  { id: "approval", step: "Approval", assigned: "(CEO)" },
  { id: "assign-event-master", step: "Assign Event Master", assigned: "Point man for Event" },
  {
    id: "confirm-itinerary",
    step: "Confirmation of itinerary of speakers/Hosts",
    assigned: "(Jake, Event Master)",
  },
  { id: "adjustments", step: "Adjustments", assigned: "(if Any)(Jake)" },
  { id: "draft-banner", step: "Draft Banner", assigned: "(Kyle, Jake)" },
  {
    id: "banner-approval",
    step: "Banner approval and posting",
    assigned: "(Revs). Feedback ug na post na",
  },
  {
    id: "fund-allocation",
    step: "Fund allocation request (Tickets, Hotel accommodation, Venue DP, PF, etc)",
    assigned: "from 01 or (Revs)",
  },
  { id: "fund-approval", step: "Fund approval", assigned: "CEO, Release finance" },
  {
    id: "inform-feedback",
    step: "Inform/Feedback final itinerary to speakers/ host, event master, 01, Pres",
    assigned: "",
  },
  {
    id: "assigned-point-person",
    step: "Assigned Point Person (sundo, guide, check in, check out, until exit)",
    assigned: "",
  },
  {
    id: "monitor-arrival",
    step: "Monitor arrival of speaker",
    assigned: "(Revs, event master)",
  },
  {
    id: "after-event-report",
    step: "Submit After Event Report",
    assigned: "(Event master, Jake/Revs)",
  },
  { id: "collect-photos", step: "Collect event photos", assigned: "(Jake)" },
  { id: "post-event", step: "Post event in FB Page", assigned: "(CSA)" },
  { id: "speaker", step: "Speaker", assigned: "", isSpeaker: true },
];

const storageKey = "eventForms.specialCompanyEvents";

type FormState = {
  eventDetails: string;
  eventDate: string;
  location: string;
  speaker: string;
  checks: Record<string, boolean>;
};

const createInitialChecks = () =>
  checklistRows.reduce<Record<string, boolean>>((acc, row) => {
    acc[row.id] = false;
    return acc;
  }, {});

const initialState: FormState = {
  eventDetails: "",
  eventDate: "",
  location: "",
  speaker: "",
  checks: createInitialChecks(),
};

const normalizeSpecialCompanyEventsState = (value: unknown): FormState => {
  if (!value || typeof value !== "object") return initialState;

  const parsed = value as Partial<FormState>;
  const parsedChecks =
    parsed.checks && typeof parsed.checks === "object"
      ? (parsed.checks as Record<string, unknown>)
      : {};

  const normalizedChecks = createInitialChecks();
  for (const row of checklistRows) {
    normalizedChecks[row.id] = Boolean(parsedChecks[row.id]);
  }

  return {
    eventDetails: typeof parsed.eventDetails === "string" ? parsed.eventDetails : "",
    eventDate: typeof parsed.eventDate === "string" ? parsed.eventDate : "",
    location: typeof parsed.location === "string" ? parsed.location : "",
    speaker: typeof parsed.speaker === "string" ? parsed.speaker : "",
    checks: normalizedChecks,
  };
};

type SpecialCompanyEventsFormProps = {
  showBackButton?: boolean;
  embedded?: boolean;
  showToolbar?: boolean;
  onRegisterActions?: (actions: {
    getState: () => unknown;
    setState: (state: unknown) => void;
    resetState: () => void;
  }) => void;
};

export function SpecialCompanyEventsForm({
  showBackButton = true,
  embedded = false,
  showToolbar = true,
  onRegisterActions,
}: SpecialCompanyEventsFormProps) {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<FormState>(initialState);

  const rows = useMemo(() => checklistRows, []);

  const updateCheck = (id: string, value: boolean) => {
    setFormState((prev) => ({
      ...prev,
      checks: {
        ...prev.checks,
        [id]: value,
      },
    }));
  };

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(formState));
  };

  const handleLoad = () => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      window.alert("No saved data yet.");
      return;
    }
    try {
      setFormState(normalizeSpecialCompanyEventsState(JSON.parse(saved)));
    } catch {
      window.alert("No saved data yet.");
    }
  };

  const handleClear = () => {
    if (!window.confirm("Clear this form?")) return;
    setFormState(initialState);
    localStorage.removeItem(storageKey);
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    onRegisterActions?.({
      getState: () => formState,
      setState: (nextState) => setFormState(normalizeSpecialCompanyEventsState(nextState)),
      resetState: () => setFormState(initialState),
    });
  }, [onRegisterActions, formState]);

  return (
    <div className={embedded ? "" : "min-h-screen bg-gray-50"}>
      <div className={embedded ? "" : "pt-16"}>
        <div className={embedded ? "" : "max-w-[1440px] mx-auto px-6 py-8"}>
          {showToolbar && (
            <div className="form-toolbar">
              {showBackButton ? (
                <div className="form-toolbar__left">
                  <button
                    onClick={() => navigate("/event-forms")}
                    className="toolbar-btn toolbar-btn--back"
                  >
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

          <div className="form-paper special-company-events-print-area mx-auto">
            <div className="form-title">
              <div className="form-title__line form-title__primary">SPECIAL COMPANY EVENTS</div>
              <div className="form-title__line">(with speaker)</div>
              <div className="form-title__line form-title__secondary">FLOW CHECKLIST:</div>
            </div>

            <div className="form-fields">
              <label className="form-field">
                <span>Event Details:</span>
                <input
                  type="text"
                  value={formState.eventDetails}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, eventDetails: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                <span>Event Date:</span>
                <input
                  type="text"
                  placeholder="dd/mm/yyyy"
                  value={formState.eventDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, eventDate: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                <span>Location/Address:</span>
                <input
                  type="text"
                  value={formState.location}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, location: event.target.value }))
                  }
                />
              </label>
            </div>

            <table className="form-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Assigned Personal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="form-step">
                        <input
                          type="checkbox"
                          checked={formState.checks[row.id] || false}
                          onChange={(event) => updateCheck(row.id, event.target.checked)}
                        />
                        <span>{row.step}</span>
                      </div>
                    </td>
                    <td>
                      {row.isSpeaker ? (
                        <input
                          type="text"
                          value={formState.speaker}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, speaker: event.target.value }))
                          }
                          className="form-inline-input"
                        />
                      ) : (
                        <span>{row.assigned}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="form-footer">
              <div>
                <div className="form-footer__label">Prepared by:</div>
                <div className="form-footer__line">Name</div>
              </div>
              <div>
                <div className="form-footer__label">Checked by:</div>
                <div className="form-footer__line">Name</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
