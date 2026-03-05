export function printReceipt(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);
  let didPrint = false;

  const cleanup = () => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  const runPrint = () => {
    if (didPrint) return;
    didPrint = true;

    const printWindow = iframe.contentWindow;
    if (!printWindow) {
      cleanup();
      return;
    }

    printWindow.onafterprint = () => {
      setTimeout(cleanup, 150);
    };

    printWindow.focus();
    printWindow.print();

    setTimeout(cleanup, 800);
  };

  const printDocument = iframe.contentWindow?.document;
  if (!printDocument) {
    cleanup();
    return;
  }

  printDocument.open();
  printDocument.write(html);
  printDocument.close();

  iframe.onload = () => {
    setTimeout(runPrint, 20);
  };

  setTimeout(runPrint, 300);
}
