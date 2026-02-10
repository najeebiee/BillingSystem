import React from "react";
import type { FormType, RecentPrintRow } from "../../services/formPrintTracking.service";
import { FormActionButton } from "../ui/FormActionButton";

type RecentPrintsTableProps = {
  formType: FormType;
  rows: RecentPrintRow[];
  onLoad: (submissionId: string) => void;
};

const getPayload = (row: RecentPrintRow) => {
  const direct = row.form_submissions as { payload?: Record<string, unknown> } | undefined;
  if (direct && !Array.isArray(direct)) return direct.payload ?? {};
  const array = row.form_submissions as Array<{ payload?: Record<string, unknown> }> | undefined;
  return array?.[0]?.payload ?? {};
};

const formatPrintedAt = (value: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return parsed.toLocaleString();
};

const getRowSummary = (formType: FormType, payload: Record<string, unknown>) => {
  if (formType === "ER") {
    const title =
      (payload.eventTitle as string) ||
      (payload.event_title as string) ||
      (payload.title as string) ||
      "—";
    const date =
      (payload.eventDate as string) ||
      (payload.event_date as string) ||
      (payload.date as string) ||
      "—";
    return { colA: title, colB: date };
  }

  if (formType === "SC") {
    const details =
      (payload.eventDetails as string) ||
      (payload.event_details as string) ||
      "—";
    const date =
      (payload.eventDate as string) ||
      (payload.event_date as string) ||
      "—";
    return { colA: details, colB: date };
  }

  const rows = (payload.rows as Array<Record<string, unknown>>) || [];
  const firstRow =
    rows.find(
      (row) =>
        (row.leaderName as string) ||
        (row.guestName as string) ||
        (row.leader_name as string) ||
        (row.guest_name as string),
    ) ?? {};
  const leader =
    (firstRow.leaderName as string) ||
    (firstRow.leader_name as string) ||
    "—";
  const guest =
    (firstRow.guestName as string) ||
    (firstRow.guest_name as string) ||
    "—";
  return { colA: leader, colB: guest };
};

const getColumns = (formType: FormType) => {
  if (formType === "ER") {
    return { colA: "Event Title", colB: "Event Date" };
  }
  if (formType === "SC") {
    return { colA: "Event Details", colB: "Event Date" };
  }
  return { colA: "Leader Name", colB: "Guest Name" };
};

export function RecentPrintsTable({ formType, rows, onLoad }: RecentPrintsTableProps) {
  const columns = getColumns(formType);

  return (
    <div className="recent-prints no-print">
      <div className="recent-prints__header">Recent Prints</div>
      <div className="recent-prints__table-wrap">
        <table className="recent-prints__table">
          <thead>
            <tr>
              <th>Reference No</th>
              <th>Printed At</th>
              <th>{columns.colA}</th>
              <th>{columns.colB}</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="recent-prints__empty">
                  No prints yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const payload = getPayload(row);
                const summary = getRowSummary(formType, payload);
                const canLoad = Boolean(row.submission_id);
                return (
                  <tr key={row.id}>
                    <td>{row.reference_no ?? "—"}</td>
                    <td>{formatPrintedAt(row.printed_at)}</td>
                    <td>{summary.colA || "—"}</td>
                    <td>{summary.colB || "—"}</td>
                    <td>
                      <FormActionButton
                        onClick={() => row.submission_id && onLoad(row.submission_id)}
                        disabled={!canLoad}
                      >
                        Load
                      </FormActionButton>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
