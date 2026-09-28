"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Client, DB, Expense, Payment } from "./types";
import { fmtDate, pdfInr } from "./format";

const BRAND: [number, number, number] = [5, 150, 105];
const DARK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];

const lastY = (doc: jsPDF) =>
  (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

function header(doc: jsPDF, db: DB, title: string) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(db.company.name.toUpperCase(), 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(db.company.tagline, 14, 23);
  doc.text(`${db.company.phone}  |  ${db.company.email}`, 14, 29);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, W - 14, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(db.company.address, W - 14, 23, { align: "right" });
  if (db.company.gst) doc.text(`GSTIN: ${db.company.gst}`, W - 14, 29, { align: "right" });
  doc.setTextColor(...DARK);
}

function billTo(doc: jsPDF, c: Client, y: number) {
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("BILL TO", 14, y);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(c.business, 14, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const lines = [
    c.name,
    `${c.address}, ${c.city}, ${c.state}`,
    `Phone: ${c.phone}${c.email ? "  |  " + c.email : ""}`,
  ];
  if (c.gst) lines.push(`GSTIN: ${c.gst}`);
  lines.forEach((l, i) => doc.text(l, 14, y + 12 + i * 5));
  return y + 12 + lines.length * 5;
}

function footer(doc: jsPDF, db: DB) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(14, H - 20, W - 14, H - 20);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Thank you for choosing ${db.company.name}!`, 14, H - 13);
  doc.text("This is a computer generated document.", W - 14, H - 13, { align: "right" });
}

export function paymentInvoicePDF(db: DB, p: Payment) {
  const c = db.clients.find((x) => x.id === p.clientId)!;
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  header(doc, db, c.gstApplicable ? "TAX INVOICE" : "INVOICE");

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Invoice No.", W - 60, 46);
  doc.text("Date", W - 60, 52);
  doc.text("Payment Mode", W - 60, 58);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.text(p.invoiceNo, W - 14, 46, { align: "right" });
  doc.text(fmtDate(p.date), W - 14, 52, { align: "right" });
  doc.text(p.mode, W - 14, 58, { align: "right" });
  doc.setFont("helvetica", "normal");

  const y = billTo(doc, c, 46);

  const desc = `${c.services.join(", ")} services${p.note ? " - " + p.note : ""}`;
  const body: (string | { content: string; styles: object })[][] = [];
  if (c.gstApplicable) {
    const taxable = p.amount / 1.18;
    const half = (p.amount - taxable) / 2;
    body.push(["1", desc, "998361", pdfInr(taxable)]);
    autoTable(doc, {
      startY: y + 6,
      head: [["#", "Description", "SAC", "Amount"]],
      body,
      foot: [
        ["", "", "Taxable Value", pdfInr(taxable)],
        ["", "", "CGST @ 9%", pdfInr(half)],
        ["", "", "SGST @ 9%", pdfInr(half)],
        ["", "", "Total", pdfInr(p.amount)],
      ],
      theme: "grid",
      headStyles: { fillColor: BRAND },
      footStyles: { fillColor: [241, 245, 249], textColor: DARK, halign: "right" },
      columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 24 }, 3: { halign: "right", cellWidth: 36 } },
      styles: { fontSize: 9.5 },
    });
  } else {
    body.push(["1", desc, pdfInr(p.amount)]);
    autoTable(doc, {
      startY: y + 6,
      head: [["#", "Description", "Amount"]],
      body,
      foot: [["", "Total", pdfInr(p.amount)]],
      theme: "grid",
      headStyles: { fillColor: BRAND },
      footStyles: { fillColor: [241, 245, 249], textColor: DARK, halign: "right" },
      columnStyles: { 0: { cellWidth: 10 }, 2: { halign: "right", cellWidth: 40 } },
      styles: { fontSize: 9.5 },
    });
  }

  const all = db.payments
    .filter((x) => x.clientId === c.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.invoiceNo.localeCompare(b.invoiceNo));
  const idx = all.findIndex((x) => x.id === p.id);
  const paidTill = all.slice(0, idx + 1).reduce((s, x) => s + x.amount, 0);

  let ty = lastY(doc) + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Account Summary", 14, ty);
  doc.setFont("helvetica", "normal");
  autoTable(doc, {
    startY: ty + 3,
    body: [
      ["Total Billing (Package)", pdfInr(c.totalBilling)],
      ["Received till this payment", pdfInr(paidTill)],
      ["Balance Pending", pdfInr(c.totalBilling - paidTill)],
    ],
    theme: "plain",
    styles: { fontSize: 9.5 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    tableWidth: 110,
  });

  ty = lastY(doc) + 10;
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(14, ty, W - 28, 14, 2, 2, "F");
  doc.setTextColor(...BRAND);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`PAYMENT RECEIVED: ${pdfInr(p.amount)} via ${p.mode} on ${fmtDate(p.date)}`, W / 2, ty + 9, {
    align: "center",
  });
  doc.setTextColor(...DARK);

  footer(doc, db);
  doc.save(`${p.invoiceNo}-${c.business.replace(/\s+/g, "-")}.pdf`);
}

export function fullBillPDF(db: DB, clientId: string) {
  const c = db.clients.find((x) => x.id === clientId)!;
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  header(doc, db, "FULL BILL / STATEMENT");

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Generated on", W - 60, 46);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.text(fmtDate(new Date().toISOString().slice(0, 10)), W - 14, 46, { align: "right" });
  doc.setFont("helvetica", "normal");

  const y = billTo(doc, c, 46);

  const pays = db.payments
    .filter((x) => x.clientId === c.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.invoiceNo.localeCompare(b.invoiceNo));
  const paid = pays.reduce((s, p) => s + p.amount, 0);
  const bal = c.totalBilling - paid;

  const boxW = (W - 28 - 8) / 3;
  const boxes: [string, string, [number, number, number]][] = [
    ["TOTAL BILLING", pdfInr(c.totalBilling), DARK],
    ["TOTAL RECEIVED", pdfInr(paid), BRAND],
    ["BALANCE PENDING", pdfInr(bal), bal > 0 ? [220, 38, 38] : BRAND],
  ];
  boxes.forEach(([label, val, col], i) => {
    const x = 14 + i * (boxW + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y + 4, boxW, 18, 2, 2, "FD");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label, x + 4, y + 10);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...col);
    doc.text(val, x + 4, y + 18);
    doc.setFont("helvetica", "normal");
  });
  doc.setTextColor(...DARK);

  let running = 0;
  autoTable(doc, {
    startY: y + 30,
    head: [["#", "Date", "Invoice No.", "Mode", "Note", "Amount", "Total Paid"]],
    body: pays.map((p, i) => {
      running += p.amount;
      return [String(i + 1), fmtDate(p.date), p.invoiceNo, p.mode, p.note, pdfInr(p.amount), pdfInr(running)];
    }),
    foot: [["", "", "", "", "Total Received", pdfInr(paid), ""]],
    theme: "grid",
    headStyles: { fillColor: BRAND },
    footStyles: { fillColor: [241, 245, 249], textColor: DARK },
    columnStyles: { 0: { cellWidth: 8 }, 5: { halign: "right" }, 6: { halign: "right" } },
    styles: { fontSize: 8.5 },
  });

  const ty = lastY(doc) + 8;
  doc.setFontSize(9);
  doc.text(`Services: ${c.services.join(", ")}`, 14, ty);
  doc.text(`Total payments: ${pays.length}`, 14, ty + 5);

  footer(doc, db);
  doc.save(`Full-Bill-${c.business.replace(/\s+/g, "-")}.pdf`);
}

export function expenseReportPDF(
  db: DB,
  rangeLabel: string,
  income: number,
  expenses: Expense[]
) {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  header(doc, db, "ACCOUNT REPORT");
  const spent = expenses.reduce((s, e) => s + e.amount, 0);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Period: ${rangeLabel}`, 14, 46);
  doc.setFont("helvetica", "normal");

  const boxW = (W - 28 - 8) / 3;
  const boxes: [string, string, [number, number, number]][] = [
    ["TOTAL AAYA", pdfInr(income), BRAND],
    ["TOTAL KHARCHA", pdfInr(spent), [220, 38, 38]],
    ["BACHA HUA", pdfInr(income - spent), income - spent >= 0 ? DARK : [220, 38, 38]],
  ];
  boxes.forEach(([label, val, col], i) => {
    const x = 14 + i * (boxW + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, 52, boxW, 18, 2, 2, "FD");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label, x + 4, 58);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...col);
    doc.text(val, x + 4, 66);
    doc.setFont("helvetica", "normal");
  });
  doc.setTextColor(...DARK);

  const byCat: Record<string, number> = {};
  expenses.forEach((e) => (byCat[e.category] = (byCat[e.category] ?? 0) + e.amount));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Category-wise Kharcha", 14, 80);
  doc.setFont("helvetica", "normal");
  autoTable(doc, {
    startY: 83,
    head: [["Category", "Amount", "%"]],
    body: Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => [k, pdfInr(v), spent ? ((v / spent) * 100).toFixed(1) + "%" : "0%"]),
    theme: "grid",
    headStyles: { fillColor: BRAND },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    styles: { fontSize: 9 },
    tableWidth: 120,
  });

  const ty = lastY(doc) + 10;
  doc.setFont("helvetica", "bold");
  doc.text("Kharche ki poori list", 14, ty);
  doc.setFont("helvetica", "normal");
  autoTable(doc, {
    startY: ty + 3,
    head: [["Date", "Kahan", "Kyun", "Category", "Mode", "Amount"]],
    body: [...expenses]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => [fmtDate(e.date), e.where, e.why, e.category, e.mode, pdfInr(e.amount)]),
    foot: [["", "", "", "", "Total", pdfInr(spent)]],
    theme: "grid",
    headStyles: { fillColor: BRAND },
    footStyles: { fillColor: [241, 245, 249], textColor: DARK },
    columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 58 }, 5: { halign: "right", cellWidth: 24 } },
    styles: { fontSize: 8 },
  });

  footer(doc, db);
  doc.save(`Growvika-Account-Report.pdf`);
}
