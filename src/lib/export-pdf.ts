export async function exportRowsToPdf(
  columns: string[],
  rows: (string | number)[][],
  filename: string,
  title: string,
  subtitle?: string,
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(title, 40, 40);
  if (subtitle) {
    doc.setFontSize(10);
    doc.text(subtitle, 40, 58);
  }

  autoTable(doc, {
    head: [columns],
    body: rows.map((r) => r.map((c) => String(c))),
    startY: subtitle ? 72 : 56,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [31, 41, 55] },
  });

  doc.save(filename);
}
