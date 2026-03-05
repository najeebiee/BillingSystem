import { formatDate, formatMoneyPHP, labelPaymentMethod } from "./format";

export type ReceiptPaperWidth = "80mm" | "58mm";

interface ReceiptBreakdown {
  description?: string | null;
  amount: number | string;
  payment_method?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_no?: string | null;
}

interface BuildReceiptHtmlParams {
  reference_no: string;
  request_date: string;
  status?: string | null;
  vendor_name: string;
  requester_name: string;
  breakdowns: ReceiptBreakdown[];
  total_amount: number | string;
  remarks?: string | null;
  company_name?: string;
}

interface BuildReceiptHtmlOptions {
  paper?: ReceiptPaperWidth;
  showSubtotal?: boolean;
}

interface PaperConfig {
  pageSize: ReceiptPaperWidth;
  pageMargin: string;
  bodyWidth: string;
  labelWidth: string;
  amountMinWidth: string;
  baseFont: string;
}

const PAPER_CONFIG: Record<ReceiptPaperWidth, PaperConfig> = {
  "80mm": {
    pageSize: "80mm",
    pageMargin: "4mm",
    bodyWidth: "72mm",
    labelWidth: "24mm",
    amountMinWidth: "26mm",
    baseFont: "11px"
  },
  "58mm": {
    pageSize: "58mm",
    pageMargin: "3mm",
    bodyWidth: "50mm",
    labelWidth: "17mm",
    amountMinWidth: "19mm",
    baseFont: "10px"
  }
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function labelStatus(status?: string | null): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "awaiting_approval":
      return "Awaiting Approval";
    case "rejected":
      return "Rejected";
    case "approved":
      return "Approved";
    case "paid":
      return "Paid";
    case "void":
      return "Void";
    default:
      return status || "-";
  }
}

