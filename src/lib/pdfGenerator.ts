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
    doc.text("HostelPro Management Suite", 26, 21);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text(`Tenant: ${hostelName || "System Workspace"}`, 14, 32);
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
    const primaryColor: [number, number, number] = [37, 99, 235];

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 36, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("STUDENT FEE INVOICE", 14, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(data.hostelName, 14, 26);
    if (data.hostelPhone) doc.text(data.hostelPhone, 14, 31);

    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Invoice: ${data.invoiceCode}`, 140, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text(`Issue Date: ${data.issueDate}`, 140, 24);
    doc.text(`Billing Month: ${data.billingMonthLabel}`, 140, 29);
    doc.text(`Status: ${data.status.toUpperCase()}`, 140, 34);

    let y = 48;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text("Bill To", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
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
      doc.text("Hostel Address", 120, 48);
      doc.setFont("helvetica", "normal");
      const addressLines = doc.splitTextToSize(data.hostelAddress, 70);
      doc.text(addressLines, 120, 54);
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
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    // @ts-expect-error - autotable plugin
    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Total Due: ${data.currency} ${data.total.toLocaleString()}`, 14, finalY);

    if (data.paymentDate) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(22, 101, 52);
      doc.text(`Payment Date: ${data.paymentDate}`, 14, finalY + 6);
    }

    let notesY = finalY + (data.paymentDate ? 12 : 6);
    if (data.paymentMethod) {
      doc.setTextColor(55, 65, 81);
      doc.text(
        `Payment Method: ${formatPaymentMethodLabel(data.paymentMethod)}`,
        14,
        notesY
      );
      notesY += 6;
    }
    if (data.invoiceNotes?.trim()) {
      doc.setTextColor(75, 85, 99);
      const noteLines = doc.splitTextToSize(`Note: ${data.invoiceNotes.trim()}`, 180);
      doc.text(noteLines, 14, notesY);
    }

    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("Thank you for your payment. This is a computer-generated invoice.", 14, 285);

    doc.save(`${data.invoiceCode}.pdf`);
  } catch (error) {
    console.error("Failed to generate student invoice PDF:", error);
    alert("Could not generate invoice PDF. Please try again.");
  }
}
