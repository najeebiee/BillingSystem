import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Printer, Save, Trash2 } from "lucide-react";
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
import "./SpecialCompanyEventsForm.css";

type StepDefinition = {
  key: string;
  label: string;
  assigned: string;
};

type StepState = StepDefinition & {
  done: boolean;
};

const stepDefinitions: StepDefinition[] = [
  { key: "event_request", label: "Event Request", assigned: "(by 01)" },
  { key: "review", label: "Review", assigned: "(Revs, Jake)" },
  { key: "approval", label: "Approval", assigned: "(CEO)" },
  { key: "assign_event_master", label: "Assign Event Master", assigned: "(Point man for Event)" },
  {
    key: "confirm_itinerary",
    label: "Confirmation of itinerary of speakers / Hosts",
    assigned: "(Jake, Event Master)",
  },
  { key: "adjustments", label: "Adjustments", assigned: "(if Any)(Jake)" },
  { key: "draft_banner", label: "Draft Banner", assigned: "(Kyle, Jake)" },
  {
    key: "banner_approval_posting",
    label: "Banner approval and posting",
    assigned: "(Revs). Feedback ug na post na",
  },
  {
    key: "fund_allocation_request",
    label: "Fund allocation request (Tickets, Hotel accommodation, Venue DP, PF, etc)",
    assigned: "from 01 or (Revs)",
  },
  { key: "fund_approval", label: "Fund approval", assigned: "CEO, Release finance" },
  {
    key: "inform_feedback_final_itinerary",
    label: "Inform/Feedback final itinerary to speakers/ host, event master, 01, Pres",
    assigned: "",
  },
  {
    key: "assigned_point_person",
    label: "Assigned Point Person (sundo, guide, check in, check out, until exit)",
    assigned: "",
  },
  { key: "monitor_arrival", label: "Monitor arrival of speaker", assigned: "(Revs, event master)" },
  {
    key: "submit_after_event_report",
    label: "Submit After Event Report",
    assigned: "(Event master, Jake / Revs)",
  },
  { key: "collect_event_photos", label: "Collect event photos", assigned: "(Jake)" },
  { key: "post_event_fb", label: "Post event in FB Page", assigned: "(CSA)" },
  { key: "speaker", label: "Speaker", assigned: "" },
];

const legacyIds = [
  "event-request",
  "review",
  "approval",
  "assign-event-master",
  "confirm-itinerary",
  "adjustments",
  "draft-banner",
  "banner-approval",
  "fund-allocation",
  "fund-approval",
  "inform-feedback",
  "assigned-point-person",
  "monitor-arrival",
  "after-event-report",
  "collect-photos",
  "post-event",
  "speaker",
];

const storageKey = "eventForms.specialCompanyEvents";

type FormState = {
  eventDetails: string;
  eventDate: string;
  locationAddress: string;
  steps: StepState[];
  preparedByName: string;
  preparedByTitle: string;
  checkedByName: string;
  checkedByTitle: string;
};

const createInitialSteps = (): StepState[] =>
  stepDefinitions.map((step) => ({
    ...step,
    done: false,
    assigned: step.assigned,
  }));

const initialState: FormState = {
  eventDetails: "",
  eventDate: "",
  locationAddress: "",
  steps: createInitialSteps(),
  preparedByName: "",
  preparedByTitle: "",
  checkedByName: "",
  checkedByTitle: "",
};

