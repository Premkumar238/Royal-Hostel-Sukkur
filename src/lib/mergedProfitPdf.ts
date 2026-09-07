import type { MergedProfitMonthlyReport } from "@/lib/mergedProfitUtils";
<<<<<<< HEAD
import {
  computeStudentBillingStatus,
  groupExpensesByHostel,
  groupStudentBillingByHostel,
  summarizeHostelRow,
  summarizeMergedReport,
} from "@/lib/mergedProfitUtils";
=======
import { summarizeHostelRow, summarizeMergedReport } from "@/lib/mergedProfitUtils";
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils";

async function loadPdfScripts() {
  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      if (typeof window !== "undefined" && document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script ${src}`));
      document.body.appendChild(script);
    });

  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  await loadScript(
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"
  );
}

function money(amount: number, currency: string) {
  return formatCurrency(Number(amount || 0), currency);
}

export async function downloadMergedProfitReportPDF(report: MergedProfitMonthlyReport) {
  await loadPdfScripts();

  // @ts-expect-error - jspdf loaded from CDN
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const currency = report.currency || "PKR";
  const monthLabel = formatMonth(report.billing_month);
  const totals = summarizeMergedReport(report);
  const primaryColor: [number, number, number] = [37, 99, 235];
<<<<<<< HEAD
  const studentBilling = report.student_billing ?? [];
=======
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9

  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("Royal Girls Hostels — Merged Profit Report", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Billing Month: ${monthLabel}`, 14, 21);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 120, 21);

  let y = 36;

  doc.setTextColor(17, 24, 39);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Executive Summary (Hostel 1 + Hostel 2)", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Total Income (Rent + Mess): ${money(totals.grandIncome, currency)}`, 14, y);
  y += 5;
  doc.text(`Total Expenses (incl. shared ledger): ${money(totals.grandExpenses, currency)}`, 14, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(totals.grandNetProfit >= 0 ? 22 : 220, totals.grandNetProfit >= 0 ? 101 : 38, totals.grandNetProfit >= 0 ? 52 : 38);
  doc.text(`Final Net Profit: ${money(totals.grandNetProfit, currency)}`, 14, y);
  y += 8;

  const addSectionTable = (title: string, headers: string[], rows: string[][]) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, 14, y);
    y += 2;
    doc.autoTable({
      head: [headers],
      body: rows.length ? rows : [["—", "No records", "—", "—"]],
      startY: y + 2,
      theme: "striped",
      headStyles: { fillColor: primaryColor, fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  };

  addSectionTable(
    "Hostel Summary",
    ["Hostel", "Rent", "Mess", "Staff", "Mess Ops", "Other Exp.", "Net Profit"],
    report.hostel_summaries.map((row) => {
      const s = summarizeHostelRow(row);
      return [
        row.hostel_name,
        money(row.rent_collected, currency),
        money(row.mess_collected, currency),
        money(row.staff_expenses, currency),
        money(row.mess_operating_expenses, currency),
        money(row.other_expenses, currency),
        money(s.netProfit, currency),
      ];
    })
  );

<<<<<<< HEAD
  for (const [hostelName, rows] of groupStudentBillingByHostel(studentBilling)) {
    addSectionTable(
      `Student Billing — ${hostelName}`,
      ["Student", "Rent", "Mess", "Total", "Status", "Paid On"],
      rows.map((row) => {
        const rent = Number(row.rent_amount || 0);
        const mess = Number(row.mess_amount || 0);
        const status = computeStudentBillingStatus(row);
        return [
          `${row.student_name} (${row.student_code})`,
          money(rent, currency),
          mess > 0 ? money(mess, currency) : "—",
          money(rent + mess, currency),
          status,
          row.payment_date ? formatDate(row.payment_date) : "—",
        ];
      })
    );
  }
=======
  addSectionTable(
    "Student Payments (Rent + Mess)",
    ["Hostel", "Student", "Type", "Amount", "Status", "Paid On"],
    report.student_payments.map((p) => [
      p.hostel_name,
      `${p.student_name} (${p.student_code})`,
      p.fee_type,
      money(p.amount, currency),
      p.status,
      p.payment_date ? formatDate(p.payment_date) : "—",
    ])
  );
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9

  addSectionTable(
    "Staff Salaries",
    ["Hostel", "Employee", "Role", "Amount", "Date"],
    report.staff_payments.map((p) => [
      p.hostel_name,
      p.employee_name,
      p.role,
      money(p.amount, currency),
      formatDate(p.payment_date),
    ])
  );

<<<<<<< HEAD
  for (const [hostelName, rows] of groupExpensesByHostel(report.expenses)) {
    addSectionTable(
      `Operating Expenses — ${hostelName}`,
      ["Title", "Category", "Vendor", "Amount", "Date"],
      rows.map((e) => [
        e.title,
        e.category,
        e.vendor || "—",
        money(e.amount, currency),
        formatDate(e.expense_date),
      ])
    );
  }

  const messTotal = report.mess_expenses.reduce((sum, m) => sum + Number(m.amount || 0), 0);
  addSectionTable(
    `Mess Operating Expenses — Both Hostels (Total: ${money(messTotal, currency)})`,
    ["Description", "Type", "Amount", "Date", "Hostel"],
    report.mess_expenses.map((m) => [
=======
  addSectionTable(
    "Operating Expenses",
    ["Hostel", "Title", "Category", "Amount", "Date"],
    report.expenses.map((e) => [
      e.hostel_name,
      e.title,
      e.category,
      money(e.amount, currency),
      formatDate(e.expense_date),
    ])
  );

  addSectionTable(
    "Mess Operating Expenses",
    ["Hostel", "Description", "Type", "Amount", "Date"],
    report.mess_expenses.map((m) => [
      m.hostel_name,
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
      m.description || "—",
      m.expense_type || "—",
      money(m.amount, currency),
      formatDate(m.expense_date),
<<<<<<< HEAD
      m.hostel_name,
=======
>>>>>>> e833f060c6a2158933243eeaef6e1f90ac1fc2a9
    ])
  );

  addSectionTable(
    "Shared Ledger (Both Hostels)",
    ["Hostel", "Vendor", "Amount", "Date", "Notes"],
    report.shared_ledger.map((l) => [
      l.hostel_name,
      l.vendor,
      money(l.amount, currency),
      formatDate(l.expense_date),
      l.description || "—",
    ])
  );

  doc.save(`Merged-Profit-Report-${report.billing_month.slice(0, 7)}.pdf`);
}
