import { formatDate, formatMoneyPHP, labelPaymentMethod } from "../print/format";

export type ReceiptPaperWidth = "80mm" | "58mm";

export interface PdfBreakdownItem {
  description?: string | null;
  amount: number | string;
  payment_method?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_no?: string | null;
}

export interface PdfTemplateData {
  reference_no: string;
  request_date: string;
  status?: string | null;
  vendor_name: string;
  requester_name: string;
  checked_by?: string | null;
  approved_by?: string | null;
  breakdowns: PdfBreakdownItem[];
  total_amount: number | string;
  remarks?: string | null;
  attachments?: string[];
  company_name?: string;
}

interface ReceiptOptions {
  paper?: ReceiptPaperWidth;
}

const RECEIPT_PAPER = {
  "80mm": {
    pageSize: "80mm",
    pageMargin: "4mm",
    bodyWidth: "72mm",
    labelWidth: "24mm",
    amountWidth: "26mm",
    baseFont: "11px"
  },
  "58mm": {
    pageSize: "58mm",
    pageMargin: "3mm",
    bodyWidth: "50mm",
    labelWidth: "18mm",
    amountWidth: "18mm",
    baseFont: "10px"
  }
} as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatStatus(value?: string | null): string {
  switch (value) {
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
      return value || "-";
  }
}

