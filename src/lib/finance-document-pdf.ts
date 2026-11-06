import { buildFinanceInvoice, buildFinanceStatement, type InvoiceShop } from "./finance-document";
import { billProductLabel, itemTotal, type FinanceEntry, type FinanceParty } from "./finance";
import { formatCurrency, formatDate } from "./format";

export async function createFinanceDocumentPdf(party: FinanceParty, entries: FinanceEntry[], shop: InvoiceShop, role: string | null, billId?: string) {
  const invoice = billId ? buildFinanceInvoice(party, entries, billId, role) : null;
  const statement = invoice ? null : buildFinanceStatement(party, entries, role);
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const title = invoice ? (party.kind === "receivable" ? "INVOICE" : "PAYABLE BILL") : "STATEMENT OF ACCOUNT";
  doc.setFont("helvetica", "bold"); doc.setFontSize(21);
  doc.text(shop.name, 40, 44);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(shop.address, 40, 63); doc.text(`Phone: ${shop.phone}`, 40, 79);
  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(title, 40, 112);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const recipient = `${party.kind === "receivable" ? "Bill to" : "Vendor"}: ${party.name}${party.phone ? `\nPhone: ${party.phone}` : ""}`;
  const recipientLines = doc.splitTextToSize(recipient, width - 80);
  doc.text(recipientLines, 40, 135);
  let startY = 135 + recipientLines.length * 13 + 12;
  doc.text(invoice ? `Date: ${formatDate(invoice.bill.date)}    PO: ${invoice.bill.po_number || "—"}    Ref: ${invoice.bill.id.slice(0, 8)}` : `Issued: ${formatDate(new Date().toISOString())}`, 40, startY);
  startY += 18;
  const styles = { fontSize: 9, cellPadding: 6, overflow: "linebreak" as const };
  if (invoice) {
    const body = invoice.items?.map((item) => [item.name, String(item.quantity), formatCurrency(item.unitPrice), formatCurrency(itemTotal(item))]) ?? [[invoice.bill.entry_type === "loan" ? "Loan" : billProductLabel(invoice.bill.product_name) || "Bill", "—", "—", formatCurrency(invoice.subtotal)]];
    autoTable(doc, { head: [["Product / Description", "Qty", "Unit price", "Total"]], body, startY, margin: 40, styles, theme: "grid", columnStyles: { 0: { cellWidth: 270 }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } } });
    const lastY = (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
    autoTable(doc, { startY: lastY + 16, margin: { left: 220, right: 40 }, theme: "plain", styles,
      body: [["Current bill subtotal", formatCurrency(invoice.subtotal)], ["Previous balance at issue", formatCurrency(invoice.previousBalance)], ["Total due at issue", formatCurrency(invoice.totalDue)], ["Paid against this bill", formatCurrency(invoice.paid)], ["Discount against this bill", formatCurrency(invoice.discount)], ["VAT / Tax against this bill", formatCurrency(invoice.tax)], ["Goods returned against this bill", formatCurrency(invoice.returned)], ["Outstanding incl. previous balance", formatCurrency(invoice.outstanding)]], columnStyles: { 1: { halign: "right" } } });
    let y = ((doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? lastY) + 24;
    const notes = ["Previous balance is calculated before this bill; deductions above apply only to this bill.", invoice.bill.note].filter((value): value is string => Boolean(value));
    const lines = doc.splitTextToSize(notes.join("\n"), width - 80);
    if (y + lines.length * 12 + 80 > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 45; }
    doc.setFontSize(9); doc.text(lines, 40, y);
    y += lines.length * 12 + 50;
    doc.line(40, y, 220, y); doc.line(width - 220, y, width - 40, y);
    doc.text("Authorized signature / seal", 40, y + 14); doc.text("Receiver signature", width - 220, y + 14);
  } else if (statement) {
    autoTable(doc, { head: [["Date / PO", "Description", "Charges", "Paid", "Returned", "Discount", "VAT / Tax", "Balance"]],
      body: statement.rows.map((row) => [`${formatDate(row.entry.date)}\n${row.reference}`, `${row.description}${row.entry.note ? `\n${row.entry.note}` : ""}`, formatCurrency(row.charge), formatCurrency(row.paid), formatCurrency(row.returned), formatCurrency(row.discount), formatCurrency(row.tax), formatCurrency(row.balance)]),
      foot: [["Closing balance", "", "", "", "", "", "", formatCurrency(statement.balance)]], showFoot: "lastPage", startY, margin: 40, styles: { ...styles, fontSize: 7, cellPadding: 4 }, theme: "grid",
      columnStyles: { 0: { cellWidth: 68 }, 1: { cellWidth: 125 }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } } });
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFontSize(8);
    doc.text(`${shop.name} · ${title} · ${page} / ${pages}`, 40, doc.internal.pageSize.getHeight() - 20);
  }
  return doc;
}