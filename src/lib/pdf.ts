"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Client, DB, Expense, Payment } from "./types";
import { fmtDate, formatPhone, isPaid, pdfInr, planBreakdown, planDecided, planSummary } from "./format";

const BRAND: [number, number, number] = [61, 101, 254];
const NAVY: [number, number, number] = [3, 8, 27];
const GREEN: [number, number, number] = [5, 150, 105];
const DARK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];

export type Output = "download" | "base64";
export interface PdfResult {
  filename: string;
  base64: string;
}

function finish(doc: jsPDF, filename: string, output: Output): PdfResult {
  if (output === "download") {
    doc.save(filename);
    return { filename, base64: "" };
  }
  const uri = doc.output("datauristring");
  return { filename, base64: uri.slice(uri.indexOf(",") + 1) };
}

const lastY = (doc: jsPDF) =>
  (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

let logoCache: { data: string; w: number; h: number } | null = null;

async function loadLogo() {
  if (logoCache) return logoCache;
  try {
    const res = await fetch("/logo-white.png");
    const blob = await res.blob();
    const data: string = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
    const dims: { w: number; h: number } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.src = data;
    });
    logoCache = { data, ...dims };
  } catch {
    logoCache = null;
  }
  return logoCache;
}

async function header(doc: jsPDF, db: DB, title: string) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 34, "F");
  const logo = await loadLogo();
  doc.setTextColor(255, 255, 255);
  if (logo) {
    const h = 9;
    doc.addImage(logo.data, "PNG", 14, 8, (logo.w / logo.h) * h, h, "gv-logo", "FAST");
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(db.company.name, 14, 16);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(db.company.tagline, 14, 23);
  doc.text([formatPhone(db.company.phone), db.company.email].filter(Boolean).join("  |  "), 14, 29);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, W - 14, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(db.company.address, W - 14, 23, { align: "right" });
  const ids = [db.company.udyam ? `Udyam Reg. No: ${db.company.udyam}` : "", db.company.gst ? `GSTIN: ${db.company.gst}` : ""].filter(Boolean);
  if (ids.length) doc.text(ids.join("  |  "), W - 14, 29, { align: "right" });
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
  const addr = [c.address, c.city, c.state].filter(Boolean).join(", ");
  const contact = [c.phone ? `Phone: ${formatPhone(c.phone)}` : "", c.email].filter(Boolean).join("  |  ");
  const lines = [c.name, addr, contact].filter(Boolean);
  if (c.gst) lines.push(`GSTIN: ${c.gst}`);
  lines.forEach((l, i) => doc.text(l, 14, y + 12 + i * 5));
  return y + 12 + lines.length * 5;
}

