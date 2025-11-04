import jsPDF from "jspdf";
import "jspdf-autotable";
import type { UserOptions } from "jspdf-autotable";

type RGBColor = [number, number, number];

// Type for autoTable options
interface AutoTableOptions
  extends Omit<
    UserOptions,
    "styles" | "headStyles" | "bodyStyles" | "alternateRowStyles"
  > {
  head: string[][];
  body: string[][];
  foot?: string[][];
  theme?: "striped" | "grid" | "plain";
  styles?: {
    font?: string;
    fontSize?: number;
    cellPadding?: number;
    fillColor?: RGBColor;
    textColor?: RGBColor;
    lineColor?: RGBColor;
    lineWidth?: number;
  };
  headStyles?: {
    fillColor?: RGBColor;
    textColor?: RGBColor;
    fontSize?: number;
    fontStyle?: "normal" | "bold" | "italic" | "bolditalic";
  };
  bodyStyles?: {
    fillColor?: RGBColor;
    textColor?: RGBColor;
    fontSize?: number;
  };
  alternateRowStyles?: {
    fillColor?: RGBColor;
  };
  margin?: { top: number; right: number; bottom: number; left: number };
}

interface PrintCompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface PrintConfig {
  PAGE_WIDTH: number;
  PAGE_HEIGHT: number;
  MARGIN: number;
  TITLE_SIZE: number;
  HEADER_SIZE: number;
  BODY_SIZE: number;
  FOOTER_SIZE: number;
  BLACK: RGBColor;
  GRAY: RGBColor;
  LIGHT_GRAY: RGBColor;
  COMPANY: PrintCompanyInfo;
}

// Print configuration
export const PRINT_CONFIG: PrintConfig = {
  // Page settings
  PAGE_WIDTH: 210, // A4 width in mm
  PAGE_HEIGHT: 297, // A4 height in mm
  MARGIN: 15, // Margin in mm

  // Font sizes
  TITLE_SIZE: 18,
  HEADER_SIZE: 12,
  BODY_SIZE: 10,
  FOOTER_SIZE: 8,

  // Colors (RGB for jsPDF)
  BLACK: [0, 0, 0],
  GRAY: [128, 128, 128],
  LIGHT_GRAY: [240, 240, 240],

  // Company info
  COMPANY: {
    name: "PT. Inventory INDONESIA",
    address: "Jl. Raya No. 123, Jakarta Selatan",
    phone: "(021) 1234-5678",
    email: "info@Inventory.com",
  },
};

// Utility function to format currency
export const formatCurrencyForPrint = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Utility function to format date
export const formatDateForPrint = (date: Date): string => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

// Utility function to add page header
export const addPageHeader = (doc: jsPDF, title: string): number => {
  let yPosition = PRINT_CONFIG.MARGIN;

  // Company header
  doc.setFontSize(PRINT_CONFIG.TITLE_SIZE);
  doc.setFont("helvetica", "bold");
  doc.text(PRINT_CONFIG.COMPANY.name, PRINT_CONFIG.MARGIN, yPosition);

  yPosition += 8;
  doc.setFontSize(PRINT_CONFIG.BODY_SIZE);
  doc.setFont("helvetica", "normal");
  doc.text(PRINT_CONFIG.COMPANY.address, PRINT_CONFIG.MARGIN, yPosition);

  yPosition += 5;
  doc.text(
    `Telp: ${PRINT_CONFIG.COMPANY.phone}`,
    PRINT_CONFIG.MARGIN,
    yPosition
  );

  yPosition += 5;
  doc.text(
    `Email: ${PRINT_CONFIG.COMPANY.email}`,
    PRINT_CONFIG.MARGIN,
    yPosition
  );

  // Add line separator
  yPosition += 8;
  doc.setLineWidth(0.5);
  doc.setDrawColor(...PRINT_CONFIG.GRAY);
  doc.line(
    PRINT_CONFIG.MARGIN,
    yPosition,
    PRINT_CONFIG.PAGE_WIDTH - PRINT_CONFIG.MARGIN,
    yPosition
  );

  yPosition += 8;
  doc.setFontSize(PRINT_CONFIG.HEADER_SIZE);
  doc.setFont("helvetica", "bold");
  doc.text(title, PRINT_CONFIG.MARGIN, yPosition);

  return yPosition + 10;
};

