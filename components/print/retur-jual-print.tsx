import React, { forwardRef, useImperativeHandle } from "react";
import { useReactToPrint } from "react-to-print";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { printStyles } from "./print-styles";
type ReturJualPrintItem = {
  id: string;
  barang: {
    nama: string;
    satuan: string;
    ukuran?: string | null;
    tipe?: string | null;
    merk?: string | null;
  };
  qty: number;
  harga: number | string;
  subtotal: number | string;
  alasan: string;
  kondisi: "bisa_dijual_lagi" | "rusak_total";
};

export interface ReturJualPrintData {
  id: string;
  noRetur: string;
  tanggal: Date | string;
  customer: {
    nama: string;
    alamat: string;
    telepon: string;
    email?: string | null;
    tipePelanggan?: string | null;
  };
  suratJalanId?: string | null;
  suratJalan?: {
    noSJ: string;
    tanggal: Date | string;
  };
  totalQty: number | string;
  totalNilai: number | string;
  alasan: string;
  status: string;
  detail: ReturJualPrintItem[];
  createdBy?: string | null;
}

interface ReturJualPrintProps {
  data: ReturJualPrintData;
  onPrintComplete?: () => void;
}

export interface ReturJualPrintRef {
  print: () => void;
}

const ReturJualPrint = forwardRef<ReturJualPrintRef, ReturJualPrintProps>(
  ({ data, onPrintComplete }, ref) => {
    const componentRef = React.useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
      contentRef: componentRef,
      documentTitle: `Retur Penjualan - ${data.noRetur}`,
      onAfterPrint: () => {
        onPrintComplete?.();
      },
      pageStyle: `
      @page {
        margin: 15mm;
        size: A4;
      }
      @media print {
        body { print-color-adjust: exact; }
      }
    `,
    });

    useImperativeHandle(ref, () => ({
      print: handlePrint,
    }));

    const calculateTotal = () => {
      return data.detail.reduce(
        (total, item) => total + Number(item.subtotal),
        0
      );
    };

    const calculateTotalQty = () => {
      return data.detail.reduce((total, item) => total + item.qty, 0);
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
          <div className="document-title">SURAT RETUR PENJUALAN</div>

          {/* Return Header */}
          <div
            className="retur-header"
            style={{ backgroundColor: "#d1ecf1", borderColor: "#bee5eb" }}
          >
            <p className="title">Nomor: {data.noRetur}</p>
            <p>
              Tanggal:{" "}
              {format(new Date(data.tanggal), "dd MMMM yyyy", { locale: id })}
            </p>
          </div>

          {/* Customer Information */}
          <div className="document-info">
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Dari:</span>
                <span className="info-value">{data.customer.nama}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Alamat:</span>
                <span className="info-value">{data.customer.alamat}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Telepon:</span>
                <span className="info-value">{data.customer.telepon}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{data.customer.email || "-"}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Tipe Pelanggan:</span>
                <span className="info-value">
                  {data.customer.tipePelanggan === "retail"
                    ? "Retail"
                    : data.customer.tipePelanggan === "wholesale"
                      ? "Wholesale"
                      : data.customer.tipePelanggan === "distributor"
                        ? "Distributor"
                        : "-"}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Status Retur:</span>
                <span className="info-value">
                  {data.status === "draft"
                    ? "Draft"
                    : data.status === "approved"
                      ? "Disetujui"
                      : data.status === "completed"
                        ? "Selesai"
                        : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Reference */}
          {data.suratJalanId && data.suratJalan && (
            <div className="document-info">
              <div className="info-grid">
                <div className="info-row">
                  <span className="info-label">Referensi SJ:</span>
                  <span className="info-value">{data.suratJalan.noSJ}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Tanggal SJ:</span>
                  <span className="info-value">
                    {format(new Date(data.suratJalan.tanggal), "dd MMMM yyyy", {
                      locale: id,
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Return Reason */}
          <div
            className="notes-section"
            style={{ backgroundColor: "#fff3cd", borderColor: "#ffeaa7" }}
          >
            <div className="notes-title">ALASAN RETUR:</div>
            <div className="notes-content">{data.alasan}</div>
          </div>

          {/* Items Table */}
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Barang</th>
                <th>Alasan Retur</th>
                <th>Kondisi</th>
                <th>Qty</th>
                <th>Satuan</th>
                <th>Harga</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.detail.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="bold">{item.barang.nama}</div>
                    {item.barang.ukuran && (
                      <div className="text-sm">
                        Ukuran: {item.barang.ukuran}
                      </div>
                    )}
                    {item.barang.tipe && (
                      <div className="text-sm">Tipe: {item.barang.tipe}</div>
                    )}
                    {item.barang.merk && (
                      <div className="text-sm">Merk: {item.barang.merk}</div>
                    )}
                  </td>
                  <td>
                    <span className="text-warning">{item.alasan}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        item.kondisi === "bisa_dijual_lagi"
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {item.kondisi === "bisa_dijual_lagi"
                        ? "Bisa Dijual Lagi"
                        : "Rusak Total"}
                    </span>
                  </td>
                  <td className="center">{item.qty}</td>
                  <td className="center">{item.barang.satuan}</td>
                  <td className="number">
                    Rp {Number(item.harga).toLocaleString("id-ID")}
                  </td>
                  <td className="number">
                    Rp {Number(item.subtotal).toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="summary-row">
                <td colSpan={4} className="bold">
                  TOTAL RETUR
                </td>
                <td className="center bold">{calculateTotalQty()}</td>
                <td>-</td>
                <td>-</td>
                <td className="number">
                  Rp {calculateTotal().toLocaleString("id-ID")}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Items Condition Summary */}
          <div className="document-info" style={{ marginTop: "20px" }}>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Barang Bisa Dijual:</span>
                <span className="info-value text-success">
                  {data.detail
                    .filter((item) => item.kondisi === "bisa_dijual_lagi")
                    .reduce((sum, item) => sum + item.qty, 0)}{" "}
                  {data.detail[0]?.barang.satuan}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Barang Rusak Total:</span>
                <span className="info-value text-danger">
                  {data.detail
                    .filter((item) => item.kondisi === "rusak_total")
                    .reduce((sum, item) => sum + item.qty, 0)}{" "}
                  {data.detail[0]?.barang.satuan}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="notes-section">
            <div className="notes-title">KETERANGAN TAMBAHAN:</div>
            <div className="notes-content">
              1. Barang-barang di atas dikembalikan oleh customer dengan alasan
              yang disebutkan
              <br />
              2. Barang dengan kondisi &quot;Bisa Dijual Lagi&quot; akan
              dimasukkan kembali ke stok
              <br />
              3. Barang dengan kondisi &quot;Rusak Total&quot; akan diproses
              sesuai kebijakan perusahaan
              <br />
              4. Retur ini telah disetujui oleh pihak manajemen
              <br />
              5. Dokumen ini sebagai bukti retur yang sah
            </div>
          </div>

          {/* Signature Section */}
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-title">Menyetujui</div>
              <div className="signature-line"></div>
              <div className="signature-name">
                {data.status === "approved" || data.status === "completed"
                  ? "Management"
                  : "________________"}
              </div>
            </div>

            <div className="signature-box">
              <div className="signature-title">Customer</div>
              <div className="signature-line"></div>
              <div className="signature-name">{data.customer.nama}</div>
            </div>

            <div className="signature-box">
              <div className="signature-title">Sales Admin</div>
              <div className="signature-line"></div>
              <div className="signature-name">
                {data.createdBy ? "Sales" : "________________"}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="document-footer">
            Dokumen ini adalah bukti retur penjualan yang sah dan harus
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
  }
);

ReturJualPrint.displayName = "ReturJualPrint";

export default ReturJualPrint;
