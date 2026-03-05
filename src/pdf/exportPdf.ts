import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export type PdfPagePreset = "A4" | "RECEIPT_80" | "RECEIPT_58";
export interface ExportHtmlToPdfParams {
  html: string;
  filename: string;
  preset: PdfPagePreset;
}

interface PresetConfig {
  renderWidth: number;
  marginMm: number;
  pageWidthMm: number;
  pageHeightMm?: number;
}

const PRESET_CONFIG: Record<PdfPagePreset, PresetConfig> = {
  A4: {
    renderWidth: 794,
    marginMm: 10,
    pageWidthMm: 210,
    pageHeightMm: 297
  },
  RECEIPT_80: {
    renderWidth: 302,
    marginMm: 4,
    pageWidthMm: 80
  },
  RECEIPT_58: {
    renderWidth: 219,
    marginMm: 3,
    pageWidthMm: 58
  }
};

async function createSandboxFrame(
  html: string,
  renderWidth: number
): Promise<{ iframe: HTMLIFrameElement; root: HTMLElement }> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-100000px";
  iframe.style.top = "0";
  iframe.style.width = `${renderWidth}px`;
  iframe.style.height = "1200px";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) {
      resolve();
      return;
    }
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();
  });

  const frameDoc = iframe.contentWindow?.document;
  const root = frameDoc?.body;
  if (!frameDoc || !root) {
    throw new Error("Failed to initialize PDF rendering frame.");
  }

  frameDoc.documentElement.style.width = `${renderWidth}px`;
  root.style.width = `${renderWidth}px`;
  root.style.background = "#fff";

  return { iframe, root };
}

export async function exportHtmlToPdf({
  html,
  filename,
  preset: pagePreset
}: ExportHtmlToPdfParams): Promise<void> {
  const config = PRESET_CONFIG[pagePreset];
  const { iframe, root } = await createSandboxFrame(html, config.renderWidth);

  try {
    await new Promise((resolve) => setTimeout(resolve, 80));

    const canvas = await html2canvas(root, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      width: root.scrollWidth,
      height: root.scrollHeight,
      windowWidth: root.scrollWidth,
      windowHeight: root.scrollHeight,
      logging: false
    });

    const imageData = canvas.toDataURL("image/png");

    if (pagePreset === "A4") {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const usableWidth = config.pageWidthMm - config.marginMm * 2;
      const usableHeight = (config.pageHeightMm || 297) - config.marginMm * 2;
      const imageHeightMm = (canvas.height * usableWidth) / canvas.width;

      let heightLeft = imageHeightMm;
      let yOffset = config.marginMm;

      pdf.addImage(imageData, "PNG", config.marginMm, yOffset, usableWidth, imageHeightMm);
      heightLeft -= usableHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        yOffset -= usableHeight;
        pdf.addImage(imageData, "PNG", config.marginMm, yOffset, usableWidth, imageHeightMm);
        heightLeft -= usableHeight;
      }

      pdf.save(filename);
      return;
    }

    const usableWidth = config.pageWidthMm - config.marginMm * 2;
    const imageHeightMm = (canvas.height * usableWidth) / canvas.width;
    const pageHeightMm = Math.max(imageHeightMm + config.marginMm * 2, 30);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [config.pageWidthMm, pageHeightMm]
    });

    pdf.addImage(imageData, "PNG", config.marginMm, config.marginMm, usableWidth, imageHeightMm);
    pdf.save(filename);
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }

    document.querySelectorAll(".html2canvas-container").forEach((node) => node.remove());
  }
}
