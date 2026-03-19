import { Button } from "@/components/ui/button";
import { DailySalesDialog } from "@/components/daily-sales/DailySalesDialog";
import { formatCurrency, openPrintWindow } from "@/components/daily-sales/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PrintLineItem, PrintTransaction } from "@/types/dailySales";

export function PrintPreviewDialog({
  isOpen,
  transaction,
  lineItems,
  onClose,
}: {
  isOpen: boolean;
  transaction: PrintTransaction | null;
  lineItems: PrintLineItem[];
  onClose: () => void;
}) {
  const onPrint = () => {
    if (!transaction) {
      return;
    }

    const rows = lineItems
      .map(
        (item) => `
          <tr>
            <td>${item.productPackage}</td>
            <td>${formatCurrency(item.srp)}</td>
            <td>${formatCurrency(item.discount)}</td>
            <td>${formatCurrency(item.discountedPrice)}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.amount)}</td>
            <td>${item.releasedBottle}</td>
            <td>${item.releasedBlister}</td>
            <td>${item.balanceBottle}</td>
            <td>${item.balanceBlister}</td>
          </tr>
        `,
      )
      .join("");

    openPrintWindow(
      "Daily Sales Transaction",
      `
        <div>
          <h2 style="margin-bottom: 4px;">Daily Sales</h2>
          <p style="margin: 0 0 16px;">Transaction Print Preview</p>
          <table style="margin-bottom: 16px;">
            <tbody>
              <tr><td>Date</td><td>${transaction.date}</td></tr>
              <tr><td>POF Number</td><td>${transaction.pofNumber}</td></tr>
              <tr><td>Customer</td><td>${transaction.customer}</td></tr>
              <tr><td>GG Transaction No</td><td>${transaction.ggTransNo}</td></tr>
              <tr><td>Mode of Payment</td><td>${transaction.modeOfPayment}</td></tr>
              <tr><td>Encoder</td><td>${transaction.encoder}</td></tr>
            </tbody>
          </table>
          <table>
            <thead>
              <tr>
                <th>Product / Package</th>
                <th>SRP</th>
                <th>Discount</th>
                <th>Discounted Price</th>
                <th>Quantity</th>
                <th>Amount</th>
                <th>Released Bottle</th>
                <th>Released Blister</th>
                <th>Balance Bottle</th>
                <th>Balance Blister</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `,
    );
  };

  return (
    <DailySalesDialog
      isOpen={isOpen}
      title="Print Preview"
      onClose={onClose}
      panelClassName="max-w-6xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onPrint}>Print</Button>
        </>
      }
    >
      {transaction ? (
        <div className="max-h-[70vh] overflow-auto space-y-4 text-xs text-slate-700">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">Daily Sales</h3>
            <p>Billing System Sales Module</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <p><span className="font-semibold text-slate-900">Date:</span> {transaction.date}</p>
            <p><span className="font-semibold text-slate-900">POF No:</span> {transaction.pofNumber}</p>
            <p><span className="font-semibold text-slate-900">Customer:</span> {transaction.customer}</p>
            <p><span className="font-semibold text-slate-900">GG Trans No:</span> {transaction.ggTransNo}</p>
            <p><span className="font-semibold text-slate-900">Mode of Payment:</span> {transaction.modeOfPayment}</p>
            <p><span className="font-semibold text-slate-900">Encoder:</span> {transaction.encoder}</p>
          </div>
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>PRODUCT / PACKAGE</TableHead>
                <TableHead>SRP</TableHead>
                <TableHead>DISCOUNT</TableHead>
                <TableHead>DISCOUNTED PRICE</TableHead>
                <TableHead>QUANTITY</TableHead>
                <TableHead>AMOUNT</TableHead>
                <TableHead>RELEASED (BOTTLE)</TableHead>
                <TableHead>RELEASED (BLISTER)</TableHead>
                <TableHead>BALANCE (BOTTLE)</TableHead>
                <TableHead>BALANCE (BLISTER)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.productPackage}</TableCell>
                  <TableCell>{formatCurrency(item.srp)}</TableCell>
                  <TableCell>{formatCurrency(item.discount)}</TableCell>
                  <TableCell>{formatCurrency(item.discountedPrice)}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.amount)}</TableCell>
                  <TableCell>{item.releasedBottle}</TableCell>
                  <TableCell>{item.releasedBlister}</TableCell>
                  <TableCell>{item.balanceBottle}</TableCell>
                  <TableCell>{item.balanceBlister}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </DailySalesDialog>
  );
}

