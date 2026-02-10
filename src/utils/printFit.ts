let activePrintElement: HTMLElement | null = null;
let prevTransform = "";
let prevTransformOrigin = "";
let restorePrintOnlyDisplay: (() => void) | null = null;
const PRINT_MARGIN_MM = 8;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.35;

function mmToPx(mm: number): number {
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.width = "1mm";
  document.body.appendChild(probe);
  const pxPerMm = probe.getBoundingClientRect().width;
  document.body.removeChild(probe);
  return mm * pxPerMm;
}

export function applyPrintFit() {
  const target = document.querySelector(".print-only [data-print-fit]") as HTMLElement | null;
  if (!target) return;

  const printOnlyParent = target.closest(".print-only") as HTMLElement | null;
  if (printOnlyParent) {
    const currentDisplay = window.getComputedStyle(printOnlyParent).display;
    if (currentDisplay === "none") {
      const previousInline = printOnlyParent.style.display;
      printOnlyParent.style.display = "block";
      restorePrintOnlyDisplay = () => {
        printOnlyParent.style.display = previousInline;
      };
    } else {
      restorePrintOnlyDisplay = null;
    }
  } else {
    restorePrintOnlyDisplay = null;
  }

  activePrintElement = target;
  prevTransform = target.style.transform;
  prevTransformOrigin = target.style.transformOrigin;

  target.style.transform = "none";
  target.style.transformOrigin = "top left";

  target.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    if (restorePrintOnlyDisplay) {
      restorePrintOnlyDisplay();
      restorePrintOnlyDisplay = null;
    }
    return;
  }

  const availableWidth = mmToPx(210 - PRINT_MARGIN_MM * 2);
  const availableHeight = mmToPx(297 - PRINT_MARGIN_MM * 2);

  const widthScale = availableWidth / rect.width;
  const heightScale = availableHeight / rect.height;
  let scale = Math.min(widthScale, heightScale);
  if (!Number.isFinite(scale) || scale <= 0) {
    if (restorePrintOnlyDisplay) {
      restorePrintOnlyDisplay();
      restorePrintOnlyDisplay = null;
    }
    return;
  }
  scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

  target.style.transformOrigin = "top left";
  target.style.transform = `scale(${scale})`;
}

export function resetPrintFit() {
  if (!activePrintElement) return;
  activePrintElement.style.transform = prevTransform || "";
  activePrintElement.style.transformOrigin = prevTransformOrigin || "";
  activePrintElement = null;
  if (restorePrintOnlyDisplay) {
    restorePrintOnlyDisplay();
    restorePrintOnlyDisplay = null;
  }
}

export function registerPrintFitListeners() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeprint", applyPrintFit);
  window.addEventListener("afterprint", resetPrintFit);
}
