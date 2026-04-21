import { Button } from "@/components/ui/button";
import { DailySalesDialog } from "@/components/daily-sales/DailySalesDialog";
import { openPrintWindow } from "@/components/daily-sales/shared";

export function SectionPrintPreviewDialog({
  isOpen,
  title,
  html,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  html: string;
  onClose: () => void;
}) {
  return (
    <DailySalesDialog
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      panelClassName="max-w-6xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => openPrintWindow(title, html)}>Print</Button>
        </>
      }
    >
      <div
        className="max-h-[70vh] overflow-auto text-xs text-slate-700"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </DailySalesDialog>
  );
}