function toAmount(value: number | string | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function buildReceiptHtml(
  params: BuildReceiptHtmlParams,
  options: BuildReceiptHtmlOptions = {}
): string {
  const {
    reference_no,
    request_date,
    status,
    vendor_name,
    requester_name,
    breakdowns,
    total_amount,
    remarks,
    company_name = "GuildLedger"
  } = params;

  const paper = options.paper ?? "80mm";
  const paperConfig = PAPER_CONFIG[paper];

  const printedAt = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());

  const subtotalAmount = breakdowns.reduce((sum, item) => sum + toAmount(item.amount), 0);
  const totalAmount = toAmount(total_amount);
  const shouldShowSubtotal =
    options.showSubtotal === undefined
      ? Math.abs(subtotalAmount - totalAmount) > 0.009
      : options.showSubtotal;

  const itemsHtml = breakdowns
    .map((item) => {
      const paymentMethod = labelPaymentMethod(item.payment_method);
      const bankInfo =
        item.payment_method === "bank_transfer"
          ? `<div class="bank-info">
              <div><span class="bank-label">Bank:</span> ${escapeHtml(item.bank_name || "-")}</div>
              <div><span class="bank-label">Account:</span> ${escapeHtml(item.bank_account_name || "-")}</div>
              <div><span class="bank-label">No:</span> ${escapeHtml(item.bank_account_no || "-")}</div>
            </div>`
          : "";

      return `<div class="item">
        <div class="item-main">
          <div class="item-left">
            <div class="description">${escapeHtml(item.description || "-")}</div>
            <div class="method">${escapeHtml(paymentMethod)}</div>
          </div>
          <div class="amount">${escapeHtml(formatMoneyPHP(item.amount))}</div>
        </div>
        ${bankInfo}
      </div>`;
    })
    .join("");

  const remarksHtml = remarks
    ? `<div class="divider"></div>
      <div class="section-title">REMARKS</div>
      <div class="remarks">${escapeHtml(remarks)}</div>`
    : "";

  const subtotalHtml = shouldShowSubtotal
    ? `<div class="total-row"><span>SUBTOTAL</span><span class="num">${escapeHtml(
        formatMoneyPHP(subtotalAmount)
      )}</span></div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payment Request Receipt</title>
  <style>
    :root {
      color-scheme: light;
    }

    @page {
      size: ${paperConfig.pageSize} auto;
      margin: ${paperConfig.pageMargin};
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
    }

    body {
      width: ${paperConfig.bodyWidth};
      font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
      font-size: ${paperConfig.baseFont};
      line-height: 1.35;
      font-variant-numeric: tabular-nums;
    }

    .receipt {
      width: 100%;
    }

    .center {
      text-align: center;
    }

    .company {
      font-size: 1.22em;
      font-weight: 700;
      margin-bottom: 2px;
      letter-spacing: 0.2px;
    }

    .title {
      font-size: 1.02em;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 7px;
      letter-spacing: 0.35px;
    }

    .divider {
      border-top: 1px dashed #000;
      margin: 7px 0;
    }

    .kv {
      display: grid;
      row-gap: 2px;
    }

    .kv-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 6px;
    }

    .kv-label {
      width: ${paperConfig.labelWidth};
      flex-shrink: 0;
      font-weight: 600;
    }

    .kv-value {
      text-align: right;
      word-break: break-word;
      overflow-wrap: anywhere;
      min-width: 0;
      flex: 1;
    }

    .section-title {
      font-weight: 700;
      margin-bottom: 5px;
      letter-spacing: 0.25px;
      text-transform: uppercase;
    }

    .item {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 8px;
    }

    .item-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .item-left {
      min-width: 0;
      flex: 1;
    }

    .description {
      font-weight: 600;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .method {
      margin-top: 1px;
      font-size: 0.88em;
    }

    .amount {
      min-width: ${paperConfig.amountMinWidth};
      text-align: right;
      white-space: nowrap;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .bank-info {
      margin-top: 4px;
      margin-left: 6px;
      padding-left: 6px;
      border-left: 1px dashed #000;
      font-size: 0.9em;
      word-break: break-word;
      overflow-wrap: anywhere;
      display: grid;
      row-gap: 1px;
    }

    .bank-label {
      font-weight: 600;
    }

    .totals {
      display: grid;
      row-gap: 3px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: baseline;
    }

    .total-row .num {
      text-align: right;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .total-row.total {
      font-size: 1.16em;
      font-weight: 700;
    }

    .remarks {
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .footer {
      margin-top: 9px;
      text-align: center;
      font-size: 0.9em;
    }

    @media print and (min-width: 210mm) {
      body {
        margin: 0 auto;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center company">${escapeHtml(company_name)}</div>
    <div class="center title">Payment Request</div>

    <div class="kv">
      <div class="kv-row"><span class="kv-label">PRF No</span><span class="kv-value">${escapeHtml(
        reference_no || "-"
      )}</span></div>
      <div class="kv-row"><span class="kv-label">Date</span><span class="kv-value">${escapeHtml(
        formatDate(request_date)
      )}</span></div>
      <div class="kv-row"><span class="kv-label">Status</span><span class="kv-value">${escapeHtml(
        labelStatus(status)
      )}</span></div>
      <div class="kv-row"><span class="kv-label">Vendor</span><span class="kv-value">${escapeHtml(
        vendor_name || "-"
      )}</span></div>
      <div class="kv-row"><span class="kv-label">Requested By</span><span class="kv-value">${escapeHtml(
        requester_name || "-"
      )}</span></div>
    </div>

    <div class="divider"></div>
    <div class="section-title">Breakdown</div>
    ${itemsHtml || `<div class="item"><div class="description">-</div></div>`}

    <div class="divider"></div>
    <div class="totals">
      ${subtotalHtml}
      <div class="total-row total"><span>TOTAL</span><span class="num">${escapeHtml(
        formatMoneyPHP(totalAmount)
      )}</span></div>
    </div>

    ${remarksHtml}

    <div class="divider"></div>
    <div class="footer">
      <div>Printed: ${escapeHtml(printedAt)}</div>
    </div>
  </div>
</body>
</html>`;
}
