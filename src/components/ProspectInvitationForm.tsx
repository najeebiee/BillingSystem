import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Printer, Save, Trash2 } from "lucide-react";

type ProspectRow = {
  leaderName: string;
  guestName: string;
  date1: string;
  date2: string;
  remarks: string;
};

const storageKey = "prospect-invitation-form";
const defaultRowCount = 30;

const createEmptyRow = (): ProspectRow => ({
  leaderName: "",
  guestName: "",
  date1: "",
  date2: "",
  remarks: "",
});

const createInitialRows = (): ProspectRow[] =>
  Array.from({ length: defaultRowCount }, () => createEmptyRow());

const hasRowContent = (row: ProspectRow) =>
  row.leaderName.trim() ||
  row.guestName.trim() ||
  row.date1.trim() ||
  row.date2.trim() ||
  row.remarks.trim();

type ProspectInvitationFormProps = {
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

export function ProspectInvitationForm({
  showBackButton = true,
  embedded = false,
  showToolbar = true,
  onRegisterActions,
}: ProspectInvitationFormProps) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProspectRow[]>(createInitialRows);

  const updateRow = (index: number, key: keyof ProspectRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };

      if (index === next.length - 1 && hasRowContent(next[index])) {
        next.push(createEmptyRow());
      }

      return next;
    });
  };

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(rows));
  };

  const handleLoad = () => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<ProspectRow>[];
      if (!Array.isArray(parsed)) return;

      const loadedRows = parsed.map((row) => ({
        leaderName: row.leaderName ?? "",
        guestName: row.guestName ?? "",
        date1: row.date1 ?? "",
        date2: row.date2 ?? "",
        remarks: row.remarks ?? "",
      }));

      if (loadedRows.length < defaultRowCount) {
        loadedRows.push(...Array.from({ length: defaultRowCount - loadedRows.length }, createEmptyRow));
      }

      setRows(loadedRows);
    } catch {
      // Ignore malformed storage data.
    }
  };

  const handleClear = () => {
    setRows(createInitialRows());
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
  }, [onRegisterActions, rows]);

  return (
    <div className={embedded ? "prospect-page" : "prospect-page min-h-screen bg-gray-50"}>
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

          <div className="prospect-paper prospect-print-area mx-auto">
            <header className="prospect-header">PROSPECT INVITATION GUIDE</header>

            <table className="prospect-table">
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
                      <input value={row.date1} onChange={(e) => updateRow(index, "date1", e.target.value)} />
                    </td>
                    <td>
                      <input value={row.date2} onChange={(e) => updateRow(index, "date2", e.target.value)} />
                    </td>
                    <td>
                      <input
                        value={row.remarks}
                        onChange={(e) => updateRow(index, "remarks", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
