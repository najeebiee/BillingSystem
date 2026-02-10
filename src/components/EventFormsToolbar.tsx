import React from "react";
import { Download, Printer, Save, Trash2 } from "lucide-react";
import { FormActionButton } from "./ui/FormActionButton";

type EventFormsToolbarProps = {
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
  onPrint: () => void;
};

export function EventFormsToolbar({ onSave, onLoad, onClear, onPrint }: EventFormsToolbarProps) {
  return (
    <div className="form-actions no-print">
      <FormActionButton onClick={onSave} ariaLabel="Save active form">
        <Save className="w-4 h-4" />
        Save
      </FormActionButton>
      <FormActionButton onClick={onLoad} ariaLabel="Load active form">
        <Download className="w-4 h-4" />
        Load
      </FormActionButton>
      <FormActionButton onClick={onClear} ariaLabel="Clear active form">
        <Trash2 className="w-4 h-4" />
        Clear
      </FormActionButton>
      <FormActionButton onClick={onPrint} ariaLabel="Print active form">
        <Printer className="w-4 h-4" />
        Print
      </FormActionButton>
      <span className="print-hint no-print">Disable Headers and Footers in the print dialog for best results.</span>
    </div>
  );
}
