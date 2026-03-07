type PrintDocumentOptions = {
  title: string;
  contentHtml: string;
  pageCss?: string;
  extraCss?: string;
};

type PrintElementOptions = PrintDocumentOptions & {
  elementId: string;
};

const waitForFonts = async (printDocument: Document): Promise<void> => {
  if (!("fonts" in printDocument)) return;

  try {
    await printDocument.fonts.ready;
  } catch {
    // Ignore font readiness failures and continue printing.
  }
};

const waitForLayout = async (printWindow: Window): Promise<void> =>
  new Promise((resolve) => {
    printWindow.requestAnimationFrame(() => {
      printWindow.requestAnimationFrame(() => resolve());
    });
  });

const copyComputedStyles = (sourceElement: Element, clonedElement: Element): void => {
  if (!("style" in clonedElement)) return;

  const computedStyle = window.getComputedStyle(sourceElement);
  const targetStyle = (clonedElement as HTMLElement).style;

  for (let index = 0; index < computedStyle.length; index += 1) {
    const propertyName = computedStyle[index];
    targetStyle.setProperty(
      propertyName,
      computedStyle.getPropertyValue(propertyName),
      computedStyle.getPropertyPriority(propertyName)
    );
  }
};

const syncFormValues = (sourceElement: Element, clonedElement: Element): void => {
  if (sourceElement instanceof HTMLInputElement && clonedElement instanceof HTMLInputElement) {
    clonedElement.value = sourceElement.value;
    if (sourceElement.checked) {
      clonedElement.setAttribute("checked", "checked");
    } else {
      clonedElement.removeAttribute("checked");
    }
    return;
  }

  if (sourceElement instanceof HTMLTextAreaElement && clonedElement instanceof HTMLTextAreaElement) {
    clonedElement.value = sourceElement.value;
    clonedElement.textContent = sourceElement.value;
    return;
  }

  if (sourceElement instanceof HTMLSelectElement && clonedElement instanceof HTMLSelectElement) {
    clonedElement.value = sourceElement.value;
    Array.from(clonedElement.options).forEach((option) => {
      option.selected = option.value === sourceElement.value;
    });
  }
};

const inlineNodeTreeStyles = (sourceRoot: Element, clonedRoot: Element): void => {
  copyComputedStyles(sourceRoot, clonedRoot);
  syncFormValues(sourceRoot, clonedRoot);

  const sourceChildren = Array.from(sourceRoot.children);
  const clonedChildren = Array.from(clonedRoot.children);

  sourceChildren.forEach((sourceChild, index) => {
    const clonedChild = clonedChildren[index];
    if (!clonedChild) return;
    inlineNodeTreeStyles(sourceChild, clonedChild);
  });
};

const buildPrintableMarkup = (sourceElement: HTMLElement): string => {
  const clonedElement = sourceElement.cloneNode(true) as HTMLElement;
  inlineNodeTreeStyles(sourceElement, clonedElement);
  clonedElement.querySelectorAll(".no-print").forEach((node) => node.remove());
  return clonedElement.outerHTML;
};

export async function printHtmlDocument({
  title,
  contentHtml,
  pageCss = "@page { size: A4 portrait; margin: 10mm; }",
  extraCss = ""
}: PrintDocumentOptions): Promise<void> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  document.body.appendChild(iframe);

  const cleanup = () => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  const printWindow = iframe.contentWindow;
  const printDocument = printWindow?.document;

  if (!printWindow || !printDocument) {
    cleanup();
    throw new Error("Unable to create the print document.");
  }

  printWindow.onafterprint = () => {
    window.setTimeout(cleanup, 150);
  };

  printDocument.open();
  printDocument.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      ${pageCss}
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        background: #ffffff;
        color: #111827;
        overflow: visible !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        font-family: Inter, Arial, sans-serif;
      }
      body {
        min-height: 100%;
      }
      .print-document {
        width: 100%;
        margin: 0;
        padding: 0;
        background: #ffffff;
        display: block !important;
        visibility: visible !important;
      }
      .print-document *,
      .print-document *::before,
      .print-document *::after {
        visibility: visible !important;
      }
      .print-document div,
      .print-document section,
      .print-document article,
      .print-document aside,
      .print-document main,
      .print-document header,
      .print-document footer,
      .print-document nav,
      .print-document form,
      .print-document fieldset,
      .print-document legend,
      .print-document p,
      .print-document h1,
      .print-document h2,
      .print-document h3,
      .print-document h4,
      .print-document h5,
      .print-document h6,
      .print-document ul,
      .print-document ol,
      .print-document li {
        display: block !important;
      }
      .print-document span,
      .print-document strong,
      .print-document b,
      .print-document em,
      .print-document i,
      .print-document small,
      .print-document label {
        display: inline !important;
      }
      .print-document button,
      .print-document input,
      .print-document textarea,
      .print-document select {
        display: inline-block !important;
      }
      .print-document table {
        display: table !important;
      }
      .print-document thead {
        display: table-header-group !important;
      }
      .print-document tbody {
        display: table-row-group !important;
      }
      .print-document tfoot {
        display: table-footer-group !important;
      }
      .print-document tr {
        display: table-row !important;
      }
      .print-document th,
      .print-document td {
        display: table-cell !important;
      }
      .print-document svg {
        display: inline-block !important;
      }
      .print-document .no-print {
        display: none !important;
      }
      .print-document .overflow-x-auto,
      .print-document .overflow-auto {
        overflow: visible !important;
      }
      .print-document table {
        page-break-inside: auto;
      }
      .print-document tr,
      .print-document td,
      .print-document th {
        page-break-inside: avoid;
      }
      ${extraCss}
    </style>
  </head>
  <body>
    <div class="print-document">${contentHtml}</div>
  </body>
</html>`);
  printDocument.close();

  await waitForFonts(printDocument);
  await waitForLayout(printWindow);

  printWindow.focus();
  printWindow.print();

  window.setTimeout(cleanup, 1500);
}

export async function printElementById({
  elementId,
  title,
  pageCss,
  extraCss
}: PrintElementOptions): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Print target "${elementId}" was not found.`);
  }

  await printHtmlDocument({
    title,
    contentHtml: buildPrintableMarkup(element),
    pageCss,
    extraCss
  });
}
