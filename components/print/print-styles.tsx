export const printStyles = `
  .print-container {
    display: none;
  }

  @media print {
    .print-container {
      display: block;
    }

    .print-preview {
      font-family: "Times New Roman", serif;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
      padding: 20px;
      max-width: 100%;
      margin: 0 auto;
    }

    .company-header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }

    .company-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .company-address,
    .company-contact {
      font-size: 11px;
      margin-bottom: 2px;
    }

    .document-title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .document-info {
      margin-bottom: 20px;
      border: 1px solid #ccc;
      padding: 10px;
      background-color: #f9f9f9;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }

    .info-label {
      font-weight: bold;
      min-width: 120px;
    }

    .info-value {
      flex: 1;
      text-align: right;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 11px;
    }

    .data-table th,
    .data-table td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }

    .data-table th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }

    .data-table .center {
      text-align: center;
    }

    .data-table .right,
    .data-table .number {
      text-align: right;
    }

    .data-table .bold {
      font-weight: bold;
    }

    .summary-row {
      font-weight: bold;
      background-color: #f0f0f0;
    }

    .notes-section {
      margin: 20px 0;
      border: 1px solid #ccc;
      padding: 10px;
      background-color: #f9f9f9;
    }

    .notes-title {
      font-weight: bold;
      margin-bottom: 5px;
    }

    .notes-content {
      line-height: 1.5;
    }

    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      margin-bottom: 20px;
    }

    .signature-box {
      text-align: center;
      width: 30%;
    }

    .signature-title {
      font-weight: bold;
      margin-bottom: 40px;
    }

    .signature-line {
      border-bottom: 1px solid #000;
      margin-bottom: 5px;
      height: 40px;
    }

    .signature-name {
      font-size: 11px;
    }

    .document-footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 10px;
      color: #666;
    }

    /* Text utilities */
    .text-success {
      color: #155724;
    }

    .text-danger {
      color: #721c24;
    }

    .text-warning {
      color: #856404;
    }

    .text-xs {
      font-size: 10px;
    }

    .text-sm {
      font-size: 11px;
    }

    /* Badge utilities */
    .badge {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: bold;
    }

    .badge.text-success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .badge.text-danger {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .badge.text-warning {
      background-color: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }

    /* Page break handling */
    .signature-section {
      page-break-inside: avoid;
    }

    .data-table {
      page-break-inside: auto;
    }

    .data-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    .document-title {
      page-break-after: avoid;
    }

    .notes-section {
      page-break-inside: avoid;
    }
  }
`;