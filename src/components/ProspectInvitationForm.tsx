import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Printer, Plus, Save, Trash2 } from "lucide-react";
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
import "./ProspectInvitationForm.css";

type ProspectRow = {
  leaderName: string;
  guestName: string;
  date1: string;
  date2: string;
  remarks: string;
};

const storageKey = "eventForms.prospectInvitation";
const defaultRowCount = 20;
const PRINT_EMPTY_ROWS = 14;
const MAX_ROWS_FOR_ONE_PAGE = 15;

const createEmptyRow = (): ProspectRow => ({
  leaderName: "",
  guestName: "",
  date1: "",
  date2: "",
  remarks: "",
});

const createInitialRows = (): ProspectRow[] =>
  Array.from({ length: defaultRowCount }, () => createEmptyRow());

const normalizeProspectRows = (value: unknown): ProspectRow[] => {
  if (!Array.isArray(value)) return createInitialRows();

  const loadedRows = value.map((row) => {
    const parsed = row && typeof row === "object" ? (row as Partial<ProspectRow>) : {};
    return {
      leaderName: typeof parsed.leaderName === "string" ? parsed.leaderName : "",
      guestName: typeof parsed.guestName === "string" ? parsed.guestName : "",
      date1: typeof parsed.date1 === "string" ? parsed.date1 : "",
      date2: typeof parsed.date2 === "string" ? parsed.date2 : "",
      remarks: typeof parsed.remarks === "string" ? parsed.remarks : "",
    };
  });

  if (loadedRows.length < defaultRowCount) {
    loadedRows.push(...Array.from({ length: defaultRowCount - loadedRows.length }, createEmptyRow));
  }

  return loadedRows;
};

const hasRowContent = (row: ProspectRow) =>
  row.leaderName.trim() || row.guestName.trim() || row.date1.trim() || row.date2.trim() || row.remarks.trim();

type ProspectInvitationFormProps = {
  showBackButton?: boolean;
  embedded?: boolean;
  showToolbar?: boolean;
  showPrintRoot?: boolean;
  showActions?: boolean;
  onRegisterActions?: (actions: {
    getState: () => unknown;
    setState: (state: unknown) => void;
    resetState: () => void;
  }) => void;
};

export function ProspectInvitationForm({
  showBackButton = true,
  embedded = false,
  showToolbar = true,
  showPrintRoot = true,
  showActions = true,
  onRegisterActions,
}: ProspectInvitationFormProps) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProspectRow[]>(createInitialRows);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [referenceNo, setReferenceNo] = useState<string | null>(null);
  const [printedAt, setPrintedAt] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [recentPrints, setRecentPrints] = useState<RecentPrintRow[]>([]);

  const printableRows = useMemo(() => {
    const filled = rows.filter(hasRowContent);
    if (filled.length > 0) return filled.slice(0, MAX_ROWS_FOR_ONE_PAGE);
    return Array.from({ length: PRINT_EMPTY_ROWS }, () => createEmptyRow());
  }, [rows]);

  const updateRow = (index: number, key: keyof ProspectRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(rows));
  };

  const handleLoad = () => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      window.alert("No saved data yet.");
      return;
    }

    try {
      setRows(normalizeProspectRows(JSON.parse(saved)));
    } catch {
      window.alert("No saved data yet.");
    }
  };

  const handleClear = () => {
    if (!window.confirm("Clear this form?")) return;
    setRows(createInitialRows());
    localStorage.removeItem(storageKey);
  };

  const loadRecentPrints = useCallback(async () => {
    const result = await fetchRecentPrints({ formType: "PI" });
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
        formType: "PI",
        payload: { rows } as Record<string, unknown>,
      });

      if (upsert.error || !upsert.data) {
        window.alert(upsert.error || "Failed to save print submission.");
        return;
      }

      setSubmissionId(upsert.data.id);
      setReferenceNo(upsert.data.reference_no);

      const logResult = await logPrint({
        submissionId: upsert.data.id,
        formType: "PI",
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
      getState: () => rows,
      setState: (nextRows) => setRows(normalizeProspectRows(nextRows)),
      resetState: () => setRows(createInitialRows()),
    });
  }, [onRegisterActions, rows]);

  useEffect(() => {
    loadRecentPrints();
  }, [loadRecentPrints]);

  const handleLoadSubmission = async (id: string) => {
    const result = await fetchSubmissionById(id);
    if (result.error || !result.data) {
      window.alert(result.error || "Failed to load submission.");
      return;
    }

    const payload = result.data.payload as Record<string, unknown>;
    const payloadRows = Array.isArray(payload) ? payload : (payload.rows as ProspectRow[]) ?? [];
    setRows(normalizeProspectRows(payloadRows));
    setSubmissionId(result.data.id);
    setReferenceNo(result.data.reference_no);
    toast.success(`Loaded ${result.data.reference_no}`);
  };

  const printRoot =
    showPrintRoot && typeof document !== "undefined"
      ? createPortal(
          <div id="print-root" className="print-only prospect-print-only">
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
            <header className="prospect-print-head print-section">
              <h1 className="print-title">PROSPECT INVITATION GUIDE</h1>
            </header>

            <table className="prospect-print-table print-table form-section">
              <thead>
                <tr>
                  <th>Leader&apos;s Name</th>
                  <th>Name of Guest</th>
                  <th>Call/P2P: Date 1</th>
                  <th>Call/P2P: Date 2 (Follow-Up)</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {printableRows.map((row, index) => (
                  <tr key={index}>
                    <td>{row.leaderName || "\u00A0"}</td>
                    <td>{row.guestName || "\u00A0"}</td>
                    <td>{row.date1 || "\u00A0"}</td>
                    <td>{row.date2 || "\u00A0"}</td>
                    <td>{row.remarks || "\u00A0"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={embedded ? "prospect-page" : "prospect-page min-h-screen bg-gray-50"}>
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
            </div>
          )}

          <div className="screen-form no-print prospect-screen-form">
            <header className="prospect-screen-head">
              <h1>PROSPECT INVITATION GUIDE</h1>
            </header>

            <div className="prospect-table-wrap">
              <table className="prospect-screen-table">
                <thead>
                  <tr>
                    <th>Leader&apos;s Name</th>
                    <th>Name of Guest</th>
                    <th>Call/P2P: Date 1</th>
                    <th>Call/P2P: Date 2 (Follow-Up)</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          value={row.leaderName}
                          onChange={(e) => updateRow(index, "leaderName", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          value={row.guestName}
                          onChange={(e) => updateRow(index, "guestName", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={row.date1}
                          onChange={(e) => updateRow(index, "date1", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={row.date2}
                          onChange={(e) => updateRow(index, "date2", e.target.value)}
                        />
                      </td>
                      <td>
                        <input value={row.remarks} onChange={(e) => updateRow(index, "remarks", e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="prospect-row-actions">
              <FormActionButton onClick={handleAddRow}>
                <Plus className="form-btn__icon" />
                Add Row
              </FormActionButton>
            </div>

            <RecentPrintsTable formType="PI" rows={recentPrints} onLoad={handleLoadSubmission} />

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

