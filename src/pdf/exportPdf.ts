import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export type PdfPagePreset = "A4" | "RECEIPT_80" | "RECEIPT_58";

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

function createSandbox(html: string, renderWidth: number): { container: HTMLDivElement; root: HTMLDivElement } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-100000px";
  container.style.top = "0";
  container.style.width = `${renderWidth}px`;
  container.style.zIndex = "-1";
  container.style.pointerEvents = "none";
  container.style.background = "#fff";

  const root = document.createElement("div");
  root.style.width = `${renderWidth}px`;
  root.style.background = "#fff";

  const styleTag = document.createElement("style");
  styleTag.textContent = Array.from(doc.querySelectorAll("style"))
    .map((styleEl) => styleEl.textContent || "")
    .join("\n");

  root.innerHTML = doc.body.innerHTML;
  container.appendChild(styleTag);
  container.appendChild(root);
  document.body.appendChild(container);

  return { container, root };
}

export async function exportHtmlToPdf(
  html: string,
  filename: string,
  pagePreset: PdfPagePreset
): Promise<void> {
  const config = PRESET_CONFIG[pagePreset];
  const { container, root } = createSandbox(html, config.renderWidth);

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
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
