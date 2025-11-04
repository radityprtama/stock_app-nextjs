import React, { forwardRef, useImperativeHandle } from "react";
import { useReactToPrint } from "react-to-print";
import { format } from "date-fns";
import { id } from "date-fns/locale";
type SuratJalanPrintDetail = {
  id: string;
  barang?: {
    nama: string;
    satuan: string;
    ukuran?: string | null;
    tipe?: string | null;
    merk?: string | null;
  } | null;
  qty: number;
  hargaJual: number | string;
  subtotal: number | string;
  isDropship?: boolean;
  namaAlias?: string | null;
  keterangan?: string | null;
  isCustom?: boolean;
  customKode?: string | null;
  customNama?: string | null;
  customSatuan?: string | null;
  customHarga?: number | null;
};

export interface SuratJalanPrintData {
  id: string;
  noSJ: string;
  tanggal: Date | string;
  customer: {
    nama: string;
    alamat: string;
    telepon: string;
    email?: string | null;
  };
  alamatKirim: string;
  gudang: {
    nama: string;
  };
  namaSupir: string;
  nopolKendaraan: string;
  status: string;
  detail: SuratJalanPrintDetail[];
  deliveryOption?: "partial" | "complete";
  tanggalKirim?: Date | string | null;
  tanggalTerima?: Date | string | null;
  namaPenerima?: string | null;
  createdBy?: string | null;
  keterangan?: string | null;
}

interface SuratJalanPrintProps {
  data: SuratJalanPrintData;
  onPrintComplete?: () => void;
}

export interface SuratJalanPrintRef {
  print: () => void;
}

const SuratJalanPrint = forwardRef<SuratJalanPrintRef, SuratJalanPrintProps>(
  ({ data, onPrintComplete }, ref) => {
    const componentRef = React.useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
      contentRef: componentRef,
      documentTitle: `Surat Jalan - ${data.noSJ}`,
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
        (total, item) => total + Number(item.subtotal ?? 0),
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
          <div className="document-title">SURAT JALAN</div>

          {/* Document Number and Date */}
          <div className="surat-jalan-header">
            <p className="title">Nomor: {data.noSJ}</p>
            <p>
              Tanggal:{" "}
              {format(new Date(data.tanggal), "dd MMMM yyyy", { locale: id })}
            </p>
          </div>

          {/* Customer and Delivery Info */}
          <div className="document-info">
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Kepada:</span>
                <span className="info-value">{data.customer.nama}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Alamat Kirim:</span>
                <span className="info-value">{data.alamatKirim}</span>
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
                <span className="info-label">Gudang:</span>
                <span className="info-value">{data.gudang.nama}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Supir:</span>
                <span className="info-value">{data.namaSupir}</span>
              </div>
              <div className="info-row">
                <span className="info-label">No. Polisi:</span>
                <span className="info-value">{data.nopolKendaraan}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Status:</span>
                <span className="info-value">
                  {data.status === "draft"
                    ? "Draft"
                    : data.status === "in_transit"
                      ? "Dalam Perjalanan"
                      : data.status === "delivered"
                        ? "Terkirim"
                        : "Dibatalkan"}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Barang</th>
                <th>Keterangan</th>
                <th>Qty</th>
                <th>Satuan</th>
                <th>Harga</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.detail.map((item, index) => {
                const itemName =
                  item.namaAlias ||
                  (item.isCustom ? item.customNama : item.barang?.nama) ||
                  (item.isCustom ? "Custom Item" : "Barang");
                const itemSatuan = item.isCustom ?
                  (item.customSatuan || "-") :
                  (item.barang?.satuan || "-");
                const hargaJual = Number(
                  item.isCustom ?
                    (item.customHarga ?? 0) :
                    (item.hargaJual ?? 0)
                );
                const subtotal = Number(item.subtotal ?? 0);

                return (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="bold">{itemName}</div>
                      {item.isCustom && (
                        <div className="text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded w-fit mb-1">
                          Custom
                        </div>
                      )}
                      {item.barang?.ukuran && (
                        <div className="text-sm">
                          Ukuran: {item.barang.ukuran}
                        </div>
                      )}
                      {item.barang?.tipe && (
                        <div className="text-sm">Tipe: {item.barang.tipe}</div>
                      )}
                      {item.barang?.merk && (
                        <div className="text-sm">Merk: {item.barang.merk}</div>
                      )}
                      {item.isDropship && (
                        <div className="text-warning">*Dropship</div>
                      )}
                    </td>
                    <td>{item.keterangan || "-"}</td>
                    <td className="center">{item.qty}</td>
                    <td className="center">{itemSatuan}</td>
                    <td className="number">
                      Rp {hargaJual.toLocaleString("id-ID")}
                    </td>
                    <td className="number">
                      Rp {subtotal.toLocaleString("id-ID")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="summary-row">
                <td colSpan={3} className="bold">
                  TOTAL
                </td>
                <td className="center bold">{calculateTotalQty()}</td>
                <td>-</td>
                <td className="number">
                  Rp {calculateTotal().toLocaleString("id-ID")}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Notes */}
          {data.keterangan && (
            <div className="notes-section">
              <div className="notes-title">KETERANGAN:</div>
              <div className="notes-content">{data.keterangan}</div>
            </div>
          )}

          {/* Signature Section */}
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-title">Pengirim</div>
              <div className="signature-line"></div>
              <div className="signature-name">
                {data.createdBy ? "Admin" : "________________"}
              </div>
            </div>

            <div className="signature-box">
              <div className="signature-title">Supir</div>
              <div className="signature-line"></div>
              <div className="signature-name">{data.namaSupir}</div>
            </div>

            <div className="signature-box">
              <div className="signature-title">Penerima</div>
              <div className="signature-line"></div>
              <div className="signature-name">
                {data.namaPenerima || "________________"}
              </div>
            </div>
          </div>

          {/* Delivery Dates */}
          <div className="document-info" style={{ marginTop: "20px" }}>
            <div className="info-grid">
              {data.tanggalKirim && (
                <div className="info-row">
                  <span className="info-label">Tanggal Kirim:</span>
                  <span className="info-value">
                    {format(new Date(data.tanggalKirim), "dd MMMM yyyy HH:mm", {
                      locale: id,
                    })}
                  </span>
                </div>
              )}
              {data.tanggalTerima && (
                <div className="info-row">
                  <span className="info-label">Tanggal Terima:</span>
                  <span className="info-value">
                    {format(
                      new Date(data.tanggalTerima),
                      "dd MMMM yyyy HH:mm",
                      { locale: id }
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="document-footer">
            Dokumen ini adalah bukti pengiriman yang sah dan harus
            ditandatangani oleh pihak terkait.
            <br />
            Dokumen ini dicetak pada{" "}
            {format(new Date(), "dd MMMM yyyy HH:mm:ss", { locale: id })}
          </div>
        </div>
      </div>
    );
  }
);

SuratJalanPrint.displayName = "SuratJalanPrint";

export default SuratJalanPrint;