const normalizeSpecialCompanyEventsState = (value: unknown): FormState => {
  if (!value || typeof value !== "object") return initialState;

  const parsed = value as Partial<FormState> & {
    location?: unknown;
    checks?: Record<string, unknown>;
    speaker?: unknown;
    steps?: Partial<StepState>[];
  };

  const steps = createInitialSteps();
  if (Array.isArray(parsed.steps)) {
    for (const step of parsed.steps) {
      if (!step || typeof step !== "object") continue;
      const key = typeof step.key === "string" ? step.key : "";
      const index = steps.findIndex((item) => item.key === key);
      if (index === -1) continue;
      const assigned = typeof step.assigned === "string" ? step.assigned : steps[index].assigned;
      const label = typeof step.label === "string" ? step.label : steps[index].label;
      const done = typeof step.done === "boolean" ? step.done : steps[index].done;
      steps[index] = { ...steps[index], assigned, label, done };
    }
  } else if (parsed.checks && typeof parsed.checks === "object") {
    legacyIds.forEach((id, index) => {
      steps[index].done = Boolean((parsed.checks as Record<string, unknown>)[id]);
    });
    const speakerIndex = steps.findIndex((step) => step.key === "speaker");
    if (speakerIndex >= 0 && typeof parsed.speaker === "string") {
      steps[speakerIndex].assigned = parsed.speaker;
    }
  }

  const locationAddress =
    typeof parsed.locationAddress === "string"
      ? parsed.locationAddress
      : typeof parsed.location === "string"
        ? parsed.location
        : "";

  return {
    eventDetails: typeof parsed.eventDetails === "string" ? parsed.eventDetails : "",
    eventDate: typeof parsed.eventDate === "string" ? parsed.eventDate : "",
    locationAddress,
    steps,
    preparedByName: typeof parsed.preparedByName === "string" ? parsed.preparedByName : "",
    preparedByTitle: typeof parsed.preparedByTitle === "string" ? parsed.preparedByTitle : "",
    checkedByName: typeof parsed.checkedByName === "string" ? parsed.checkedByName : "",
    checkedByTitle: typeof parsed.checkedByTitle === "string" ? parsed.checkedByTitle : "",
  };
};

const mark = (done: boolean) => (done ? "x" : " ");

const printText = (value: string) => value.trim() || "\u00A0";

const formatPerson = (name: string, title: string) => {
  const cleanName = name.trim();
  const cleanTitle = title.trim();
  if (!cleanName && !cleanTitle) return "\u00A0";
  if (!cleanTitle) return cleanName || "\u00A0";
  if (!cleanName) return `(${cleanTitle})`;
  return `${cleanName} (${cleanTitle})`;
};

type SpecialCompanyEventsFormProps = {
  showBackButton?: boolean;
  embedded?: boolean;
  showToolbar?: boolean;
  showPrintRoot?: boolean;
  showActions?: boolean;
  onRegisterActions?: (actions: {
    getState: () => unknown;
    setState: (state: unknown) => void;
    resetState: () => void;
    save?: () => void;
    load?: () => void;
    clear?: () => void;
    print?: () => void;
  }) => void;
};