function toAmount(value: number | string | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function buildReceiptHtml(data: PdfTemplateData, options: ReceiptOptions = {}): string {
  const paper = options.paper ?? "80mm";
  const cfg = RECEIPT_PAPER[paper];
  const printedAt = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());

  const subtotal = data.breakdowns.reduce((sum, row) => sum + toAmount(row.amount), 0);
  const total = toAmount(data.total_amount);
  const showSubtotal = Math.abs(total - subtotal) > 0.009;

  const itemsHtml = data.breakdowns
    .map((row) => {
      const bankInfo =
        row.payment_method === "bank_transfer"
          ? `<div class="bank-info">
              <div><span class="bank-label">Bank:</span> ${escapeHtml(row.bank_name || "-")}</div>
              <div><span class="bank-label">Account:</span> ${escapeHtml(row.bank_account_name || "-")}</div>
              <div><span class="bank-label">No:</span> ${escapeHtml(row.bank_account_no || "-")}</div>
            </div>`
          : "";

      return `<div class="item">
          <div class="item-main">
            <div class="item-left">
              <div class="description">${escapeHtml(row.description || "-")}</div>
              <div class="method">${escapeHtml(labelPaymentMethod(row.payment_method))}</div>
            </div>
            <div class="amount">${escapeHtml(formatMoneyPHP(row.amount))}</div>
          </div>
          ${bankInfo}
        </div>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page {
      size: ${cfg.pageSize} auto;
      margin: ${cfg.pageMargin};
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      width: ${cfg.bodyWidth};
      color: #000;
      background: #fff;
      font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
      font-size: ${cfg.baseFont};
      line-height: 1.35;
      font-variant-numeric: tabular-nums;
    }

    .receipt { width: 100%; }
    .center { text-align: center; }

    .company {
      font-size: 1.2em;
      font-weight: 700;
      margin-bottom: 2px;
      letter-spacing: .2px;
    }

    .title {
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: .35px;
      margin-bottom: 7px;
    }

    .divider {
      border-top: 1px dashed #000;
      margin: 7px 0;
    }

    .kv { display: grid; row-gap: 2px; }

    .kv-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 6px;
    }

    .kv-label {
      width: ${cfg.labelWidth};
      flex-shrink: 0;
      font-weight: 600;
    }

    .kv-value {
      min-width: 0;
      flex: 1;
      text-align: right;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .section-title {
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 5px;
      letter-spacing: .25px;
    }

    .item {
      margin-bottom: 8px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .item-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 7px;
    }

    .item-left { min-width: 0; flex: 1; }

    .description {
      font-weight: 600;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .method {
      font-size: .88em;
      margin-top: 1px;
    }

    .amount {
      min-width: ${cfg.amountWidth};
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
      font-size: .9em;
      word-break: break-word;
      overflow-wrap: anywhere;
      display: grid;
      row-gap: 1px;
    }

    .bank-label { font-weight: 600; }

    .totals { display: grid; row-gap: 3px; }

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

    .total-row.total { font-size: 1.16em; font-weight: 700; }

    .remarks {
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .footer {
      margin-top: 9px;
      text-align: center;
      font-size: .9em;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center company">${escapeHtml(data.company_name || "GuildLedger")}</div>
    <div class="center title">Payment Request</div>

    <div class="kv">
      <div class="kv-row"><span class="kv-label">PRF No</span><span class="kv-value">${escapeHtml(data.reference_no || "-")}</span></div>
      <div class="kv-row"><span class="kv-label">Date</span><span class="kv-value">${escapeHtml(formatDate(data.request_date))}</span></div>
      <div class="kv-row"><span class="kv-label">Status</span><span class="kv-value">${escapeHtml(formatStatus(data.status))}</span></div>
      <div class="kv-row"><span class="kv-label">Vendor</span><span class="kv-value">${escapeHtml(data.vendor_name || "-")}</span></div>
      <div class="kv-row"><span class="kv-label">Requested By</span><span class="kv-value">${escapeHtml(data.requester_name || "-")}</span></div>
    </div>

    <div class="divider"></div>
    <div class="section-title">Breakdown</div>
    ${itemsHtml || `<div class="item"><div class="description">-</div></div>`}

    <div class="divider"></div>
    <div class="totals">
      ${showSubtotal ? `<div class="total-row"><span>SUBTOTAL</span><span class="num">${escapeHtml(formatMoneyPHP(subtotal))}</span></div>` : ""}
      <div class="total-row total"><span>TOTAL</span><span class="num">${escapeHtml(formatMoneyPHP(total))}</span></div>
    </div>

    ${data.remarks ? `<div class="divider"></div><div class="section-title">Remarks</div><div class="remarks">${escapeHtml(data.remarks)}</div>` : ""}

    <div class="divider"></div>
    <div class="footer">Printed: ${escapeHtml(printedAt)}</div>
  </div>
</body>
</html>`;
}

export function buildA4Html(data: PdfTemplateData): string {
  const printedAt = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());

  const itemRows = data.breakdowns
    .map((row, index) => {
      const baseRow = `<tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(labelPaymentMethod(row.payment_method))}</td>
          <td class="desc">${escapeHtml(row.description || "-")}</td>
          <td class="amount">${escapeHtml(formatMoneyPHP(row.amount))}</td>
        </tr>`;

      if (row.payment_method !== "bank_transfer") return baseRow;

      return `${baseRow}
        <tr class="bank-row">
          <td></td>
          <td colspan="3">
            <div><strong>Bank:</strong> ${escapeHtml(row.bank_name || "-")}</div>
            <div><strong>Account Name:</strong> ${escapeHtml(row.bank_account_name || "-")}</div>
            <div><strong>Account No:</strong> ${escapeHtml(row.bank_account_no || "-")}</div>
          </td>
        </tr>`;
    })
    .join("");

  const attachments = (data.attachments || []).filter(Boolean);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }

    body {
      margin: 0;
      color: #111;
      background: #fff;
      font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      font-variant-numeric: tabular-nums;
    }

    .page {
      width: 794px;
      padding: 40px;
      margin: 0 auto;
    }

    .title {
      text-align: center;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: .4px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .subtitle {
      text-align: center;
      margin-bottom: 24px;
      color: #333;
    }

    .meta {
      width: 100%;
      border: 1px solid #1f2937;
      border-collapse: collapse;
      margin-bottom: 18px;
    }

    .meta td {
      border: 1px solid #1f2937;
      padding: 8px 10px;
      vertical-align: top;
    }

    .meta .label {
      font-size: 11px;
      color: #374151;
      margin-bottom: 2px;
    }

    .meta .value {
      font-size: 12px;
      font-weight: 600;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      margin: 18px 0 8px;
      text-transform: uppercase;
      letter-spacing: .2px;
    }

    .breakdown {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #1f2937;
      table-layout: fixed;
    }

    .breakdown th,
    .breakdown td {
      border: 1px solid #1f2937;
      padding: 8px 10px;
      vertical-align: top;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .breakdown th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .2px;
    }

    .breakdown .col-no { width: 40px; }
    .breakdown .col-method { width: 130px; }
    .breakdown .col-amount { width: 150px; }
    .breakdown .desc { white-space: pre-wrap; }
    .breakdown .amount {
      text-align: right;
      white-space: nowrap;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-variant-numeric: tabular-nums;
    }

    .bank-row td {
      font-size: 11px;
      padding-top: 6px;
      padding-bottom: 6px;
    }

    .totals {
      width: 320px;
      margin-left: auto;
      margin-top: 10px;
      border: 1px solid #1f2937;
      border-collapse: collapse;
    }

    .totals td {
      border: 1px solid #1f2937;
      padding: 8px 10px;
      font-size: 12px;
    }

    .totals .label { font-weight: 700; }
    .totals .value {
      text-align: right;
      font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .remarks {
      border: 1px solid #1f2937;
      padding: 10px;
      min-height: 72px;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .attachments {
      border: 1px solid #1f2937;
      padding: 10px;
      min-height: 56px;
    }

    .attachments ul {
      margin: 0;
      padding-left: 18px;
    }

    .footer {
      margin-top: 24px;
      font-size: 11px;
      color: #374151;
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="title">Payment Request Form</div>
    <div class="subtitle">${escapeHtml(data.company_name || "GuildLedger")}</div>

    <table class="meta">
      <tr>
        <td>
          <div class="label">PRF No</div>
          <div class="value">${escapeHtml(data.reference_no || "-")}</div>
        </td>
        <td>
          <div class="label">Date</div>
          <div class="value">${escapeHtml(formatDate(data.request_date))}</div>
        </td>
        <td>
          <div class="label">Status</div>
          <div class="value">${escapeHtml(formatStatus(data.status))}</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="label">Vendor / Payee</div>
          <div class="value">${escapeHtml(data.vendor_name || "-")}</div>
        </td>
        <td>
          <div class="label">Requested By</div>
          <div class="value">${escapeHtml(data.requester_name || "-")}</div>
        </td>
        <td>
          <div class="label">Checked By / Approved By</div>
          <div class="value">${escapeHtml(data.checked_by || "-")} / ${escapeHtml(data.approved_by || "-")}</div>
        </td>
      </tr>
    </table>

    <div class="section-title">Payment Breakdown</div>
    <table class="breakdown">
      <thead>
        <tr>
          <th class="col-no">#</th>
          <th class="col-method">Payment Method</th>
          <th>Description</th>
          <th class="col-amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || `<tr><td>1</td><td>-</td><td class="desc">-</td><td class="amount">${escapeHtml(formatMoneyPHP(0))}</td></tr>`}
      </tbody>
    </table>

    <table class="totals">
      <tr>
        <td class="label">TOTAL AMOUNT</td>
        <td class="value">${escapeHtml(formatMoneyPHP(data.total_amount))}</td>
      </tr>
    </table>

    <div class="section-title">Remarks</div>
    <div class="remarks">${escapeHtml(data.remarks || "-")}</div>

    <div class="section-title">Attachments</div>
    <div class="attachments">
      ${attachments.length > 0 ? `<ul>${attachments.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>` : "-"}
    </div>

    <div class="footer">
      <div>Generated: ${escapeHtml(printedAt)}</div>
      <div>Document: PAYMENT REQUEST FORM</div>
    </div>
  </div>
</body>
</html>`;
}
