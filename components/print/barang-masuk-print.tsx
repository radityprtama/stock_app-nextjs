import React, { forwardRef, useImperativeHandle } from "react";
import { useReactToPrint } from "react-to-print";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { printStyles } from "./print-styles";

interface BarangMasukPrintData {
  id: string;
  noDokumen: string;
  tanggal: string;
  supplier: {
    id: string;
    kode: string;
    nama: string;
  };
  gudang: {
    id: string;
    kode: string;
    nama: string;
  };
  totalQty: number;
  totalNilai: number;
  keterangan?: string;
  status: "draft" | "posted" | "cancelled";
  detail: Array<{
    id: string;
    barang: {
      id: string;
      kode: string;
      nama: string;
      satuan: string;
    };
    qty: number;
    harga: number;
    subtotal: number;
  }>;
}

interface BarangMasukPrintProps {
  data: BarangMasukPrintData;
  onPrintComplete?: () => void;
}

export interface BarangMasukPrintRef {
  print: () => void;
}

const BarangMasukPrint = forwardRef<
  BarangMasukPrintRef,
  BarangMasukPrintProps
>(({ data, onPrintComplete }, ref) => {
  const componentRef = React.useRef<HTMLDivElement | null>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Barang Masuk - ${data.noDokumen}`,
    onAfterPrint: () => {
      onPrintComplete?.();
    },
    pageStyle: `
    @page {
      size: A4;
      margin: 0;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        margin: 0;
      }

      /* Hilangkan header/footer browser (Chrome/Edge/Firefox) */
      @page :header {
        display: none !important;
      }
      @page :footer {
        display: none !important;
      }

      /* Untuk browser yang gak support pseudo :header/:footer */
      header, footer {
        display: none !important;
      }
    }
  `,
  });

  useImperativeHandle(ref, () => ({
    print: handlePrint,
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="print-container">
      <div ref={componentRef} className="print-preview">
        {/* Company Header */}
        <div className="company-header">
          <div className="company-name">PT. Inventory INDONESIA</div>
          <div className="company-address">
            Jl. Raya No. 123, Jakarta Selatan
          </div>
          <div className="company-contact">
            Telp: (021) 1234-5678 | Email: info@Inventory.com
          </div>
        </div>

        {/* Document Title */}
        <div className="document-title">BUKTI BARANG MASUK</div>

        {/* Document Number and Date */}
        <div className="document-info">
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Nomor Dokumen:</span>
              <span className="info-value">{data.noDokumen}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Tanggal:</span>
              <span className="info-value">
                {format(new Date(data.tanggal), "dd MMMM yyyy", { locale: id })}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Supplier:</span>
              <span className="info-value">
                {data.supplier.kode} - {data.supplier.nama}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Gudang:</span>
              <span className="info-value">
                {data.gudang.kode} - {data.gudang.nama}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className="info-value">
                {data.status === "draft"
                  ? "Draft"
                  : data.status === "posted"
                    ? "Posted"
                    : "Cancelled"}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {data.keterangan && (
          <div className="notes-section">
            <div className="notes-title">KETERANGAN:</div>
            <div className="notes-content">{data.keterangan}</div>
          </div>
        )}

        {/* Items Table */}
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Kode Barang</th>
              <th>Nama Barang</th>
              <th>Satuan</th>
              <th>Qty</th>
              <th>Harga</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.detail.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.barang.kode}</td>
                <td className="bold">{item.barang.nama}</td>
                <td className="center">{item.barang.satuan}</td>
                <td className="center">{item.qty}</td>
                <td className="right">{formatCurrency(Number(item.harga))}</td>
                <td className="right bold">{formatCurrency(Number(item.subtotal))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="summary-row">
              <td colSpan={4} className="bold">
                TOTAL
              </td>
              <td className="center bold">{data.totalQty}</td>
              <td>-</td>
              <td className="right bold">{formatCurrency(Number(data.totalNilai))}</td>
            </tr>
          </tfoot>
        </table>

        {/* Summary Information */}
        <div className="document-info" style={{ marginTop: "20px" }}>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Total Quantity:</span>
              <span className="info-value">{data.totalQty} unit</span>
            </div>
            <div className="info-row">
              <span className="info-label">Total Nilai:</span>
              <span className="info-value">{formatCurrency(Number(data.totalNilai))}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Dibuat Oleh:</span>
              <span className="info-value">Admin System</span>
            </div>
            <div className="info-row">
              <span className="info-label">Tanggal Dibuat:</span>
              <span className="info-value">
                {format(new Date(), "dd MMMM yyyy HH:mm:ss", { locale: id })}
              </span>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="signature-section">
          <div className="signature-box">
            <div className="signature-title">Supplier</div>
            <div className="signature-line"></div>
            <div className="signature-name">
              {data.supplier.nama || "________________"}
            </div>
          </div>

          <div className="signature-box">
            <div className="signature-title">Gudang</div>
            <div className="signature-line"></div>
            <div className="signature-name">________________</div>
          </div>

          <div className="signature-box">
            <div className="signature-title">Penerima</div>
            <div className="signature-line"></div>
            <div className="signature-name">________________</div>
          </div>
        </div>

        {/* Instructions */}
        <div
          className="notes-section"
          style={{ backgroundColor: "#fff3cd", borderColor: "#ffeaa7" }}
        >
          <div className="notes-title">PETUNJUK:</div>
          <div className="notes-content">
            1. Periksa semua barang sesuai dengan daftar di atas
            <br />
            2. Pastikan kondisi barang baik saat diterima
            <br />
            3. Tanda tangani dokumen ini sebagai bukti penerimaan
            <br />
            4. Laporkan segera jika ada barang yang rusak atau tidak sesuai
          </div>
        </div>

        {/* Footer */}
        <div className="document-footer">
          Dokumen ini adalah bukti penerimaan barang dari supplier yang sah dan harus
          ditandatangani oleh pihak terkait.
          <br />
          Dokumen ini dicetak pada{" "}
          {format(new Date(), "dd MMMM yyyy HH:mm:ss", { locale: id })}
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{printStyles}</style>
    </div>
  );
});

BarangMasukPrint.displayName = "BarangMasukPrint";

export default BarangMasukPrint;