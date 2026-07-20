// Utility to dynamically load jsPDF + jsPDF-AutoTable from CDN and download reports as PDFs

import type { PaymentMethod } from "@/types/database";

export function formatPaymentMethodLabel(method: PaymentMethod): string {
  if (method === "cash") return "Cash";
  if (method === "online") return "Online";
  return "Bank Transfer";
}

export async function downloadPDF(
  title: string,
  headers: string[],
  rows: string[][],
  filename: string,
  hostelName?: string
) {
  const loadScript = (src: string) => {
    return new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && document.querySelector(`script[src="${src}"]`)) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error(`Failed to load script ${src}`));
      document.body.appendChild(script);
    });
  };

  try {
    // Load scripts dynamically from Cloudflare/CDNjs
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");

    // @ts-expect-error - jspdf loaded from CDN
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Color Palette (Premium Indigo/Blue Theme)
    const primaryColor = [37, 99, 235]; // Tailwind blue-600

    // Add Logo or Hostel Icon (Text representation)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(14, 15, 8, 8, "F");

    // Title & Header Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(17, 24, 39); // Gray-900
    doc.text(hostelName || "Hostel Management", 26, 21);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text(`Tenant: ${hostelName || "Hostel"}`, 14, 32);
    doc.text(`Report Name: ${title}`, 14, 37);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 42);

    // Border line under header
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.line(14, 47, 196, 47);

    // Render Table
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 52,
      theme: "striped",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [55, 65, 81], // Gray-700
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251], // Gray-50
      },
      margin: { left: 14, right: 14 },
    });

    // Save PDF file
    doc.save(filename);
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    alert("Could not generate PDF. Please try again.");
  }
}

export interface StudentInvoicePdfData {
  invoiceCode: string;
  issueDate: string;
  billingMonthLabel: string;
  hostelName: string;
  hostelAddress?: string | null;
  hostelPhone?: string | null;
  currency: string;
  studentName: string;
  studentCode: string;
  studentPhone?: string | null;
  studentCnic?: string | null;
  lineItems: { description: string; amount: number }[];
  total: number;
  status: string;
  paymentDate?: string | null;
  paymentMethod?: PaymentMethod | null;
  invoiceNotes?: string | null;
}

export async function downloadStudentInvoicePDF(data: StudentInvoicePdfData) {
  const loadScript = (src: string) => {
    return new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && document.querySelector(`script[src="${src}"]`)) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error(`Failed to load script ${src}`));
      document.body.appendChild(script);
    });
  };

  try {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");

    // @ts-expect-error - jspdf loaded from CDN
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [37, 99, 235]; // blue-600
    const primaryDark: [number, number, number] = [29, 78, 216]; // blue-700
    const inkColor: [number, number, number] = [30, 41, 59]; // slate-800
    const mutedInk: [number, number, number] = [51, 65, 85]; // slate-700
    const headerMuted: [number, number, number] = [219, 234, 254]; // blue-100 on header
    const stripeFill: [number, number, number] = [239, 246, 255]; // blue-50

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("STUDENT FEE INVOICE", 14, 17);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...headerMuted);
    doc.text(data.hostelName, 14, 25);
    if (data.hostelPhone) doc.text(data.hostelPhone, 14, 31);

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Invoice: ${data.invoiceCode}`, 118, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...headerMuted);
    doc.text(`Issue Date: ${data.issueDate}`, 118, 23);
    doc.text(`Billing Month: ${data.billingMonthLabel}`, 118, 29);
    doc.text(`Status: ${data.status.toUpperCase()}`, 118, 35);

    let y = 52;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...primaryDark);
    doc.text("Bill To", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...inkColor);
    doc.text(data.studentName || "—", 14, y);
    y += 5;
    doc.text(`Student Code: ${data.studentCode}`, 14, y);
    y += 5;
    if (data.studentPhone) {
      doc.text(`Contact: ${data.studentPhone}`, 14, y);
      y += 5;
    }
    if (data.studentCnic) {
      doc.text(`CNIC: ${data.studentCnic}`, 14, y);
      y += 5;
    }

    if (data.hostelAddress) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...primaryDark);
      doc.text("Hostel Address", 118, 52);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...inkColor);
      const addressLines = doc.splitTextToSize(data.hostelAddress, 78);
      doc.text(addressLines, 118, 58);
    }

    const tableBody = data.lineItems.map((item) => [
      item.description,
      `${data.currency} ${item.amount.toLocaleString()}`,
    ]);

    doc.autoTable({
      head: [["Description", "Amount"]],
      body: tableBody,
      startY: y + 4,
      theme: "striped",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 9,
        textColor: inkColor,
      },
      alternateRowStyles: {
        fillColor: stripeFill,
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-expect-error - autotable plugin
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...primaryDark);
    doc.text(`Total Due: ${data.currency} ${data.total.toLocaleString()}`, 14, finalY);

    if (data.paymentDate) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(22, 101, 52);
      doc.text(`Payment Date: ${data.paymentDate}`, 14, finalY + 7);
    }

    let notesY = finalY + (data.paymentDate ? 14 : 8);
    if (data.paymentMethod) {
      doc.setTextColor(...primaryDark);
      doc.setFont("helvetica", "bold");
      doc.text(`Payment Method: ${formatPaymentMethodLabel(data.paymentMethod)}`, 14, notesY);
      notesY += 6;
    }
    if (data.invoiceNotes?.trim()) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...mutedInk);
      const noteLines = doc.splitTextToSize(`Note: ${data.invoiceNotes.trim()}`, 180);
      doc.text(noteLines, 14, notesY);
      notesY += noteLines.length * 5;
    }

    doc.setDrawColor(...headerMuted);
    doc.line(14, notesY + 4, 196, notesY + 4);

    doc.setFontSize(8);
    doc.setTextColor(96, 165, 250);
    doc.text("Thank you for your payment. This is a computer-generated invoice.", 14, notesY + 10);

    doc.save(`${data.invoiceCode}.pdf`);
  } catch (error) {
    console.error("Failed to generate student invoice PDF:", error);
    alert("Could not generate invoice PDF. Please try again.");
  }
}