export function SpecialCompanyEventsForm({
  showBackButton = true,
  embedded = false,
  showToolbar = true,
  showPrintRoot = true,
  showActions = true,
  onRegisterActions,
}: SpecialCompanyEventsFormProps) {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<FormState>(initialState);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [referenceNo, setReferenceNo] = useState<string | null>(null);
  const [printedAt, setPrintedAt] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [recentPrints, setRecentPrints] = useState<RecentPrintRow[]>([]);

  const steps = useMemo(() => formState.steps, [formState.steps]);

  const updateStep = (index: number, updates: Partial<StepState>) => {
    setFormState((prev) => {
      const nextSteps = [...prev.steps];
      nextSteps[index] = { ...nextSteps[index], ...updates };
      return { ...prev, steps: nextSteps };
    });
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

  const loadRecentPrints = useCallback(async () => {
    const result = await fetchRecentPrints({ formType: "SC" });
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
        formType: "SC",
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
        formType: "SC",
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
      setState: (nextState) => setFormState(normalizeSpecialCompanyEventsState(nextState)),
      resetState: () => setFormState(initialState),
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

    setFormState(normalizeSpecialCompanyEventsState(result.data.payload));
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
            <div className="sce-print">
              <div className="sce-print-title print-title">
                <div>SPECIAL COMPANY EVENTS</div>
                <div>(with speaker)</div>
                <div>FLOW CHECKLIST:</div>
              </div>

              <div className="sce-print-fields">
                <div className="sce-print-line print-line">
                  <span className="sce-print-label print-label">Event Details:</span>
                  <span className="sce-print-value print-value">{printText(formState.eventDetails)}</span>
                </div>
                <div className="sce-print-line print-line">
                  <span className="sce-print-label print-label">Event Date:</span>
                  <span className="sce-print-value print-value">{printText(formState.eventDate)}</span>
                </div>
                <div className="sce-print-line print-line">
                  <span className="sce-print-label print-label">Location/Address:</span>
                  <span className="sce-print-value print-value">{printText(formState.locationAddress)}</span>
                </div>
              </div>

              <table className="sce-print-table print-table">
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Assigned Personal</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step) => (
                    <tr key={step.key}>
                      <td>
                        <span className="sce-print-check">[{mark(step.done)}]</span> {step.label}
                      </td>
                      <td>{printText(step.assigned)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="sce-print-footer">
                <div className="sce-print-sign print-line">
                  <span className="sce-print-label print-label">Prepared By:</span>
                  <span className="sce-print-value print-value">
                    {formatPerson(formState.preparedByName, formState.preparedByTitle)}
                  </span>
                </div>
                <div className="sce-print-sign print-line">
                  <span className="sce-print-label print-label">Checked By:</span>
                  <span className="sce-print-value print-value">
                    {formatPerson(formState.checkedByName, formState.checkedByTitle)}
                  </span>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={
        embedded ? "sce-page form-page form-page--embedded" : "sce-page min-h-screen bg-gray-50 form-page form-page--standalone"
      }
    >
      <div className={embedded ? "form-page-body" : "pt-16 form-page-body"}>
        <div
          className={
            embedded ? "sce-shell form-shell" : "sce-shell form-shell max-w-[1100px] mx-auto px-4 md:px-6 py-6 md:py-8"
          }
        >
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
            </div>
          )}

          <div className="screen-form no-print form-screen">
            <div className="form-screen__body">
              <header className="sce-screen-head">
                <div className="sce-title">SPECIAL COMPANY EVENTS</div>
                <div className="sce-title-sub">(with speaker)</div>
                <div className="sce-title-sub">FLOW CHECKLIST:</div>
              </header>

            <div className="sce-top-fields">
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
              <label className="sce-field">
                <span>Location/Address</span>
                <input
                  type="text"
                  value={formState.locationAddress}
                  onChange={(event) => setFormState((prev) => ({ ...prev, locationAddress: event.target.value }))}
                />
              </label>
            </div>

            <div className="sce-checklist">
              <div className="sce-checklist-header">
                <div>Step</div>
                <div>Assigned Personal</div>
              </div>
              {steps.map((step, index) => (
                <div key={step.key} className="sce-checklist-row">
                  <label className="sce-step">
                    <input
                      type="checkbox"
                      checked={step.done}
                      onChange={(event) => updateStep(index, { done: event.target.checked })}
                    />
                    <span>{step.label}</span>
                  </label>
                  <input
                    className="sce-assigned-input"
                    type="text"
                    value={step.assigned}
                    onChange={(event) => updateStep(index, { assigned: event.target.value })}
                  />
                </div>
              ))}
            </div>

            <div className="sce-footer-grid">
              <div className="sce-footer-block">
                <label className="sce-field">
                  <span>Prepared By (Name)</span>
                  <input
                    type="text"
                    value={formState.preparedByName}
                    onChange={(event) => setFormState((prev) => ({ ...prev, preparedByName: event.target.value }))}
                  />
                </label>
                <label className="sce-field">
                  <span>Position/Title (optional)</span>
                  <input
                    type="text"
                    value={formState.preparedByTitle}
                    onChange={(event) => setFormState((prev) => ({ ...prev, preparedByTitle: event.target.value }))}
                  />
                </label>
              </div>
              <div className="sce-footer-block">
                <label className="sce-field">
                  <span>Checked By (Name)</span>
                  <input
                    type="text"
                    value={formState.checkedByName}
                    onChange={(event) => setFormState((prev) => ({ ...prev, checkedByName: event.target.value }))}
                  />
                </label>
                <label className="sce-field">
                  <span>Position/Title (optional)</span>
                  <input
                    type="text"
                    value={formState.checkedByTitle}
                    onChange={(event) => setFormState((prev) => ({ ...prev, checkedByTitle: event.target.value }))}
                  />
                </label>
              </div>
            </div>

              <RecentPrintsTable formType="SC" rows={recentPrints} onLoad={handleLoadSubmission} />
            </div>

            {showActions ? (
              <div className="form-actions-bottom no-print">
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
                <FormActionButton onClick={handlePrint} disabled={isPrinting}>
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

