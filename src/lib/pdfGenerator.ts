// Utility to dynamically load jsPDF + jsPDF-AutoTable from CDN and download reports as PDFs

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
