import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Printer, Save, Trash2 } from "lucide-react";
import { FormActionButton } from "./ui/FormActionButton";
import { applyPrintFit } from "../utils/printFit";
import "./SpecialCompanyEventsForm.css";

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
  preparedByName: string;
  checkedByName: string;
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
  preparedByName: "",
  checkedByName: "",
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
    preparedByName: typeof parsed.preparedByName === "string" ? parsed.preparedByName : "",
    checkedByName: typeof parsed.checkedByName === "string" ? parsed.checkedByName : "",
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


function mark(checked: boolean) {
  return checked ? "\u2611" : "\u2610";
}

function printText(value: string) {
  return value.trim() || "\u00A0";
}

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
    applyPrintFit();
    requestAnimationFrame(() => window.print());
  };

  useEffect(() => {
    onRegisterActions?.({
      getState: () => formState,
      setState: (nextState) => setFormState(normalizeSpecialCompanyEventsState(nextState)),
      resetState: () => setFormState(initialState),
    });
  }, [onRegisterActions, formState]);

  return (
    <div className={embedded ? "sce-page" : "sce-page min-h-screen bg-gray-50"}>
      <div className={embedded ? "" : "pt-16"}>
        <div className={embedded ? "" : "max-w-[1440px] mx-auto px-6 py-8"}>
          {showToolbar && (
            <div className="form-toolbar no-print">
              {showBackButton ? (
                <div className="form-toolbar__left">
                  <FormActionButton onClick={() => navigate("/event-forms")} className="form-action-back">
                    <ArrowLeft className="form-btn__icon" />
                    Back to Forms
                  </FormActionButton>
                </div>
              ) : (
                <div />
              )}
              <div className="form-actions no-print">
                <FormActionButton onClick={handleSave}>
                  <Save className="form-btn__icon" />
                  Save
                </FormActionButton>
                <FormActionButton onClick={handleLoad}>
                  <Download className="form-btn__icon" />
                  Load
                </FormActionButton>
                <FormActionButton onClick={handleClear}>
                  <Trash2 className="form-btn__icon" />
                  Clear
                </FormActionButton>
                <FormActionButton onClick={handlePrint}>
                  <Printer className="form-btn__icon" />
                  Print
                </FormActionButton>
              </div>
            </div>
          )}

          <div className="screen-form no-print">
            <div className="sce-screen-head">
              <h1>SPECIAL COMPANY EVENTS (with speaker) FLOW CHECKLIST</h1>
            </div>

            <div className="sce-top-grid">
              <label className="sce-field">
                <span>Event Details</span>
                <input
                  type="text"
                  value={formState.eventDetails}
                  onChange={(event) => setFormState((prev) => ({ ...prev, eventDetails: event.target.value }))}
                />
              </label>
              <label className="sce-field">
                <span>Event Date</span>
                <input
                  type="date"
                  value={formState.eventDate}
                  onChange={(event) => setFormState((prev) => ({ ...prev, eventDate: event.target.value }))}
                />
              </label>
              <label className="sce-field sce-field-full">
                <span>Location/Address</span>
                <input
                  type="text"
                  value={formState.location}
                  onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
                />
              </label>
            </div>

            <div className="sce-table-wrap">
              <table className="sce-table">
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
                        <label className="sce-step">
                          <input
                            type="checkbox"
                            checked={formState.checks[row.id] || false}
                            onChange={(event) => updateCheck(row.id, event.target.checked)}
                          />
                          <span>{row.step}</span>
                        </label>
                      </td>
                      <td>
                        {row.isSpeaker ? (
                          <input
                            type="text"
                            value={formState.speaker}
                            onChange={(event) => setFormState((prev) => ({ ...prev, speaker: event.target.value }))}
                            className="sce-inline-input"
                          />
                        ) : (
                          <span>{row.assigned}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sce-foot-grid">
              <label className="sce-field">
                <span>Prepared by (Name)</span>
                <input
                  type="text"
                  value={formState.preparedByName}
                  onChange={(event) => setFormState((prev) => ({ ...prev, preparedByName: event.target.value }))}
                />
              </label>
              <label className="sce-field">
                <span>Checked by (Name)</span>
                <input
                  type="text"
                  value={formState.checkedByName}
                  onChange={(event) => setFormState((prev) => ({ ...prev, checkedByName: event.target.value }))}
                />
              </label>
            </div>
          </div>

          <div className="print-only">
            <div className="print-fit-page">
              <div className="print-root print-fullpage print-fit-content" data-print-fit>
                <div className="sce-print-paper">
              <div className="sce-print-title">
                <div>SPECIAL COMPANY EVENTS</div>
                <div>(with speaker)</div>
                <div>FLOW CHECKLIST</div>
              </div>

              <div className="sce-print-top">
                <div className="sce-print-line">
                  <span className="sce-print-label">Event Details:</span>
                  <span className="sce-print-value">{printText(formState.eventDetails)}</span>
                </div>
                <div className="sce-print-line">
                  <span className="sce-print-label">Event Date:</span>
                  <span className="sce-print-value">{printText(formState.eventDate)}</span>
                </div>
                <div className="sce-print-line">
                  <span className="sce-print-label">Location/Address:</span>
                  <span className="sce-print-value">{printText(formState.location)}</span>
                </div>
              </div>

              <table className="sce-print-table form-section">
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
                        <span className="sce-print-check">{mark(Boolean(formState.checks[row.id]))}</span> {row.step}
                      </td>
                      <td>{row.isSpeaker ? printText(formState.speaker) : printText(row.assigned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="sce-print-footer">
                <div className="sce-print-line">
                  <span className="sce-print-label">Prepared by:</span>
                  <span className="sce-print-value">{printText(formState.preparedByName)}</span>
                </div>
                <div className="sce-print-line">
                  <span className="sce-print-label">Checked by:</span>
                  <span className="sce-print-value">{printText(formState.checkedByName)}</span>
                </div>
              </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