// Utility function to add page footer
export const addPageFooter = (doc: jsPDF): void => {
  const yPosition = PRINT_CONFIG.PAGE_HEIGHT - PRINT_CONFIG.MARGIN;

  doc.setFontSize(PRINT_CONFIG.FOOTER_SIZE);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Dokumen ini dicetak pada ${formatDateForPrint(new Date())} jam ${new Date().toLocaleTimeString("id-ID")}`,
    PRINT_CONFIG.MARGIN,
    yPosition
  );

  // Add page number
  const pageCount = doc.internal.pages.length - 1;
  const pageNumber = pageCount;
  doc.text(
    `Halaman ${pageNumber}`,
    PRINT_CONFIG.PAGE_WIDTH - PRINT_CONFIG.MARGIN - 20,
    yPosition,
    { align: "right" }
  );
};

// Utility function to create a table
export const createTable = (doc: jsPDF, options: AutoTableOptions): number => {
  const defaultOptions: AutoTableOptions = {
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: PRINT_CONFIG.BODY_SIZE,
      cellPadding: 3,
      lineColor: PRINT_CONFIG.GRAY,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: PRINT_CONFIG.LIGHT_GRAY,
      textColor: PRINT_CONFIG.BLACK,
      fontSize: PRINT_CONFIG.BODY_SIZE,
      fontStyle: "bold",
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: PRINT_CONFIG.BLACK,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    margin: {
      top: PRINT_CONFIG.MARGIN,
      right: PRINT_CONFIG.MARGIN,
      bottom: PRINT_CONFIG.MARGIN,
      left: PRINT_CONFIG.MARGIN,
    },
    ...options,
  };

  // Use any type to avoid TypeScript issues with jsPDF autotable
  const autoTable = (doc as any).autoTable || (doc as any).setTable;
  if (typeof autoTable === "function") {
    autoTable.call(doc, defaultOptions);
  }

  return (doc as any).lastAutoTable.finalY || PRINT_CONFIG.MARGIN + 50;
};

// Utility function to add signature section
export const addSignatureSection = (
  doc: jsPDF,
  yPosition: number,
  leftSignatures: Array<{ title: string; name: string }>,
  rightSignatures: Array<{ title: string; name: string }>
): number => {
  const signatureWidth = 80;
  const signatureHeight = 40;
  const spacing = 30;

  yPosition += 20;

  // Left signatures
  leftSignatures.forEach((sig, index) => {
    const xPosition = PRINT_CONFIG.MARGIN;

    // Draw signature line
    doc.setLineWidth(0.5);
    doc.line(
      xPosition,
      yPosition + signatureHeight,
      xPosition + signatureWidth,
      yPosition + signatureHeight
    );

    // Add title and name
    doc.setFontSize(PRINT_CONFIG.BODY_SIZE);
    doc.text(sig.title, xPosition, yPosition + signatureHeight + 5);
    doc.text(sig.name, xPosition, yPosition + signatureHeight + 10);

    if (index < leftSignatures.length - 1) {
      yPosition += spacing;
    }
  });

  // Right signatures
  const rightXPosition =
    PRINT_CONFIG.PAGE_WIDTH - PRINT_CONFIG.MARGIN - signatureWidth;

  rightSignatures.forEach((sig, index) => {
    // Draw signature line
    doc.setLineWidth(0.5);
    doc.line(
      rightXPosition,
      yPosition + signatureHeight,
      rightXPosition + signatureWidth,
      yPosition + signatureHeight
    );

    // Add title and name
    doc.setFontSize(PRINT_CONFIG.BODY_SIZE);
    doc.text(sig.title, rightXPosition, yPosition + signatureHeight + 5);
    doc.text(sig.name, rightXPosition, yPosition + signatureHeight + 10);

    if (index < rightSignatures.length - 1) {
      yPosition += spacing;
    }
  });

  return yPosition + 60;
};

// Print function for browser print (react-to-print)
export const printElement = (elementId: string): void => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id '${elementId}' not found`);
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Failed to open print window");
    return;
  }

  // Create print content
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Document</title>
        <style>
          @page {
            margin: 15mm;
            size: A4;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .company-info {
            font-size: 10px;
            margin-bottom: 2px;
          }
          .document-title {
            font-size: 16px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
          }
          .info-section {
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            margin-bottom: 5px;
          }
          .info-label {
            width: 120px;
            font-weight: bold;
          }
          .info-value {
            flex: 1;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .signature-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            text-align: center;
            width: 150px;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            margin-bottom: 5px;
            height: 40px;
          }
          .signature-title {
            font-weight: bold;
            margin-bottom: 2px;
          }
          .signature-name {
            font-size: 10px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            font-style: italic;
            color: #666;
          }
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
        <div class="footer">
          Dokumen ini dicetak pada ${new Date().toLocaleString("id-ID")}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};

// Save PDF function
export const savePDF = (doc: jsPDF, filename: string): void => {
  doc.save(filename);
};
