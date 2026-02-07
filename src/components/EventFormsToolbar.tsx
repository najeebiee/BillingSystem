import React from "react";
import { Download, Printer, Save, Trash2 } from "lucide-react";

type EventFormsToolbarProps = {
  onSave: () => void;
  onLoad: () => void;
  onClear: () => void;
  onPrint: () => void;
};

const buttonClassName =
  "inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-3 py-1.5 text-[13px] text-gray-900 shadow-sm transition-all duration-200 ease-out hover:bg-blue-50 hover:border-blue-200 hover:-translate-y-0.5 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30";

export function EventFormsToolbar({ onSave, onLoad, onClear, onPrint }: EventFormsToolbarProps) {
  return (
    <div className="eventToolbar print:hidden flex items-center justify-end gap-2.5 w-full md:w-auto md:shrink-0">
      <button type="button" onClick={onSave} aria-label="Save active form" className={buttonClassName}>
        <Save className="w-4 h-4" />
        Save
      </button>
      <button type="button" onClick={onLoad} aria-label="Load active form" className={buttonClassName}>
        <Download className="w-4 h-4" />
        Load
      </button>
      <button type="button" onClick={onClear} aria-label="Clear active form" className={buttonClassName}>
        <Trash2 className="w-4 h-4" />
        Clear
      </button>
      <button type="button" onClick={onPrint} aria-label="Print active form" className={buttonClassName}>
        <Printer className="w-4 h-4" />
        Print
      </button>
    </div>
  );
}
