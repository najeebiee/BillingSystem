import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DailySalesDialog } from "@/components/daily-sales/DailySalesDialog";
import { fieldClassName } from "@/components/daily-sales/shared";

export function ModifyGgTransNoDialog({
  isOpen,
  row,
  onSave,
  onClose,
  isSaving,
}: {
  isOpen: boolean;
  row: { id: string; pofNumber: string; ggTransNo: string } | null;
  onSave: (value: string) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(row?.ggTransNo ?? "");
  }, [row]);

  return (
    <DailySalesDialog
      isOpen={isOpen}
      title="Modify GG Transaction Number"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => onSave(value.trim())} disabled={isSaving || !value.trim()}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          POF Number
          <input value={row?.pofNumber ?? ""} readOnly className={`${fieldClassName} bg-slate-50`} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          GG Transaction Number
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && value.trim() && !isSaving) {
                event.preventDefault();
                onSave(value.trim());
              }
            }}
            className={fieldClassName}
          />
        </label>
      </div>
    </DailySalesDialog>
  );
}