function signature(doc: jsPDF, db: DB) {
  const sig = db.company.signature;
  if (!sig) return;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const boxW = 60;
  const x = W - 14 - boxW;
  const bottom = H - 28;
  try {
    const props = doc.getImageProperties(sig);
    const maxW = 45;
    const maxH = 18;
    const scale = Math.min(maxW / props.width, maxH / props.height);
    const w = props.width * scale;
    const h = props.height * scale;
    doc.addImage(sig, sig.startsWith("data:image/png") ? "PNG" : "JPEG", x + (boxW - w) / 2, bottom - 12 - h, w, h, "gv-signature", "FAST");
  } catch {
    return;
  }
  doc.setDrawColor(148, 163, 184);
  doc.line(x, bottom - 10, x + boxW, bottom - 10);
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.text("Authorised Signature", x + boxW / 2, bottom - 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text(`of ${db.company.name}`, x + boxW / 2, bottom - 1, { align: "center" });
  doc.setTextColor(...DARK);
}

function footer(doc: jsPDF, db: DB) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(14, H - 20, W - 14, H - 20);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Thank you for choosing ${db.company.name}!`, 14, H - 13);
  doc.text("Let's grow your business together  |  www.growvika.com", W - 14, H - 13, { align: "right" });
}

export async function paymentInvoicePDF(db: DB, p: Payment, output: Output = "download") {
  const c = db.clients.find((x) => x.id === p.clientId)!;
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const withGst = c.gstApplicable && !!db.company.gst;
  await header(doc, db, withGst ? "TAX INVOICE" : "INVOICE");

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

  const decided = planDecided(c);
  const planText = decided ? planSummary(c) : "Advance (plan to be decided)";
  const desc = p.service || p.plan
    ? [p.service, p.plan, p.note].filter(Boolean).join(" - ")
    : [planText, c.services.length ? `${c.services.join(", ")} services` : "", p.note].filter(Boolean).join(" - ");
  const body: (string | { content: string; styles: object })[][] = [];
  if (withGst) {
    const rate = db.settings.gstRate || 0;
    const taxable = p.amount / (1 + rate / 100);
    const half = (p.amount - taxable) / 2;
    body.push(["1", desc, db.settings.sacCode || "-", pdfInr(taxable)]);
    autoTable(doc, {
      startY: y + 6,
      head: [["#", "Description", "SAC", "Amount"]],
      body,
      foot: [
        ["", "", "Taxable Value", pdfInr(taxable)],
        ["", "", `CGST @ ${rate / 2}%`, pdfInr(half)],
        ["", "", `SGST @ ${rate / 2}%`, pdfInr(half)],
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
  const paidTill = all.slice(0, idx + 1).filter(isPaid).reduce((s, x) => s + x.amount, 0);
  const isDue = !isPaid(p);

  let ty = lastY(doc) + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Account Summary", 14, ty);
  doc.setFont("helvetica", "normal");
  autoTable(doc, {
    startY: ty + 3,
    body: [
      ...(decided
        ? [
            ["Total Billing (Package)", pdfInr(c.totalBilling)],
            [isDue ? "Received till date" : "Received till this payment", pdfInr(paidTill)],
            ["Balance Pending", pdfInr(Math.max(0, c.totalBilling - paidTill))],
          ]
        : [
            ["Plan", "To be decided"],
            [isDue ? "Advance received till date" : "Advance received till this payment", pdfInr(paidTill)],
          ]),
    ],
    theme: "plain",
    styles: { fontSize: 9.5 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    tableWidth: 110,
  });

  ty = lastY(doc) + 10;
  if (isDue) doc.setFillColor(254, 242, 242);
  else doc.setFillColor(238, 242, 255);
  doc.roundedRect(14, ty, W - 28, 14, 2, 2, "F");
  if (isDue) doc.setTextColor(220, 38, 38);
  else doc.setTextColor(...BRAND);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(isDue ? `PAYMENT DUE: ${pdfInr(p.amount)}  |  Please pay at the earliest` : `PAYMENT RECEIVED: ${pdfInr(p.amount)} via ${p.mode} on ${fmtDate(p.date)}`, W / 2, ty + 9, {
    align: "center",
  });
  doc.setTextColor(...DARK);

  signature(doc, db);
  footer(doc, db);
  return finish(doc, `${p.invoiceNo}-${c.business.replace(/\s+/g, "-")}.pdf`, output);
}

export async function fullBillPDF(db: DB, clientId: string, output: Output = "download") {
  const c = db.clients.find((x) => x.id === clientId)!;
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  await header(doc, db, "FULL BILL / STATEMENT");

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
  const paid = pays.filter(isPaid).reduce((s, p) => s + p.amount, 0);
  const due = pays.filter((p) => !isPaid(p)).reduce((s, p) => s + p.amount, 0);
  const decided = planDecided(c);
  const bal = Math.max(decided ? c.totalBilling - paid : 0, due);

  const boxW = (W - 28 - 8) / 3;
  const boxes: [string, string, [number, number, number]][] = [
    decided ? ["TOTAL BILLING", pdfInr(c.totalBilling), DARK] : ["PLAN", "To be decided", DARK],
    [decided ? "TOTAL RECEIVED" : "ADVANCE RECEIVED", pdfInr(paid), GREEN],
    decided || due ? ["BALANCE PENDING", pdfInr(Math.max(0, bal)), bal > 0 ? [220, 38, 38] : GREEN] : ["BALANCE PENDING", "-", DARK],
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
  let tableStart = y + 30;
  const { rows: planRows, other } = planBreakdown(db, c);
  if (planRows.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text("Plan-wise summary", 14, tableStart);
    doc.setFont("helvetica", "normal");
    const body = planRows.map((r) => [r.label, r.cycle || "-", pdfInr(r.amount), pdfInr(r.paid), r.due ? pdfInr(r.due) : "-", pdfInr(r.remaining)]);
    if (other.paid || other.due) body.push(["Other payments (no plan selected on bill)", "-", "-", pdfInr(other.paid), other.due ? pdfInr(other.due) : "-", "-"]);
    const tAmount = planRows.reduce((s2, r) => s2 + r.amount, 0);
    const tPaid = planRows.reduce((s2, r) => s2 + r.paid, 0) + other.paid;
    const tDue = planRows.reduce((s2, r) => s2 + r.due, 0) + other.due;
    const tRemaining = Math.max(0, tAmount - tPaid);
    autoTable(doc, {
      startY: tableStart + 3,
      head: [["Plan", "Cycle", "Plan Amount", "Paid", "Bill Due", "Remaining"]],
      body,
      foot: [["Total", "", pdfInr(tAmount), pdfInr(tPaid), tDue ? pdfInr(tDue) : "-", pdfInr(tRemaining)]],
      theme: "grid",
      headStyles: { fillColor: NAVY },
      footStyles: { fillColor: [241, 245, 249], textColor: DARK, fontStyle: "bold" },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right", fontStyle: "bold" } },
      styles: { fontSize: 8.5 },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 5 && d.cell.raw !== "-" && d.cell.raw !== "Rs. 0") d.cell.styles.textColor = [220, 38, 38];
        if (d.section === "body" && d.column.index === 5 && d.cell.raw === "Rs. 0") d.cell.styles.textColor = GREEN;
      },
    });
    tableStart = lastY(doc) + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Payment history", 14, tableStart);
    doc.setFont("helvetica", "normal");
    tableStart += 3;
  }

  autoTable(doc, {
    startY: tableStart,
    head: [["#", "Date", "Invoice No.", "For", "Status", "Amount", "Total Paid"]],
    body: pays.map((p, i) => {
      if (isPaid(p)) running += p.amount;
      return [String(i + 1), fmtDate(p.date), p.invoiceNo, [p.service, p.plan, p.note].filter(Boolean).join(" - ") || "-", isPaid(p) ? `Paid (${p.mode})` : "DUE", pdfInr(p.amount), pdfInr(running)];
    }),
    foot: [
      ["", "", "", "", "Total Received", pdfInr(paid), ""],
      ...(due ? [["", "", "", "", "Bills Due", pdfInr(due), ""]] : []),
    ],
    theme: "grid",
    headStyles: { fillColor: BRAND },
    footStyles: { fillColor: [241, 245, 249], textColor: DARK },
    columnStyles: { 0: { cellWidth: 8 }, 5: { halign: "right" }, 6: { halign: "right" } },
    styles: { fontSize: 8.5 },
  });

  const ty = lastY(doc) + 8;
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(`Plan: ${decided ? planSummary(c) || "-" : "To be decided"}   |   Services: ${c.services.join(", ") || "-"}`, doc.internal.pageSize.getWidth() - 28), 14, ty);
  doc.text(`Total payments: ${pays.length}`, 14, ty + 5);

  signature(doc, db);
  footer(doc, db);
  return finish(doc, `Full-Bill-${c.business.replace(/\s+/g, "-")}.pdf`, output);
}

export async function expenseReportPDF(
  db: DB,
  rangeLabel: string,
  income: number,
  expenses: Expense[]
) {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  await header(doc, db, "ACCOUNT REPORT");
  const spent = expenses.reduce((s, e) => s + e.amount, 0);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Period: ${rangeLabel}`, 14, 46);
  doc.setFont("helvetica", "normal");

  const boxW = (W - 28 - 8) / 3;
  const boxes: [string, string, [number, number, number]][] = [
    ["TOTAL INCOME", pdfInr(income), GREEN],
    ["TOTAL EXPENSES", pdfInr(spent), [220, 38, 38]],
    ["BALANCE LEFT", pdfInr(income - spent), income - spent >= 0 ? DARK : [220, 38, 38]],
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
  doc.text("Expenses by category", 14, 80);
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
  doc.text("All expenses", 14, ty);
  doc.setFont("helvetica", "normal");
  autoTable(doc, {
    startY: ty + 3,
    head: [["Date", "Where", "Why", "Category", "Mode", "Amount"]],
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
  doc.save(`GrowVika-Account-Report.pdf`);
}
